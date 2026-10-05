// Showcase's first screen on a phone: the "About This Tommy" card (Figma 06 Mobile, V1 73:491). The four facts are
// fixed here on purpose (confirmed by Tommy 2026-10-05), not derived from profile.ts.
const FACTS: [string, string][] = [
  ['Based in', 'Sydney, Australia'],
  ['Study', 'Master of IT, UTS · July 2027'],
  ['Status', 'Open to part-time, casual or internship work'],
  ['Latest', 'CookPilot · 1st place, ICON x Lyra Hackathon'],
];

interface Props {
  onResume: () => void;
  onProjects: () => void;
  onMoreInfo: () => void;
  onContact: () => void;
}

export default function AboutCard({ onResume, onProjects, onMoreInfo, onContact }: Props) {
  return (
    <div className="m-card-wrap">
      <section className="m-card" aria-labelledby="m-card-name">
        <div className="m-card-title">
          <span className="m-card-gels" aria-hidden="true">
            <span className="gel gel-close" />
            <span className="gel gel-min" />
            <span className="gel gel-zoom" />
          </span>
          About This Tommy
        </div>
        <div className="m-card-body">
          <div className="m-card-head">
            <span className="m-t-badge" aria-hidden="true">
              T
            </span>
            <h1 id="m-card-name" className="m-card-name">
              Min-Chia (Tommy) Huang
            </h1>
            <div className="m-card-job">Software Engineer</div>
            <div className="m-card-tag">full-stack, backend, AI &amp; automation</div>
          </div>
          <dl className="m-card-facts">
            {FACTS.map(([k, v]) => (
              <div key={k} className="m-card-fact">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="m-card-buttons">
            <button type="button" className="aqua-btn primary" onClick={onResume}>
              Résumé
            </button>
            <button type="button" className="aqua-btn" onClick={onProjects}>
              Projects
            </button>
            <button type="button" className="aqua-btn" onClick={onMoreInfo}>
              More Info…
            </button>
            <button type="button" className="aqua-btn" onClick={onContact}>
              Contact
            </button>
          </div>
          <div className="m-card-foot">™ &amp; © 2026 Min-Chia Huang · minchiahuang.dev</div>
        </div>
      </section>
    </div>
  );
}
