import { create } from "zustand";
import * as THREE from "three";

export const HOME_TARGET = new THREE.Vector3(0, 0, 0); // system center
export const HOME_DISTANCE = 20;                        // a nice wide shot

type CameraState = {
  /** World-space point the camera should look at */
  target: THREE.Vector3;
  /** Desired camera distance from the target */
  distance: number;
  /**
   * A monotonically increasing/unique “signal” value.
   * CameraRig’s useEffect depends ONLY on this, avoiding mid-tween restarts.
   */
  requestId: number;

  /** Focus the camera on a point; optional distance override */
  setFocus: (target: THREE.Vector3, distance?: number) => void;

  /** Reset to the home (system) view */
  setHome: () => void;

  /** Bump the signal without changing target/distance (rarely needed) */
  clear: () => void;
};

export const useCameraStore = create<CameraState>((set) => ({
  target: HOME_TARGET.clone(),
  distance: HOME_DISTANCE,
  requestId: Date.now(),

  setFocus: (target, distance = 8) =>
    set(() => ({
      target: target.clone(),
      distance,
      // Use a unique signal every time to satisfy exhaustive-deps cleanly
      requestId: Date.now(),
    })),

  setHome: () =>
    set(() => ({
      target: HOME_TARGET.clone(),
      distance: HOME_DISTANCE,
      requestId: Date.now(),
    })),

  clear: () =>
    set(() => ({
      requestId: Date.now(),
    })),
}));
