// Ayin's voice and ears. Ayin speaks with a real voice from the server (/api/voice), or the
// browser's built-in voice if that isn't available; it hears "done", "help", "show me" and "back".

type SpeakOptions = { onEnd?: () => void; onWord?: (charIndex: number) => void };

let playing: HTMLAudioElement | null = null;
/** Each new line gets a number, so a slow reply for an old line never talks over a new one. */
let latest = 0;

// The microphone can hear Ayin's own voice, and speech recognition often hands over what it
// heard just after Ayin stops. So Ayin remembers when it last spoke and what it said.
/** Anything heard this soon after Ayin stops talking is probably still Ayin. */
const ECHO_MS = 1500;
/** Ayin's lines are remembered this long, to spot them coming back through the microphone. */
const REMEMBER_MS = 30_000;
let quietSince = 0;
const said: { words: Set<string>; at: number }[] = [];

const wordsOf = (text: string) => text.toLowerCase().match(/[a-z0-9']+/g) ?? [];

function remember(text: string): void {
  said.push({ words: new Set(wordsOf(text)), at: Date.now() });
  while (said.length && Date.now() - said[0].at > REMEMBER_MS) said.shift();
}

function stoppedTalking(): void {
  quietSince = Date.now();
}

/** True if what the microphone heard is most likely Ayin's own voice, not the student's. */
function isEcho(heard: string, short: boolean): boolean {
  if (isSpeaking() || Date.now() - quietSince < ECHO_MS) return true;
  const words = wordsOf(heard);
  if (short || words.length < 3) return false;
  return said.some((line) => words.filter((w) => line.words.has(w)).length / words.length >= 0.7);
}

/** Where each word starts in the text, for lighting words up as they're said. */
function wordStarts(text: string): number[] {
  return [...text.matchAll(/\S+/g)].map((m) => m.index);
}

/** The browser's own voice, which reports each word as it reaches it. */
function speakInBrowser(text: string, { onEnd, onWord }: SpeakOptions): void {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.onend = () => {
    stoppedTalking();
    onEnd?.();
  };
  if (onWord) utterance.onboundary = (event) => event.name === "word" && onWord(event.charIndex);
  window.speechSynthesis.speak(utterance);
}

/** The real voice. Words light up in step with the audio, spread over its length by position. */
function playAudio(audio: HTMLAudioElement, text: string, { onEnd, onWord }: SpeakOptions): void {
  const starts = wordStarts(text);
  let word = -1;
  const follow = () => {
    if (audio !== playing || audio.paused || !audio.duration) return;
    const at = Math.min(starts.length - 1, Math.floor((audio.currentTime / audio.duration) * starts.length));
    if (at !== word) onWord?.(starts[(word = at)]);
    requestAnimationFrame(follow);
  };
  audio.onplay = () => requestAnimationFrame(follow);
  audio.onended = () => {
    if (audio === playing) playing = null;
    stoppedTalking();
    onEnd?.();
  };
  playing = audio;
  audio.play().catch(() => {
    playing = null;
    speakInBrowser(text, { onEnd, onWord });
  });
}

/**
 * Say something out loud. `onWord` gets the position of each word as Ayin reaches it (so the
 * screen can light it up), and `onEnd` runs when Ayin finishes, or right away if it can't talk.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (typeof window === "undefined") return options.onEnd?.();
  hush();
  remember(text);
  const line = ++latest;
  fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
    .then(async (response) => {
      if (line !== latest) return;
      if (response.status !== 200) return speakInBrowser(text, options);
      const url = URL.createObjectURL(await response.blob());
      if (line !== latest) return URL.revokeObjectURL(url);
      const audio = new Audio(url);
      audio.addEventListener("ended", () => URL.revokeObjectURL(url));
      playAudio(audio, text, options);
    })
    .catch(() => line === latest && speakInBrowser(text, options));
}

/** Stop talking mid-sentence. */
export function hush(): void {
  if (typeof window === "undefined") return;
  if (isSpeaking()) stoppedTalking();
  playing?.pause();
  playing = null;
  window.speechSynthesis?.cancel();
}

export type VoiceCommand = "done" | "help" | "show-me" | "back";

// SpeechRecognition isn't in TypeScript's DOM types yet, so describe the part we use.
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export function canListen(): boolean {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

/** Map what the student said to a command. Plain words only, no wake word. */
export function toCommand(said: string): VoiceCommand | null {
  const words = said.toLowerCase();
  if (words.includes("show me")) return "show-me";
  if (words.includes("help") || words.includes("stuck")) return "help";
  if (words.includes("done") || words.includes("finished") || words.includes("next")) return "done";
  if (words.includes("back") || words.includes("again")) return "back";
  return null;
}

/** True while Ayin itself is talking, so the microphone doesn't answer Ayin's own voice. */
export function isSpeaking(): boolean {
  return typeof window !== "undefined" && (playing !== null || window.speechSynthesis?.speaking === true);
}

/**
 * Listen until stopped, like talking to a coach. Short commands ("done", "help", "show me")
 * go to `onCommand`; anything else the student says goes to `onQuestion`.
 * Returns a function that stops listening.
 */
export function listen(onCommand: (command: VoiceCommand) => void, onQuestion: (question: string) => void): () => void {
  const w = window as unknown as Record<string, new () => Recognition>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return () => {};

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  let stopped = false;

  recognition.onresult = (event) => {
    const heard = event.results[event.resultIndex][0].transcript.trim();
    const short = heard.split(/\s+/).length <= 3;
    if (isEcho(heard, short)) return; // that was Ayin's own voice
    const command = toCommand(heard);
    if (command && short) onCommand(command);
    else if (heard.length >= 2) onQuestion(heard);
  };
  recognition.onend = () => {
    if (!stopped) recognition.start(); // browsers stop after a pause; keep going
  };
  recognition.start();

  return () => {
    stopped = true;
    recognition.stop();
  };
}
