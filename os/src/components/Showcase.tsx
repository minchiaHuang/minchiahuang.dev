import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { icons } from '../icons';

type Page = 'home' | 'about' | 'experience' | 'projects' | 'software' | 'music' | 'art' | 'contact';

const asset = (name: string) => `${import.meta.env.BASE_URL}showcase/${name}`;
const SITE = 'https://minchiahuang.dev';
const EMAIL = 'minchia.huang.dev@gmail.com';
const LINKS = [
  { label: 'GitHub', href: 'https://github.com/minchiaHuang' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/minchiahuang/' },
  { label: 'Personal site', href: SITE },
];

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

interface Project { name: string; meta: string; blurb: string; image?: string; links: { label: string; href: string }[] }
const PROJECTS: Project[] = [
  {
    name: 'CookPilot',
    meta: 'iOS | ICON x Lyra Hackathon, 1st place | 2026',
    blurb:
      'Look at your fridge through Ray-Ban Meta glasses and it tells you what you can cook tonight, read into your ear step by step. I owned the iOS build end to end: SwiftUI, the step state machine, voice control and the model service layer.',
    image: 'cookpilot-home.png',
    links: [{ label: 'Case study', href: `${SITE}/cookpilot.html` }],
  },
  {
    name: 'Visual Eyes',
    meta: 'visionOS | Apple Foundation Program | 2026',
    blurb:
      'Asks who you want to become, then builds a five-room walkable museum of that future. A two-stage pipeline produces a structured story and images, composited onto named wall frames in a USDZ gallery. Four-person team, I built the app.',
    image: 've-gallery.jpg',
    links: [
      { label: 'Case study', href: `${SITE}/visual-eyes.html` },
      { label: 'GitHub', href: 'https://github.com/minchiaHuang/Vision-Pro' },
    ],
  },
  {
    name: 'LearnGuard',
    meta: 'MCP | OpenAI Codex Hackathon',
    blurb:
      'A gate that makes a coding assistant earn its permissions. The red-team suite blocks 8 of 8 attacks while letting legitimate actions through.',
    links: [{ label: 'GitHub', href: 'https://github.com/minchiaHuang/LearnGuard' }],
  },
  {
    name: 'VaxAgent',
    meta: 'FastAPI | HSIL, Harvard T.H. Chan',
    blurb:
      'Tumour mutation data in, ranked neoantigen candidates out, with every step traceable back to the file it came from.',
    links: [{ label: 'GitHub', href: 'https://github.com/minchiaHuang/VaxAgent' }],
  },
  {
    name: 'Accenture x SUBAA Datathon 2026',
    meta: 'Python | Finalist, top 4 of 40 teams',
    blurb:
      'Analysed 105k+ records across four HR datasets and built a reusable matplotlib style module so new figures matched the existing Excel charts. Traced all 24 cited figures back to the raw CSVs before the final.',
    links: [],
  },
];

const NAV: { page: Page; label: string; children?: { page: Page; label: string }[] }[] = [
  { page: 'home', label: 'HOME' },
  { page: 'about', label: 'ABOUT' },
  { page: 'experience', label: 'EXPERIENCE' },
  {
    page: 'projects',
    label: 'PROJECTS',
    children: [
      { page: 'software', label: 'SOFTWARE' },
      { page: 'music', label: 'MUSIC' },
      { page: 'art', label: 'ART' },
    ],
  },
  { page: 'contact', label: 'CONTACT' },
];

const isUnder = (page: Page, parent: Page) =>
  parent === 'projects' && (page === 'software' || page === 'music' || page === 'art');

// Screenshot states: ?shot=sc-about, sc-projects, sc-software ... open My Showcase on that page.
const PAGES: Page[] = ['home', 'about', 'experience', 'projects', 'software', 'music', 'art', 'contact'];
const startPage = (): Page => {
  const m = /^sc-(\w+)$/.exec(new URLSearchParams(location.search).get('shot') ?? '');
  return (PAGES as string[]).includes(m?.[1] ?? '') ? (m![1] as Page) : 'home';
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

export default function Showcase() {
  const [page, setPage] = useState<Page>(startPage);
  const [visited, setVisited] = useState<Set<Page>>(() => new Set());
  const go = (p: Page) => {
    setVisited((v) => new Set(v).add(page));
    setPage(p);
  };
  return (
    <GoCtx.Provider value={go}>
      <VisitedCtx.Provider value={visited}>
        <Pages page={page} />
      </VisitedCtx.Provider>
    </GoCtx.Provider>
  );
}

function Pages({ page }: { page: Page }) {

  if (page === 'home') {
    return (
      <div className="sc sc-home">
        <h1 className="sc-name-big">Tommy Huang</h1>
        <div className="sc-job">Software Engineer</div>
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
          Tommy
          <br />
          Huang
        </div>
        <div className="sc-side-sub">Showcase '26</div>
        <nav className="sc-side-nav">
          {NAV.map((n) => {
            const open = page === n.page || (n.children && isUnder(page, n.page));
            return (
              <div key={n.page}>
                <div className={`sc-nav-item${page === n.page ? ' is-current' : ''}${n.children && open ? ' has-children' : ''}`}>
                  <Link to={n.page}>{n.label}</Link>
                </div>
                {n.children && open && (
                  <div className="sc-nav-children">
                    {n.children.map((c) => (
                      <div key={c.page} className={`sc-nav-item sc-nav-child${page === c.page ? ' is-current' : ''}`}>
                        <Link to={c.page}>{c.label}</Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="sc-main">{renderPage(page)}</main>
    </div>
  );
}

function Resume() {
  return (
    <div className="sc-resume">
      <img src={icons.resume} alt="" draggable={false} className="sc-resume-icon" />
      <div>
        <strong>Looking for my resume?</strong>
        <br />
        <Ext href={asset('TommyHuang_Resume.pdf')}>Click here to download it!</Ext>
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
          <p>
            <strong>Skills.</strong> Swift, Python, C#, TypeScript, JavaScript, SQL; SwiftUI, React, Node.js, Express, Tailwind CSS;
            OpenAI API, Model Context Protocol, PostgreSQL, SQLite; Git, Docker, Xcode.
          </p>
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
          <h2>&amp; Hobbies</h2>
          <p>Click on one of the areas below to see what I have been building, listening to and drawing.</p>
          {(
            [
              ['software', 'Software', 'PROJECTS', icons.hubSoftware],
              ['music', 'Music', 'VENTURES', icons.hubMusic],
              ['art', 'Art', 'ENDEAVORS', icons.hubArt],
            ] as const
          ).map(([to, big, small, icon]) => (
            <Link key={to} to={to} className="sc-card">
              <img src={icon} alt="" draggable={false} className="sc-card-icon" />
              <span className="sc-card-text">
                <span className="sc-card-big">{big}</span>
                <span className="sc-card-small">{small}</span>
              </span>
            </Link>
          ))}
        </>
      );
    case 'software':
      return (
        <>
          <h1>Software</h1>
          <h2>Projects</h2>
          <p>Some of the software I have shipped, each under a deadline with other people in the room.</p>
          <Resume />
          {PROJECTS.map((p) => (
            <section key={p.name} className="sc-proj">
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
            </section>
          ))}
        </>
      );
    case 'music':
      return (
        <>
          <h1>Music</h1>
          <h2>Ventures</h2>
          <p>Nothing here yet. I have not released any music, and I would rather leave this page honest than fill it with made-up tracks.</p>
          <p>
            Back to <Link to="projects">PROJECTS</Link>.
          </p>
        </>
      );
    case 'art':
      return (
        <>
          <h1>Art</h1>
          <h2>Endeavors</h2>
          <p>
            No standalone art portfolio yet. The closest thing is my film background and the visual side of the software
            projects, such as the generated gallery rooms in Visual Eyes.
          </p>
          <img src={asset('ve-room-night.jpg')} alt="" draggable={false} className="sc-art" />
          <p>
            More on that project in <Link to="software">SOFTWARE</Link>.
          </p>
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
            <Ext href={SITE}>Personal site</Ext> | <Ext href={asset('TommyHuang_Resume.pdf')}>Resume (PDF)</Ext>
          </p>
        </>
      );
    default:
      return null;
  }
}
