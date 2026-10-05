import { aqua, appById, GAMES, type AppId } from '../apps';
import { useState } from 'react';

// The Games folder: the three DOS games under their publishers' logos. Double-click starts one in its own window
// (tapToOpen, the phone shell: one tap).
export default function Games({ onOpen, tapToOpen = false }: { onOpen: (id: AppId) => void; tapToOpen?: boolean }) {
  const [sel, setSel] = useState<AppId | null>(null);
  return (
    <div className="finder">
      <div className="finder-info">{GAMES.length} items</div>
      <div className="finder-grid finder-logos" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`finder-item${sel === g.id ? ' is-selected' : ''}`}
            onMouseDown={() => setSel(g.id)}
            onClick={tapToOpen ? () => onOpen(g.id) : undefined}
            onDoubleClick={() => onOpen(g.id)}
          >
            <span className="finder-logo">
              <img src={aqua(g.logo)} alt="" draggable={false} />
            </span>
            <span className="finder-name">{appById(g.id).name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
