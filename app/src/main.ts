import './style.css';
import * as THREE from 'three';
import sources from './sources';
import Resources from './Resources';
import Renderers, { hasWebGL } from './Renderers';
import LoadingScreen from './LoadingScreen';
import BakedModel from './BakedModel';
import Camera from './Camera';
import MonitorScreen from './MonitorScreen';
import AudioManager from './AudioManager';
import CoffeeSteam from './CoffeeSteam';
import HelpPrompt from './HelpPrompt';
import InfoOverlay from './InfoOverlay';
import EntryButtons, { openInOS } from './EntryButtons';
import { SHOT } from './shot';
import { shouldUseFlatOS, readFlatEnv, goFlat } from './flatMode';

const BAKED_SCALE = 900;

const ui = document.getElementById('ui')!;
const uiInteractive = document.getElementById('ui-interactive')!;

function onStart() {
  // The loading overlay no longer needs to catch clicks; Camera flies to idle on this event.
  ui.style.pointerEvents = 'none';
  window.dispatchEvent(new CustomEvent('loadingScreenDone'));
}

function start3D() {
  const loadingScreen = new LoadingScreen(ui, onStart);

  /** Shot mode: no real loading. Feed the BIOS the same events a real load would send. */
  function fakeProgress(loaded: number) {
    const toLoad = sources.length;
    for (let i = 1; i <= loaded; i++) {
      const progress = i / toLoad;
      loadingScreen.onProgress({ name: sources[i - 1].name, loaded: i, toLoad, progress });
    }
  }

  const renderers = new Renderers();
  const camera = new Camera(renderers.camera, renderers.gl.domElement);
  let monitor: MonitorScreen | undefined;
  let steam: CoffeeSteam | undefined;
  let audio: AudioManager | undefined;
  const playTick = () => audio?.typeTick();

  // The prompt, the info card and the entry buttons mount once the BIOS is done. In shot mode only idle shows the prompt.
  window.addEventListener('loadingScreenDone', () => {
    if (!SHOT || SHOT === 'idle') new HelpPrompt(ui, playTick);
    new InfoOverlay(uiInteractive, playTick);
    new EntryButtons(uiInteractive, (target) => {
      // Same event as hovering the monitor: Camera zooms in, and the prompt and info card react.
      window.dispatchEvent(new CustomEvent('enterMonitor'));
      openInOS(target);
    });
  });

  if (SHOT === 'loading') {
    fakeProgress(9);
  } else if (SHOT === 'popup') {
    fakeProgress(sources.length);
  } else {
    // Shot mode plays no sound, and decoding the two long mp3s in headless Chrome is slow and flaky.
    const toLoad = SHOT ? sources.filter((s) => s.type !== 'audio') : sources;
    const resources = new Resources(
      toLoad,
      (info) => loadingScreen.onProgress(info),
      (name, err) => {
        console.error('load failed', name, err);
        // A missing model leaves nothing to show: fall back to the OS. A missing sound or texture is not fatal.
        if (sources.find((s) => s.name === name)?.type === 'gltfModel') goFlat();
        else loadingScreen.onError(name);
      },
    );
    resources.start().then(() => {
      const models: [string, string][] = [
        ['computerSetupModel', 'computerSetupTexture'],
        ['environmentModel', 'environmentTexture'],
        ['decorModel', 'decorTexture'],
      ];
      for (const [model, texture] of models) {
        renderers.scene.add(new BakedModel(resources.gltf(model), resources.texture(texture), BAKED_SCALE).object);
      }
      const computer = resources.gltf('computerSetupModel').scene;
      computer.updateMatrixWorld(true);
      const anchor = computer.getObjectByName('ScreenAnchor');
      const placement = anchor
        ? { position: anchor.getWorldPosition(new THREE.Vector3()), quaternion: anchor.getWorldQuaternion(new THREE.Quaternion()) }
        : undefined;
      if (!anchor) console.warn('ScreenAnchor missing: using the built-in screen position');
      monitor = new MonitorScreen(
        renderers.scene, renderers.cssScene, renderers.camera,
        resources.texture('monitorSmudgeTexture'), resources.texture('monitorShadowTexture'),
        placement,
      );
      steam = new CoffeeSteam(renderers.scene);
      if (!SHOT) {
        const buffers: Record<string, AudioBuffer> = {};
        for (const s of sources) if (s.type === 'audio') buffers[s.name] = resources.items[s.name] as AudioBuffer;
        audio = new AudioManager(renderers.scene, renderers.camera, buffers);
      }
      if (SHOT) {
        // Shot states skip the BIOS and go straight to the keyframe.
        loadingScreen.hide();
        window.dispatchEvent(new CustomEvent('loadingScreenDone'));
      }
    });
  }

  const t0 = performance.now();
  const tick = () => {
    camera.update();
    monitor?.update();
    audio?.update();
    const elapsed = performance.now() - t0;
    steam?.update(elapsed);
    renderers.render(elapsed);
    requestAnimationFrame(tick);
  };
  tick();
}

// Phones, no WebGL, reduced motion: straight to the OS, before any 3D file is requested.
// Shot mode always renders the scene (screenshots are taken at desktop size).
if (!SHOT && shouldUseFlatOS(readFlatEnv(hasWebGL))) {
  goFlat();
} else {
  start3D();
}
