import { aqua, appById, type AppId } from '../apps';
import { HOME_ITEMS } from './state';

// The desktop when no app is open: one icon per item on the Aqua wallpaper (MobileShell draws the wallpaper).
// One tap opens. About This Site has no Aqua icon, so it gets the T badge.
export default function HomeGrid({ onOpen }: { onOpen: (id: AppId) => void }) {
  return (
    <div className="m-home">
      {HOME_ITEMS.map((id) => {
        const app = appById(id);
        return (
          <button key={id} type="button" className="m-home-item" onClick={() => onOpen(id)}>
            {app.icon ? (
              <img src={aqua(app.icon)} alt="" draggable={false} />
            ) : (
              <span className="m-t-badge" aria-hidden="true">
                T
              </span>
            )}
            <span className="m-home-label">{app.name}</span>
          </button>
        );
      })}
    </div>
  );
}
