"use client";

import { useMemo, useState } from "react";
import Scene from "@/components/canvas/Scene";
import { STARS, STAR_DEFAULT_KEY, type StarConfig } from "@/components/canvas/starConfig";
import { useCameraStore } from "@/components/canvas/cameraStore";

export default function DashboardClient() {
  const [simSpeed, setSimSpeed] = useState<number>(30);
  const [paused, setPaused] = useState<boolean>(false);

  const [starKey, setStarKey] = useState<string>(STAR_DEFAULT_KEY);
  const star: StarConfig = STARS[starKey];

  const [mutualGravity, setMutualGravity] = useState<boolean>(true);

  const setHome = useCameraStore((s) => s.setHome);
  const effectiveSpeed = useMemo(() => (paused ? 0 : simSpeed), [paused, simSpeed]);

  const [creatorMode, setCreatorMode] = useState<boolean>(false);

  return (
    <div className="space-y-4">
      {/* Control panel */}
      <div className="rounded-lg border border-white/10 p-4 space-y-4">
        {/* Row 1: Simulation speed + Pause/Play + Reset View */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="text-sm text-white/80">
            Simulation speed: <span className="font-mono">{effectiveSpeed.toFixed(0)}×</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={simSpeed}
              onChange={(e) => setSimSpeed(Number(e.target.value))}
              className="w-56 md:w-64 accent-white"
              disabled={paused}
            />
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
              aria-pressed={paused}
              title={paused ? "Play" : "Pause"}
            >
              {paused ? "Play" : "Pause"}
            </button>
            <button
              type="button"
              onClick={setHome}
              className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
              title="Reset camera to system view"
            >
              Reset view
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-white/80">Add planet tool</label>
            <label className="text-sm text-white/70 flex items-center gap-2">
              <input type="checkbox" checked={creatorMode} onChange={(e) => setCreatorMode(e.target.checked)} />
              Enable
            </label>
        </div>

        {/* Row 2: Star preset */}
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-white/80">Star preset</label>
          <select
            value={starKey}
            onChange={(e) => setStarKey(e.target.value)}
            className="rounded bg-white/10 px-3 py-1 text-white"
            aria-label="Choose star preset"
          >
            {Object.keys(STARS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Mutual gravity */}
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-white/80">Mutual gravity (Jupiter, Saturn…)</label>
          <label className="text-sm text-white/70 flex items-center gap-2">
            <input
              type="checkbox"
              checked={mutualGravity}
              onChange={(e) => setMutualGravity(e.target.checked)}
            />
            Enable
          </label>
        </div>
      </div>

      {/* Canvas panel */}
      <div className="rounded-lg border border-white/10">
        <div className="h-[70vh]">
          <Scene
            simSpeed={effectiveSpeed}
            star={star}
            mutualGravity={mutualGravity}
            creatorMode={creatorMode}   // ← MUST be here (not commented out)
          />
        </div>
      </div>
    </div>
  );
}