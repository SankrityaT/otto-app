"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The device camera, for when the phone or tablet is Ayin's eyes.
 * `capture()` returns one JPEG frame as a data URL. Nothing is recorded or saved.
 */
export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError("Ayin can't use the camera. Check the browser's camera permission."));
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [enabled]);

  function capture(): string | null {
    const video = videoRef.current;
    if (!enabled || !video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  return { videoRef, capture, error };
}
