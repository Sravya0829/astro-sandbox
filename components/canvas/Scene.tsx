"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Line } from "@react-three/drei";
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { PLANETS } from "./planetConfig";
import type { StarConfig } from "./starConfig";
import { STARS, STAR_DEFAULT_KEY } from "./starConfig";
import { useCameraStore } from "./cameraStore";
import CameraRig from "./CameraRig";

// Physics
import { usePhysicsStore } from "./physics/store";
import { usePhysicsWorker, type BodyInit } from "./physics/client";
import { seedFromPlanets } from "./physics/seed";


function PhysicsStepper({ step }: { step: (dt: number) => void }) {
  useFrame((_, delta) => {
    step(delta);
  });
  return null;
}

const AU = 10;

// --- Log-distance scaling (AU -> scene units) ---
const SCALE_K = 12;
const SCALE_R0 = 0.4;

function scaleRadiusAU(rAU: number) {
  return SCALE_K * Math.log(1 + rAU / SCALE_R0);
}
function invScaleRadius(sceneR: number) {
  // invert y = K * ln(1 + r/R0)  →  r = R0 * (e^(y/K) - 1)
  return SCALE_R0 * (Math.exp(sceneR / SCALE_K) - 1);
}
function toSceneFromAU(posAU: [number, number], starAU: [number, number]): [number, number, number] {
  const dx = posAU[0] - starAU[0];
  const dy = posAU[1] - starAU[1];
  const r = Math.hypot(dx, dy);
  if (r === 0) return [0, 0, 0];
  const s = scaleRadiusAU(r);
  const ux = dx / r, uy = dy / r;
  return [ux * s, 0, uy * s];
}
function toAUFromScene(sceneXZ: [number, number], starAU: [number, number]): [number, number] {
  const [x, z] = sceneXZ;
  const rS = Math.hypot(x, z);
  if (rS === 0) return [starAU[0], starAU[1]];
  const rAU = invScaleRadius(rS);
  const ux = x / rS, uz = z / rS;
  return [starAU[0] + ux * rAU, starAU[1] + uz * rAU];
}


function CreatorGizmo({ addBody }: { addBody: (b: BodyInit) => void }) {
  const { camera, gl } = useThree();

  // Current star position in AU (index 0). If missing, use [0,0].
  const starAU = usePhysicsStore((s) => s.bodies[0]?.pos ?? ([0, 0] as [number, number]));

  // First click stores AU position; second click sets velocity
  const [placing, setPlacing] = useState<null | { posAU: [number, number] }>(null);
  // Latest pointer position in SCENE (x,z) for aiming the velocity arrow
  const [pointerScene, setPointerScene] = useState<[number, number] | null>(null);

  // Raycast the mouse to the XZ plane (y=0), return scene [x,z]
  const getSceneXZ = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit)) {
        return [hit.x, hit.z];
      }
      return null;
    },
    [gl.domElement, camera]
  );

  // Mouse move / click handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const p = getSceneXZ(e.clientX, e.clientY);
      if (p) setPointerScene(p);
    }

    function onClick(e: MouseEvent) {
      const p = getSceneXZ(e.clientX, e.clientY);
      if (!p) return;

      if (!placing) {
        // First click: choose spawn position (convert scene → AU using inverse log scale)
        const posAU = toAUFromScene(p, starAU);
        setPlacing({ posAU });
      } else {
        // Second click: choose initial velocity based on drag direction
        if (!pointerScene) return;

        const p0 = placing.posAU;                         // AU
        const p1AU = toAUFromScene(pointerScene, starAU); // AU

        // Heuristic: convert displacement to AU/day
        const SCALE_V = 0.06; // ↓ reduce if new planets fly off too fast
        const vAU: [number, number] = [
          (p1AU[0] - p0[0]) * SCALE_V,
          (p1AU[1] - p0[1]) * SCALE_V,
        ];

        // Send to worker + store (includes visual props)
        addBody({
          massSolar: 0,                 // massless test particle (doesn’t tug others)
          pos: p0,
          vel: vAU,
          name: "Custom",
          color: "#66ccff",
          radiusScene: 0.28,
        });

        setPlacing(null);
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [getSceneXZ, placing, pointerScene, starAU, addBody]);

  // Preview marker (scene coords)
  const previewPosScene = useMemo(
    () => (placing ? toSceneFromAU(placing.posAU, starAU) : null),
    [placing, starAU]
  );

  // Preview velocity arrow end (scene coords)
  const previewVelEndScene = useMemo(() => {
    if (!placing || !pointerScene) return null;
    const p1AU = toAUFromScene(pointerScene, starAU);

    // Longer line so it’s easy to see in the scene
    const SCALE_V_LINE = 2.0;
    const vx = (p1AU[0] - placing.posAU[0]) * SCALE_V_LINE;
    const vy = (p1AU[1] - placing.posAU[1]) * SCALE_V_LINE;
    const endAU: [number, number] = [placing.posAU[0] + vx, placing.posAU[1] + vy];
    return toSceneFromAU(endAU, starAU);
  }, [placing, pointerScene, starAU]);

  useEffect(() => {
    const prev = document.body.style.cursor;
    document.body.style.cursor = "crosshair";
    return () => { document.body.style.cursor = prev; };
  }, []);

  return (
    <>
      <Html position={[-9999, -9999, 0]} transform={false}>
        <div style={{
          position: "fixed", top: 12, left: 12,
          background: "rgba(0,0,0,0.6)", color: "#fff",
          padding: "6px 8px", borderRadius: 6, fontSize: 12,
          pointerEvents: "none", zIndex: 1000
        }}>
          Add planet: click to place, move mouse, click to set velocity
        </div>
      </Html>

      {/* Spawn point preview */}
      {previewPosScene && (
        <mesh position={previewPosScene}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )}

      {/* Velocity preview arrow */}
      {previewPosScene && previewVelEndScene && (
        <Line
          points={[
            new THREE.Vector3(...previewPosScene),
            new THREE.Vector3(...previewVelEndScene),
          ]}
          lineWidth={1}
          color="#ffffff"
          transparent
          opacity={0.9}
        />
      )}
    </>
  );
}



/* ---------------- SUN ---------------- */
function Sun({
  name,
  radius,
  type,
  color,
  emissive,
  emissiveIntensity,
  massSolar,
}: {
  name: string;
  radius: number;
  type: string;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  massSolar: number;
}) {
  const meshRef = useRef<THREE.Object3D>(null!);
  const [hovered, setHovered] = useState(false);
  const setFocus = useCameraStore((s) => s.setFocus);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => { document.body.style.cursor = "auto"; };
  }, [hovered]);

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      roughness: 0.6,
    }),
    [color, emissive, emissiveIntensity]
  );

  return (
    <group name={name} position={[0, 0, 0]}>
      <mesh
        ref={meshRef as React.Ref<THREE.Object3D>}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => {
          e.stopPropagation();
          const wp = new THREE.Vector3();
          meshRef.current.getWorldPosition(wp);
          setFocus(wp, Math.max(4, radius * 6));
        }}
      >
        <sphereGeometry args={[radius, 48, 48]} />
        <primitive object={material} attach="material" />
      </mesh>

      <Html transform position={[0, radius + 0.4, 0]} occlude={[meshRef]} distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div style={{ padding: "2px 6px", fontSize: "12px", borderRadius: 6, background: "rgba(0,0,0,0.5)", color: "white", whiteSpace: "nowrap" }}>
          {name}
        </div>
      </Html>

      {hovered && (
        <Html transform position={[0, radius + 1.0, 0]} occlude={[meshRef]} distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div style={{ padding: "6px 8px", fontSize: "12px", borderRadius: 8, background: "rgba(20,20,20,0.75)", color: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.15)" }}>
            <strong style={{ marginRight: 6 }}>{name}</strong>
            <span>• Type: {type}</span>{" "}
            <span>• Mass ≈ {massSolar} M☉</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* --------------- ORBIT RING --------------- */
function OrbitRing({ radiusScene }: { radiusScene: number }) {
  const segments = 128;
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radiusScene, 0, Math.sin(a) * radiusScene));
    }
    const g = new THREE.BufferGeometry();
    g.setFromPoints(pts);
    return g;
  }, [radiusScene]);

  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color="#444" />
    </line>
  );
}

/* --------------- PLANET (physics position) --------------- */
type PlanetProps = {
  name: string;
  radius: number;
  posAU: [number, number];
  tilt?: number;
  color?: string;
};

function Planet({ name, radius, posAU, tilt = 0, color = "#88aaff" }: PlanetProps) {
  const groupRef = useRef<THREE.Object3D>(null!);
  const meshRef = useRef<THREE.Object3D>(null!);
  const [hovered, setHovered] = useState(false);
  const setFocus = useCameraStore((s) => s.setFocus);

  // Get the star's current AU position from the physics store (index 0)
  const starAU = usePhysicsStore((s) => s.bodies[0]?.pos ?? ([0, 0] as [number, number]));

  const posScene = useMemo(() => toSceneFromAU(posAU, starAU), [posAU, starAU]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => { document.body.style.cursor = "auto"; };
  }, [hovered]);

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.7, metalness: 0.1 }),
    [color]
  );

  return (
    <group ref={groupRef as React.Ref<THREE.Object3D>} name={name} position={posScene}>
      <mesh
        ref={meshRef as React.Ref<THREE.Object3D>}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => {
          e.stopPropagation();
          const wp = new THREE.Vector3();
          groupRef.current.getWorldPosition(wp);
          setFocus(wp, Math.max(4, radius * 8));
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <primitive object={material} attach="material" />
      </mesh>

      <Html transform position={[0, radius + 0.25, 0]} occlude={[meshRef]} distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div style={{ padding: "2px 6px", fontSize: "12px", borderRadius: 6, background: "rgba(0,0,0,0.5)", color: "white", whiteSpace: "nowrap" }}>
          {name}
        </div>
      </Html>

      {hovered && (
        <Html transform position={[0, radius + 0.9, 0]} occlude={[meshRef]} distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div style={{ padding: "6px 8px", fontSize: "12px", borderRadius: 8, background: "rgba(20,20,20,0.75)", color: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.15)" }}>
            <strong style={{ marginRight: 6 }}>{name}</strong>
            <span>• r ≈ {Math.hypot(posAU[0] - starAU[0], posAU[1] - starAU[1]).toFixed(2)} AU</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------------- SCENE ROOT ---------------- */
export default function Scene({
  simSpeed = 30,
  star = STARS[STAR_DEFAULT_KEY],
  mutualGravity = true,
  creatorMode = false,
}: {
  simSpeed?: number;
  star?: StarConfig;
  mutualGravity?: boolean;
  creatorMode?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Build initial physics bodies from the selected star + planet config
  const initialBodies = useMemo(() => {
    return seedFromPlanets({
      starName: star.name,
      starMass: star.massSolar,
      starRadiusScene: star.radiusScene,
      starColor: star.color,
      planets: PLANETS.map((p) => ({
        name: p.name,
        aAU: p.aAU,
        periodDays: p.periodDays,
        radius: p.radius,
        color: p.color,
      })),
      mutualGravity, // re-seeds worker when toggled
    });
  }, [star, mutualGravity]);

  // ✅ Call the physics hook at the top level (not inside useEffect)
  const { step, addBody } = usePhysicsWorker({
    initialBodies,
    simSpeed, // days per real second (0 = paused)
  });

  // Read live bodies from the store (index 0 is the star in AU space)
  const bodies = usePhysicsStore((s) => s.bodies);

  // Small helper that runs inside the Canvas so useFrame is legal
  function PhysicsStepper({ step }: { step: (dt: number) => void }) {
    useFrame((_, delta) => step(delta));
    return null;
  }

  return (
    <Canvas camera={{ position: [0, 6, 26], fov: 60 }} dpr={[1, 2]}>
      {/* Drive physics each frame */}
      <PhysicsStepper step={step} />

      {/* Optional creator overlay */}
      {creatorMode && <CreatorGizmo addBody={addBody} />}

      {/* Background + lights */}
      <Stars radius={200} depth={50} count={2000} factor={4} fade />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 2]} intensity={1.0} />

      {/* Sun rendered at scene origin (we're using log-distance visualization) */}
      <Sun
        name={star.name}
        type={star.type}
        radius={star.radiusScene}
        color={star.color}
        emissive={star.emissive}
        emissiveIntensity={star.emissiveIntensity}
        massSolar={star.massSolar}
      />

      {/* Reference orbit rings – use the same scaling as planets */}
      {PLANETS.map((p) => (
        <OrbitRing key={`ring:${p.name}`} radiusScene={scaleRadiusAU(p.aAU)} />
      ))}

      {/* Render planets at physics positions (skip index 0 = star) */}
      {bodies.slice(1).map((b) => (
        <Planet
          key={b.id}
          name={b.name}
          radius={b.radiusScene}
          posAU={b.pos}
          color={b.color}
        />
      ))}

      {/* Controls + tween rig */}
      <OrbitControls
        ref={controlsRef as React.Ref<OrbitControlsImpl>}
        enableDamping
        enabled={!creatorMode}   // ← important
      />
      <CameraRig controls={controlsRef.current} />
    </Canvas>
  );
}
