import * as THREE from 'three';
import type { EasingFn } from './Easing';

/**
 * Moves one Vector3 toward another over time. The end vector is read every frame, so a target
 * that keeps moving (idle drift, monitor z, desk parallax) is followed, like the reference.
 */
export default class Tween {
  private start = new THREE.Vector3();
  private elapsed = 0;
  done = false;

  constructor(
    private object: THREE.Vector3,
    private end: THREE.Vector3,
    private duration: number,
    private easing: EasingFn,
    private onComplete?: () => void,
  ) {
    this.start.copy(object);
  }

  update(deltaMs: number) {
    if (this.done) return;
    this.elapsed += deltaMs;
    const k = Math.min(this.elapsed / this.duration, 1);
    this.object.lerpVectors(this.start, this.end, this.easing(k));
    if (k === 1) {
      this.done = true;
      this.onComplete?.();
    }
  }
}
