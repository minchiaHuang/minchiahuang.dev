import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SHOT } from './shot';

const noiseVert = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// White-noise hash per pixel; u_time is the only moving input and is 0 in shot mode.
const noiseFrag = /* glsl */ `
uniform float u_time;
float hash(vec2 p, float seed) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed * 37.719) * 43758.5453);
}
void main() {
  vec2 p = gl_FragCoord.xy;
  gl_FragColor = vec4(hash(p, u_time + 1.0), hash(p, u_time + 2.0), hash(p, u_time + 3.0), 1.0);
}
`;

/** The three stacked renderers: WebGL (scene), CSS3D (iframe later), noise overlay. */
export default class Renderers {
  readonly scene = new THREE.Scene();
  readonly cssScene = new THREE.Scene();
  readonly overlayScene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(
    35, window.innerWidth / window.innerHeight, 10, 900000,
  );

  readonly gl: THREE.WebGLRenderer;
  readonly css = new CSS3DRenderer();
  readonly overlay: THREE.WebGLRenderer;
  private noiseUniforms = { u_time: { value: 0 } };

  constructor() {
    this.gl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.gl.setClearColor(0x000000, 0);
    this.place(this.gl.domElement);
    document.getElementById('webgl')!.appendChild(this.gl.domElement);

    this.overlay = new THREE.WebGLRenderer();
    this.place(this.overlay.domElement);
    Object.assign(this.overlay.domElement.style, {
      mixBlendMode: 'soft-light', opacity: '0.12', pointerEvents: 'none',
    });
    document.getElementById('overlay')!.appendChild(this.overlay.domElement);

    this.place(this.css.domElement);
    document.getElementById('css')!.appendChild(this.css.domElement);

    // Full-screen quad in clip space, so it needs no camera movement.
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: noiseVert,
        fragmentShader: noiseFrag,
        uniforms: this.noiseUniforms,
        depthTest: false,
        depthWrite: false,
      }),
    );
    quad.frustumCulled = false;
    this.overlayScene.add(quad);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private place(el: HTMLElement) {
    el.style.position = 'absolute';
    el.style.top = '0px';
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const r of [this.gl, this.overlay]) {
      r.setPixelRatio(ratio);
      r.setSize(w, h);
    }
    this.css.setSize(w, h);
  }

  render(elapsedMs: number) {
    this.noiseUniforms.u_time.value = SHOT ? 0 : Math.sin(elapsedMs * 0.01);
    this.gl.render(this.scene, this.camera);
    this.css.render(this.cssScene, this.camera);
    this.overlay.render(this.overlayScene, this.camera);
  }
}

export function hasWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
  return ctx !== null;
}
