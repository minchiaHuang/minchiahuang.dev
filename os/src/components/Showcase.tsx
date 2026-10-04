import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { aqua } from '../apps';
import { EMAIL, LINKS, PROJECTS, RESUME_FILE } from '../data/profile';
import { parseOpenQuery, SHOWCASE_PAGES } from '../remote';
import type { ShowcasePage as Page } from '../remote';

const asset = (name: string) => `${import.meta.env.BASE_URL}showcase/${name}`;

const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer">
    {children}
  </a>
);

interface Job { role: string; org: string; when: string; bullets: ReactNode[] }
const JOBS: Job[] = [
  {
    role: 'Freelance Web Developer',
    org: 'Self-Employed',
    when: '2024 - Present',
    bullets: [
      <>Owned client projects from requirements through deployment, delivering 10+ customised WordPress websites.</>,
      <>Built and deployed LINE and WhatsApp chatbots to automate client communication workflows.</>,
    ],
  },
  {
    role: 'Organising Committee Member',
    org: 'UTS Project Society',
    when: '2025 - Present',
    bullets: [
      <>Ran speaker outreach and scheduling across 3 events as the main external contact within a 5-member committee.</>,
    ],
  },
];

const NAV: { page: Page; label: string }[] = [
  { page: 'home', label: 'HOME' },
  { page: 'about', label: 'ABOUT' },
  { page: 'experience', label: 'EXPERIENCE' },
  { page: 'projects', label: 'PROJECTS' },
  { page: 'resume', label: 'RESUME' },
  { page: 'contact', label: 'CONTACT' },
];

// Opening page: ?page=<page> (see remote.ts), else the screenshot state ?shot=sc-<page>, else home.
const startPage = (): Page => {
  const fromUrl = parseOpenQuery(location.search);
  if (fromUrl?.app === 'showcase') return fromUrl.page;
  const m = /^sc-(\w+)$/.exec(new URLSearchParams(location.search).get('shot') ?? '');
  return (SHOWCASE_PAGES as readonly string[]).includes(m?.[1] ?? '') ? (m![1] as Page) : 'home';
};

// Scrolls the Showcase's own scroll container (.sc) to an element of the page. Plain #hash links would be
// swallowed by Link and could scroll the outer page instead.
const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  const box = el?.closest('.sc');
  if (el && box) box.scrollTo({ top: el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 16, behavior: 'smooth' });
};

const GoCtx = createContext<(p: Page) => void>(() => {});
const VisitedCtx = createContext<Set<Page>>(new Set());

// An in-app link: switches the page instead of navigating.
function Link({ to, children, className }: { to: Page; children: ReactNode; className?: string }) {
  const go = useContext(GoCtx);
  const visited = useContext(VisitedCtx).has(to);
  return (
    <a
      href="#"
      className={`${className ?? ''}${visited ? ' is-visited' : ''}`.trim() || undefined}
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

interface ShowcaseProps {
  // A page the outer page or the URL asked for. `n` changes on every request so asking for the page
  // that is already showing (after the visitor browsed away and back) still counts.
  request?: { page: Page; n: number };
}

export default function Showcase({ request }: ShowcaseProps) {
  const [page, setPage] = useState<Page>(startPage);
  const [visited, setVisited] = useState<Set<Page>>(() => new Set());
  const go = (p: Page) => {
    setVisited((v) => new Set(v).add(page));
    setPage(p);
  };
  useEffect(() => {
    if (request) go(request.page);
    // `go` changes every render; the request counter is the real trigger.
  }, [request?.n]);
  return (
    <GoCtx.Provider value={go}>
      <VisitedCtx.Provider value={visited}>
        <Pages page={page} />
      </VisitedCtx.Provider>
    </GoCtx.Provider>
  );
}

function Pages({ page }: { page: Page }) {
  const go = useContext(GoCtx);
  if (page === 'home') {
    return (
      <div className="sc sc-home">
        <h1 className="sc-name-big">Min-Chia (Tommy) Huang</h1>
        <div className="sc-job">Software Engineer</div>
        <div className="sc-tagline">full-stack, backend, AI &amp; automation</div>
        <div className="sc-home-buttons">
          <button type="button" className="sc-big-btn aqua-btn primary" onClick={() => go('resume')}>
            Résumé
          </button>
        </div>
        <nav className="sc-home-links">
          <Link to="about">ABOUT</Link>
          <Link to="experience">EXPERIENCE</Link>
          <Link to="projects">PROJECTS</Link>
          <Link to="contact">CONTACT</Link>
        </nav>
      </div>
    );
  }

  return (
    <div className="sc sc-inner">
      <aside className="sc-side">
        <div className="sc-side-name">
          Min-Chia{' '}
          <br />
          (Tommy){' '}
          <br />
          Huang
        </div>
        <div className="sc-side-sub">minchiahuang.dev</div>
        <nav className="sc-side-nav">
          {NAV.map((n) => (
            <div key={n.page} className={`sc-nav-item${page === n.page ? ' is-current' : ''}`}>
              <Link to={n.page}>{n.label}</Link>
            </div>
          ))}
        </nav>
      </aside>
      <main className="sc-main">{renderPage(page)}</main>
    </div>
  );
}

function Resume() {
  return (
    <div className="sc-resume">
      <img src={aqua('pdf.png')} alt="" draggable={false} className="sc-resume-icon" />
      <div>
        <strong>Looking for my résumé?</strong>
        <br />
        <Ext href={asset(RESUME_FILE)}>Open résumé (PDF)</Ext>
      </div>
    </div>
  );
}

function renderPage(page: Page) {
  switch (page) {
    case 'about':
      return (
        <>
          <h1>About</h1>
          <h2>Me</h2>
          <p>
            I am a Master of Information Technology student at UTS, specialising in Enterprise Software Development, graduating in
            July 2027. I build iOS and full-stack software from Sydney, and I am looking for part-time, casual or internship work
            while I finish my degree.
          </p>
          <Resume />
          <h3>About Me</h3>
          <p>
            I came to software from film (Bachelor of Film and Screen Media Production, Griffith University, 2019 - 2022), and it
            shows in how I build: I like to test a project on someone with no context before calling it done.
          </p>
          <p>
            Recent work includes a first-place hackathon app, a visionOS museum shown at the UTS Tech Fest 2026 AI Showcase, and
            10+ client websites. Away from the keyboard I climb, swim and run, and last winter I cycled from Seoul to Busan.
          </p>
          <h3>What I can build</h3>
          <ul>
            <li>
              <strong>iOS apps.</strong> Swift and SwiftUI, with on-device speech recognition.
            </li>
            <li>
              <strong>Spatial.</strong> RealityKit and visionOS, generating USDZ scenes.
            </li>
            <li>
              <strong>Backends.</strong> Python, FastAPI and SQLite, streaming progress to the client.
            </li>
            <li>
              <strong>Wearables.</strong> Apps for Ray-Ban Meta glasses through the Meta Wearables DAT.
            </li>
            <li>
              <strong>AI plumbing.</strong> OpenAI, MCP servers and tool-permission gating.
            </li>
            <li>
              <strong>Shipping fast.</strong> Hackathons and tight deadlines, with other people in the room.
            </li>
          </ul>
        </>
      );
    case 'experience':
      return (
        <>
          <h1>Experience</h1>
          <h2>Work &amp; Activities</h2>
          {JOBS.map((j) => (
            <section key={j.role} className="sc-job-block">
              <h3>{j.role}</h3>
              <div className="sc-job-meta">
                {j.org} | {j.when}
              </div>
              <ul>
                {j.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
          <section className="sc-job-block">
            <h3>Education</h3>
            <div className="sc-job-meta">University of Technology Sydney | Expected July 2027</div>
            <ul>
              <li>Master of Information Technology, Specialisation in Enterprise Software Development.</li>
            </ul>
            <div className="sc-job-meta">Griffith University | 2019 - 2022</div>
            <ul>
              <li>Bachelor of Film and Screen Media Production.</li>
            </ul>
          </section>
        </>
      );
    case 'projects':
      return (
        <>
          <h1>Projects</h1>
          <h2>Software</h2>
          <p id="sc-projects-index">Click a project to jump to it.</p>
          <div className="sc-cards">
            {PROJECTS.map((p) => (
              <button key={p.slug} type="button" className="sc-card" onClick={() => scrollToId(`sc-proj-${p.slug}`)}>
                {/* A 56x56 thumbnail goes here later: <img src={asset(p.image)} /> when p.image is set. */}
                <span className="sc-card-text">
                  <span className="sc-card-name">{p.name}</span>
                  <span className="sc-card-tag">{p.tag}</span>
                </span>
                <span className="sc-card-go" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          {PROJECTS.map((p) => (
            <section key={p.name} id={`sc-proj-${p.slug}`} className="sc-proj">
              <h3>{p.name}</h3>
              <div className="sc-job-meta">{p.meta}</div>
              <p>{p.blurb}</p>
              {p.image && <img src={asset(p.image)} alt="" draggable={false} />}
              {p.links.length > 0 && (
                <p>
                  {p.links.map((l, i) => (
                    <span key={l.label}>
                      {i > 0 && ' | '}
                      <Ext href={l.href}>{l.label}</Ext>
                    </span>
                  ))}
                </p>
              )}
              <p className="sc-back">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId('sc-projects-index');
                  }}
                >
                  ↑︎ Back to projects
                </a>
              </p>
            </section>
          ))}
        </>
      );
    case 'resume':
      return (
        <>
          <h1>Résumé</h1>
          <h2>At a glance</h2>
          <ul>
            <li>Software engineer working across full-stack, backend, AI and automation.</li>
            <li>Master of Information Technology, UTS (Enterprise Software Development), graduating July 2027.</li>
            <li>1st place at the ICON x Lyra Hackathon with CookPilot; built the iOS app end to end.</li>
            <li>10+ client websites and LINE and WhatsApp chatbots delivered as a freelancer.</li>
            <li>Finalist, Accenture x SUBAA Datathon 2026 (top 4 of 40 teams).</li>
          </ul>
          <Resume />
        </>
      );
    case 'contact':
      return (
        <>
          <div className="sc-contact-head">
            <h1>Contact</h1>
            <div className="sc-social">
              <a href={LINKS[0].href} target="_blank" rel="noreferrer" aria-label="GitHub">
                <svg viewBox="0 0 16 16" shapeRendering="crispEdges">
                  <circle cx="8" cy="8" r="7.5" fill="#000" />
                  <path d="M4 5l1 1h6l1-1v3h1v2l-2 2H8v-1h2v-1H6v1h2v1H5l-2-2V8h1z" fill="#fff" />
                  <rect x="6" y="8" width="1" height="1" fill="#000" />
                  <rect x="9" y="8" width="1" height="1" fill="#000" />
                </svg>
              </a>
              <a href={LINKS[1].href} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <svg viewBox="0 0 16 16" shapeRendering="crispEdges">
                  <circle cx="8" cy="8" r="7.5" fill="#0a66c2" />
                  <rect x="4" y="7" width="2" height="5" fill="#fff" />
                  <rect x="4" y="4" width="2" height="2" fill="#fff" />
                  <path d="M7 7h2v1h1V7h2v5h-2V9H9v3H7z" fill="#fff" />
                </svg>
              </a>
              <a href={`mailto:${EMAIL}`} aria-label="Email">
                <svg viewBox="0 0 16 16" shapeRendering="crispEdges">
                  <rect x="1" y="3" width="14" height="10" fill="#1d9bf0" />
                  <path d="M1 3h14v1l-7 5-7-5z" fill="#fff" />
                  <path d="M2 4l6 4.5L14 4v1L8 9.5 2 5z" fill="#1d9bf0" />
                </svg>
              </a>
            </div>
          </div>
          <p>
            I am looking for paid part-time, casual or internship work in Sydney that I can do while I finish my Master of IT.
            The fastest way to reach me is email.
          </p>
          <p>
            <strong>Email: </strong>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
          <p>
            {LINKS.map((l) => (
              <span key={l.label}>
                <Ext href={l.href}>{l.label}</Ext>
                {' | '}
              </span>
            ))}
            <Ext href={asset(RESUME_FILE)}>Résumé (PDF)</Ext>
          </p>
        </>
      );
    default:
      return null;
  }
}
