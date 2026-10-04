// Two always-visible buttons after boot, so nobody has to find a key or explore the scene to
// reach the résumé.
export type EntryTarget = 'resume' | 'about-site';

export default class EntryButtons {
  readonly root = document.createElement('nav');

  constructor(parent: HTMLElement, onChoose: (target: EntryTarget) => void) {
    this.root.className = 'entry-buttons';
    this.root.setAttribute('aria-label', 'Quick links');
    const add = (label: string, target: EntryTarget) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      // Camera listens for mousedown on the document; a click here must not also move the camera.
      b.addEventListener('mousedown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); onChoose(target); });
      this.root.append(b);
    };
    add('Résumé', 'resume');
    add('How this site was built', 'about-site');
    parent.append(this.root);
  }
}

/** Ask the OS in the monitor iframe to open a window (protocol: os/src/remote.ts). */
export function openInOS(target: EntryTarget): void {
  const frame = document.getElementById('computer-screen') as HTMLIFrameElement | null;
  const msg = target === 'resume' ? { type: 'open', app: 'showcase', page: 'resume' } : { type: 'open', app: 'about-site' };
  frame?.contentWindow?.postMessage(msg, window.location.origin);
}
