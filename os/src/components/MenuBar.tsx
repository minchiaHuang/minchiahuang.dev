import { useEffect, useRef } from 'react';
import { appById, type AppId } from '../apps';
import type { WinState } from '../windows';
import Clock from './Clock';

export type MenuId = 't' | 'file' | 'edit' | 'view' | 'window';

interface Item {
  label: string;
  run?: () => void; // no run: drawn disabled
}
type Entry = Item | 'sep';

interface Props {
  open: MenuId | null;
  setOpen: (m: MenuId | null) => void;
  active: AppId | null;
  wins: WinState[];
  onAbout: () => void;
  onRestart: () => void;
  onShutDown: () => void;
  onClose: (id: AppId) => void;
  onMinimize: (id: AppId) => void;
  onFocus: (id: AppId) => void;
}

export default function MenuBar({ open, setOpen, active, wins, onAbout, onRestart, onShutDown, onClose, onMinimize, onFocus }: Props) {
  const bar = useRef<HTMLDivElement>(null);

  // A press anywhere outside the bar closes the open menu.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('mousedown', close, true);
    return () => window.removeEventListener('mousedown', close, true);
  }, [open, setOpen]);

  const menus: { id: MenuId; title: string; items: Entry[] }[] = [
    { id: 't', title: 'T', items: [{ label: 'About This Site…', run: onAbout }, 'sep', { label: 'Restart', run: onRestart }, { label: 'Shut Down…', run: onShutDown }] },
    {
      id: 'file',
      title: 'File',
      items: [{ label: 'New Window' }, { label: 'Open…' }, 'sep', { label: 'Close Window', run: active ? () => onClose(active) : undefined }],
    },
    { id: 'edit', title: 'Edit', items: [{ label: 'Undo' }, 'sep', { label: 'Cut' }, { label: 'Copy' }, { label: 'Paste' }, { label: 'Select All' }] },
    { id: 'view', title: 'View', items: [{ label: 'as Icons' }, { label: 'as List' }, 'sep', { label: 'Show View Options' }] },
    {
      id: 'window',
      title: 'Window',
      items: [
        { label: 'Minimize Window', run: active ? () => onMinimize(active) : undefined },
        ...(wins.length ? (['sep'] as Entry[]) : []),
        ...wins.map((w) => ({ label: `${w.id === active ? '✓ ' : ''}${appById(w.id).windowTitle}`, run: () => onFocus(w.id) })),
      ],
    },
  ];

  return (
    <div className="menubar" ref={bar}>
      {menus.map((m) => (
        <div key={m.id} className="menu">
          <button
            className={`menu-title${m.id === 't' ? ' menu-t' : ''}${open === m.id ? ' is-open' : ''}`}
            aria-label={m.id === 't' ? 'T menu' : undefined}
            onMouseDown={() => setOpen(open === m.id ? null : m.id)}
            // Once a menu is open, sliding across the bar switches menus, as on the Mac.
            onMouseEnter={() => open && open !== m.id && setOpen(m.id)}
          >
            {m.title}
          </button>
          {open === m.id && (
            <div className="menu-drop" role="menu">
              {m.items.map((it, i) =>
                it === 'sep' ? (
                  <hr key={i} className="menu-sep" />
                ) : (
                  <button
                    key={i}
                    role="menuitem"
                    className="menu-item"
                    disabled={!it.run}
                    onClick={() => {
                      setOpen(null);
                      it.run?.();
                    }}
                  >
                    {it.label}
                  </button>
                ),
              )}
            </div>
          )}
          {/* The bold app name follows the T menu, as the frontmost app's name did on Mac OS X. */}
          {m.id === 't' && <span className="menu-app">{active ? appById(active).name : 'Showcase'}</span>}
        </div>
      ))}
      <Clock />
    </div>
  );
}
