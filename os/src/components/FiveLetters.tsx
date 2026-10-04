import { useCallback, useEffect, useState } from 'react';
import { ANSWER, WORDS } from '../data/words';

type Mark = 'hit' | 'near' | 'miss';
const ROWS = 6;
const COLS = 5;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Standard Wordle scoring, including repeated letters (TOMMY has two M).
function score(guess: string): Mark[] {
  const marks: Mark[] = Array(COLS).fill('miss');
  const left: Record<string, number> = {};
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === ANSWER[i]) marks[i] = 'hit';
    else left[ANSWER[i]] = (left[ANSWER[i]] ?? 0) + 1;
  }
  for (let i = 0; i < COLS; i++) {
    if (marks[i] !== 'hit' && left[guess[i]] > 0) {
      marks[i] = 'near';
      left[guess[i]]--;
    }
  }
  return marks;
}

interface Props {
  active: boolean;
  initial?: string[]; // pre-submitted guesses, used by ?shot= states
}

export default function FiveLetters({ active, initial = [] }: Props) {
  const [guesses, setGuesses] = useState<string[]>(initial);
  const [current, setCurrent] = useState('');
  const [notice, setNotice] = useState('');

  const won = guesses.includes(ANSWER);
  const over = won || guesses.length >= ROWS;

  const press = useCallback(
    (key: string) => {
      if (over) return;
      if (key === 'ENTER') {
        if (current.length < COLS) return;
        if (!WORDS.has(current)) {
          setNotice('Not in word list');
          return;
        }
        setGuesses((g) => [...g, current]);
        setCurrent('');
      } else if (key === 'BACK') {
        setCurrent((c) => c.slice(0, -1));
        setNotice('');
      } else if (/^[A-Z]$/.test(key)) {
        setCurrent((c) => (c.length < COLS ? c + key : c));
        setNotice('');
      }
    },
    [over, current],
  );

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACK' : e.key.length === 1 ? e.key.toUpperCase() : '';
      if (k) {
        e.preventDefault();
        press(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, press]);

  const best: Record<string, Mark> = {};
  const rank = { miss: 0, near: 1, hit: 2 };
  for (const g of guesses) {
    score(g).forEach((m, i) => {
      if (!best[g[i]] || rank[m] > rank[best[g[i]]]) best[g[i]] = m;
    });
  }

  if (over) {
    return (
      <div className="hn hn-end">
        <h1>{won ? 'You win!' : 'Game Over'}</h1>
        <p>Thanks for playing! Remember: the word is always "{ANSWER}"!</p>
        <div className="hn-row">
          {[...ANSWER].map((c, i) => (
            <div key={i} className="hn-tile hn-hit hn-big">
              {c}
            </div>
          ))}
        </div>
        <button
          className="hn-restart raised"
          onClick={() => {
            setGuesses([]);
            setCurrent('');
            setNotice('');
          }}
        >
          Restart Game
        </button>
      </div>
    );
  }

  return (
    <div className="hn">
      <h1>Five Letters</h1>
      <div className="hn-sub">Wordle but with a TOMMY based twist.</div>
      <div className="hn-notice">{notice}</div>
      <div className="hn-grid">
        {Array.from({ length: ROWS }, (_, r) => {
          const done = r < guesses.length;
          const text = done ? guesses[r] : r === guesses.length ? current : '';
          const marks = done ? score(guesses[r]) : null;
          return (
            <div key={r} className="hn-row">
              {Array.from({ length: COLS }, (_, c) => (
                <div
                  key={c}
                  className={`hn-tile${marks ? ` hn-${marks[c]}` : text[c] ? ' hn-filled' : ''}`}
                >
                  {text[c] ?? ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="hn-keys">
        {KEYS.map((row, i) => (
          <div key={row} className="hn-keyrow">
            {i === 2 && (
              <button tabIndex={-1} onMouseDown={(e) => e.preventDefault()} className="hn-key hn-wide raised" onClick={() => press('ENTER')}>
                RET
              </button>
            )}
            {[...row].map((k) => (
              <button key={k} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} className={`hn-key raised${best[k] ? ` hn-${best[k]}` : ''}`} onClick={() => press(k)}>
                {k}
              </button>
            ))}
            {i === 2 && (
              <button tabIndex={-1} onMouseDown={(e) => e.preventDefault()} className="hn-key hn-wide raised" onClick={() => press('BACK')}>
                DEL
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
