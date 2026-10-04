import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { appById } from '../apps';
import type { Action, WinState } from '../windows';

interface Props {
  win: WinState;
  active: boolean;
  dispatch: (a: Action) => void;
  children: ReactNode;
}

// Track the pointer on window so a drag keeps working when the cursor leaves the element.
// Returns a stop function; the drag also ends on blur or when the button is no longer held.
function track(onMove: (dx: number, dy: number) => void, startX: number, startY: number) {
  const move = (e: MouseEvent) => {
    if (e.buttons === 0) return stop();
    onMove(e.clientX - startX, e.clientY - startY);
  };
  const stop = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', stop);
    window.removeEventListener('blur', stop);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', stop);
  window.addEventListener('blur', stop);
  return stop;
}

export default function Window({ win, active, dispatch, children }: Props) {
  const app = appById(win.id);
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);
  const { x, y, w, h } = win.rect;
  const style: CSSProperties = {
    left: x,
    top: y,
    width: w,
    height: h,
    zIndex: win.z,
    display: win.minimized ? 'none' : undefined,
  };

  // Gel buttons act on click (release), as Aqua's did; a press on them must not start a title-bar drag.
  const gel = (kind: string, label: string, a: Action) => (
    <button className={`gel gel-${kind}`} aria-label={label} onMouseDown={(e) => e.stopPropagation()} onClick={() => dispatch(a)} />
  );

  const onTitleDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || win.maximized) return;
    const { x: x0, y: y0 } = win.rect;
    stopDrag.current?.();
    stopDrag.current = track((dx, dy) => dispatch({ type: 'move', id: win.id, x: x0 + dx, y: y0 + dy }), e.clientX, e.clientY);
  };

  const onGripDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault();
    const { w: w0, h: h0 } = win.rect;
    stopDrag.current?.();
    stopDrag.current = track((dx, dy) => dispatch({ type: 'resize', id: win.id, w: w0 + dx, h: h0 + dy }), e.clientX, e.clientY);
  };

  return (
    <div
      className={`win${active ? ' is-active' : ''}${win.maximized ? ' is-max' : ''}`}
      style={style}
      data-app={win.id}
      // Capture so a press anywhere inside, even on a child that stops propagation, raises the window.
      onMouseDownCapture={() => dispatch({ type: 'focus', id: win.id })}
    >
      <div className="win-title" onMouseDown={onTitleDown} onDoubleClick={() => dispatch({ type: 'minimize', id: win.id })}>
        <div className="gels">
          {gel('close', 'Close', { type: 'close', id: win.id })}
          {gel('min', 'Minimize', { type: 'minimize', id: win.id })}
          {gel('zoom', 'Zoom', { type: 'toggleMax', id: win.id })}
        </div>
        <span className="win-title-text">{app.windowTitle}</span>
      </div>
      <div className="win-body">{children}</div>
      <span className="win-grip" onMouseDown={onGripDown} aria-hidden />
    </div>
  );
}
