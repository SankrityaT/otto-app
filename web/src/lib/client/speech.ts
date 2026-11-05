// The browser's built-in speech: read steps aloud, and hear "done", "help" and "show me".

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export type VoiceCommand = "done" | "help" | "show-me";

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
  if (words.includes("done") || words.includes("finished")) return "done";
  return null;
}

/** True while Ayin itself is talking, so the microphone doesn't answer Ayin's own voice. */
export function isSpeaking(): boolean {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
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
    else if (said.split(/\s+/).length >= 2) onQuestion(said);
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
