import { RESUME_FILE } from '../data/profile';

const dir = `${import.meta.env.BASE_URL}showcase/`;
const pdf = dir + RESUME_FILE;

// The Résumé on a phone. iOS Safari shows no PDF inside <object>, so this shows the page as a picture
// (tools/resume-pages.sh), as wide as the screen. Open PDF and a tap on the page both go to the PDF itself, where
// Safari's own viewer zooms and downloads; zooming here would zoom the top bar and the Dock with it.
export default function MobileResume() {
  return (
    <div className="m-resume">
      <div className="resume-bar m-resume-bar">
        <span>{RESUME_FILE}</span>
        <a className="aqua-btn primary" href={pdf}>
          Open PDF
        </a>
      </div>
      <a className="m-resume-page" href={pdf} aria-label="Open the résumé PDF">
        <img src={`${dir}resume-p1.png`} alt="Résumé of Min-Chia (Tommy) Huang, page 1" draggable={false} />
      </a>
    </div>
  );
}
