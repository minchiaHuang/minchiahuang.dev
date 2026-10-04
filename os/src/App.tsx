import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { DOCK, dockOwner, type AppId } from './apps';
import Desktop, { type DeskKey } from './components/Desktop';
import MenuBar, { type MenuId } from './components/MenuBar';
import Dock from './components/Dock';
import Window from './components/Window';
import FiveLetters from './components/FiveLetters';
import Credits from './components/Credits';
import DosGame from './components/DosGame';
import Showcase from './components/Showcase';
import Shutdown from './components/Shutdown';
import Games from './components/Games';
import HardDisk from './components/HardDisk';
import Projects from './components/Projects';
import Resume from './components/Resume';
import Contact from './components/Contact';
import Terminal from './components/Terminal';
import { activeId, initialSystem, reduce } from './windows';
import type { Action } from './windows';
import { parseOpenMessage, parseOpenQuery } from './remote';
import type { OpenTarget, ShowcasePage } from './remote';

// Screenshot states for review: ?shot=tmenu | dock | games | terminal | projects | resume | contact | selected
// | windows | maximized | minimized | shutdown | fiveletters | fiveletters-win | fiveletters-lose | credits
// | dos-oregon | dos-doom | dos-scrabble, and sc-<page> (Showcase.tsx).
const shot = new URLSearchParams(location.search).get('shot');

const initialOpen = (): AppId[] => {
  if (shot === 'windows') return ['showcase', 'fiveletters', 'credits'];
  if (shot?.startsWith('fiveletters')) return ['showcase', 'fiveletters'];
  if (shot === 'credits') return ['showcase', 'credits'];
  if (shot?.startsWith('dos-')) return ['showcase', shot.slice(4) as AppId];
  if (shot === 'games' || shot === 'tmenu') return ['showcase', 'games'];
  if (shot === 'terminal' || shot === 'projects' || shot === 'resume' || shot === 'contact') return ['showcase', shot];
  return ['showcase'];
};
const shotGuesses = shot === 'fiveletters-win' ? ['TODAY', 'TOMMY'] : shot === 'fiveletters-lose' ? Array(6).fill('CRANE') : shot === 'fiveletters' ? ['CRANE', 'MONEY'] : [];
const shotTerminal = shot === 'terminal' ? ['help', 'cd projects', 'ls'] : [];
// The Figma state frame (42:832) has the pointer resting on Games in the Dock.
const shotDockSlot = shot === 'dock' || shot === 'tmenu' ? DOCK.indexOf('games') : undefined;

type Request<T> = (T & { n: number }) | null; // n changes on every request so asking twice still counts

export default function App() {
  const [selected, setSelected] = useState<DeskKey | null>(shot === 'selected' ? 'hd' : null);
  const [menu, setMenu] = useState<MenuId | null>(shot === 'tmenu' ? 't' : null);
  const [sys, dispatch] = useReducer(reduce, undefined, () => {
    let s = initialSystem({ w: window.innerWidth, h: window.innerHeight }, initialOpen());
    if (shot === 'windows' || shot === 'credits') s = reduce(s, { type: 'focus', id: 'credits' });
    if (shot === 'maximized') s = reduce(s, { type: 'toggleMax', id: 'showcase' });
    // A phone-width standalone page has no room for a floating window: Showcase starts zoomed.
    if (shot !== 'maximized' && window.parent === window && window.innerWidth <= 768) s = reduce(s, { type: 'toggleMax', id: 'showcase' });
    if (shot === 'minimized') s = reduce(s, { type: 'minimize', id: 'showcase' });
    return s;
  });
  // Click time of "Shut Down…", non-null while the shutdown screen is up.
  const [shutdownAt, setShutdownAt] = useState<Date | null>(shot === 'shutdown' ? new Date() : null);
  const active = activeId(sys);

  const [showcasePage, setShowcasePage] = useState<Request<{ page: ShowcasePage }>>(null);
  const [projectReq, setProjectReq] = useState<Request<{ slug: string }>>(null);

  // Opening a window or pressing inside one clears the desktop selection. Closing Showcase or Projects drops the
  // page or project it was last asked for: a window mounts with its request, so a stale one would reopen the old
  // page instead of the start page.
  const send = useCallback((a: Action) => {
    if (a.type === 'open' || a.type === 'focus') setSelected(null);
    if (a.type === 'close' && a.id === 'showcase') setShowcasePage(null);
    if (a.type === 'close' && a.id === 'projects') setProjectReq(null);
    dispatch(a);
  }, []);
  const open = useCallback((id: AppId) => send({ type: 'open', id }), [send]);

  const showPage = useCallback(
    (page: ShowcasePage) => {
      open('showcase');
      setShowcasePage((prev) => ({ page, n: (prev?.n ?? 0) + 1 }));
    },
    [open],
  );
  const openTarget = useCallback((t: OpenTarget) => (t.app === 'showcase' ? showPage(t.page) : open(t.app)), [open, showPage]);

  // The outer page (postMessage) or the URL can ask for a window; see remote.ts.
  useEffect(() => {
    const fromUrl = parseOpenQuery(location.search);
    if (fromUrl) openTarget(fromUrl);
    const onMessage = (e: MessageEvent) => {
      // Only the embedding page, from our own origin, may open windows.
      if (e.source !== window.parent || e.origin !== location.origin) return;
      const t = parseOpenMessage(e.data);
      if (t) openTarget(t);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [openTarget]);

  // The OS fills the iframe: follow the size of the root element (100vw x 100vh).
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => dispatch({ type: 'viewport', w: root.clientWidth, h: root.clientHeight });
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Back to a fresh, empty desktop: what the shutdown screen ends in.
  const reboot = useCallback(() => {
    dispatch({ type: 'closeAll' });
    setSelected(null);
    setMenu(null);
    setShutdownAt(null);
    setShowcasePage(null);
    setProjectReq(null);
  }, []);
  // NEEDS DECISION: Restart skips the shutdown log; it reboots at once and reopens Showcase, as at first load.
  const restart = useCallback(() => {
    reboot();
    dispatch({ type: 'open', id: 'showcase' });
  }, [reboot]);

  const running = useMemo(() => new Set(sys.wins.map((w) => dockOwner(w.id)).filter((id): id is AppId => id !== null)), [sys.wins]);

  const content = (id: AppId, isActive: boolean, minimized: boolean) => {
    switch (id) {
      case 'showcase':
        return <Showcase request={showcasePage ?? undefined} />;
      case 'fiveletters':
        return <FiveLetters active={isActive} initial={shotGuesses} />;
      case 'credits':
        return <Credits />;
      case 'games':
        return <Games onOpen={open} />;
      case 'harddisk':
        return <HardDisk onProjects={() => open('projects')} onExperience={() => showPage('experience')} />;
      case 'projects':
        return <Projects request={projectReq ?? undefined} />;
      case 'resume':
        return <Resume />;
      case 'contact':
        return <Contact />;
      case 'terminal':
        return (
          <Terminal
            active={isActive}
            initial={shotTerminal}
            onEffect={(e) => {
              if (e.open === 'projects') setProjectReq((prev) => ({ slug: e.project, n: (prev?.n ?? 0) + 1 }));
              open(e.open);
            }}
          />
        );
      default:
        // Minimizing unmounts the game so its emulator and audio stop; restoring starts it again.
        return minimized ? null : <DosGame id={id} />;
    }
  };

  return (
    <div className="screen">
      <Desktop
        selected={selected}
        onSelect={(key) => {
          setSelected(key);
          dispatch({ type: 'blur' });
        }}
        onOpen={open}
      />
      <div className="win-layer">
        {sys.wins.map((w) => (
          <Window key={w.id} win={w} active={active === w.id} dispatch={send}>
            {content(w.id, active === w.id, w.minimized)}
          </Window>
        ))}
      </div>
      <MenuBar
        open={menu}
        setOpen={setMenu}
        active={active}
        wins={sys.wins}
        onAbout={() => open('credits')}
        onRestart={restart}
        onShutDown={() => {
          dispatch({ type: 'blur' });
          setShutdownAt(new Date());
        }}
        onClose={(id) => send({ type: 'close', id })}
        onMinimize={(id) => send({ type: 'minimize', id })}
        onFocus={(id) => send({ type: 'open', id })}
      />
      <Dock running={running} onOpen={open} hoverSlot={shotDockSlot} />
      {shutdownAt && <Shutdown clickedAt={shutdownAt} onDone={reboot} />}
    </div>
  );
}
