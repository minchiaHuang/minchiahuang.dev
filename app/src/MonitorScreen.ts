import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SHOT } from './shot';

// docs/spec/contract.md section 1.
const SCREEN = { w: 1280, h: 1024 };
const PADDING = 32;
// The reference scales pointer coordinates by rect / (screen - padding), i.e. 1248 x 992.
const CONTENT = { w: SCREEN.w - PADDING, h: SCREEN.h - PADDING };

const POSITION = new THREE.Vector3(0, 950, 255);
const ROTATION = new THREE.Euler(-3 * THREE.MathUtils.DEG2RAD, 0, 0);

const LAYER_DEPTH_SCALE = 4;
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
 * so the room can hide it, glass layers in front of it, a side box, and a distance/angle dimmer.
 */
export default class MonitorScreen {
  private iframe!: HTMLIFrameElement;
  private dimmer!: THREE.Mesh;
  private videoTextures: THREE.VideoTexture[] = [];
  private inComputer = false;
  private prevInComputer = false;

  constructor(
    private scene: THREE.Scene,
    private cssScene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    smudge: THREE.Texture,
    shadow: THREE.Texture,
  ) {
    this.bindPointer();
    this.createIframe();
    const maxOffset = this.createLayers(smudge, shadow);
    this.createSides(maxOffset);
    this.createDimmer(maxOffset);
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
      const { top, left, width, height } = this.iframe.getBoundingClientRect();
      evt.clientX = Math.round(msg.clientX * (width / CONTENT.w) + left);
      evt.clientY = Math.round(msg.clientY * (height / CONTENT.h) + top);
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
    object.position.copy(POSITION);
    object.rotation.copy(ROTATION);
    this.cssScene.add(object);

    // Occluder: alpha 0 + NoBlending overwrites the canvas pixels with transparent ones where the
    // plane is the nearest surface, so the CSS layer underneath shows through, and the room hides it
    // anywhere something is in front.
    const material = new THREE.MeshLambertMaterial();
    material.side = THREE.DoubleSide;
    material.opacity = 0;
    material.transparent = true;
    material.blending = THREE.NoBlending;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), material);
    plane.position.copy(object.position);
    plane.rotation.copy(object.rotation);
    this.scene.add(plane);
  }

  // ---- glass layers ------------------------------------------------------

  private video(file: string): THREE.VideoTexture {
    const video = document.createElement('video');
    video.muted = true;
    video.loop = !SHOT;
    video.autoplay = !SHOT;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = import.meta.env.BASE_URL + 'textures/monitor/video/' + file;
    video.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
    document.body.appendChild(video);
    if (SHOT) {
      // Deterministic: stay on frame 0, however the browser tries to start playback.
      const freeze = () => { video.pause(); video.currentTime = 0; };
      freeze();
      video.addEventListener('loadeddata', freeze);
      video.addEventListener('play', freeze);
    }
    // The reference leaves video textures untagged (linear), so its sRGB output stage brightens them.
    return new THREE.VideoTexture(video);
  }

  private createLayers(smudge: THREE.Texture, shadow: THREE.Texture): number {
    smudge.colorSpace = THREE.SRGBColorSpace;
    shadow.colorSpace = THREE.SRGBColorSpace;
    this.videoTextures = [this.video('base-static.mp4'), this.video('static-texture-layer.mp4')];

    // Same order as the reference (this decides draw order among equal depths).
    const layers = [
      { texture: smudge, blending: THREE.AdditiveBlending, opacity: 0.12, offset: 24 },
      { texture: shadow, blending: THREE.NormalBlending, opacity: 1, offset: 5 },
      { texture: this.videoTextures[0], blending: THREE.AdditiveBlending, opacity: 0.5, offset: 10 },
      { texture: this.videoTextures[1], blending: THREE.AdditiveBlending, opacity: 0.1, offset: 15 },
    ];

    let maxOffset = -1;
    for (const layer of layers) {
      const offset = layer.offset * LAYER_DEPTH_SCALE;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
        new THREE.MeshBasicMaterial({
          map: layer.texture, blending: layer.blending, side: THREE.DoubleSide,
          opacity: layer.opacity, transparent: true,
        }),
      );
      mesh.position.copy(POSITION).add(new THREE.Vector3(0, 0, offset));
      mesh.rotation.copy(ROTATION);
      this.scene.add(mesh);
      maxOffset = Math.max(maxOffset, offset);
    }
    return maxOffset;
  }

  /** Four panels that close the gap between the screen and the outermost layer. */
  private createSides(maxOffset: number) {
    const d = (x: number, y: number) => new THREE.Vector3(x, y, maxOffset / 2);
    const quarter = Math.PI / 2;
    const sides = [
      { size: [maxOffset, SCREEN.h], at: d(-SCREEN.w / 2, 0), rot: new THREE.Euler(0, quarter, 0) },
      { size: [maxOffset, SCREEN.h], at: d(SCREEN.w / 2, 0), rot: new THREE.Euler(0, quarter, 0) },
      { size: [SCREEN.w, maxOffset], at: d(0, SCREEN.h / 2), rot: new THREE.Euler(quarter, 0, 0) },
      { size: [SCREEN.w, maxOffset], at: d(0, -SCREEN.h / 2), rot: new THREE.Euler(quarter, 0, 0) },
    ];
    for (const s of sides) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(s.size[0], s.size[1]),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x48493f }),
      );
      mesh.position.copy(POSITION).add(s.at);
      mesh.rotation.copy(s.rot);
      this.scene.add(mesh);
    }
  }

  private createDimmer(maxOffset: number) {
    this.dimmer = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending,
      }),
    );
    this.dimmer.position.copy(POSITION).add(new THREE.Vector3(0, 0, maxOffset - 5));
    this.dimmer.rotation.copy(ROTATION);
    this.scene.add(this.dimmer);
  }

  // ---- per frame ---------------------------------------------------------

  /** Dimmer: darker the farther the camera is and the more it looks at the screen from the side. */
  update() {
    const view = this.camera.position.clone().sub(POSITION).normalize();
    const dot = view.dot(new THREE.Vector3(0, 0, 1));
    const distance = this.camera.position.distanceTo(this.dimmer.position);
    const near = 1 / (distance / 10000);
    (this.dimmer.material as THREE.MeshBasicMaterial).opacity =
      (1 - near) * DIM_FACTOR + (1 - dot) * DIM_FACTOR;

    // A paused video never reports a new frame, so push frame 0 to the GPU ourselves.
    if (SHOT) for (const t of this.videoTextures) t.needsUpdate = true;
  }
}
