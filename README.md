Astronomy Sandbox:
An interactive web app astronomy sandbox built with Next.js, React Three Fiber, and Three.js. It renders a live solar system, lets you add new planets, and simulates N-body gravity in real time. The final goal is a sandbox with multiple modes (orbit play, black hole visuals, star lifecycle, and habitability overlay).

Current Status:
Next.js app scaffolded and running locally.
3D scene with camera, lighting, and starfield background.
Solar System visual (sun + planets) orbiting.
Add a planet tool: create a new body with mass, radius, and initial velocity.
Physics loop: stable N-body integration.
Orbit helpers (rings/labels) and basic inspector controls.


Tech Stack
Frontend: Next.js (React + TypeScript)
3D: Three.js, @react-three/fiber, @react-three/drei
State: Zustand (scene, bodies, UI)
Physics: Custom Newtonian N-body (leapfrog/velocity-Verlet), gravitational softening
Build/Deploy: npm, Vercel (incomplete)


To run:
# Install dependencies
npm install

# Run in dev mode
npm run dev      # http://localhost:3000

# Build & Start
npm run build
npm start


Physics Notes:
Gravity law: Each body feels acceleration from all others.
Integration: Motion is updated using a leapfrog (velocity-Verlet) integrator. This makes orbits stable over long time periods, unlike basic Euler integration.
Timestep: A fixed timestep advances the system. A time scale factor lets users speed up or slow down how fast simulated time flows relative to real time.
Collisions: Currently, merging collisions are not supported. 