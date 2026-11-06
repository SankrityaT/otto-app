'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Otto.
 * We changed the words to fit starting a task, put the camera in the bar (it turns into Send
 * once you type), only show the hint while it's needed, and listen through Deepgram.
 */
import { useEffect, useRef, useState } from 'react';
import { canListen, holdToTalk } from '@/lib/client/speech';
import type { PondStatus } from './Pond';

type Props = {
  status: PondStatus;
  onListening: (on: boolean) => void;
  onSend: (text: string, via: 'voice' | 'text') => void;
  /** A photo of the task (a recipe card, instructions), as a data URL. */
  onPhoto?: (file: File) => void;
};

/**
 * Hold to talk, or type. Voice goes through Deepgram (see lib/client/speech), so it works in
 * every browser that can use the microphone; where it can't, the text field does the same job.
 */
export default function TalkBar({ status, onListening, onSend, onPhoto }: Props) {
  const [text, setText] = useState('');
  const [holding, setHolding] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [voiceOk, setVoiceOk] = useState(true);
  const recording = useRef<Promise<() => Promise<string>> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setVoiceOk(canListen()), []);

  const start = () => {
    if (holding) return;
    if (!voiceOk) {
      input.current?.focus();
      return;
    }
    recording.current = holdToTalk();
    recording.current.catch(() => setVoiceOk(false));
    setHolding(true);
    onListening(true);
  };

  const stop = async () => {
    if (!holding) return;
    setHolding(false);
    onListening(false);
    const pending = recording.current;
    recording.current = null;
    if (!pending) return;
    setHearing(true);
    try {
      const said = await (await pending)();
      if (said) onSend(said, 'voice');
    } catch {
      setVoiceOk(false);
    } finally {
      setHearing(false);
    }
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
          aria-label={voiceOk ? 'Hold to tell Otto your task' : 'Voice isn’t available here. Type instead.'}
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
          placeholder={holding ? 'Listening…' : hearing ? 'One moment…' : 'Say hi to Otto'}
          value={holding ? '' : text}
          onChange={(e) => setText(e.target.value)}
          readOnly={holding}
          autoComplete="off"
        />
        {onPhoto && !text.trim() ? (
          <label className="talk__send grid cursor-pointer place-items-center" aria-label="Show Otto a photo of the task">
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
        <p className="talk__hint">{holding ? 'Let go to send' : 'Otto can’t use the microphone here. Type instead.'}</p>
      )}
    </div>
  );
}
