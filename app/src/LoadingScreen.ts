import type { ProgressInfo } from './Resources';
import { SHOT } from './shot';

const NAME_WIDTH = 24;
const MAX_LINES = 8;
const NBSP = ' ';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className = '', text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function p(...parts: (string | Node)[]): HTMLParagraphElement {
  const node = el('p');
  node.append(...parts);
  return node;
}

function bold(text: string, className = ''): HTMLElement {
  return el('b', className, text);
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

/** The fake BIOS boot screen. Plain DOM, no framework; text mirrors the reference screen. */
export default class LoadingScreen {
  private root = el('div', 'bios');
  private bootText = el('div', 'bios-text');
  private loadingLine = el('p', 'loading', 'WAIT');
  private list = el('div', 'bios-list');
  private doneLine = el('p');
  private popup = el('div', 'bios-popup-wrap');
  private popupCursor = el('div', 'bios-cursor-wrap');
  private lines: string[] = [];

  constructor(parent: HTMLElement, private onStart: () => void, webglOk: boolean) {
    parent.appendChild(this.root);
    this.root.append(this.popupCursor);
    this.popupCursor.append(el('span', 'blinking-cursor'));
    this.popupCursor.style.display = 'none';

    if (!webglOk) {
      this.root.append(this.buildError());
      return;
    }
    this.buildBootText();
    this.root.append(this.bootText, this.buildPopup());
  }

  private buildBootText() {
    const header = el('div', 'loading-screen-header');
    const logo = el('div');
    logo.append(p(bold('Tommy Huang,')), p(bold('Software Engineer')));
    const info = el('div', 'bios-header-info');
    info.append(p('Released: 01/13/2000'), p('THBIOS (C)2000 Tommy Huang Inc.,'));
    header.append(logo, info);

    const body = el('div', 'loading-screen-body');
    this.doneLine.style.display = 'none';
    this.doneLine.append(
      'All Content Loaded, launching ',
      bold("'Tommy Huang Portfolio Showcase'"),
      ' V1.0',
    );
    body.append(
      p('HSP S13 2000-2022 Special UC131S'),
      el('div', 'spacer'),
      p('HSP Showcase(tm) XX 113'),
      p('Checking RAM : 14000 OK'),
      el('div', 'spacer'),
      el('div', 'spacer'),
      this.loadingLine,
      el('div', 'spacer'),
      this.list,
      el('div', 'spacer'),
      this.doneLine,
      el('div', 'spacer'),
      el('span', 'blinking-cursor'),
    );

    const footer = el('div', 'loading-screen-footer');
    footer.append(
      p('Press ', bold('DEL'), ' to enter SETUP , ', bold('ESC'), ' to skip memory test'),
      p(today()),
    );
    this.bootText.append(header, body, footer);
  }

  private buildPopup(): HTMLElement {
    this.popup.classList.add('bios-popup-container');
    const box = el('div', 'bios-popup');
    const mobileWarning = el('div', 'bios-warning');
    mobileWarning.append(
      el('br'),
      p('WARNING: This experience is best viewed on'),
      p('a desktop or laptop computer.'),
      el('br'),
    );
    for (const line of mobileWarning.querySelectorAll('p')) line.style.color = 'yellow';
    mobileWarning.style.display = 'none';
    const updateWarning = () => {
      mobileWarning.style.display = window.innerWidth < 768 ? 'block' : 'none';
    };
    updateWarning();
    window.addEventListener('resize', updateWarning);

    const prompt = el('div', 'bios-prompt');
    prompt.append(p('Click start to begin' + NBSP), el('span', 'blinking-cursor'));

    const button = el('div', 'bios-start-button');
    button.append(p('START'));
    button.addEventListener('click', () => this.start());
    const buttonRow = el('div', 'bios-button-row');
    buttonRow.append(button);

    box.append(p('Tommy Huang Portfolio Showcase 2026'), mobileWarning, prompt, buttonRow);
    this.popup.append(box);
    return this.popup;
  }

  private buildError(): HTMLElement {
    const wrap = el('div', 'bios-popup-container');
    wrap.style.opacity = '1';
    const box = el('div', 'bios-popup');
    box.append(
      p(bold('CRITICAL ERROR:', 'red'), ' No WebGL Detected'),
      el('div', 'spacer'),
      el('div', 'spacer'),
      p('WebGL is required to run this site.'),
      p('Please enable it or switch to a browser which supports WebGL'),
    );
    wrap.append(box);
    return wrap;
  }

  /** Called once per loaded file. */
  onProgress(info: ProgressInfo) {
    const pad = NBSP.repeat(Math.max(0, NAME_WIDTH - info.name.length));
    this.lines.push(`Loaded ${info.name}${pad} ... ${Math.round(info.progress * 100)}%`);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.list.replaceChildren(...this.lines.map((l) => p(l)));

    const finished = info.progress >= 1;
    this.loadingLine.className = finished ? '' : 'loading';
    this.loadingLine.textContent = finished
      ? 'FINISHED LOADING RESOURCES'
      : `LOADING RESOURCES (${info.loaded}/${info.toLoad})`;
    if (finished) {
      this.doneLine.style.display = '';
      this.showPopupSoon();
    }
  }

  onError(name: string) {
    const line = p(`ERROR: could not load ${name}`);
    line.style.color = 'red';
    this.list.append(line);
  }

  /** 1000 ms wait, fade the boot text, 500 ms more, then the popup. No waiting in shot mode. */
  private showPopupSoon() {
    if (SHOT) {
      this.showPopup();
      return;
    }
    setTimeout(() => {
      this.bootText.style.opacity = '0';
      this.popupCursor.style.display = '';
      setTimeout(() => this.showPopup(), 500);
    }, 1000);
  }

  private showPopup() {
    if (SHOT) this.bootText.style.display = 'none';
    this.popupCursor.style.display = 'none';
    this.popup.style.opacity = '1';
  }

  /** Shot mode: skip the BIOS entirely. */
  hide() {
    this.root.style.display = 'none';
  }

  private start() {
    this.root.style.opacity = '0';
    this.root.style.transform = 'scale(1.1)';
    this.root.style.pointerEvents = 'none';
    this.onStart();
  }
}
