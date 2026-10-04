import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SCREEN_PX as SCREEN, DEFAULT_ANCHOR, DEFAULT_SIZE } from './screenGeometry';

// No inset: the ScreenAnchor size is exactly the visible glass, and the OS is laid out for the
// full 1024x768. (The old CRT used 32 px to keep content off its curved edge.)
const PADDING = 0;

const DEFAULT_POSITION = new THREE.Vector3(DEFAULT_ANCHOR.x, DEFAULT_ANCHOR.y, DEFAULT_ANCHOR.z);
const DEFAULT_ROTATION = new THREE.Euler(0, 0, 0);

const DIM_FACTOR = 0.7;

type OsMessage =
  | { type: 'mousemove'; clientX: number; clientY: number }
  | { type: 'mousedown' }
  | { type: 'mouseup' }
  | { type: 'keydown'; key: string }
  | { type: 'keyup'; key: string };

type InComputerEvent = Event & { inComputer?: boolean; clientX?: number; clientY?: number; key?: string };

/**
 * The monitor: a real iframe placed in 3D with CSS3D, a GL plane that punches a hole in the canvas
 * so the room can hide it, and a distance/angle dimmer.
 */
export default class MonitorScreen {
  private position: THREE.Vector3;
  private rotation: THREE.Euler;
  // Screen-local +z (the glass normal) in world space; layers are offset along it, not along world z.
  private quaternion: THREE.Quaternion;
  private normal: THREE.Vector3;
  // Visible glass in app units. The iframe is SCREEN css px, scaled down to this.
  private size: { w: number; h: number };
  private iframe!: HTMLIFrameElement;
  private dimmer!: THREE.Mesh;
  private inComputer = false;
  private prevInComputer = false;

  constructor(
    private scene: THREE.Scene,
    private cssScene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    placement?: { position: THREE.Vector3; quaternion: THREE.Quaternion; size?: { w: number; h: number } },
  ) {
    // The bake exports a ScreenAnchor node; the constants only apply when it is missing.
    this.position = placement?.position ?? DEFAULT_POSITION.clone();
    this.size = placement?.size ?? { ...DEFAULT_SIZE };
    this.rotation = placement ? new THREE.Euler().setFromQuaternion(placement.quaternion) : DEFAULT_ROTATION.clone();
    this.quaternion = new THREE.Quaternion().setFromEuler(this.rotation);
    this.normal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    if (import.meta.env.DEV) console.log(`screen at ${this.position.x},${this.position.y},${this.position.z}`);
    this.bindPointer();
    this.createIframe();
    this.createDimmer();
  }

  // ---- pointer and OS messages -------------------------------------------

  /**
   * Over the iframe the parent page gets no mouse events, so the OS forwards them by postMessage
   * (re-dispatched below as bubbling events flagged inComputer). Entering or leaving the screen is
   * derived from that flag. Camera holds a leave back while a button is down.
   */
  private bindPointer() {
    document.addEventListener('mousemove', (e) => {
      const ev = e as InComputerEvent;
      if ((e.target as HTMLElement | null)?.id === 'computer-screen') ev.inComputer = true;
      this.inComputer = Boolean(ev.inComputer);
      if (this.inComputer && !this.prevInComputer) window.dispatchEvent(new CustomEvent('enterMonitor'));
      if (!this.inComputer && this.prevInComputer) window.dispatchEvent(new CustomEvent('leftMonitor'));
      this.prevInComputer = this.inComputer;
    });
  }

  private forward(msg: OsMessage) {
    const evt: InComputerEvent = new CustomEvent(msg.type, { bubbles: true, cancelable: false });
    evt.inComputer = true;
    if (msg.type === 'mousemove') {
      // The rect is the projected iframe (CSS3D scale and perspective included); approximate off-axis.
      const { top, left, width, height } = this.iframe.getBoundingClientRect();
      evt.clientX = Math.round((msg.clientX + PADDING) * (width / SCREEN.w) + left);
      evt.clientY = Math.round((msg.clientY + PADDING) * (height / SCREEN.h) + top);
    } else if (msg.type === 'keydown' || msg.type === 'keyup') {
      evt.key = msg.key;
    }
    this.iframe.dispatchEvent(evt);
  }

  // ---- iframe and occluder -----------------------------------------------

  private createIframe() {
    const container = document.createElement('div');
    container.style.cssText = `width:${SCREEN.w}px;height:${SCREEN.h}px;opacity:1;background:#1d2e2f`;

    const iframe = document.createElement('iframe');
    iframe.src = import.meta.env.BASE_URL + 'os/index.html';
    iframe.id = 'computer-screen';
    iframe.className = 'jitter';
    iframe.title = 'Computer screen';
    iframe.style.cssText =
      `width:${SCREEN.w}px;height:${SCREEN.h}px;padding:${PADDING}px;box-sizing:border-box;opacity:1;border:0`;
    container.appendChild(iframe);
    this.iframe = iframe;

    window.addEventListener('message', (e) => {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data as OsMessage | undefined;
      if (!data || typeof data.type !== 'string') return;
      if (['mousemove', 'mousedown', 'mouseup', 'keydown', 'keyup'].includes(data.type)) this.forward(data);
    });

    const object = new CSS3DObject(container);
    object.position.copy(this.position);
    object.rotation.copy(this.rotation);
    // One CSS px is one app unit at scale 1; shrink the 1024x768 iframe onto the glass.
    object.scale.set(this.size.w / SCREEN.w, this.size.h / SCREEN.h, 1);
    this.cssScene.add(object);

    // Occluder: alpha 0 + NoBlending overwrites the canvas pixels with transparent ones where the
    // plane is the nearest surface, so the CSS layer underneath shows through, and the room hides it
    // anywhere something is in front. Unlit black: the canvas is premultiplied, so a lit colour
    // (the shell's lights reach any lit material) with alpha 0 would add a grey wash over the OS.
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    material.side = THREE.DoubleSide;
    material.opacity = 0;
    material.transparent = true;
    material.blending = THREE.NoBlending;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.size.w, this.size.h), material);
    // The baked GLB has its own opaque Screen mesh on this exact plane; coplanar, the two z-fight per
    // triangle and half the quad (the diagonal) stays opaque. One unit (~1 mm) in front wins cleanly.
    plane.position.copy(object.position).add(this.toWorld(new THREE.Vector3(0, 0, 1)));
    plane.rotation.copy(object.rotation);
    this.scene.add(plane);
  }

  /** A screen-local offset as a world-space vector. */
  private toWorld(local: THREE.Vector3): THREE.Vector3 {
    return local.clone().applyQuaternion(this.quaternion);
  }

  // ---- dimmer ------------------------------------------------------------

  // The glass layers (CRT noise, edge shadow, smudges) and the side panels that boxed them in were
  // dropped: on the Aqua OS they read as a dark filter over the screen.
  private createDimmer() {
    this.dimmer = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size.w, this.size.h),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending,
      }),
    );
    this.dimmer.position.copy(this.position).add(this.toWorld(new THREE.Vector3(0, 0, 1)));
    this.dimmer.rotation.copy(this.rotation);
    this.scene.add(this.dimmer);
  }

  // ---- per frame ---------------------------------------------------------

  /** Dimmer: darker the farther the camera is and the more it looks at the screen from the side. */
  update() {
    const view = this.camera.position.clone().sub(this.position).normalize();
    const dot = view.dot(this.normal);
    const distance = this.camera.position.distanceTo(this.dimmer.position);
    const near = 1 / (distance / 10000);
    (this.dimmer.material as THREE.MeshBasicMaterial).opacity =
      (1 - near) * DIM_FACTOR + (1 - dot) * DIM_FACTOR;
  }
}
