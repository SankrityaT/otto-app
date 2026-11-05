"use client";

import { useSyncExternalStore } from "react";

// Small choices remembered on this device: who is working, and which camera is Ayin's eyes.

const STUDENT_KEY = "ayin.studentId";
const CAMERA_KEY = "ayin.camera";
const CHANGED = "ayin:settings-changed"; // same-tab updates; "storage" only fires in other tabs

export type CameraChoice = "this-device" | "screen" | "otter";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function save(key: string, value: string | null): void {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  window.dispatchEvent(new Event(CHANGED));
}

/** The student using this device, or null. Null on the server, where there is no storage. */
export function useStudentId(): [string | null, (id: string | null) => void] {
  const id = useSyncExternalStore(subscribe, () => localStorage.getItem(STUDENT_KEY), () => null);
  return [id, (next) => save(STUDENT_KEY, next)];
}

/** Where Ayin looks: this device's camera, a shared screen, or the otter. */
export function useCameraChoice(): [CameraChoice, (choice: CameraChoice) => void] {
  const stored = useSyncExternalStore(subscribe, () => localStorage.getItem(CAMERA_KEY), () => null);
  const choice: CameraChoice = stored === "otter" || stored === "screen" ? stored : "this-device";
  return [choice, (next) => save(CAMERA_KEY, next)];
}
