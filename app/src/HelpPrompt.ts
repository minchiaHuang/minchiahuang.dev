import { SHOT } from './shot';
import { typeText } from './Typewriter';

const HELP_TEXT = 'Click anywhere to begin';

/** "Click anywhere to begin" typed at the bottom after START. Fades on the first click or entering the monitor. */
export default class HelpPrompt {
  private root = document.createElement('div');
  private label = document.createElement('p');
  private visible = true;

  constructor(parent: HTMLElement, private onTick: () => void) {
    this.root.className = 'help-prompt';
    this.root.style.display = 'none'; // nothing shows until the first character
    const cursorBox = document.createElement('div');
    cursorBox.className = 'help-cursor';
    const cursor = document.createElement('div');
    cursor.className = 'blinking-cursor';
    cursorBox.append(cursor);
    this.root.append(this.label, cursorBox);
    parent.append(this.root);

    if (SHOT) {
      // Screenshot state: already fully typed.
      this.label.textContent = HELP_TEXT;
      this.root.style.display = 'flex';
      return;
    }

    document.addEventListener('mousedown', () => this.hide());
    window.addEventListener('enterMonitor', () => this.hide());
    setTimeout(() => {
      typeText({
        text: () => HELP_TEXT,
        onText: (typed) => {
          this.label.textContent = typed;
          this.root.style.display = 'flex';
        },
        delay: () => Math.random() * 120 + 50,
        onChar: this.onTick,
        stop: () => !this.visible,
      });
    }, 500);
  }

  private hide() {
    if (!this.visible) return;
    this.visible = false;
    this.root.classList.add('hide');
    this.onTick();
  }
}
