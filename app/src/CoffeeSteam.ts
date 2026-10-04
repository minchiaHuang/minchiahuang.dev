import * as THREE from 'three';
import { SHOT } from './shot';

// Classic 2D Perlin noise (Stefan Gustavson / Ashima, MIT), shared by both shaders.
const perlin = /* glsl */ `
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float perlin2d(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 *
      vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}
`;

// Wobble: the top of the plane sways, more the higher the vertex.
const vertex = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
${perlin}
void main() {
  vec3 p = position;
  vec2 displacementUv = uv * 5.0;
  displacementUv.y -= uTime * 0.0002;
  float strength = pow(uv.y * 3.0, 2.0);
  p.y += perlin2d(displacementUv) * strength * 0.1;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
  vUv = uv;
}
`;

// Smoke: noise scrolls down the plane so the pattern drifts up; edges and top fade out.
const fragment = /* glsl */ `
uniform float uTime;
uniform float uTimeFrequency;
uniform vec2 uUvFrequency;
uniform vec3 uColor;
varying vec2 vUv;
${perlin}
void main() {
  vec2 uv = vUv * uUvFrequency;
  uv.y -= uTime * uTimeFrequency;
  float border = min(vUv.x * 4.0, (1.0 - vUv.x) * 4.0) * (1.0 - vUv.y);
  float alpha = min(perlin2d(uv) * border * 0.6, 1.0);
  gl_FragColor = vec4(uColor, alpha);
}
`;

/** Steam above the mug: one 280x700 plane with a scrolling noise shader (not particles). */
export default class CoffeeSteam {
  private material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    // The shader writes straight to the screen, so the colour must stay as the raw #c9c9c9 bytes.
    const gray = 0xc9 / 255;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uTimeFrequency: { value: 0.001 },
        uUvFrequency: { value: new THREE.Vector2(3, 5) },
        uColor: { value: new THREE.Color().setRGB(gray, gray, gray, THREE.LinearSRGBColorSpace) },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(280, 700), this.material);
    // Mug top at glTF ≈ (1.52, -0.14, 1.06), i.e. app (1370, -125, 960); the plane's foot sits just inside it.
    mesh.position.set(1370, 200, 960);
    scene.add(mesh);
  }

  /** `elapsedMs` since start; shot mode keeps the shader at t = 0. */
  update(elapsedMs: number) {
    this.material.uniforms.uTime.value = SHOT ? 0 : elapsedMs;
  }
}
