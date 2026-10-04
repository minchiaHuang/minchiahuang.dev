// Portfolio data shared by Showcase, Projects, Contact and Terminal. Plain data with no JSX and no
// import.meta, so the Terminal parser can import it under `node --test`.

export const SITE = 'https://minchiahuang.dev';
export const EMAIL = 'minchia.huang.dev@gmail.com';
export const RESUME_FILE = 'MinChia-Tommy-Huang-Resume.pdf';
export const LINKS = [
  { label: 'GitHub', href: 'https://github.com/minchiaHuang' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/minchiahuang/' },
];

export interface Project {
  slug: string; // folder name in Projects and in the Terminal
  name: string;
  meta: string;
  blurb: string;
  image?: string; // file in public/showcase/
  links: { label: string; href: string }[];
}

export const PROJECTS: Project[] = [
  {
    slug: 'cookpilot',
    name: 'CookPilot',
    meta: 'iOS | ICON x Lyra Hackathon, 1st place | 2026',
    blurb:
      'Look at your fridge through Ray-Ban Meta glasses and it tells you what you can cook tonight, read into your ear step by step. I owned the iOS build end to end: SwiftUI, the step state machine, voice control and the model service layer.',
    image: 'cookpilot-home.png',
    links: [{ label: 'Case study', href: `${SITE}/cookpilot.html` }],
  },
  {
    slug: 'visual-eyes',
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
    slug: 'learnguard',
    name: 'LearnGuard',
    meta: 'MCP | OpenAI Codex Hackathon',
    blurb:
      'A gate that makes a coding assistant earn its permissions. The red-team suite blocks 8 of 8 attacks while letting legitimate actions through.',
    links: [{ label: 'GitHub', href: 'https://github.com/minchiaHuang/LearnGuard' }],
  },
  {
    slug: 'vaxagent',
    name: 'VaxAgent',
    meta: 'FastAPI | HSIL, Harvard T.H. Chan',
    blurb:
      'Tumour mutation data in, ranked neoantigen candidates out, with every step traceable back to the file it came from.',
    links: [{ label: 'GitHub', href: 'https://github.com/minchiaHuang/VaxAgent' }],
  },
  {
    slug: 'datathon-2026',
    name: 'Accenture x SUBAA Datathon 2026',
    meta: 'Python | Finalist, top 4 of 40 teams',
    blurb:
      'Analysed 105k+ records across four HR datasets and built a reusable matplotlib style module so new figures matched the existing Excel charts. Traced all 24 cited figures back to the raw CSVs before the final.',
    links: [],
  },
];

export const ABOUT =
  'Master of IT student at UTS (Enterprise Software Development), graduating July 2027. I build iOS and full-stack ' +
  'software from Sydney and came to software from film. Looking for part-time, casual or internship work.';
