import { aqua } from '../apps';
import { EMAIL, LINKS } from '../data/profile';

// Mail-flavoured contact card: the address and the two profiles.
export default function Contact() {
  return (
    <div className="contact">
      <div className="contact-head">
        <img src={aqua('mail.png')} alt="" draggable={false} />
        <div>
          <h2>Get in touch</h2>
          <p>Looking for part-time, casual or internship work in Sydney. Email is the fastest way to reach me.</p>
        </div>
      </div>
      <dl className="contact-rows">
        <div className="contact-row">
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </dd>
        </div>
        {LINKS.map((l) => (
          <div key={l.label} className="contact-row">
            <dt>{l.label}</dt>
            <dd>
              <a href={l.href} target="_blank" rel="noreferrer">
                {l.href.replace(/^https:\/\/(www\.)?/, '')}
              </a>
            </dd>
          </div>
        ))}
      </dl>
      <div className="contact-actions">
        <a className="aqua-btn primary" href={`mailto:${EMAIL}`}>
          New Message
        </a>
      </div>
    </div>
  );
}
