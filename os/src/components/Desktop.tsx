import { APPS, type AppId } from '../apps';
import { icons } from '../icons';

interface Props {
  selected: AppId | null;
  opened: AppId | null;
  shifted: boolean; // the column sits 9px higher once a window has opened, until the next reboot
  onSelect: (id: AppId | null) => void;
  onOpen: (id: AppId) => void;
}

export default function Desktop({ selected, opened, shifted, onSelect, onOpen }: Props) {
  const hit = (id: AppId) => ({ onMouseDown: () => onSelect(id), onDoubleClick: () => onOpen(id) });
  return (
    <div
      className="desktop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      {APPS.map((app) => {
        const src = icons[app.icon];
        return (
          <div key={app.id} className="desk-icon" style={{ top: app.iconY - (shifted ? 9 : 0) }}>
            <div className={`desk-icon-hit${selected === app.id ? ' is-selected' : ''}`}>
              <div className="desk-icon-img" {...hit(app.id)}>
                <img src={src} alt="" draggable={false} />
                <span className="desk-icon-tint" style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")` }} />
              </div>
              {/* The 5px gap above the label belongs to the label so the hit area has no hole. */}
              <div className="desk-icon-label" {...hit(app.id)}>
                <span className={opened === app.id ? 'is-opened' : undefined}>{app.label}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
