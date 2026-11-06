'use client';

/*
 * Written by Havi (@Havishea) for the Ayin team, from https://github.com/Havishea/Ayin.
 * We changed the words to fit starting a task, put the camera in the bar (it turns into Send
 * once you type), and only show the hint while it's needed.
 */
import { useEffect, useRef, useState } from 'react';
import type { PondStatus } from './Pond';

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

type Props = {
  status: PondStatus;
  onListening: (on: boolean) => void;
  onSend: (text: string, via: 'voice' | 'text') => void;
  /** A photo of the task (a recipe card, instructions), as a data URL. */
  onPhoto?: (file: File) => void;
};

/**
 * Hold to talk, or type. Voice uses the browser's speech recognition where it exists
 * (Chrome, Edge, Safari); everywhere else the text field does the same job.
 */
export default function TalkBar({ status, onListening, onSend, onPhoto }: Props) {
  const [text, setText] = useState('');
  const [holding, setHolding] = useState(false);
  const [voiceOk, setVoiceOk] = useState(true);
  const [heard, setHeard] = useState('');
  const rec = useRef<Recognition | null>(null);
  const transcript = useRef('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setVoiceOk(getRecognition() !== null), []);

  const start = () => {
    if (holding) return;
    if (!voiceOk) {
      input.current?.focus();
      return;
    }
    const r = getRecognition();
    if (!r) return;
    transcript.current = '';
    setHeard('');
    r.lang = navigator.language || 'en-US';
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      transcript.current = Array.from(e.results).map((res) => res[0].transcript).join(' ');
      setHeard(transcript.current);
    };
    r.onerror = () => setVoiceOk(false);
    r.onend = null;
    rec.current = r;
    try {
      r.start();
    } catch {
      setVoiceOk(false);
      return;
    }
    setHolding(true);
    onListening(true);
  };

  const stop = () => {
    if (!holding) return;
    setHolding(false);
    onListening(false);
    const r = rec.current;
    if (!r) return;
    r.onend = () => {
      const said = transcript.current.trim();
      setHeard('');
      if (said) onSend(said, 'voice');
    };
    r.stop();
  };

  const busy = status === 'thinking';

  return (
    <div className="talk">
      <form
        className="talk__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          onSend(text, 'text');
          setText('');
        }}
      >
        <button
          type="button"
          className={`talk__hold ${holding ? 'is-holding' : ''}`}
          aria-pressed={holding}
          aria-label={voiceOk ? 'Hold to tell Ayin your task' : 'Voice isn’t available here. Type instead.'}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            start();
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              start();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') stop();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <label className="sr-only" htmlFor="ask">What are you working on?</label>
        <input
          id="ask"
          ref={input}
          className="talk__input"
          placeholder={holding ? 'Listening…' : 'Say hi to Ayin'}
          value={holding ? heard : text}
          onChange={(e) => setText(e.target.value)}
          readOnly={holding}
          autoComplete="off"
        />
        {onPhoto && !text.trim() ? (
          <label className="talk__send grid cursor-pointer place-items-center" aria-label="Show Ayin a photo of the task">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhoto(file);
              }}
            />
          </label>
        ) : (
          <button className="talk__send" type="submit" disabled={busy || !text.trim()}>Send</button>
        )}
      </form>
      {(holding || !voiceOk) && (
        <p className="talk__hint">{holding ? 'Let go to send' : 'Voice isn’t available in this browser. Type instead.'}</p>
      )}
    </div>
  );
}
