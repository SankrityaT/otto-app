// Typed calls from the screens to our API. Every call throws a readable Error on failure.

import type { Scene, SceneSoFar } from "../ai/scene";
import type { Together } from "../data/together";
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
  if (!response.ok) throw new ApiError(body.error ?? "Something went wrong. Please try again.", response.status);
  return body as T;
}

/** A readable message, plus the HTTP status for screens that act on it. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

/**
 * A step's 3D model. A saved one comes back at once; a new one streams in, and `onBuilding`
 * gets the parts written so far each time another is ready, to show it being built.
 */
async function buildScene(
  stepId: string,
  photo: string | null,
  onBuilding?: (soFar: SceneSoFar) => void,
): Promise<{ scene: Scene }> {
  const response = await fetch(`/api/steps/${stepId}/scene`, { ...post({ photo }), headers: { "Content-Type": "application/json" } });
  if (!response.headers.get("Content-Type")?.includes("ndjson")) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
    return body;
  }
  // A new model: Ayin starts planning it now, so show the empty blueprint straight away.
  onBuilding?.({ title: null, parts: [] });
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) {
      const message = JSON.parse(line) as { building?: SceneSoFar; scene?: Scene; error?: string };
      if (message.building) onBuilding?.(message.building);
      if (message.error) throw new Error(message.error);
      if (message.scene) return { scene: message.scene };
    }
  }
  throw new Error("The 3D model stopped before it was finished. Please try again.");
}

export type Summary = { total: number; onOwn: number };

/** Ayin's review of a raft post that wasn't shared yet. */
export type PostReview = { ok: boolean; problem: string; why: string; kinderVersion: string | null };

export const api = {
  student: (studentId: string) => call<{ student: Student }>(`/api/students/${encodeURIComponent(studentId)}`),
  addStudent: (name: string, furHue: number, raftCode: string) =>
    call<{ student: Student }>("/api/students", post({ name, furHue, raftCode })),
  joinRaft: (studentId: string, code: string) => call(`/api/students/${encodeURIComponent(studentId)}/raft`, post({ code })),
  raftByCode: (code: string) => call<{ members: Student[] }>("/api/crew/members", post({ code })),
  setFurHue: (studentId: string, furHue: number) =>
    call(`/api/students/${studentId}`, { method: "PATCH", body: JSON.stringify({ furHue }) }),
  doneThisWeek: (studentId: string) =>
    call<{
      done: { runId: string; title: string; onOwn: number; total: number }[];
      inProgress: { runId: string; title: string; done: number; total: number }[];
    }>(
      `/api/runs?studentId=${encodeURIComponent(studentId)}`,
    ),
  routines: (studentId: string) =>
    call<{ routines: { id: string; title: string; stepCount: number }[] }>(`/api/routines?studentId=${encodeURIComponent(studentId)}`),
  routine: (routineId: string) => call<{ routine: Routine }>(`/api/routines/${routineId}`),
  newRoutine: (studentId: string, task: string, photo: string | null) =>
    call<{ routine: Routine }>("/api/routines", post({ studentId, task, photo })),
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
  scene: buildScene,
  crew: (studentId: string) => call<{ crew: CrewView }>(`/api/crew?studentId=${encodeURIComponent(studentId)}`),
  cheer: (fromId: string, runId: string, phrase: string) => call("/api/crew/cheers", post({ fromId, runId, phrase })),
  inviteTogether: (fromId: string, toId: string, routineId: string) =>
    call<{ runId: string }>("/api/crew/invites", post({ fromId, toId, routineId })),
  answerInvite: (inviteId: string, studentId: string, answer: "yes" | "not-today") =>
    call<{ runId: string | null }>(`/api/crew/invites/${inviteId}`, post({ studentId, answer })),
  together: (runId: string) => call<{ together: Together | null }>(`/api/runs/${runId}/together`),
  cheerPartner: (runId: string, phrase: string) => call(`/api/runs/${runId}/together`, post({ phrase })),
  helperFor: (studentId: string, stepId: string) =>
    call<{ helperName: string | null }>(`/api/crew/helper?studentId=${encodeURIComponent(studentId)}&stepId=${encodeURIComponent(stepId)}`),
  talk: (studentId: string, said: string, history: { who: "student" | "ayin"; text: string }[], busyWith: string | null = null) =>
    call<{ say: string; choices: string[]; startTask: string | null; routineId: string | null }>("/api/talk", post({ studentId, said, history, busyWith })),
  feed: (studentId: string, kind: PostKind | null) =>
    call<{ posts: Post[] }>(`/api/raft/feed?studentId=${encodeURIComponent(studentId)}${kind ? `&kind=${kind}` : ""}`),
  post: (postId: string, studentId: string) =>
    call<{ post: Post; replies: Reply[] }>(`/api/raft/posts/${postId}?studentId=${encodeURIComponent(studentId)}`),
  share: (input: { authorId: string; kind: PostKind; body: string; photo: string | null; stepId: string | null }) =>
    call<{ shared: boolean; id?: string; review?: PostReview }>("/api/raft/posts", post(input)),
  reply: (postId: string, authorId: string, body: string, extras: { photo?: string | null; sceneStepId?: string | null } = {}) =>
    call<{ shared: boolean; review?: PostReview }>(`/api/raft/posts/${postId}/replies`, post({ authorId, body, ...extras })),
  react: (postId: string, studentId: string, kind: Reaction) => call(`/api/raft/posts/${postId}/react`, post({ studentId, kind })),
  report: (postId: string, studentId: string) => call(`/api/raft/posts/${postId}/report`, post({ studentId })),
  markHelped: (replyId: string, studentId: string) => call(`/api/raft/replies/${replyId}/helped`, post({ studentId })),
  profile: (studentId: string, viewerId = "") =>
    call<{ profile: Profile; workStyles: string[] }>(`/api/raft/people/${studentId}?viewerId=${encodeURIComponent(viewerId)}`),
  block: (studentId: string, blockedId: string, blocked: boolean) =>
    call(`/api/raft/people/${blockedId}/block`, post({ studentId, blocked })),
  updateProfile: (studentId: string, change: { goal?: string | null; goalRoutineId?: string | null; workStyle?: string[] }) =>
    call(`/api/raft/people/${studentId}`, { method: "PATCH", body: JSON.stringify(change) }),
  otter: () => call<{ address: string | null }>("/api/otter"),
  findOtter: () => call<{ address: string; photo: string | null }>("/api/otter/find", post({})),
  testOtter: (address: string) => call<{ photo: string }>("/api/otter/test", post({ address })),
  saveOtter: (address: string | null) => call("/api/otter", post({ address })),
  buttonPresses: (after: number) => call<{ presses: { id: number; button: string }[] }>(`/api/buttons?after=${after}`),
};
