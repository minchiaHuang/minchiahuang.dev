import * as THREE from 'three';

const REF_DISTANCE = 10000;
const MOUSE_AT = new THREE.Vector3(800, -300, 1200);
const KEYBOARD_AT = new THREE.Vector3(-300, -400, 1200);

type InComputerEvent = Event & { inComputer?: boolean; key?: string };

interface PlayOptions {
  volume?: number;
  loop?: boolean;
  /** Lowpass cutoff in Hz. */
  lowpass?: number;
  /** World position of an invisible emitter; without it the sound is plain stereo. */
  position?: THREE.Vector3;
  /** Fixed pitch shift in cents. */
  detune?: number;
}

type Sound = THREE.Audio<GainNode | PannerNode>;

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
const mapRange = (x: number, a: number, b: number, c: number, d: number) => c + ((d - c) / (b - a)) * (x - a);

/**
 * All sound. The listener rides on the camera, so positional sounds (mouse, keys) get quieter and
 * pan as the camera moves, and the office hum is muffled by a lowpass that opens as the camera nears.
 */
export default class AudioManager {
  private listener = new THREE.AudioListener();
  private emitterGeometry = new THREE.SphereGeometry(100, 8, 8);
  private emitterMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  private office?: Sound;
  private lastKey = '';

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private buffers: Record<string, AudioBuffer>,
  ) {
    camera.add(this.listener);
    this.bindComputer();

    window.addEventListener('loadingScreenDone', () => {
      // The START click is the user gesture that lets the context run.
      this.resume();
      setTimeout(() => this.resume(), 100);
      this.office = this.play('office', { volume: 1, loop: true, lowpass: 1000 });
      this.play('startup', { volume: 0.4 });
    });
    window.addEventListener('muteToggle', (e) => {
      this.listener.setMasterVolume((e as CustomEvent).detail ? 0 : 1);
    });
  }

  private resume() {
    const ctx = this.listener.context;
    if (ctx.state === 'suspended') void ctx.resume();
  }

  /** Mouse and key sounds come from the OS iframe (events flagged inComputer by MonitorScreen). */
  private bindComputer() {
    const inComputer = (e: Event) => (e as InComputerEvent).inComputer === true;
    document.addEventListener('mousedown', (e) => {
      if (inComputer(e)) this.play('mouseDown', { volume: 0.8, position: MOUSE_AT });
    });
    document.addEventListener('mouseup', (e) => {
      if (inComputer(e)) this.play('mouseUp', { volume: 0.8, position: MOUSE_AT });
    });
    document.addEventListener('keyup', (e) => {
      if (inComputer(e)) this.lastKey = '';
    });
    document.addEventListener('keydown', (e) => {
      if (!inComputer(e)) return;
      const key = (e as InComputerEvent).key ?? '';
      if (key === this.lastKey) return; // holding a key does not repeat the click
      this.lastKey = key;
      this.playKey();
    });
  }

  /** Random one of key_1..key_6. */
  private playKey() {
    const n = 1 + Math.floor(Math.random() * 6);
    this.play(`keyboardKeydown${n}`, { volume: 0.8, position: KEYBOARD_AT });
  }

  /** The soft tick used by the UI typing animations and buttons. */
  typeTick() {
    this.play('ccType', { volume: 0.1, detune: 20 });
  }

  private play(name: string, o: PlayOptions = {}): Sound | undefined {
    const buffer = this.buffers[name];
    if (!buffer) return undefined;
    this.resume();

    let audio: Sound;
    let emitter: THREE.Mesh | undefined;
    if (o.position) {
      const positional = new THREE.PositionalAudio(this.listener);
      positional.setRefDistance(REF_DISTANCE);
      emitter = new THREE.Mesh(this.emitterGeometry, this.emitterMaterial);
      emitter.position.copy(o.position);
      emitter.add(positional);
      this.scene.add(emitter);
      audio = positional;
    } else {
      audio = new THREE.Audio(this.listener);
    }
    audio.setBuffer(buffer);

    if (o.lowpass !== undefined) {
      const filter = this.listener.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = o.lowpass;
      audio.setFilter(filter);
    }
    audio.setLoop(Boolean(o.loop));
    audio.setVolume(o.volume ?? 1);
    if (o.detune) audio.setDetune(o.detune);

    if (emitter) {
      const placed = emitter;
      audio.onEnded = () => {
        THREE.Audio.prototype.onEnded.call(audio);
        audio.disconnect();
        this.scene.remove(placed);
      };
    }
    audio.play();
    return audio;
  }

  /** Per frame: office hum follows camera distance to the desk (origin). */
  update() {
    if (!this.office || !this.office.isPlaying) return;
    const distance = this.camera.position.length();
    const hz = clamp(mapRange(distance, 0, 10000, 100, 22000) - 3000, 0, 22050);
    const volume = clamp(mapRange(distance, 1200, 10000, 0, 0.2), 0.05, 0.1);
    const filter = this.office.getFilter() as BiquadFilterNode;
    filter.frequency.setTargetAtTime(hz, this.listener.context.currentTime, 0.05);
    this.office.setVolume(volume);
  }
}
