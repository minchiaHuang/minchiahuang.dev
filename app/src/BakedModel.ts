import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * A model whose lighting is already baked into one texture, so it only needs an unlit
 * material. flipY must be false because glTF UVs start at the top-left.
 */
export default class BakedModel {
  readonly material: THREE.MeshBasicMaterial;

  constructor(private gltf: GLTF, texture: THREE.Texture, scale = 1) {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshBasicMaterial({ map: texture });

    // Scale the root, not each mesh: meshopt-compressed meshes carry their own node transforms.
    gltf.scene.scale.setScalar(scale);
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) child.material = this.material;
    });
  }

  get object(): THREE.Group {
    return this.gltf.scene;
  }
}
