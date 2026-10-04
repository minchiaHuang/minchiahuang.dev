import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SHOT } from './shot';

// Monitor size in CSS pixels.
const SCREEN = { w: 1280, h: 1024 };
const PADDING = 32;
// Pointer coordinates are scaled by rect / (screen - padding), i.e. 1248 x 992.
const CONTENT = { w: SCREEN.w - PADDING, h: SCREEN.h - PADDING };

const DEFAULT_POSITION = new THREE.Vector3(0, 950, 255);
const DEFAULT_ROTATION = new THREE.Euler(-3 * THREE.MathUtils.DEG2RAD, 0, 0);

const LAYER_DEPTH_SCALE = 4;
const DIM_FACTOR = 0.7;

type OsMessage =
  | { type: 'mousemove'; clientX: number; clientY: number }
  | { type: 'mousedown' }
  | { type: 'mouseup' }
  | { type: 'keydown'; key: string }
  | { type: 'keyup'; key: string };

type InComputerEvent = Event & { inComputer?: boolean; clientX?: number; clientY?: number; key?: string };

// CRT noise and scanlines, drawn by a shader, so no clip has to be downloaded or looped.
const NOISE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const NOISE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    // 320x256 grain cells that change 24 times a second
    vec2 cell = floor(vUv * vec2(320.0, 256.0));
    float grain = hash(cell + floor(uTime * 24.0));
    // 256 scanlines with a slow roll
    float scan = 0.5 + 0.5 * sin((vUv.y + uTime * 0.02) * 256.0 * 6.2831853);
    float v = grain * 0.6 + scan * 0.4;
    gl_FragColor = vec4(vec3(v), uOpacity);
  }
`;

/**
 * The monitor: a real iframe placed in 3D with CSS3D, a GL plane that punches a hole in the canvas
 * so the room can hide it, glass layers in front of it, a side box, and a distance/angle dimmer.
 */
export default class MonitorScreen {
  private position: THREE.Vector3;
  private rotation: THREE.Euler;
  // Screen-local +z (the glass normal) in world space; layers are offset along it, not along world z.
  private quaternion: THREE.Quaternion;
  private normal: THREE.Vector3;
  private iframe!: HTMLIFrameElement;
  private dimmer!: THREE.Mesh;
  private noise!: THREE.ShaderMaterial;
  private inComputer = false;
  private prevInComputer = false;

  constructor(
    private scene: THREE.Scene,
    private cssScene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    smudge: THREE.Texture,
    shadow: THREE.Texture,
    placement?: { position: THREE.Vector3; quaternion: THREE.Quaternion },
  ) {
    // The bake exports a ScreenAnchor node; the constants only apply when it is missing.
    this.position = placement?.position ?? DEFAULT_POSITION.clone();
    this.rotation = placement ? new THREE.Euler().setFromQuaternion(placement.quaternion) : DEFAULT_ROTATION.clone();
    this.quaternion = new THREE.Quaternion().setFromEuler(this.rotation);
    this.normal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    if (import.meta.env.DEV) console.log(`screen at ${this.position.x},${this.position.y},${this.position.z}`);
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
    object.position.copy(this.position);
    object.rotation.copy(this.rotation);
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

  // ---- glass layers ------------------------------------------------------

  private createLayers(smudge: THREE.Texture, shadow: THREE.Texture): number {
    smudge.colorSpace = THREE.SRGBColorSpace;
    shadow.colorSpace = THREE.SRGBColorSpace;
    this.noise = new THREE.ShaderMaterial({
      vertexShader: NOISE_VERTEX, fragmentShader: NOISE_FRAGMENT,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.18 } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });

    // Layer order decides draw order among equal depths.
    type Layer = {
      texture?: THREE.Texture; material?: THREE.Material; blending?: THREE.Blending; opacity?: number; offset: number;
    };
    const layers: Layer[] = [
      { texture: smudge, blending: THREE.AdditiveBlending, opacity: 0.12, offset: 24 },
      { texture: shadow, blending: THREE.NormalBlending, opacity: 1, offset: 5 },
      { material: this.noise, offset: 10 },
    ];

    let maxOffset = -1;
    for (const layer of layers) {
      const offset = layer.offset * LAYER_DEPTH_SCALE;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
        layer.material ?? new THREE.MeshBasicMaterial({
          map: layer.texture, blending: layer.blending, side: THREE.DoubleSide,
          opacity: layer.opacity, transparent: true,
        }),
      );
      mesh.position.copy(this.position).add(this.toWorld(new THREE.Vector3(0, 0, offset)));
      mesh.rotation.copy(this.rotation);
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
      mesh.position.copy(this.position).add(this.toWorld(s.at));
      mesh.quaternion.copy(this.quaternion).multiply(new THREE.Quaternion().setFromEuler(s.rot));
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
    this.dimmer.position.copy(this.position).add(this.toWorld(new THREE.Vector3(0, 0, maxOffset - 5)));
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

    // Shot mode freezes the noise so screenshots are repeatable.
    this.noise.uniforms.uTime.value = SHOT ? 0 : performance.now() / 1000;
  }
}
