"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// "Explain my screen": the student shares a tab or window (say, a how-to video) and asks about
// it. Ayin keeps the last few moments in memory only: a few small pictures of the screen and
// the last half minute of its sound. They're sent only when the student asks, and never saved.

/** A picture of the screen this often, keeping the last few, so Ayin can follow what changed. */
const FRAME_MS = 4000;
const FRAMES_KEPT = 3;
const FRAME_WIDTH = 1024;
/** Sound is kept in short pieces; the last two (up to about 30 seconds) go with a question. */
const SOUND_PIECE_MS = 15_000;
const SOUND_PIECES_KEPT = 2;
const SOUND_TYPE = "audio/webm;codecs=opus";

export function canShareScreen(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function useScreenWatch() {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const frames = useRef<string[]>([]);
  const sounds = useRef<Blob[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [sharing, setSharing] = useState(false);
  const [hasSound, setHasSound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The preview can appear after sharing starts, so hand the stream to whichever <video> shows up.
  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
    if (element && stream.current) element.srcObject = stream.current;
  }, []);

  /** One small picture of the screen right now. */
  const grab = useCallback((): string | null => {
    const frame = video.current;
    if (!frame || frame.videoWidth === 0) return null;
    const scale = Math.min(1, FRAME_WIDTH / frame.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(frame.videoWidth * scale);
    canvas.height = Math.round(frame.videoHeight * scale);
    canvas
      .getContext("2d")
      ?.drawImage(frame, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, []);

  /** Record one piece of sound; when it stops, keep it and drop the oldest. */
  const recordPiece = useCallback((audio: MediaStream) => {
    const rec = new MediaRecorder(audio, { mimeType: SOUND_TYPE });
    const parts: Blob[] = [];
    rec.ondataavailable = (event) => event.data.size && parts.push(event.data);
    rec.onstop = () => {
      sounds.current = [
        ...sounds.current,
        new Blob(parts, { type: SOUND_TYPE }),
      ].slice(-SOUND_PIECES_KEPT);
    };
    rec.start();
    recorder.current = rec;
  }, []);

  const stop = useCallback(() => {
    timers.current.forEach(clearInterval);
    timers.current = [];
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    frames.current = [];
    sounds.current = [];
    setSharing(false);
    setHasSound(false);
  }, []);

  /**
   * Ask the browser to share a tab, window or screen, with its sound. Must be called from a tap.
   * Returns whether Ayin can hear it too, or null if nothing was shared.
   */
  const start = useCallback(async (): Promise<boolean | null> => {
    setError(null);
    try {
      const shared = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      stream.current = shared;
      if (video.current) video.current.srcObject = shared;
      // Stopping from the browser's own "Stop sharing" bar ends it here too.
      shared.getVideoTracks()[0]?.addEventListener("ended", stop);
      timers.current.push(
        setInterval(() => {
          const frame = grab();
          if (frame)
            frames.current = [...frames.current, frame].slice(-FRAMES_KEPT);
        }, FRAME_MS),
      );
      const audioTracks = shared.getAudioTracks();
      if (
        audioTracks.length &&
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(SOUND_TYPE)
      ) {
        const audio = new MediaStream(audioTracks);
        recordPiece(audio);
        timers.current.push(
          setInterval(() => {
            recorder.current?.stop();
            recordPiece(audio);
          }, SOUND_PIECE_MS),
        );
        setHasSound(true);
      }
      setSharing(true);
      return audioTracks.length > 0;
    } catch {
      setError(
        "The screen wasn't shared. Try again and pick the tab with the video.",
      );
      return null;
    }
  }, [grab, recordPiece, stop]);

  /** What to send with a question: the last few pictures (ending with right now) and recent sound. */
  const moments = useCallback(async (): Promise<{
    frames: string[];
    sounds: string[];
  }> => {
    const now = grab();
    const pictures = [...frames.current, ...(now ? [now] : [])].slice(
      -FRAMES_KEPT,
    );
    // Close the piece being recorded so the last few seconds are included, then keep listening.
    const rec = recorder.current;
    if (rec?.state === "recording") {
      const closed = new Promise((resolve) =>
        rec.addEventListener("stop", resolve, { once: true }),
      );
      rec.stop();
      await closed;
      recordPiece(rec.stream);
    }
    const clips = await Promise.all(
      sounds.current.filter((s) => s.size > 0).map(readAsDataUrl),
    );
    return { frames: pictures, sounds: clips };
  }, [grab, recordPiece]);

  useEffect(() => stop, [stop]);

  return { videoRef, sharing, hasSound, error, start, stop, moments };
}
