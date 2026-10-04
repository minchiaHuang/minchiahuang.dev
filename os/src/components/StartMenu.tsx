import { icons } from '../icons';

interface Props {
  shuttingDown: boolean; // the item stays highlighted until the screen goes dark
  onShutDown: () => void;
}

export default function StartMenu({ shuttingDown, onShutDown }: Props) {
  return (
    <div className="start-menu raised" data-menu-zone>
      <div className="start-banner">
        <span>TommyOS</span>
      </div>
      <div className="start-items">
        <div className="start-spacer" />
        <hr className="start-separator" />
        <button className={`start-item${shuttingDown ? ' is-on' : ''}`} onClick={onShutDown}>
          <img src={icons.computer} alt="" draggable={false} />
          <span>
            Sh<u>u</u>t down...
          </span>
        </button>
      </div>
    </div>
  );
}
