import { RESUME_FILE } from '../data/profile';

const pdf = `${import.meta.env.BASE_URL}showcase/${RESUME_FILE}`;

// Preview-style viewer: the browser's own PDF viewer in the window, with a Download button.
// Browsers without an inline PDF viewer (most phones) get the fallback link inside <object>.
export default function Resume() {
  return (
    <div className="resume">
      <div className="resume-bar">
        <span>{RESUME_FILE}</span>
        <a className="aqua-btn primary" href={pdf} download={RESUME_FILE}>
          Download
        </a>
      </div>
      <object className="resume-doc" data={`${pdf}#toolbar=0&view=FitH`} type="application/pdf" aria-label="Résumé">
        <div className="resume-fallback">
          <p>This browser cannot show the PDF here.</p>
          <a className="aqua-btn" href={pdf} target="_blank" rel="noreferrer">
            Open résumé (PDF)
          </a>
        </div>
      </object>
    </div>
  );
}
