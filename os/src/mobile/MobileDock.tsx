import { aqua, appById, DOCK, type AppId } from '../apps';

interface Props {
  lit: AppId | null; // the app on screen (a game lights Games), see dockLit in state.ts
  onOpen: (id: AppId) => void;
}

// The phone Dock: a tab bar of the seven Dock apps. No Trash and no magnification (that is Dock.tsx, for a mouse).
// mobile.css shows the labels only when the phone is upright.
export default function MobileDock({ lit, onOpen }: Props) {
  return (
    <nav className="m-dock" aria-label="Dock">
      {DOCK.map((id) => {
        const app = appById(id);
        return (
          <button
            key={id}
            type="button"
            className={`m-dock-item${lit === id ? ' is-lit' : ''}`}
            aria-label={app.name}
            aria-current={lit === id ? 'page' : undefined}
            onClick={() => onOpen(id)}
          >
            <img src={aqua(app.icon!)} alt="" draggable={false} />
            <span className="m-dock-label" aria-hidden="true">
              {app.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
