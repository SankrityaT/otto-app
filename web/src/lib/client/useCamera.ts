"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { frameChange, stillAfterMotion } from "../motion";

export type EyesSource = "camera" | "screen";

/** Frames are compared at this size and this often. Tiny, and never leave the browser. */
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 24;
const SAMPLE_MS = 250;

/**
 * What Ayin looks at from the browser: the device camera, or a screen or tab the student
 * shares (for students without a camera, or tasks that happen on a screen).
 * `capture()` returns one JPEG frame as a data URL. Nothing is recorded or saved.
 * With `onStill`, it calls back each time the student moves and then holds still.
 */
export function useCamera(enabled: boolean, source: EyesSource = "camera", onStill?: () => void) {
  const video = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // The preview can appear after the camera has started (the pause screen comes first),
  // so hand the stream to whichever <video> shows up.
  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
    if (element && streamRef.current) element.srcObject = streamRef.current;
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  function attach(stream: MediaStream) {
    streamRef.current = stream;
    if (video.current) video.current.srcObject = stream;
    // If the student stops sharing from the browser's own bar, show the share button again.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => setSharing(false));
  }

  // The camera starts on its own; sharing a screen needs the student to choose it (see shareScreen).
  useEffect(() => {
    if (!enabled || source !== "camera") return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false })
      .then(attach)
      .catch(() => setError("Ayin can't use the camera. Check the browser's camera permission."));
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [enabled, source]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const still = useEffectEvent(() => onStill?.());
  const watching = enabled && onStill !== undefined;

  useEffect(() => {
    if (!watching) return;
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const shouldLook = stillAfterMotion();
    let previous: Uint8ClampedArray | null = null;
    const timer = setInterval(() => {
      const frame = video.current;
      if (!context || !frame || frame.videoWidth === 0) return;
      context.drawImage(frame, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const pixels = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
      if (previous && shouldLook(frameChange(previous, pixels), Date.now())) still();
      previous = pixels;
    }, SAMPLE_MS);
    return () => clearInterval(timer);
  }, [watching]);

  /** Ask the browser to share a screen, window or tab. Must be called from a tap. */
  async function shareScreen() {
    try {
      attach(await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }));
      setSharing(true);
      setError(null);
    } catch {
      setError("Screen sharing was cancelled.");
    }
  }

  function capture(): string | null {
    const frame = video.current;
    if (!enabled || !frame || frame.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    canvas.getContext("2d")?.drawImage(frame, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  return { videoRef, capture, error, sharing, shareScreen };
}
