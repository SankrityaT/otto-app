import { describe, expect, it } from "vitest";
import { evidenceFor, laterChoices, latestOfEachTask, notNow, openThings, type FinishedRun } from "../src/lib/today";

const noon = "2026-11-05T12:00:00.000Z";
const latte = { id: "latte", title: "Make an iced latte", stepCount: 6 };
const fold = { id: "fold", title: "Fold a shirt", stepCount: 4 };
const apron = { id: "apron", text: "Bring my apron", createdAt: noon };

function open(input: Partial<Parameters<typeof openThings>[0]>) {
  return openThings({ routines: [latte, fold], started: [], reminders: [], holds: [], finishedToday: new Set(), now: noon, ...input });
}

const hold = (itemId: string, change: { laterUntil?: string; laterMoment?: string; letGoAt?: string }) => ({
  itemId,
  laterUntil: null,
  laterMoment: null,
  letGoAt: null,
  ...change,
});

describe("what's open", () => {
  it("puts tasks already started first, then reminders, then tasks to practise", () => {
    const started = [{ runId: "r1", routineId: "fold", title: fold.title, done: 2, total: 4 }];
    expect(open({ started, reminders: [apron] }).map((t) => t.id)).toEqual(["fold", "apron", "latte"]);
  });

  it("shows each task once, carrying on its latest try", () => {
    const started = [
      { runId: "new", routineId: "fold", title: fold.title, done: 1, total: 4 },
      { runId: "old", routineId: "fold", title: fold.title, done: 3, total: 4 },
    ];
    const things = open({ started });
    expect(things.filter((t) => t.id === "fold")).toHaveLength(1);
    expect(things[0].run?.id).toBe("new");
  });

  it("rests a task finished today, unless it was started again", () => {
    const finishedToday = new Set(["latte"]);
    expect(open({ finishedToday }).map((t) => t.id)).toEqual(["fold"]);
    const started = [{ runId: "r2", routineId: "latte", title: latte.title, done: 1, total: 6 }];
    expect(open({ finishedToday, started }).map((t) => t.id)).toEqual(["latte", "fold"]);
  });

  it("drops anything the student can't see any more", () => {
    const started = [{ runId: "r3", routineId: "left-the-raft", title: "Old task", done: 1, total: 4 }];
    expect(open({ started }).map((t) => t.id)).toEqual(["latte", "fold"]);
  });

  it("moves a thing put off to the back until its time comes", () => {
    const holds = [hold("latte", { laterUntil: "2026-11-05T13:00:00.000Z", laterMoment: "after lunch" })];
    const things = open({ holds });
    expect(things.map((t) => t.id)).toEqual(["fold", "latte"]);
    expect(things[1].later).toBe("after lunch");

    const afterLunch = open({ holds, now: "2026-11-05T13:00:01.000Z" });
    expect(afterLunch.map((t) => t.id)).toEqual(["latte", "fold"]);
    expect(afterLunch[0].later).toBeNull();
  });

  it("leaves out what was let go", () => {
    const holds = [hold("latte", { letGoAt: noon })];
    expect(open({ holds, reminders: [apron] }).map((t) => t.id)).toEqual(["apron", "fold"]);
  });
});

describe("how Otto knows", () => {
  it("only says Otto saw what a photo check really passed", () => {
    expect(evidenceFor({ total: 6, seen: 6, said: 0 })).toEqual({ kind: "saw", detail: "Otto saw every step" });
    expect(evidenceFor({ total: 6, seen: 4, said: 2 })).toEqual({ kind: "saw", detail: "Otto saw 4 of 6 steps" });
    expect(evidenceFor({ total: 6, seen: 0, said: 6 })).toEqual({ kind: "confirmed", detail: "You said you did it" });
  });

  it("claims nothing for steps logged before Otto kept track", () => {
    expect(evidenceFor({ total: 6, seen: 0, said: 0 })).toBeNull();
  });

  it("remembers the latest finish of each task", () => {
    const run = (runId: string, routineId: string) => ({ runId, routineId }) as FinishedRun;
    expect(latestOfEachTask([run("a", "latte"), run("b", "latte"), run("c", "fold")]).map((r) => r.runId)).toEqual(["a", "c"]);
  });
});

describe("later, on the student's clock", () => {
  const momentsAt = (hour: number) => laterChoices(new Date(2026, 10, 5, hour)).map((c) => c.moment);

  it("only offers times still to come", () => {
    expect(momentsAt(9)).toEqual(["in 30 minutes", "after lunch", "this evening"]);
    expect(momentsAt(14)).toEqual(["in 30 minutes", "this evening"]);
    expect(momentsAt(20)).toEqual(["in 30 minutes"]);
  });

  it("sends every choice into the future", () => {
    const morning = new Date(2026, 10, 5, 9);
    for (const choice of [...laterChoices(morning), notNow(morning)]) {
      expect(new Date(choice.until).getTime()).toBeGreaterThan(morning.getTime());
    }
  });

  it("makes not now mean tomorrow morning", () => {
    const until = new Date(notNow(new Date(2026, 10, 5, 23, 30)).until);
    expect([until.getDate(), until.getHours()]).toEqual([6, 8]);
  });
});
