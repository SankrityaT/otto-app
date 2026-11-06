// Ayin's voice and ears. Ayin speaks with a real voice from the server (/api/voice: Cartesia,
// or Deepgram), and only uses the browser's built-in voice if neither is set up. It hears the
// student through Deepgram too (/api/hear).

type SpeakOptions = { onEnd?: () => void; onWord?: (charIndex: number) => void };

let playing: HTMLAudioElement | null = null;
/** Each new line gets a number, so a slow reply for an old line never talks over a new one. */
let latest = 0;

// Phones (iPhones especially) only let a page play sound right after a tap, but Ayin's voice
// arrives a moment later from the server. So Ayin uses one audio player for every line, and
// unlocks it with a silent sound on the student's first tap anywhere.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
let player: HTMLAudioElement | null = null;
function voicePlayer(): HTMLAudioElement {
  player ??= new Audio();
  return player;
}
/** The hands-free listener's sound processing, which phones keep paused until a tap. */
let ears: AudioContext | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => ears?.resume().catch(() => {}), { capture: true });
  const unlock = () => {
    const audio = voicePlayer();
    if (audio.src) return;
    audio.src = SILENCE;
    audio.play().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
}

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
function isEcho(heard: string): boolean {
  const words = wordsOf(heard);
  if (words.length === 0) return true;
  const aloudJustNow = isSpeaking() || Date.now() - quietSince < ECHO_MS;
  // A few words heard while Ayin talks are Ayin's own if Ayin just said every one of them.
  if (words.length < 3) return aloudJustNow && said.some((line) => words.every((w) => line.words.has(w)));
  return said.some((line) => words.filter((w) => line.words.has(w)).length / words.length >= (aloudJustNow ? 0.6 : 0.7));
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
    // The browser wouldn't play it (no tap yet on this page): stay quiet rather than switch voices.
    playing = null;
    onEnd?.();
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
      const audio = voicePlayer();
      if (audio.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
      audio.src = url;
      playAudio(audio, text, options);
    })
    .catch(() => line === latest && speakInBrowser(text, options));
}

/** Stop talking mid-sentence, including a line that's still on its way. */
export function hush(): void {
  if (typeof window === "undefined") return;
  latest++;
  if (isSpeaking()) stoppedTalking();
  playing?.pause();
  playing = null;
  window.speechSynthesis?.cancel();
}

export type VoiceCommand = "done" | "help" | "show-me" | "back";

// Ayin's ears. The microphone is recorded only while someone is talking, in short clips, and
// Deepgram turns each clip into words through our server (/api/hear), so the key never reaches
// the browser. It works the same in every browser that can record sound, iPhones included.

const CLIP_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
/** How often the microphone's loudness is checked while listening hands-free. */
const TICK_MS = 100;
/** A pause this long means the student finished saying something. */
const PAUSE_MS = 900;
/** Shorter sounds are a cough or a clatter, not words; longer ones are cut into pieces. */
const MIN_CLIP_MS = 400;
const MAX_CLIP_MS = 15_000;
/** While nobody is talking, the running recording starts over this often, so clips stay small. */
const IDLE_RESTART_MS = 4000;
/** The quietest sound that can count as talking (loudness 0..1), above the room's own noise. */
const MIN_LEVEL = 0.012;

export function canListen(): boolean {
  return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

function openMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
}

/** Start recording; `stop()` hands back the clip. */
function record(stream: MediaStream): { stop: () => Promise<Blob> } {
  const type = CLIP_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const parts: Blob[] = [];
  recorder.ondataavailable = (event) => event.data.size && parts.push(event.data);
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(parts, { type: recorder.mimeType }));
        if (recorder.state === "recording") recorder.stop();
        else resolve(new Blob(parts, { type: recorder.mimeType }));
      }),
  };
}

/** What was said in a clip, or "" if nothing could be heard. */
async function toWords(clip: Blob): Promise<string> {
  if (clip.size === 0) return "";
  const response = await fetch("/api/hear", { method: "POST", headers: { "Content-Type": clip.type }, body: clip }).catch(() => null);
  if (!response?.ok) return "";
  const body = (await response.json().catch(() => null)) as { text?: string } | null;
  return (body?.text ?? "").trim();
}

/** Hold to talk: recording starts now; the function it returns stops it and gives back the words. */
export async function holdToTalk(): Promise<() => Promise<string>> {
  const stream = await openMic();
  const clip = record(stream);
  return async () => {
    const recorded = await clip.stop();
    stream.getTracks().forEach((track) => track.stop());
    return toWords(recorded);
  };
}

/** Map what the student said to a command. Plain words only, no wake word. */
function toCommand(said: string): VoiceCommand | null {
  const words = said.toLowerCase();
  if (words.includes("show me")) return "show-me";
  if (words.includes("help") || words.includes("stuck")) return "help";
  if (words.includes("done") || words.includes("finished") || words.includes("next")) return "done";
  if (words.includes("back") || words.includes("again")) return "back";
  return null;
}

/** True while Ayin itself is talking, so the microphone doesn't answer Ayin's own voice. */
function isSpeaking(): boolean {
  return typeof window !== "undefined" && (playing !== null || window.speechSynthesis?.speaking === true);
}

/**
 * Listen until stopped, like talking to a coach. Each time the student says something and
 * pauses, short commands ("done", "help", "show me") go to `onCommand`, and anything else goes
 * to `onQuestion`. Ayin's own voice is ignored. Returns a function that stops listening.
 */
export function listen(onCommand: (command: VoiceCommand) => void, onQuestion: (question: string) => void): () => void {
  let stopped = false;
  let close = () => {};

  const handle = (heard: string) => {
    const short = heard.split(/\s+/).length <= 3;
    if (isEcho(heard)) return; // that was Ayin's own voice
    hush(); // the student is talking: Ayin stops and listens, like a person would
    const command = toCommand(heard);
    if (command && short) onCommand(command);
    else if (heard.length >= 2) onQuestion(heard);
  };

  (async () => {
    const stream = await openMic().catch(() => null);
    if (!stream) return;
    if (stopped) return stream.getTracks().forEach((track) => track.stop());

    // Loudness, measured on the device, decides when someone starts and stops talking.
    const context = new AudioContext();
    ears = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let noise = MIN_LEVEL / 2;
    // Always recording, so a clip includes the moment before the first word. While nobody talks,
    // the recording is quietly restarted now and then; when someone talks and pauses, it's sent.
    let clip = record(stream);
    let clipFrom = Date.now();
    let talkingFrom = 0;
    let quiet = 0;

    const timer = setInterval(async () => {
      analyser.getFloatTimeDomainData(samples);
      const level = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
      const loud = level > Math.max(MIN_LEVEL, noise * 3);
      if (!loud) noise = noise * 0.95 + level * 0.05;

      // The student can talk over Ayin. The microphone cancels most of Ayin's voice, and
      // anything that still comes through is recognised as Ayin's own words (isEcho).
      if (!talkingFrom) {
        if (loud) [talkingFrom, quiet] = [Date.now(), 0];
        else if (Date.now() - clipFrom > IDLE_RESTART_MS) {
          clip.stop();
          [clip, clipFrom] = [record(stream), Date.now()];
        }
        return;
      }
      quiet = loud ? 0 : quiet + TICK_MS;
      const length = Date.now() - talkingFrom;
      if (quiet < PAUSE_MS && length < MAX_CLIP_MS) return;
      const finished = clip;
      [clip, clipFrom, talkingFrom] = [record(stream), Date.now(), 0];
      const recorded = await finished.stop();
      if (length - quiet < MIN_CLIP_MS) return;
      const heard = await toWords(recorded);
      if (!stopped && heard) handle(heard);
    }, TICK_MS);

    close = () => {
      clearInterval(timer);
      clip.stop();
      stream.getTracks().forEach((track) => track.stop());
      context.close().catch(() => {});
      if (ears === context) ears = null;
    };
    if (stopped) close();
  })();

  return () => {
    stopped = true;
    close();
  };
}
