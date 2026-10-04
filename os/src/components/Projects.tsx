import { useEffect, useState } from 'react';
import { aqua } from '../apps';
import { PROJECTS } from '../data/profile';

const shot = (name: string) => `${import.meta.env.BASE_URL}showcase/${name}`;

interface Props {
  // A project the Terminal asked for; `n` changes on every request so asking twice still counts.
  request?: { slug: string; n: number };
}

// Finder-style icon view of the projects; double-click shows one project's details and links.
export default function Projects({ request }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(request?.slug ?? null);
  useEffect(() => {
    if (request) setOpen(request.slug);
  }, [request?.n]);

  const p = PROJECTS.find((x) => x.slug === open);
  if (p) {
    return (
      <div className="finder">
        <div className="finder-info">
          <button className="aqua-btn small" onClick={() => setOpen(null)}>
            ◀ Projects
          </button>
          <span>{p.name}</span>
        </div>
        <div className="proj-detail">
          <h2>{p.name}</h2>
          <div className="proj-meta">{p.meta}</div>
          <p>{p.blurb}</p>
          {p.image && <img src={shot(p.image)} alt="" draggable={false} />}
          {p.links.length > 0 && (
            <div className="proj-links">
              {p.links.map((l) => (
                <a key={l.label} className="aqua-btn" href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="finder">
      <div className="finder-info">{PROJECTS.length} items</div>
      <div className="finder-grid" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
        {PROJECTS.map((x) => (
          <button
            key={x.slug}
            className={`finder-item${sel === x.slug ? ' is-selected' : ''}`}
            onMouseDown={() => setSel(x.slug)}
            onDoubleClick={() => setOpen(x.slug)}
          >
            <img className="finder-icon" src={aqua('folder.png')} alt="" draggable={false} />
            <span className="finder-name">{x.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
