import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  onAbout: () => void;
  onRestart: () => void;
  onShutDown: () => void;
  initialMenu?: boolean; // ?shot=m-menu: the T menu starts open
}

// The phone's only bar, 44 px tall: × closes the app, the title names it, the T menu holds the system items.
// No clock on a phone. The menu opens on a tap (there is no hover) and a tap anywhere else closes it.
export default function TopBar({ title, onClose, onAbout, onRestart, onShutDown, initialMenu = false }: Props) {
  const [open, setOpen] = useState(initialMenu);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <header className="m-top" ref={bar}>
      <button type="button" className="m-top-btn m-top-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="m-top-title">{title}</div>
      <button type="button" className={`m-top-btn m-top-t${open ? ' is-open' : ''}`} aria-label="T menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        T
      </button>
      {open && (
        <div className="m-menu" role="menu">
          <button type="button" role="menuitem" className="m-menu-item" onClick={run(onAbout)}>
            About This Site…
          </button>
          {/* A plain link (push): Back on the 3D desk returns here. ?desk=1 skips the phone redirect (app/src/flatMode.ts). */}
          <a role="menuitem" className="m-menu-item" href="/?desk=1">
            View 3D Desk
          </a>
          <hr className="m-menu-sep" />
          <button type="button" role="menuitem" className="m-menu-item" onClick={run(onRestart)}>
            Restart
          </button>
          <button type="button" role="menuitem" className="m-menu-item" onClick={run(onShutDown)}>
            Shut Down…
          </button>
        </div>
      )}
    </header>
  );
}
