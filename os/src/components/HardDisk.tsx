import { useState } from 'react';
import { aqua } from '../apps';

// Tommy HD: a Finder window over three folders. Projects and Experience open the app or page that holds
// them; Hackathons is browsed in place and is empty until the hackathon category exists.
// NEEDS DECISION: what goes in Hackathons (content round).
type Folder = 'projects' | 'experience' | 'hackathons';
const FOLDERS: { id: Folder; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'hackathons', label: 'Hackathons' },
];

interface Props {
  onProjects: () => void;
  onExperience: () => void;
}

export default function HardDisk({ onProjects, onExperience }: Props) {
  const [sel, setSel] = useState<Folder | null>(null);
  const [inside, setInside] = useState<Folder | null>(null);
  const open = (f: Folder) => (f === 'projects' ? onProjects() : f === 'experience' ? onExperience() : setInside(f));

  if (inside) {
    return (
      <div className="finder">
        <div className="finder-info">
          <button className="aqua-btn small" onClick={() => setInside(null)}>
            ◀ Tommy HD
          </button>
          <span>Hackathons — 0 items</span>
        </div>
        <div className="finder-grid finder-empty">This folder is empty.</div>
      </div>
    );
  }
  return (
    <div className="finder">
      <div className="finder-info">{FOLDERS.length} items</div>
      <div className="finder-grid" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            className={`finder-item${sel === f.id ? ' is-selected' : ''}`}
            onMouseDown={() => setSel(f.id)}
            onDoubleClick={() => open(f.id)}
          >
            <img className="finder-icon" src={aqua('folder.png')} alt="" draggable={false} />
            <span className="finder-name">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
