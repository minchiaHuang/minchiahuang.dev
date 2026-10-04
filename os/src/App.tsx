import { useCallback, useEffect, useReducer, useState } from 'react';
import type { AppId } from './apps';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import StartMenu from './components/StartMenu';
import Window from './components/Window';
import FiveLetters from './components/FiveLetters';
import Credits from './components/Credits';
import DosGame from './components/DosGame';
import Showcase from './components/Showcase';
import Shutdown from './components/Shutdown';
import { activeId, initialSystem, pressedId, reduce } from './windows';
import type { Action } from './windows';

// Screenshot states for review: ?shot=startmenu | selected | windows | maximized | minimized | shutdown
// | fiveletters | fiveletters-win | fiveletters-lose | credits | dos-oregon | dos-doom | dos-scrabble.
const shot = new URLSearchParams(location.search).get('shot');

const initialOpen = (): AppId[] => {
  if (shot === 'windows') return ['showcase', 'fiveletters', 'credits'];
  if (shot?.startsWith('fiveletters')) return ['showcase', 'fiveletters'];
  if (shot === 'credits') return ['showcase', 'credits'];
  if (shot?.startsWith('dos-')) return ['showcase', shot.slice(4) as AppId];
  return ['showcase'];
};
const shotGuesses = shot === 'fiveletters-win' ? ['TODAY', 'TOMMY'] : shot === 'fiveletters-lose' ? Array(6).fill('CRANE') : shot === 'fiveletters' ? ['CRANE', 'MONEY'] : [];

function Content({ id, active, minimized }: { id: AppId; active: boolean; minimized: boolean }) {
  switch (id) {
    case 'showcase':
      return <Showcase />;
    case 'fiveletters':
      return <FiveLetters active={active} initial={shotGuesses} />;
    case 'credits':
      return <Credits />;
    default:
      // Minimizing unmounts the game so its emulator and audio stop; restoring starts it again.
      return minimized ? null : <DosGame id={id} />;
  }
}

export default function App() {
  const [selected, setSelected] = useState<AppId | null>(shot === 'selected' ? 'fiveletters' : null);
  // Icon whose window was opened last: its label shows a dotted red focus rectangle until any window is pressed.
  const [opened, setOpened] = useState<AppId | null>(null);
  // The icon column jumps up 9px when the first window opens (My Showcase is open at load) and resets on reboot.
  const [shifted, setShifted] = useState(true);
  const [menuOpen, setMenuOpen] = useState(shot === 'startmenu');
  const [sys, dispatch] = useReducer(reduce, undefined, () => {
    let s = initialSystem({ w: window.innerWidth, h: window.innerHeight }, initialOpen());
    if (shot === 'windows' || shot === 'credits') s = reduce(s, { type: 'focus', id: 'credits' });
    if (shot === 'maximized') s = reduce(s, { type: 'toggleMax', id: 'showcase' });
    if (shot === 'minimized') s = reduce(s, { type: 'minimize', id: 'showcase' });
    return s;
  });
  // Click time of "Shut down...", non-null while the shutdown screen is up.
  const [shutdownAt, setShutdownAt] = useState<Date | null>(shot === 'shutdown' ? new Date() : null);
  const active = activeId(sys);
  const pressed = pressedId(sys);

  // Opening a window or pressing inside one clears the desktop icon selection.
  const send = useCallback((a: Action) => {
    if (a.type === 'open' || a.type === 'focus' || a.type === 'taskbar') setSelected(null);
    if (a.type === 'focus') setOpened(null);
    if (a.type === 'close') setOpened((o) => (o === a.id ? null : o));
    dispatch(a);
  }, []);

  // The OS fills the iframe: follow the size of the root element (100vw x 100vh).
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => dispatch({ type: 'viewport', w: root.clientWidth, h: root.clientHeight });
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Any press outside the Start button and the menu closes the menu.
  const onRootMouseDown = (e: React.MouseEvent) => {
    if (menuOpen && !(e.target as Element).closest('[data-menu-zone]')) setMenuOpen(false);
  };

  const finishShutdown = useCallback(() => {
    dispatch({ type: 'closeAll' });
    setSelected(null);
    setOpened(null);
    setShifted(false);
    setMenuOpen(false);
    setShutdownAt(null);
  }, []);

  return (
    <div className="screen" onMouseDown={onRootMouseDown}>
      <Desktop
        selected={selected}
        opened={opened}
        shifted={shifted}
        onSelect={(id) => {
          setSelected(id);
          dispatch({ type: 'blur' });
        }}
        onOpen={(id) => {
          setOpened(id);
          setShifted(true);
          send({ type: 'open', id });
        }}
      />
      <div className="win-layer">
        {sys.wins.map((w) => (
          <Window key={w.id} win={w} active={active === w.id} dispatch={send}>
            <Content id={w.id} active={active === w.id} minimized={w.minimized} />
          </Window>
        ))}
      </div>
      {menuOpen && (
        <StartMenu
          shuttingDown={shutdownAt !== null}
          onShutDown={() => {
            // The menu stays open (hidden by the dark screen) and the active window turns inactive.
            dispatch({ type: 'blur' });
            setShutdownAt(new Date());
          }}
        />
      )}
      <Taskbar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
        wins={sys.wins}
        pressed={pressed}
        onTaskClick={(id) => send({ type: 'taskbar', id })}
      />
      {shutdownAt && <Shutdown clickedAt={shutdownAt} onDone={finishShutdown} />}
    </div>
  );
}
