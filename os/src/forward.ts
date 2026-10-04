// Contract §2: relay pointer and key events to the outer scene so it can keep
// the camera parallax going and play mouse/keyboard sounds.
type OsMessage =
  | { type: 'mousemove'; clientX: number; clientY: number }
  | { type: 'mousedown' }
  | { type: 'mouseup' }
  | { type: 'keydown'; key: string }
  | { type: 'keyup'; key: string };

export function startForwarding(): () => void {
  if (window.parent === window) return () => {};
  const send = (msg: OsMessage) => window.parent.postMessage(msg, '*');

  const onMove = (e: MouseEvent) => send({ type: 'mousemove', clientX: e.clientX, clientY: e.clientY });
  const onDown = () => send({ type: 'mousedown' });
  const onUp = () => send({ type: 'mouseup' });
  const onKeyDown = (e: KeyboardEvent) => send({ type: 'keydown', key: e.key });
  const onKeyUp = (e: KeyboardEvent) => send({ type: 'keyup', key: e.key });

  // Capture phase so a component that stops propagation still gets forwarded.
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('mouseup', onUp, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  return () => {
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('mousedown', onDown, true);
    window.removeEventListener('mouseup', onUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
  };
}
