import { appById, type AppId } from '../apps';
import type { WinState } from '../windows';
import { icons } from '../icons';
import Clock from './Clock';

interface Props {
  menuOpen: boolean;
  onToggleMenu: () => void;
  wins: WinState[];
  pressed: AppId | null;
  onTaskClick: (id: AppId) => void;
}

export default function Taskbar({ menuOpen, onToggleMenu, wins, pressed, onTaskClick }: Props) {
  return (
    <div className="taskbar">
      <button
        className={`start-button raised${menuOpen ? ' is-pressed' : ''}`}
        data-menu-zone
        onMouseDown={onToggleMenu}
      >
        <img src={icons.startFlag} alt="" draggable={false} />
        <span>Start</span>
      </button>
      <div className="task-buttons">
        {wins.map(({ id }) => {
          const app = appById(id);
          return (
            <button
              key={id}
              className={`task-button raised${pressed === id ? ' is-pressed' : ''}`}
              onMouseDown={() => onTaskClick(id)}
            >
              <img src={icons[app.icon]} alt="" draggable={false} />
              <span>{app.title}</span>
            </button>
          );
        })}
      </div>
      <div className="tray sunken">
        <img src={icons.speaker} alt="" draggable={false} />
        <Clock />
      </div>
    </div>
  );
}
