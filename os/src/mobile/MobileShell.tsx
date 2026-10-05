import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { AppId } from '../apps';
import type { ShowcasePage } from '../remote';
import { isKeyboardOpen } from '../phone';
import Showcase from '../components/Showcase';
import Projects from '../components/Projects';
import Contact from '../components/Contact';
import Games from '../components/Games';
import FiveLetters from '../components/FiveLetters';
import Terminal from '../components/Terminal';
import HardDisk from '../components/HardDisk';
import Credits from '../components/Credits';
import DosGame from '../components/DosGame';
import Shutdown from '../components/Shutdown';
import AboutCard from './AboutCard';
import MobileResume from './MobileResume';
import TopBar from './TopBar';
import MobileDock from './MobileDock';
import HomeGrid from './HomeGrid';
import { dockLit, isGame, leavesProjects, reduceMobile, startState, titleOf } from './state';
import type { MobileAction } from './state';
import './mobile.css';

type Request<T> = (T & { n: number }) | null; // n changes on every request so asking twice still counts (as in App.tsx)

const shot = new URLSearchParams(location.search).get('shot');

// The OS on a phone. main.tsx picks it for a standalone /os/ page whose short side is <= 600 px; the iMac's screen in
// the 3D scene always gets App.tsx. One full-screen app at a time under a 44 px top bar, the Dock as a tab bar, and the
// Aqua desktop grid when no app is open. The content components are App.tsx's own; windows.ts plays no part here.
export default function MobileShell() {
  const [state, dispatch] = useReducer(reduceMobile, location.search, startState);
  const [showcasePage, setShowcasePage] = useState<Request<{ page: ShowcasePage }>>(null);
  const [projectReq, setProjectReq] = useState<Request<{ slug: string }>>(null);
  const [projectFilter, setProjectFilter] = useState<Request<{ hackathons: true }>>(null);
  const [shutdownAt, setShutdownAt] = useState<Date | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const { current, info } = state;

  const send = useCallback(
    (a: MobileAction) => {
      if (leavesProjects(state, a)) {
        setProjectReq(null);
        setProjectFilter(null);
      }
      dispatch(a);
    },
    [state],
  );
  const open = useCallback((id: AppId) => send({ type: 'open', id }), [send]);
  const showPage = useCallback(
    (page: ShowcasePage) => {
      setShowcasePage((prev) => ({ page, n: (prev?.n ?? 0) + 1 }));
      send({ type: 'moreInfo' });
    },
    [send],
  );

  // iOS keeps 100dvh when the keyboard opens and lets the keyboard cover the bottom of the page. While it is up, size
  // the shell to the visible part (--m-vh) and hide the Dock (.kb-open), so what sits at the bottom stays above it.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = shell.current;
    if (!vv || !el) return;
    const sync = () => {
      const up = isKeyboardOpen(window.innerHeight, vv.height, vv.scale);
      el.classList.toggle('kb-open', up);
      if (up) {
        el.style.setProperty('--m-vh', `${vv.height * vv.scale}px`);
        window.scrollTo(0, 0); // iOS scrolls the page to show the field; the shell already fits, so pin it back
      } else {
        el.style.removeProperty('--m-vh');
      }
    };
    sync();
    vv.addEventListener('resize', sync);
    return () => vv.removeEventListener('resize', sync);
  }, []);

  // Restart: straight back to the Showcase card. Shut Down: the shutdown log, then the empty desktop (as on the iMac).
  const restart = () => {
    setShowcasePage(null);
    setProjectReq(null);
    setProjectFilter(null);
    dispatch({ type: 'open', id: 'showcase' });
  };
  const reboot = useCallback(() => {
    setShowcasePage(null);
    setProjectReq(null);
    setProjectFilter(null);
    setShutdownAt(null);
    dispatch({ type: 'home' });
  }, []);

  const content = (id: AppId) => {
    switch (id) {
      case 'showcase':
        return info ? (
          <Showcase request={showcasePage ?? undefined} />
        ) : (
          <AboutCard onResume={() => open('resume')} onProjects={() => open('projects')} onMoreInfo={() => showPage('about')} onContact={() => open('contact')} />
        );
      case 'projects':
        return <Projects request={projectReq ?? undefined} filter={projectFilter ?? undefined} tapToOpen layout="list" />;
      case 'resume':
        return <MobileResume />;
      case 'contact':
        return <Contact />;
      case 'games':
        return <Games onOpen={open} tapToOpen />;
      case 'fiveletters':
        return <FiveLetters active />;
      case 'terminal':
        return (
          <Terminal
            // Not focused on open: on a phone that would throw the keyboard over the screen. A tap on it focuses.
            active={false}
            onEffect={(e) => {
              if (e.open === 'projects') setProjectReq((prev) => ({ slug: e.project, n: (prev?.n ?? 0) + 1 }));
              open(e.open);
            }}
          />
        );
      case 'harddisk':
        return (
          <HardDisk
            tapToOpen
            onProjects={() => open('projects')}
            onHackathons={() => {
              setProjectFilter((prev) => ({ hackathons: true, n: (prev?.n ?? 0) + 1 }));
              open('projects');
            }}
            onExperience={() => showPage('experience')}
          />
        );
      case 'credits':
        return <Credits />;
      default:
        // A DOS game. Opening anything else unmounts it, which stops the emulator and its sound.
        return (
          <div className="m-game">
            <DosGame id={id} />
          </div>
        );
    }
  };

  return (
    <div ref={shell} className={`screen m-shell${isGame(current) ? ' m-gaming' : ''}`}>
      <TopBar
        title={titleOf(state)}
        initialMenu={shot === 'm-menu'}
        onClose={() => send({ type: 'close' })}
        onAbout={() => open('credits')}
        onRestart={restart}
        onShutDown={() => setShutdownAt(new Date())}
      />
      <main className="m-main">
        <div className="desktop" aria-hidden="true" />
        {current === null ? (
          <HomeGrid onOpen={open} />
        ) : (
          <div key={current} className={`m-pane${current === 'showcase' && !info ? '' : ' is-app'}`}>
            {content(current)}
          </div>
        )}
      </main>
      <MobileDock lit={dockLit(state)} onOpen={open} />
      {shutdownAt && <Shutdown clickedAt={shutdownAt} onDone={reboot} />}
    </div>
  );
}
