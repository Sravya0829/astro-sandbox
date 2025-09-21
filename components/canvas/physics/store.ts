"use client";

import { create } from "zustand";

export type Body = {
  id: string;
  name: string;
  massSolar: number;         // mass in solar masses
  radiusScene: number;       // for rendering only
  color: string;             // for rendering only
  pos: [number, number];     // AU (x, y) — z=0 plane
  vel: [number, number];     // AU/day (vx, vy)
};

type PhysicsState = {
  bodies: Body[];
  setBodies: (b: Body[]) => void;
  updatePositions: (pos: Array<[number, number]>) => void; // in same order as bodies
};

export const usePhysicsStore = create<PhysicsState>((set, get) => ({
  bodies: [],
  setBodies: (b) => set({ bodies: b }),
  updatePositions: (pos) => {
    const b = get().bodies;
    if (b.length !== pos.length) return;
    const updated = b.map((bi, i) => ({ ...bi, pos: pos[i] }));
    set({ bodies: updated });
  },
}));
