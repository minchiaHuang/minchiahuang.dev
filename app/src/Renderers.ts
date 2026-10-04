import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

/** The two stacked renderers: WebGL (scene) and CSS3D (iframe). */
export default class Renderers {
  readonly scene = new THREE.Scene();
  readonly cssScene = new THREE.Scene();
  // Near 300 (~33 cm), not 10: depth precision scales with near, and at 10 the far keyframes
  // could not resolve layers 0.5 mm apart (can labels), which z-fought as black stripes. The
  // closest view (monitor) still keeps every surface 1,300+ units away.
  readonly camera = new THREE.PerspectiveCamera(
    35, window.innerWidth / window.innerHeight, 300, 900000,
  );

  readonly gl: THREE.WebGLRenderer;
  readonly css = new CSS3DRenderer();

  constructor() {
    this.gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.gl.setClearColor(0x000000, 0);
    this.place(this.gl.domElement);
    document.getElementById('webgl')!.appendChild(this.gl.domElement);

    this.place(this.css.domElement);
    document.getElementById('css')!.appendChild(this.css.domElement);

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
    this.gl.setPixelRatio(ratio);
    this.gl.setSize(w, h);
    this.css.setSize(w, h);
  }

  render() {
    this.gl.render(this.scene, this.camera);
    this.css.render(this.cssScene, this.camera);
  }
}

export function hasWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
  return ctx !== null;
}
