"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useCameraStore } from "./cameraStore";

type Props = {
  /** Pass the OrbitControls instance (e.g., controlsRef.current) */
  controls?: OrbitControlsImpl | null;
};

export default function CameraRig({ controls }: Props) {
  const { camera } = useThree();

  // Internal tween state
  const lerpRef = useRef({
    t: 0,                                  // progress [0..1]
    duration: 0.8,                         // seconds
    active: false,                         // whether we’re animating
    startPos: new THREE.Vector3(),         // camera start
    endPos: new THREE.Vector3(),           // camera end
    startTarget: new THREE.Vector3(),      // controls target start
    endTarget: new THREE.Vector3(),        // controls target end
  });

  // Only subscribe to the "signal" that indicates a new focus/home
  const requestId = useCameraStore((s) => s.requestId);

  // Start a tween whenever requestId bumps
  useEffect(() => {
    const L = lerpRef.current;
    L.t = 0;
    L.active = true;

    // Read the latest target/distance directly from the store (not via hook),
    // so they are NOT React dependencies.
    const { target: focusTarget, distance } = useCameraStore.getState();

    // From...
    L.startPos.copy(camera.position);
    if (controls?.target) {
      L.startTarget.copy(controls.target);
    } else {
      L.startTarget.set(0, 0, 0);
    }

    // To...
    L.endTarget.copy(focusTarget);

    // Direction: preserve current look direction
    const dir = new THREE.Vector3()
      .subVectors(camera.position, L.startTarget)
      .normalize();

    // Fallback if degenerate
    if (!isFinite(dir.lengthSq()) || dir.lengthSq() === 0) {
      dir.set(0.6, 0.5, 0.6).normalize();
    }

    // End camera position = target + dir * distance
    L.endPos.copy(focusTarget).addScaledVector(dir, distance);
  }, [requestId, camera, controls]); // ✅ ESLint is happy

  useFrame((_, delta) => {
    const L = lerpRef.current;
    if (!L.active) return;

    // EaseOutCubic
    L.t = Math.min(1, L.t + delta / L.duration);
    const k = 1 - Math.pow(1 - L.t, 3);

    camera.position.lerpVectors(L.startPos, L.endPos, k);

    if (controls?.target) {
      controls.target.lerpVectors(L.startTarget, L.endTarget, k);
      controls.update?.();
    }

    if (L.t >= 1) L.active = false;
  });

  return null;
}
