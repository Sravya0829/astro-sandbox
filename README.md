# Astro Sandbox

An interactive astronomy sandbox built with Next.js, React Three Fiber, and Three.js. Pick a preset system (or start blank), add stars, planets, moons, asteroids, and black holes, and watch them evolve under real-time Newtonian N-body gravity. Science panels explain habitability, black-hole physics, and stellar lifecycles for the selected body.

The simulator is guest-first: no account is needed to explore. Accounts are reserved for saving simulations, which is still in progress.

## Features

- **Presets:** Solar System, Blank System, Sun–Earth–Moon, Binary Stars, Compact Worlds (red dwarf), Black Hole Encounter, and Stellar Lifecycle. Open one directly with `/simulator?preset=<key>`.
- **Object creation:** add a body from a template (Earth-like planet, gas giant, moon, asteroid, red dwarf, stellar black hole). It is placed on a circular orbit automatically.
- **Editing:** select, focus, edit, and remove bodies, then reset to the initial state.
- **Physics:** a velocity-Verlet integrator with gravitational softening runs in a Web Worker. It uses AU, solar masses, and days.
- **Collisions:** optional perfectly inelastic merging that conserves mass and momentum. A swept closest-approach check catches fast bodies that would otherwise pass through each other between steps. Black holes always swallow the other body and keep a Schwarzschild radius.
- **Overlays:** live orbit trails, predicted trajectories (the next 360 days), velocity vectors, an orbital grid, and labels.
- **Science panels:**
  - *Habitability:* a 0–100 score from stellar flux, habitable-zone position, mass, and equilibrium temperature.
  - *Black hole:* event horizon, photon sphere, and innermost stable orbit, using the Schwarzschild solution for a non-rotating black hole.
  - *Stellar lifecycle:* lifespan, stage, temperature, luminosity, and final remnant from a simplified mass-based model.

All science models are educational approximations, and the interface labels them that way. Visual radii and distances are exaggerated for visibility, but the calculations use the physical values.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| State | Zustand |
| Validation | Zod (versioned simulation documents) |
| Styling | Tailwind CSS 4 plus custom CSS in `app/globals.css` |
| Auth & data | NextAuth v5, Prisma, PostgreSQL |
| Deployment | Vercel (not yet production-ready) |

## Getting started

```bash
npm install          # also runs `prisma generate`
npm run dev          # http://localhost:3000
```

To use the database and dashboard, create a `.env` file with:

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<random string>
```

The simulator itself runs without a database.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run test:science` | Unit tests for the physics and science modules (Node's built-in test runner, no build step) |

## Routes

| Route | Description |
| --- | --- |
| `/` | Public landing page |
| `/simulator` | Guest simulator workspace (`?preset=<key>` selects a preset) |
| `/dashboard` | Signed-in page. Saved simulations are not built yet, so it lists presets for now. |
| `/api/auth/*` | NextAuth endpoints. Development-only email credentials login. |

## Project structure

```
app/                     Next.js routes (landing, simulator, dashboard, auth API)
components/
  simulator/             Simulator workspace UI: panels, object creator, science panels
  canvas/                React Three Fiber scene, camera rig, scene scaling and theme
    physics/             Web Worker, worker client hook, Zustand physics store
  site/                  Shared site chrome (rail, footer, brand mark)
lib/
  simulation/            Schema, presets, templates, N-body core, trajectory prediction
  science/               Pure habitability, black-hole, and stellar-evolution models
  auth.ts, db.ts         NextAuth config and Prisma client
prisma/                  Database schema and migrations
tests/                   Science and N-body unit tests
docs/                    Implementation plan
```

## Physics notes

- **Units:** AU, solar masses (M☉), and days, with the Gaussian gravitational constant G = 2.959×10⁻⁴ AU³/(M☉·day²).
- **Integration:** velocity Verlet (leapfrog) keeps orbits stable over long runs, unlike Euler integration. Each frame's time is split into substeps (24 per simulated day), and the frame delta is capped so a slow tab cannot cause a huge jump.
- **Softening:** a small softening term keeps close encounters from producing infinite forces.
- **Time scale:** the speed control sets how many simulated days pass per real second.
- **Scene scaling:** distances are compressed logarithmically around the primary star or black hole, so inner planets and distant giants are visible at the same time.

## Roadmap

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). The next phases are:

- saved simulations with CRUD APIs, ownership checks, and public share links;
- production-safe authentication;
- end-to-end tests;
- reliability work: WebGL and offline errors, mobile QA, and accessibility;
- Vercel and Neon deployment.
