"use client";

import { useEffect, useRef, useState } from "react";

export type EyesSource = "camera" | "screen";

/**
 * What Ayin looks at from the browser: the device camera, or a screen or tab the student
 * shares (for students without a camera, or tasks that happen on a screen).
 * `capture()` returns one JPEG frame as a data URL. Nothing is recorded or saved.
 */
export function useCamera(enabled: boolean, source: EyesSource = "camera") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  function attach(stream: MediaStream) {
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
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
    const video = videoRef.current;
    if (!enabled || !video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  return { videoRef, capture, error, sharing, shareScreen };
}
