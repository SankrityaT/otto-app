// Ayin's voice and ears. Ayin speaks with a real voice from the server (/api/voice), or the
// browser's built-in voice if that isn't available; it hears "done", "help", "show me" and "back".

type SpeakOptions = { onEnd?: () => void; onWord?: (charIndex: number) => void };

let playing: HTMLAudioElement | null = null;
/** Each new line gets a number, so a slow reply for an old line never talks over a new one. */
let latest = 0;

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
  if (onEnd) utterance.onend = onEnd;
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
    if (isSpeaking()) return; // that was Ayin's own voice
    const said = event.results[event.resultIndex][0].transcript.trim();
    const command = toCommand(said);
    if (command && said.split(/\s+/).length <= 3) onCommand(command);
    else if (said.length >= 2) onQuestion(said);
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
