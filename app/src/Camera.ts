import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { QuinticInOut, ExponentialOut, bezier, type EasingFn } from './Easing';
import Tween from './Tween';
import { SHOT } from './shot';
import { DEFAULT_ANCHOR as SCREEN, DEFAULT_SIZE, fitDistance } from './screenGeometry';

export type CameraKey = 'idle' | 'monitor' | 'loading' | 'desk' | 'orbitControlsStart';

interface Keyframe { position: THREE.Vector3; focalPoint: THREE.Vector3 }

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Reduced motion keeps the 3D scene but drops camera movement: transitions jump to their
// keyframe, and the idle drift and desk parallax hold still.
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keyframes for the iMac scene (app units = glTF units x 900). The monitor distance fits the
// glass (ScreenAnchor height, ~710 units) in the 35° field of view with ~15% margin:
// 355 / tan(17.5°) x 1.15 ≈ 1295. The old CRT's 1024 tall screen gave 1870 the same way.
const MONITOR_DISTANCE = fitDistance(DEFAULT_SIZE.h, 35);
const KEYS: Record<CameraKey, Keyframe> = {
  idle: { position: v(-12250, 7350, 12950), focalPoint: v(0, -600, 0) },
  monitor: { position: v(SCREEN.x, SCREEN.y, SCREEN.z + MONITOR_DISTANCE), focalPoint: v(SCREEN.x, SCREEN.y, SCREEN.z) },
  desk: { position: v(0, 1500, 4600), focalPoint: v(0, 350, 0) },
  loading: { position: v(-21000, 22400, 23800), focalPoint: v(0, -3150, 0) },
  // Front-left three-quarter view, close enough to see through the translucent shell.
  orbitControlsStart: { position: v(-4200, 2600, 5200), focalPoint: v(0, 100, 0) },
};

const SMOOTH_OUT = bezier(0.13, 0.99, 0, 1);

// The iMac's screen is ~70% the old CRT's height, so desk -> monitor zooms ~4.7x where the
// reference zoomed ~2.6x. The reference's 2000/1000 ms felt rushed; these keep a similar zoom rate.
const ENTER_MONITOR_MS = 3200;
const LEAVE_MONITOR_MS = 1600;
const CLICK_MS = 1400; // idle <-> desk

/**
 * Five keyframes, tweened between. Every keyframe has its own live `position` / `focalPoint`
 * that update() moves each frame (idle drift, desk parallax, monitor z); transitions tween
 * toward those live vectors.
 */
export default class Camera {
  readonly position = new THREE.Vector3();
  readonly focalPoint = new THREE.Vector3();
  freeCam = false;
  current: CameraKey | undefined = 'loading';
  target: CameraKey | undefined;

  private frames: Record<CameraKey, Keyframe>;
  private tweens: Tween[] = [];
  private controls: OrbitControls;
  private webgl = document.getElementById('webgl')!;
  private mouse = { x: 0, y: 0 };
  private mouseDown = false;
  private leaveWhenReleased = false;
  private lastTime = performance.now();
  private startTime = this.lastTime;

  // Parallax state for the desk keyframe (it chases the mouse, the keyframe copies it).
  private deskOrigin = KEYS.desk.position.clone();
  private deskFoc = KEYS.desk.focalPoint.clone();
  private deskPos = KEYS.desk.position.clone();
  private monitorOrigin = KEYS.monitor.position.clone();
  private idleOrigin = KEYS.idle.position.clone();

  constructor(readonly instance: THREE.PerspectiveCamera, domElement: HTMLElement) {
    // Own copies so the module-level table stays pristine.
    this.frames = Object.fromEntries(
      (Object.keys(KEYS) as CameraKey[]).map((k) => [k, {
        position: KEYS[k].position.clone(), focalPoint: KEYS[k].focalPoint.clone(),
      }]),
    ) as Record<CameraKey, Keyframe>;

    this.controls = new OrbitControls(instance, domElement);
    this.controls.target.copy(this.frames.orbitControlsStart.focalPoint);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minPolarAngle = 0.15; // not straight down
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // never below the floor
    // The walls stand behind and to the right of the scene and are single planes, so their back
    // faces show through from outside: the free camera stays in front and to the left.
    this.controls.minAzimuthAngle = -Math.PI / 2;
    this.controls.maxAzimuthAngle = 0;
    this.controls.minDistance = 4000;
    this.controls.maxDistance = 26000;
    instance.position.copy(this.frames.orbitControlsStart.position);
    this.controls.update();

    // Start on the loading keyframe.
    this.position.copy(this.frames.loading.position);
    this.focalPoint.copy(this.frames.loading.focalPoint);
    this.place();

    document.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', () => this.onMouseUp());

    window.addEventListener('loadingScreenDone', () => this.onLoadingDone());
    window.addEventListener('enterMonitor', () => this.enterMonitor());
    window.addEventListener('leftMonitor', () => this.leaveMonitor());
    window.addEventListener('freeCamToggle', (e) => this.setFreeCam(Boolean((e as CustomEvent).detail)));
  }

  // ---- inputs -------------------------------------------------------------

  private onMouseDown(e: MouseEvent) {
    this.mouseDown = true;
    e.preventDefault();
    if ((e.target as HTMLElement | null)?.closest('#prevent-click')) return;
    const at = (k: CameraKey) => this.current === k || this.target === k;
    if (at('idle')) this.transition('desk', CLICK_MS);
    else if (at('desk')) this.transition('idle', CLICK_MS);
  }

  private onMouseUp() {
    this.mouseDown = false;
    if (this.leaveWhenReleased) {
      this.leaveWhenReleased = false;
      this.leftMonitor();
    }
  }

  private onLoadingDone() {
    // Restart the clock so the idle drift begins at t = 0 after loading.
    this.startTime = performance.now();
    if (SHOT && SHOT !== 'loading' && SHOT !== 'popup') {
      // Shot mode: jump to the state, no tween.
      if (SHOT === 'freecam') this.startFreeCamAt('orbitControlsStart');
      else this.current = SHOT;
      return;
    }
    this.transition('idle', 2500, ExponentialOut);
  }

  /** Shot mode: open the free camera directly on a keyframe, no tween (time is frozen there). */
  private startFreeCamAt(key: CameraKey) {
    this.instance.position.copy(this.frames[key].position);
    this.current = undefined;
    this.freeCam = true;
    this.webgl.style.pointerEvents = 'auto';
    this.controls.update();
  }

  /** Mouse is over the monitor iframe. */
  enterMonitor() {
    this.transition('monitor', ENTER_MONITOR_MS, SMOOTH_OUT);
  }

  /** Mouse left the monitor iframe. A held button delays the exit until it is released. */
  leaveMonitor() {
    if (this.mouseDown) this.leaveWhenReleased = true;
    else this.leftMonitor();
  }

  private leftMonitor() {
    this.transition('desk', LEAVE_MONITOR_MS);
  }

  setFreeCam(on: boolean) {
    if (on) {
      const k = this.frames.orbitControlsStart;
      const arrive = () => {
        this.instance.position.copy(k.position);
        this.controls.update();
        this.freeCam = true;
      };
      this.transition('orbitControlsStart', 750, SMOOTH_OUT, arrive);
      this.webgl.style.pointerEvents = 'auto';
    } else {
      this.freeCam = false;
      this.transition('idle', 4000, ExponentialOut);
      this.webgl.style.pointerEvents = 'none';
    }
  }

  // ---- transitions --------------------------------------------------------

  transition(key: CameraKey, duration = 1000, easing: EasingFn = QuinticInOut, done?: () => void) {
    if (this.current === key) return;
    if (this.target) this.tweens = [];
    if (REDUCED_MOTION) duration = 1; // done on the next frame (a 0 ms tween divides by zero)

    this.current = undefined;
    this.target = key;
    const frame = this.frames[key];
    this.tweens.push(
      new Tween(this.position, frame.position, duration, easing, () => {
        this.current = key;
        this.target = undefined;
        done?.();
      }),
      new Tween(this.focalPoint, frame.focalPoint, duration, easing),
    );
  }

  // ---- per frame ----------------------------------------------------------

  private place() {
    this.instance.position.copy(this.position);
    this.instance.lookAt(this.focalPoint);
  }

  update() {
    const now = performance.now();
    // Shot mode freezes time: t = 0, nothing advances.
    const elapsed = SHOT || REDUCED_MOTION ? 0 : now - this.startTime;
    const delta = SHOT ? 0 : now - this.lastTime;
    this.lastTime = now;

    for (const t of [...this.tweens]) t.update(delta);
    this.tweens = this.tweens.filter((t) => !t.done);

    if (this.freeCam) {
      this.position.copy(this.instance.position);
      this.focalPoint.copy(this.controls.target);
      this.controls.update();
      return;
    }

    this.updateFrames(elapsed);

    if (this.current) {
      const frame = this.frames[this.current];
      this.position.copy(frame.position);
      this.focalPoint.copy(frame.focalPoint);
    }
    this.place();
  }

  private updateFrames(elapsed: number) {
    const w = window.innerWidth, h = window.innerHeight;
    const ratio = h / w;

    // idle: sine drift around the keyframe
    const idle = this.frames.idle.position;
    idle.x = Math.sin((elapsed + 19000) * 0.00008) * this.idleOrigin.x;
    idle.y = Math.sin((elapsed + 1000) * 0.000004) * 2800 + this.idleOrigin.y - 2100;

    // monitor: pull back on tall windows, push in on desktop. Fractions of the fit distance, so
    // the old CRT's +1200 / -600 at 1870 keep their proportions for the smaller screen.
    this.frames.monitor.position.z =
      this.monitorOrigin.z + (ratio * 0.64 - (w < 768 ? 0 : 0.32)) * MONITOR_DISTANCE;

    // desk: chase the mouse; shot mode and reduced motion sit exactly on the keyframe
    if (SHOT || REDUCED_MOTION) {
      this.deskFoc.copy(KEYS.desk.focalPoint);
      this.deskPos.copy(KEYS.desk.position);
    } else {
      this.deskFoc.x += (this.mouse.x - w / 2 - this.deskFoc.x) * 0.05;
      this.deskFoc.y += (-(this.mouse.y - h) - this.deskFoc.y) * 0.05;
      this.deskPos.x += (this.mouse.x - w / 2 - this.deskPos.x) * 0.025;
      this.deskPos.y += (-(this.mouse.y - h * 2) - this.deskPos.y) * 0.025;
    }
    this.deskPos.z = this.deskOrigin.z + ratio * 3000 - 1800;
    this.frames.desk.focalPoint.copy(this.deskFoc);
    this.frames.desk.position.copy(this.deskPos);
  }
}
