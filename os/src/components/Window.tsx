import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { appById } from '../apps';
import { icons } from '../icons';
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

const Glyph = ({ d }: { d: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden>
    <path d={d} fill="#000" />
  </svg>
);

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
    zIndex: win.z * 2, // z can be a half step (a window opened behind another of equal z)
    display: win.minimized ? 'none' : undefined,
    ['--title' as string]: app.titleColor ?? 'var(--active-title)',
  };

  // Title-bar buttons act on mouse down, not on release; Enter/Space (click with no pointer) still works.
  const press = (a: Action) => ({
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 0) dispatch(a);
    },
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) dispatch(a);
    },
  });

  const onTitleDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('button') || win.maximized) return;
    const { x: x0, y: y0 } = win.rect;
    stopDrag.current?.();
    stopDrag.current = track((dx, dy) => dispatch({ type: 'move', id: win.id, x: x0 + dx, y: y0 + dy }), e.clientX, e.clientY);
  };

  const onGripDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault();
    const { x: x0, y: y0 } = win.rect;
    stopDrag.current?.();
    // The bottom-right corner snaps to the pointer: the offset of the grab point inside the grip is ignored.
    stopDrag.current = track((dx, dy) => dispatch({ type: 'resize', id: win.id, w: e.clientX + dx - x0, h: e.clientY + dy - y0 }), e.clientX, e.clientY);
  };

  return (
    <div
      className={`win raised${active ? ' is-active' : ''}${win.maximized ? ' is-max' : ''}`}
      style={style}
      // Capture so a press anywhere inside, even on a child that stops propagation, raises the window.
      onMouseDownCapture={() => dispatch({ type: 'focus', id: win.id })}
    >
      <div className="win-title" onMouseDown={onTitleDown}>
        <img src={icons[app.icon]} alt="" draggable={false} />
        <span className="win-title-text">{app.windowTitle}</span>
        <button className="win-btn raised" aria-label="Minimize" {...press({ type: 'minimize', id: win.id })}>
          <Glyph d="M1 7h6v2H1z" />
        </button>
        <button className="win-btn raised" aria-label="Maximize" {...press({ type: 'toggleMax', id: win.id })}>
          <Glyph d={win.maximized ? 'M3 0h7v7H8V5H3zM4 1v1h5V1zM0 3h7v7H0zM1 4v1h5V4zM1 6v3h5V6z' : 'M0 0h10v10H0zM1 1v1h8V1zM1 3v6h8V3z'} />
        </button>
        <button className="win-btn raised win-close" aria-label="Close" {...press({ type: 'close', id: win.id })}>
          <Glyph d="M0 0h2v1h1v1h1v1h2V2h1V1h1V0h2v1H9v1H8v1H7v1H6v2h1v1h1v1h1v1h1v1H8V9H7V8H6V7H4v1H3v1H2v1H0V9h1V8h1V7h1V6h1V4H3V3H2V2H1V1H0z" />
        </button>
      </div>
      <div className="win-body">{children}</div>
      <div className="win-status">
        <span className="win-pane win-status-text">{app.status}</span>
        <span className="win-pane win-status-cell" />
        <span className="win-pane win-status-cell" />
        <span className="win-pane win-status-end">
          <span className="win-grip" onMouseDown={onGripDown}>
          <svg width="14" height="14" viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden>
            <path d="M13 1h1v1h-1v1h-1v1h-1v1h-1v1H9v1H8v1H7v1H6v1H5v1H4v1H3v1H2v1H1v-1h1v-1h1v-1h1v-1h1v-1h1V9h1V8h1V7h1V6h1V5h1V4h1V3h1z" fill="#0a0a0a" />
            <path d="M13 4h1v1h-1v1h-1v1h-1v1h-1v1H9v1H8v1H7v1H6v1H5v1H4v1H3v-1h1v-1h1v-1h1v-1h1V9h1V8h1V7h1V6h1V5h1z" fill="#7a7e82" />
            <path d="M13 8h1v1h-1v1h-1v1h-1v1H9v1H8v1H7v-1h1v-1h1v-1h1v-1h1V9h1z" fill="#fff" />
          </svg>
          </span>
        </span>
      </div>
    </div>
  );
}
