import { typeText } from './Typewriter';

const NAME_TEXT = 'Tommy Huang';
const TITLE_TEXT = 'Software Engineer';

const asset = (file: string) => import.meta.env.BASE_URL + 'textures/UI/' + file;

function row(text: string): { box: HTMLDivElement; p: HTMLParagraphElement } {
  const box = document.createElement('div');
  box.className = 'info-row';
  const p = document.createElement('p');
  box.append(p);
  p.textContent = text;
  return { box, p };
}

/**
 * Top-left card: name, title and a live clock typed out, then the mute and free-cam buttons.
 * It stays hidden until the first click, hides again on enterMonitor and returns on leftMonitor.
 * Everything in it carries id="prevent-click" through its wrapper so Camera ignores clicks on it.
 */
export default class InfoOverlay {
  private wrapper = document.createElement('div');
  private lastRow = document.createElement('div');
  private shown = false;
  private typingStarted = false;
  private time = new Date().toLocaleTimeString();
  private clockText?: HTMLParagraphElement;
  private textDone = false;

  constructor(parent: HTMLElement, private onTick: () => void) {
    this.wrapper.id = 'prevent-click';
    this.wrapper.className = 'interface-wrapper';
    this.lastRow.className = 'info-last-row';
    parent.append(this.wrapper);

    setInterval(() => {
      this.time = new Date().toLocaleTimeString();
      if (this.textDone && this.clockText) this.clockText.textContent = this.time;
    }, 1000);

    // First click anywhere reveals the card; entering the monitor cancels that for good.
    const reveal = () => this.setVisible(true);
    document.addEventListener('mousedown', reveal, { once: true });
    window.addEventListener('enterMonitor', () => {
      document.removeEventListener('mousedown', reveal);
      this.setVisible(false);
    });
    window.addEventListener('leftMonitor', () => this.setVisible(true));
  }

  private setVisible(on: boolean) {
    this.shown = on;
    this.wrapper.classList.toggle('visible', on);
    if (on && !this.typingStarted) {
      this.typingStarted = true;
      setTimeout(() => this.typeAll(), 400);
    }
  }

  private typeAll() {
    const delay = () => Math.random() * 50 + 50;
    const sound = () => { if (this.shown) this.onTick(); };
    // A row only appears when its first character does.
    const line = (r: { box: HTMLElement; p: HTMLElement }, into: () => HTMLElement) => (t: string) => {
      if (!r.box.isConnected) into().append(r.box);
      r.p.textContent = t;
    };
    const name = row('');
    const title = row('');
    const clock = row('');
    this.clockText = clock.p;
    typeText({
      text: () => NAME_TEXT, onText: line(name, () => this.wrapper), delay, onChar: sound,
      done: () => typeText({
        text: () => TITLE_TEXT, onText: line(title, () => this.wrapper), delay, onChar: sound,
        done: () => typeText({
          text: () => this.time,
          onText: line(clock, () => {
            if (!this.lastRow.isConnected) this.wrapper.append(this.lastRow);
            return this.lastRow;
          }),
          delay, onChar: sound,
          done: () => { this.textDone = true; this.showButtons(); },
        }),
      }),
    });
  }

  /** Mute after 250 ms, free cam 250 ms later. */
  private showButtons() {
    setTimeout(() => {
      this.lastRow.append(this.muteButton());
      this.onTick();
      setTimeout(() => {
        this.lastRow.append(this.freeCamButton());
        this.onTick();
      }, 250);
    }, 250);
  }

  private control(img: HTMLImageElement, onDown: () => void, extraClass = ''): HTMLDivElement {
    const box = document.createElement('div');
    box.className = `icon-control ${extraClass}`.trim();
    box.append(img);
    box.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onDown();
    });
    return box;
  }

  private muteButton(): HTMLDivElement {
    const img = document.createElement('img');
    img.className = 'mute-icon';
    img.src = asset('volume_on.svg');
    let muted = false;
    return this.control(img, () => {
      muted = !muted;
      img.src = asset(muted ? 'volume_off.svg' : 'volume_on.svg');
      window.dispatchEvent(new CustomEvent('muteToggle', { detail: muted }));
    });
  }

  private freeCamButton(): HTMLDivElement {
    const img = document.createElement('img');
    img.className = 'cam-icon off';
    img.src = asset('camera.svg');
    let on = false;
    return this.control(img, () => {
      on = !on;
      img.src = asset(on ? 'mouse.svg' : 'camera.svg');
      img.className = `cam-icon ${on ? 'on' : 'off'}`;
      this.onTick();
      window.dispatchEvent(new CustomEvent('freeCamToggle', { detail: on }));
    }, 'cam-control');
  }
}
