import { useEffect, useRef } from 'react';
import 'js-dos/dist/js-dos.css';
import 'js-dos/dist/js-dos.js'; // sets window.Dos
import type { AppId } from '../apps';
import type { SendKey } from '../mobile/keyLayouts';

declare global {
  interface Window {
    Dos: (el: HTMLElement, opts: Record<string, unknown>) => { stop: () => Promise<void> };
  }
}

// The part of js-dos's command interface (emulators.js) the phone's on-screen keys use. KBD codes, see keyLayouts.ts.
interface DosCi {
  sendKeyEvent: (code: number, pressed: boolean) => void;
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
// onReady (phone shell): called on every emulator start with a function that presses and releases keys in it.
export default function DosGame({ id, onReady }: { id: AppId; onReady?: (send: SendKey) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    let live = true;
    const player = window.Dos(host.current!, {
      url: `${base}games/${id}.jsdos`,
      pathPrefix: `${base}emulators/`,
      autoStart: true,
      kiosk: true,
      noCloud: true,
      mouseCapture: false,
      // js-dos 8.5.1 calls this with 'ci-ready' and the command interface, via setTimeout after the emulator starts.
      // Each mount gets its own ci, so a game switch hands over a fresh send; until then there is none to call.
      // `live` stops a ci that arrives after this effect was cleaned up from reaching a newer mount's onReady.
      onEvent: (event: string, ci?: DosCi) => {
        if (live && event === 'ci-ready' && ci) ready.current?.((code, pressed) => ci.sendKeyEvent(code, pressed));
      },
    });
    return () => {
      live = false;
      void player.stop();
    };
  }, [id]);
  return <div className="dos" ref={host} />;
}
