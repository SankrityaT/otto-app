// Typed calls from the screens to our API. Every call throws a readable Error on failure.

import type { Scene } from "../ai/scene";
import type { CrewView, Student } from "../data/crew";
import type { Post, PostKind, Profile, Reaction, Reply } from "../data/raft";
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

/** Ayin's review of a raft post that wasn't shared yet. */
export type PostReview = { ok: boolean; problem: string; why: string; kinderVersion: string | null };

export const api = {
  students: () => call<{ students: Student[] }>("/api/students"),
  setFurHue: (studentId: string, furHue: number) =>
    call(`/api/students/${studentId}`, { method: "PATCH", body: JSON.stringify({ furHue }) }),
  doneThisWeek: (studentId: string) =>
    call<{
      done: { runId: string; title: string; onOwn: number; total: number }[];
      inProgress: { runId: string; title: string; done: number; total: number }[];
    }>(
      `/api/runs?studentId=${encodeURIComponent(studentId)}`,
    ),
  routines: () => call<{ routines: { id: string; title: string; stepCount: number }[] }>("/api/routines"),
  routine: (routineId: string) => call<{ routine: Routine }>(`/api/routines/${routineId}`),
  newRoutine: (task: string, photo: string | null) => call<{ routine: Routine }>("/api/routines", post({ task, photo })),
  startRun: (routineId: string, studentId: string) => call<{ runId: string }>("/api/runs", post({ routineId, studentId })),
  run: (runId: string) => call<{ run: Run; summary: Summary }>(`/api/runs/${runId}`),
  check: (runId: string, stepId: string, helpLevel: number, photo: string | null, trustStudent = false) =>
    call<{ done: boolean; say: string; finished: boolean; summary: Summary | null }>(
      `/api/runs/${runId}/check`,
      post({ stepId, helpLevel, photo, trustStudent }),
    ),
  ask: (runId: string, stepId: string, question: string, photo: string | null, showing: string | null) =>
    call<{ say: string }>(`/api/runs/${runId}/ask`, post({ stepId, question, photo, showing })),
  checkAlone: (runId: string, photo: string | null) =>
    call<{ done: boolean; say: string; finished: boolean; summary: Summary | null }>(
      `/api/runs/${runId}/alone`,
      post({ photo }),
    ),
  help: (runId: string, stepId: string, level: number, photo: string | null) =>
    call<{ say: string }>(`/api/runs/${runId}/help`, post({ stepId, level, photo })),
  splitStep: (stepId: string) => call(`/api/steps/${stepId}/split`, post({})),
  scene: (stepId: string, photo: string | null) => call<{ scene: Scene }>(`/api/steps/${stepId}/scene`, post({ photo })),
  crew: (studentId: string) => call<{ crew: CrewView }>(`/api/crew?studentId=${encodeURIComponent(studentId)}`),
  cheer: (fromId: string, runId: string, phrase: string) => call("/api/crew/cheers", post({ fromId, runId, phrase })),
  inviteBuddy: (fromId: string) => call("/api/crew/invites", post({ fromId })),
  answerInvite: (inviteId: string, studentId: string, answer: "yes" | "not-today") =>
    call(`/api/crew/invites/${inviteId}`, post({ studentId, answer })),
  askCrewmate: (fromId: string, stepId: string) => call<{ helperName: string | null }>("/api/crew/asks", post({ fromId, stepId })),
  feed: (studentId: string, kind: PostKind | null) =>
    call<{ posts: Post[] }>(`/api/raft/feed?studentId=${encodeURIComponent(studentId)}${kind ? `&kind=${kind}` : ""}`),
  post: (postId: string, studentId: string) =>
    call<{ post: Post; replies: Reply[] }>(`/api/raft/posts/${postId}?studentId=${encodeURIComponent(studentId)}`),
  share: (input: { authorId: string; kind: PostKind; body: string; photo: string | null; stepId: string | null }) =>
    call<{ shared: boolean; id?: string; review?: PostReview }>("/api/raft/posts", post(input)),
  reply: (postId: string, authorId: string, body: string) =>
    call<{ shared: boolean; review?: PostReview }>(`/api/raft/posts/${postId}/replies`, post({ authorId, body })),
  react: (postId: string, studentId: string, kind: Reaction) => call(`/api/raft/posts/${postId}/react`, post({ studentId, kind })),
  report: (postId: string, studentId: string) => call(`/api/raft/posts/${postId}/report`, post({ studentId })),
  markHelped: (replyId: string, studentId: string) => call(`/api/raft/replies/${replyId}/helped`, post({ studentId })),
  profile: (studentId: string) => call<{ profile: Profile; workStyles: string[] }>(`/api/raft/people/${studentId}`),
  updateProfile: (studentId: string, change: { goal?: string | null; goalRoutineId?: string | null; workStyle?: string[] }) =>
    call(`/api/raft/people/${studentId}`, { method: "PATCH", body: JSON.stringify(change) }),
  otter: () => call<{ address: string | null }>("/api/otter"),
  testOtter: (address: string) => call<{ photo: string }>("/api/otter/test", post({ address })),
  saveOtter: (address: string | null) => call("/api/otter", post({ address })),
  buttonPresses: (after: number) => call<{ presses: { id: number; button: string }[] }>(`/api/buttons?after=${after}`),
};
