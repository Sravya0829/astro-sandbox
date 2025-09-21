"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePhysicsStore, type Body } from "./store";
import type { WorkerStateMsg } from "./physics.worker"; // outbound type from the worker

// Next.js/Webpack-friendly worker constructor
const WorkerCtor = () =>
  new Worker(new URL("./physics.worker.ts", import.meta.url));

/** Inputs to add a new body at runtime. Includes both physics + visual props. */
export type BodyInit = {
  // physics (worker cares about these)
  massSolar: number;                 // in solar masses
  pos: [number, number];             // AU (x, y) on the orbital plane
  vel: [number, number];             // AU/day (vx, vy)
  // visual (UI/store only)
  name?: string;
  radiusScene?: number;              // mesh radius in scene units
  color?: string;                    // mesh color
};

export function usePhysicsWorker({
  initialBodies,
  G = 0.00029591220828559,           // AU^3 / (M☉ * day^2)
  softening2 = 1e-6,                 // (0.001 AU)^2 softening
  simSpeed,
}: {
  initialBodies: Body[];
  G?: number;
  softening2?: number;
  simSpeed: number;                  // days per real-time second; 0 = paused
}) {
  const setBodies = usePhysicsStore((s) => s.setBodies);
  const updatePositions = usePhysicsStore((s) => s.updatePositions);
  const workerRef = useRef<Worker | null>(null);

  // Spawn/initialize the worker whenever the scenario changes
  useEffect(() => {
    const w = WorkerCtor();
    workerRef.current = w;

    // Initialize UI store bodies (visuals)
    setBodies(initialBodies);

    // Wire state updates from worker → store positions (by index)
    w.onmessage = (ev: MessageEvent<WorkerStateMsg>) => {
      if (ev.data?.type === "state" && ev.data.pos) {
        updatePositions(ev.data.pos);
      }
    };

    // Send initial physics bodies to the worker
    w.postMessage({
      type: "init",
      G,
      softening2,
      bodies: initialBodies.map((b) => ({
        massSolar: b.massSolar,
        pos: b.pos,
        vel: b.vel,
      })),
    });

    // Cleanup worker on unmount or when initial bodies change
    return () => {
      w.terminate();
      workerRef.current = null;
    };
    // Using JSON.stringify to avoid deep deps noise; include G/softening2 in case you tweak them
  }, [initialBodies, G, softening2, setBodies, updatePositions]);

  /** Advance physics by render delta (keeps substeps ≤ 1 hour for stability). */
  const step = useCallback(
    (dtSeconds: number) => {
      const w = workerRef.current;
      if (!w || simSpeed <= 0) return;

      const dtDays = dtSeconds * simSpeed;

      // Cap per-substep to ~1 hour of simulated time
      const maxStepDays = 1 / 24;
      const substeps = Math.max(1, Math.ceil(Math.abs(dtDays) / maxStepDays));

      w.postMessage({ type: "step", dtDays, substeps });
    },
    [simSpeed]
  );

  /**
   * Add a new body at runtime.
   * Posts physics data to the worker and appends a visual entry to the UI store.
   */
  const addBody = useCallback((body: BodyInit) => {
    const w = workerRef.current;
    if (!w) return;

    // 1) Tell the worker about the new physics body
    w.postMessage({
      type: "add",
      body: {
        massSolar: body.massSolar,
        pos: body.pos,
        vel: body.vel,
      },
    });

    // 2) Append a matching visual body to the UI store (so the mesh renders)
    const current = usePhysicsStore.getState().bodies;
    const visual: Body = {
      id: `planet:custom-${Date.now()}`,
      name: body.name ?? "Custom",
      massSolar: body.massSolar,
      radiusScene: body.radiusScene ?? 0.28,
      color: body.color ?? "#66ccff",
      pos: body.pos,
      vel: body.vel,
    };
    usePhysicsStore.getState().setBodies([...current, visual]);
  }, []);

  return { step, addBody };
}