import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * The translucent Bondi shell (blender/out/v2/shell.glb), the one object that is not baked: a
 * lightmap can't show what is behind it, so it gets a live material and the scene's only lights.
 * The baked models use MeshBasicMaterial, so these lights touch nothing else.
 */
export default class ShellModel {
  readonly object = new THREE.Group();

  constructor(gltf: GLTF, scale = 1) {
    // Scale the root, not each mesh: meshopt-compressed meshes carry their own node transforms.
    gltf.scene.scale.setScalar(scale);
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      // Start from the glTF values (Bondi #0095B6, alpha 0.72, roughness 0.14, clearcoat).
      const src = child.material as THREE.MeshStandardMaterial;
      const coat = src instanceof THREE.MeshPhysicalMaterial ? src : undefined;
      child.material = new THREE.MeshPhysicalMaterial({
        color: src.color,
        opacity: src.opacity,
        roughness: src.roughness,
        metalness: 0,
        clearcoat: coat?.clearcoat ?? 1,
        clearcoatRoughness: coat?.clearcoatRoughness ?? 0.04,
        transparent: true,
        // No depth write: the opaque chassis and the screen occluder behind it must still draw.
        // Front faces only, so the one unsorted mesh can't show its own inside on top of itself.
        depthWrite: false,
        side: THREE.FrontSide,
      });
      // After the opaque bake and the screen occluder: where the occluder is nearer, depth hides
      // the shell; where the shell is nearer, it tints the iframe through the cleared canvas.
      child.renderOrder = 1;
    });
    this.object.add(gltf.scene);

    // Sky/floor fill plus a warm key from the pendant lamp above the table (as in blender/preview).
    this.object.add(new THREE.HemisphereLight(0xdde6ff, 0x202428, 1.5));
    const key = new THREE.DirectionalLight(0xffe2c0, 2);
    key.position.set(0, 3, 0.5).multiplyScalar(scale);
    this.object.add(key);
  }
}
