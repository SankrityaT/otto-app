// Typed calls from the screens to our API. Every call throws a readable Error on failure.

import type { Scene } from "../ai/scene";
import type { CrewView, Student } from "../data/crew";
import type { Routine } from "../data/routines";
import type { Run } from "../data/runs";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
  return body as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export type Summary = { total: number; onOwn: number };

export const api = {
  students: () => call<{ students: Student[] }>("/api/students"),
  setFurHue: (studentId: string, furHue: number) =>
    call(`/api/students/${studentId}`, { method: "PATCH", body: JSON.stringify({ furHue }) }),
  doneThisWeek: (studentId: string) =>
    call<{ done: { runId: string; title: string; onOwn: number; total: number }[] }>(
      `/api/runs?studentId=${encodeURIComponent(studentId)}`,
    ),
  routines: () => call<{ routines: { id: string; title: string; stepCount: number }[] }>("/api/routines"),
  newRoutine: (task: string, photo: string | null) => call<{ routine: Routine }>("/api/routines", post({ task, photo })),
  startRun: (routineId: string, studentId: string) => call<{ runId: string }>("/api/runs", post({ routineId, studentId })),
  run: (runId: string) => call<{ run: Run; summary: Summary }>(`/api/runs/${runId}`),
  check: (runId: string, stepId: string, helpLevel: number, photo: string | null) =>
    call<{ done: boolean; say: string; finished: boolean; summary: Summary | null }>(
      `/api/runs/${runId}/check`,
      post({ stepId, helpLevel, photo }),
    ),
  help: (runId: string, stepId: string, level: number, photo: string | null) =>
    call<{ say: string }>(`/api/runs/${runId}/help`, post({ stepId, level, photo })),
  splitStep: (stepId: string) => call(`/api/steps/${stepId}/split`, post({})),
  scene: (stepId: string, photo: string | null) => call<{ scene: Scene }>(`/api/steps/${stepId}/scene`, post({ photo })),
  crew: (studentId: string) => call<{ crew: CrewView }>(`/api/crew?studentId=${encodeURIComponent(studentId)}`),
  cheer: (fromId: string, runId: string, phrase: string) => call("/api/crew/cheers", post({ fromId, runId, phrase })),
  askCrewmate: (fromId: string, stepId: string) => call<{ helperName: string | null }>("/api/crew/asks", post({ fromId, stepId })),
  buttonPresses: (after: number) => call<{ presses: { id: number; button: string }[] }>(`/api/buttons?after=${after}`),
};
