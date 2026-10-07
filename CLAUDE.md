# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint
- `npm run test:science`: runs `tests/science.test.mjs` with `node --experimental-strip-types --test`. There is no build step, so modules imported by tests must not use `@/` path aliases or bundler-only features.
- `npm install` runs `prisma generate` and writes the client into `app/generated/prisma/`. That directory is gitignored and lint-ignored; never edit it.

## Architecture

The full plan and its rationale are in `docs/IMPLEMENTATION_PLAN.md`. Read it before starting a feature.

**Routing (guest-first).** `/` is the public landing page, and `/simulator` is the public workspace. `/dashboard` is the only route that requires authentication; `middleware.ts` matches only `/dashboard/:path*`. Do not put auth in front of exploration features.

**Keep these four state boundaries separate:**

1. **Canonical document:** `lib/simulation/schema.ts`. A Zod-validated, versioned `SimulationDocument` (`SIMULATION_SCHEMA_VERSION`). Presets in `lib/simulation/presets.ts` and templates in `templates.ts` must conform to it. Bodies use `positionAU`, `velocityAUPerDay`, `massSolar`, and `radiusKm` (physical), plus `renderRadius` (visual only).
2. **Worker state:** `components/canvas/physics/physics.worker.ts` owns integration and collisions. It calls the pure core in `lib/simulation/nbody.ts`, which has no imports so the tests and the worker can share it.
3. **Store and live data:** `components/canvas/physics/store.ts`. Zustand holds structural and descriptive state (body list, selection, events). Per-frame positions, velocities, and trails live in the mutable `live` object, outside React. Read them in `useFrame`, and never push per-frame data through React state; doing so previously broke Next navigation on the simulator page. React state is refreshed every ~250 ms or on a structural change.
4. **Three.js scene:** `components/canvas/`. `sceneScale.ts` converts AU to scene units logarithmically around the origin body (the first star or black hole).

**Worker protocol** (`components/canvas/physics/client.ts`, `usePhysicsWorker`):
- Structural messages (`init`, `add`, `update`, `remove`, `reset`) carry a monotonically increasing `revision`. The client drops snapshots whose revision is older than the latest.
- At most one `step` is in flight; elapsed time accumulates while it is pending. Frame deltas are capped at 0.1 s, with 24 substeps per simulated day.
- The worker decides which bodies exist, because collisions remove bodies there. The store keeps the fields the worker never sees (name, color, parentId, and so on).

**Science** (`lib/science/`): pure functions that return values plus explanation strings. They are approximations, and the UI must keep labeling them that way (see the `science-disclaimer` text in `components/simulator/Simulator.tsx`).

**Persistence and auth:** `lib/auth.ts` (NextAuth v5 with a dev-only Credentials provider that upserts by email, JWT sessions) and `lib/db.ts` (Prisma). The `Sandbox` model stores the simulation document as JSON. Saving and sharing are not implemented yet; that is the next planned phase.

## Conventions

- **Units:** AU, solar masses, and days everywhere in physics. G = `GAUSSIAN_G` (`0.00029591220828559`); import it from `nbody.ts` instead of adding another copy of the literal.
- **Physical vs. visual:** never derive physics from `renderRadius` or scene coordinates. Collisions use `radiusKm`.
- **Vectors:** the simulation is currently planar (`[x, y]` tuples). The plan is to expand to 3D without renaming persisted fields.
- **Code style:** much of the simulator, physics, and science code is written in a dense style (one-line functions, chained declarations, minimal whitespace). Match the style of the file you are editing. Comments explain *why*, especially for non-obvious physics or performance choices.
- **Tests:** any change to `lib/simulation/nbody.ts`, `predict.ts`, or `lib/science/*` needs a test in `tests/science.test.mjs`. Import with relative paths and `.ts` extensions.
- **Styling:** most UI styling is semantic classes in `app/globals.css`, not inline Tailwind utilities. Scene colors live in `components/canvas/sceneTheme.ts`.
- **Definition of done** (from the plan): a feature counts as delivered only when its domain logic, worker or backend integration, UI, validation, error handling, and tests are connected. Do not ship placeholder UI.
- No deployment or hosting actions during feature work.
