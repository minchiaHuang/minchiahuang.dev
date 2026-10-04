import { aqua, type AppId } from '../apps';

// Desktop items, top-right column. Resume.pdf opens in the Résumé (Preview) app.
export const DESK_ITEMS = [
  { key: 'hd', label: 'Tommy HD', icon: 'harddisk.png', opens: 'harddisk' as AppId },
  { key: 'pdf', label: 'Resume.pdf', icon: 'pdf.png', opens: 'resume' as AppId },
] as const;
export type DeskKey = (typeof DESK_ITEMS)[number]['key'];

interface Props {
  selected: DeskKey | null;
  onSelect: (key: DeskKey | null) => void;
  onOpen: (id: AppId) => void;
}

export default function Desktop({ selected, onSelect, onOpen }: Props) {
  return (
    <div
      className="desktop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      {DESK_ITEMS.map((it) => (
        <div
          key={it.key}
          className={`desk-icon${selected === it.key ? ' is-selected' : ''}`}
          onMouseDown={() => onSelect(it.key)}
          onDoubleClick={() => onOpen(it.opens)}
        >
          <div className="desk-icon-img">
            <img src={aqua(it.icon)} alt="" draggable={false} />
          </div>
          <span className="desk-icon-label">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
