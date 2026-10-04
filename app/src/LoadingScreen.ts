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

/** The boot screen: plain DOM, no framework. */
export default class LoadingScreen {
  private root = el('div', 'bios');
  private bootText = el('div', 'bios-text');
  private loadingLine = el('p', 'loading', 'WAIT');
  private list = el('div', 'bios-list');
  private doneLine = el('p');
  private popup = el('div', 'bios-popup-wrap');
  private popupCursor = el('div', 'bios-cursor-wrap');
  private lines: string[] = [];

  constructor(parent: HTMLElement, private onStart: () => void) {
    parent.appendChild(this.root);
    this.root.append(this.popupCursor);
    this.popupCursor.append(el('span', 'blinking-cursor'));
    this.popupCursor.style.display = 'none';

    this.buildBootText();
    this.root.append(this.bootText, this.buildPopup());
  }

  private buildBootText() {
    const header = el('div', 'loading-screen-header');
    const logo = el('div');
    logo.append(p(bold('Min-Chia (Tommy) Huang')), p('Software Engineer · Full-stack · AI & automation'));
    const info = el('div', 'bios-header-info');
    info.append(p('MH-BIOS 2.6'), p('minchiahuang.dev'));
    header.append(logo, info);

    const body = el('div', 'loading-screen-body');
    this.doneLine.style.display = 'none';
    this.doneLine.textContent = 'All assets loaded. Starting MH-OS ...';
    body.append(
      p('Scene ........ scripted in Blender (bpy), baked lightmaps'),
      p('Display ...... CRT 1024x768, CSS3D'),
      p('Memory test .. skipped (it is a website)'),
      el('div', 'spacer'),
      p('Loading assets:'),
      this.loadingLine,
      el('div', 'spacer'),
      this.list,
      el('div', 'spacer'),
      this.doneLine,
      el('div', 'spacer'),
      el('span', 'blinking-cursor'),
    );

    // The link is the way out for anyone who would rather not wait for the 3D scene.
    const plain = el('a', '', '/os/');
    plain.href = '/os/';
    const footer = el('div', 'loading-screen-footer');
    footer.append(p('Press ', bold('START'), ' to boot · Prefer a plain page? Open ', plain));
    this.bootText.append(header, body, footer);
  }

  private buildPopup(): HTMLElement {
    this.popup.classList.add('bios-popup-container');
    const box = el('div', 'bios-popup');
    const prompt = el('div', 'bios-prompt');
    prompt.append(p('Click START to begin' + NBSP), el('span', 'blinking-cursor'));

    const button = el('div', 'bios-start-button');
    button.append(p('START'));
    button.addEventListener('click', () => this.start());
    const buttonRow = el('div', 'bios-button-row');
    buttonRow.append(button);

    box.append(p('minchiahuang.dev'), prompt, buttonRow);
    this.popup.append(box);
    return this.popup;
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
