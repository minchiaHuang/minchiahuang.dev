import { useState } from 'react';
import { aqua } from '../apps';

// Tommy HD: a Finder window over three folders. Each opens the app or page that holds its content;
// Hackathons opens Projects filtered to the hackathon-tagged ones.
type Folder = 'projects' | 'experience' | 'hackathons';
const FOLDERS: { id: Folder; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'hackathons', label: 'Hackathons' },
];

interface Props {
  onProjects: () => void;
  onHackathons: () => void;
  onExperience: () => void;
}

export default function HardDisk({ onProjects, onHackathons, onExperience }: Props) {
  const [sel, setSel] = useState<Folder | null>(null);
  const open = (f: Folder) => (f === 'projects' ? onProjects() : f === 'experience' ? onExperience() : onHackathons());

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
