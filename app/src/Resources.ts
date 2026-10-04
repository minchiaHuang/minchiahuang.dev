import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Source } from './sources';

export interface ProgressInfo {
  name: string;
  loaded: number;
  toLoad: number;
  progress: number; // loaded / toLoad, counted in files not bytes
}

export type LoadedItem = GLTF | THREE.Texture | AudioBuffer;

export default class Resources {
  items: Record<string, LoadedItem> = {};
  loaded = 0;
  readonly toLoad: number;

  private gltfLoader = new GLTFLoader();
  private textureLoader = new THREE.TextureLoader();
  private audioLoader = new THREE.AudioLoader();

  constructor(
    private sources: Source[],
    private onProgress: (info: ProgressInfo) => void,
    private onError: (name: string, error: unknown) => void,
  ) {
    this.toLoad = sources.length;
  }

  /** Resolves when every file has loaded. A failed file calls onError and the promise never resolves. */
  start(): Promise<void> {
    return new Promise((resolve) => {
      for (const source of this.sources) {
        const done = (file: LoadedItem) => {
          this.items[source.name] = file;
          this.loaded++;
          this.onProgress({
            name: source.name,
            loaded: this.loaded,
            toLoad: this.toLoad,
            progress: this.loaded / this.toLoad,
          });
          if (this.loaded === this.toLoad) resolve();
        };
        const fail = (err: unknown) => this.onError(source.name, err);
        const url = import.meta.env.BASE_URL + source.path;

        if (source.type === 'gltfModel') this.gltfLoader.load(url, done, undefined, fail);
        else if (source.type === 'texture') this.textureLoader.load(url, done, undefined, fail);
        else this.audioLoader.load(url, done, undefined, fail);
      }
    });
  }

  gltf(name: string) { return this.items[name] as GLTF; }
  texture(name: string) { return this.items[name] as THREE.Texture; }
}
