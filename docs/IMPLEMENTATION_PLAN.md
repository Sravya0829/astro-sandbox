# Astro Sandbox implementation plan

## Repository audit

### Working and reusable

- Next.js App Router, TypeScript, Tailwind CSS, Prisma, NextAuth, Zustand, React Three Fiber, and Three.js are installed.
- The existing scene renders a starfield, a configurable star, five planets, labels, orbit reference rings, and camera focus transitions.
- Physics already runs in a Web Worker and uses Velocity Verlet with gravitational softening and bounded substeps.
- Runtime planet placement, pause/speed controls, camera reset, and optional mutual gravity work as an early prototype.
- Prisma has initial `User` and JSON-backed `Sandbox` models. JSON is a reasonable persistence boundary for versioned simulation documents.

### Incomplete or risky

- The simulator is coupled to `/dashboard` and protected by authentication, contrary to the guest-first requirement.
- The root route was still a starter page. There is no landing page, shared navigation, presets browser, saved-simulation dashboard, or help experience.
- Simulation bodies lack a stable product schema: category, physical radius, three-dimensional vectors, parent, metadata, and schema version are absent.
- Rendering, domain conversion, object creation, selection, and scene UI live in one large component.
- Physics updates only positions on the UI side. Reset exists in the worker protocol but is not exposed; edit/remove/collisions/trails/statistics are absent.
- The current click-to-place tool installs window-level click handlers, which can conflict with surrounding interface controls.
- Camera state stores Three.js vectors in Zustand. Runtime-only Three.js state is acceptable, but it must remain separate from serializable simulation state.
- Auth middleware imports the Prisma-backed auth configuration into the Edge bundle and produces an Edge-runtime warning.
- Credentials auth is development-only, and there are no ownership checks or simulation APIs.
- No automated tests, environment schema, preset seed pipeline, offline/WebGL errors, or migration strategy exist.

## Architecture decisions

1. **Guest-first routing:** `/` is the public product page, `/simulator` is the guest workspace, and `/dashboard` is reserved for authenticated saved simulations.
2. **Versioned document persistence:** store a canonical, versioned simulation document as JSON in PostgreSQL, with relational columns for ownership, slug, visibility, title, and timestamps. Bodies remain inside the document because they are loaded and saved as a unit and are not independently queried.
3. **Four state boundaries:** canonical simulation document, live worker state, transient interface state, and Three.js scene objects remain separate and communicate through typed adapters.
4. **Scientific units:** physics uses solar masses, AU, and days. Physical radius is stored independently from exaggerated render radius. Conversion and visual scaling live in dedicated modules.
5. **Worker authority:** integration, collision detection, runtime velocities, statistics, and trajectory sampling belong in the worker. React receives throttled snapshots keyed by stable body IDs.
6. **Collision model:** begin with configurable perfectly inelastic merging that conserves mass and linear momentum. Surface the simplification in the interface.
7. **Scientific explanations:** habitability, black-hole, and stellar-lifecycle calculations are pure functions with structured explanations and explicit approximation labels.
8. **Authentication boundary:** exploration and sharing are public; only create/update/delete/duplicate personal records require a session.
9. **Deployment:** no hosting action occurs during feature development. Vercel/Neon production configuration is the final readiness phase.

## Assumptions

- The initial simulator remains planar for the first complete editing workflow, then vectors expand to 3D without changing persisted field names.
- Approximate visual radii and lensing are acceptable when clearly labeled; calculations retain physical values.
- The existing Neon database may contain early `Sandbox` records, so migrations will be additive and documents will include migration functions.
- Desktop is the primary high-density workspace, while smaller screens use drawers/stacked panels and retain all core actions.

## Dependency-aware delivery plan

### 1. Public product shell and guest simulator

- Add a polished landing page, responsive navigation, footer, product metadata, and clear calls to action.
- Move the existing simulator experience to public `/simulator` and separate account dashboard language from workspace language.
- Establish reusable visual primitives and responsive workspace layout.

### 2. Canonical simulation domain

- Define versioned simulation, body, settings, units, and preset schemas with Zod validation.
- Add deterministic IDs, cloning, migration, serialization, and explicit physics/render adapters.
- Convert existing Solar System seed data to the shared schema and add the required presets.

### 3. Complete orbital editing workflow

- Refactor the scene into focused rendering components and move runtime/interface state into dedicated stores.
- Add selection, inspector, templates, validated create/edit/move/delete, focus, reset, blank simulation, and preset switching.
- Extend worker messaging for stable IDs, velocity snapshots, body update/removal, reset, collision events, diagnostics, and throttled trails.
- Add orbit trails, velocity indicators, grid/orbital plane, statistics, and unstable/escaping/collision messaging.

### 4. Integrated science modes

- Add pure, tested habitability calculations and an explainable planet panel.
- Add Schwarzschild/event-horizon/photon-sphere calculations and integrated black-hole visuals with approximation disclosures.
- Add the rule-based stellar evolution model, editable inputs, lifecycle path, and stage-linked rendering.

### 5. Persistence, accounts, and sharing

- Evolve Prisma models with title, slug, visibility, schema version, and indexes.
- Add validated CRUD, duplicate, list, and public-share APIs with centralized ownership checks.
- Replace development-only auth behavior with production-safe configuration while preserving a documented local flow.
- Build the actual saved-simulation dashboard and read-only public share route.

### 6. Reliability and completion

- Add unit tests for physics/science/validation/serialization and integration tests for APIs and authorization.
- Add end-to-end coverage for the required open-run-edit-save-reload-share workflow.
- Add bounded trail memory, worker cleanup/recovery, tab resumption handling, WebGL/error/offline states, keyboard access, reduced motion, and mobile QA.
- Complete setup, environment, migration, seeding, architecture, scientific assumptions, and deployment documentation.
- Finish CI and only then prepare Vercel/Neon deployment.

## Definition of done

A feature is complete only when its calculation/domain behavior, worker or backend integration, interface, validation, error handling, and relevant tests are connected. Placeholder cards or disconnected demonstrations do not count as delivered features.
