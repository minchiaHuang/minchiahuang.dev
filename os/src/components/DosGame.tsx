import { useEffect, useRef } from 'react';
import 'js-dos/dist/js-dos.css';
import 'js-dos/dist/js-dos.js'; // sets window.Dos
import type { AppId } from '../apps';

declare global {
  interface Window {
    Dos: (el: HTMLElement, opts: Record<string, unknown>) => { stop: () => Promise<void> };
  }
}

// js-dos 8.5.1 leaks audio: emulators.js (createAudioPort) opens an AudioContext per game and never closes it, even after
// stop(), and exposes no handle to it. Tie each context to its emulator worker instead: the worklet's port is transferred
// to the worker with postMessage and exit() ends the worker with terminate(), so closing there is exact per game.
const portContext = new WeakMap<MessagePort, AudioContext>();
const workerContext = new WeakMap<Worker, AudioContext>();
const NativeAudioWorkletNode = window.AudioWorkletNode;
window.AudioWorkletNode = class extends NativeAudioWorkletNode {
  constructor(...args: ConstructorParameters<typeof NativeAudioWorkletNode>) {
    super(...args);
    portContext.set(this.port, args[0] as AudioContext);
  }
};
const nativePostMessage = Worker.prototype.postMessage;
Worker.prototype.postMessage = function (this: Worker, message: unknown, transfer?: any) {
  for (const t of Array.isArray(transfer) ? transfer : (transfer?.transfer ?? [])) {
    const ctx = portContext.get(t);
    if (ctx) workerContext.set(this, ctx);
  }
  return nativePostMessage.call(this, message, transfer);
};
const nativeTerminate = Worker.prototype.terminate;
Worker.prototype.terminate = function (this: Worker) {
  workerContext.get(this)?.close().catch(() => {});
  return nativeTerminate.call(this);
};

// Runs games/<id>.jsdos in js-dos (emulator files are served from /os/emulators, see vite.config.ts).
// Unmounting stops the emulator, which also silences its audio (the hooks above close its AudioContext).
export default function DosGame({ id }: { id: AppId }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const player = window.Dos(host.current!, {
      url: `${base}games/${id}.jsdos`,
      pathPrefix: `${base}emulators/`,
      autoStart: true,
      kiosk: true,
      noCloud: true,
      mouseCapture: false,
    });
    return () => void player.stop();
  }, [id]);
  return <div className="dos" ref={host} />;
}
