"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useCameraStore } from "./cameraStore";
import { usePhysicsStore } from "./physics/store";
import { liveScenePosition } from "./sceneScale";

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
    direction: new THREE.Vector3(),        // camera offset direction from the target
    distance: 0,                           // camera distance from the target
    followId: null as string | null,       // body the tween is chasing (it keeps moving)
  });

  // While a body is selected the camera follows it: each frame the camera and orbit target move by
  // however far the body moved, so the user's own orbit/zoom around it is preserved. Clicking empty
  // space clears the selection and the camera stays where it is.
  const followRef = useRef<{ id: string | null; last: THREE.Vector3 | null }>({ id: null, last: null });

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
    L.direction.copy(dir);
    L.distance = distance;
    L.followId = usePhysicsStore.getState().selectedBodyId;
  }, [requestId, camera, controls]); // ✅ ESLint is happy

  useFrame((_, delta) => {
    const L = lerpRef.current, follow = followRef.current;
    const selectedId = usePhysicsStore.getState().selectedBodyId;
    const scenePosition = selectedId ? liveScenePosition(selectedId) : null;
    const bodyPoint = scenePosition ? new THREE.Vector3(...scenePosition) : null;

    if (L.active) {
      // Chase the body's current position rather than where it was when the tween started.
      if (bodyPoint && L.followId === selectedId) {
        L.endTarget.copy(bodyPoint);
        L.endPos.copy(bodyPoint).addScaledVector(L.direction, L.distance);
      }

      // EaseOutCubic
      L.t = Math.min(1, L.t + delta / L.duration);
      const k = 1 - Math.pow(1 - L.t, 3);

      camera.position.lerpVectors(L.startPos, L.endPos, k);

      if (controls?.target) {
        controls.target.lerpVectors(L.startTarget, L.endTarget, k);
        controls.update?.();
      }

      if (L.t >= 1) L.active = false;
      follow.id = selectedId;
      follow.last = bodyPoint;
      return;
    }

    if (!bodyPoint) { follow.id = null; follow.last = null; return; }
    if (follow.id === selectedId && follow.last) {
      const moved = bodyPoint.clone().sub(follow.last);
      camera.position.add(moved);
      if (controls?.target) { controls.target.add(moved); controls.update?.(); }
    }
    follow.id = selectedId;
    follow.last = bodyPoint;
  });

  return null;
}
