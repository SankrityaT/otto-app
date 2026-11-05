// Demo data: one café crew with a little practice history, so the crew screen isn't
// empty on first run. This is sample data for trying the app, not part of the app.
// Running it again wipes the database and starts over.

import { createRoutine } from "../src/lib/data/routines";
import { db, newId } from "../src/lib/db";

const TABLES = ["reports", "reactions", "replies", "posts", "invites", "asks", "cheers", "step_logs", "runs", "steps", "routines", "students", "crews", "button_presses"];
for (const table of TABLES) db.exec(`DELETE FROM ${table}`);

// Staff set these up: the crew, its weekly goal and the cheers students can send.
// Fixed ids, so a browser that picked a student still knows them after re-seeding.
const crewId = "crew-cafe";
db.prepare("INSERT INTO crews (id, name, weekly_goal, cheers) VALUES (?, ?, ?, ?)").run(
  crewId,
  "Café raft",
  30,
  JSON.stringify(["Nice work!", "You did it on your own!", "Proud of you", "Keep going"]),
);

// Each student picked their own otter colour (a hue shift; 0 is the painted brown).
const otters: Record<string, number> = { Jordan: 0, Ava: 300, Sam: 150, Leo: 210 };
const names = Object.keys(otters);
const students = Object.fromEntries(
  names.map((name) => {
    const id = `student-${name.toLowerCase()}`;
    db.prepare("INSERT INTO students (id, name, crew_id, weekly_target, fur_hue) VALUES (?, ?, ?, ?, ?)").run(
      id,
      name,
      crewId,
      8,
      otters[name],
    );
    return [name, id];
  }),
);

// One routine the crew has practised. New tasks are created in the app by Claude.
const latte = createRoutine({
  title: "Make an iced latte",
  steps: [
    { text: "Take a medium cup", detail: "Take one 16 oz clear cup from the stack by the register.", seconds: null },
    { text: "Fill a cup with ice", detail: "Scoop ice into a tall cup until it is full.", seconds: null },
    { text: "Pour milk to the line", detail: "Pour cold milk into the cup up to the line.", seconds: null },
    { text: "Pull one espresso shot", detail: "Press the one-shot button on the espresso machine.", seconds: null },
    { text: "Pour the shot over the milk", detail: "Pour the espresso slowly over the milk and ice.", seconds: null },
    { text: "Put on a lid", detail: "Press a lid onto the cup until it clicks all the way round.", seconds: null },
  ],
});

/** Record a past run: `helpLevels` is the help each step took. */
function pastRun(name: string, daysAgo: number, helpLevels: number[]): string {
  const studentId = students[name];
  const when = new Date();
  when.setDate(when.getDate() - daysAgo);
  const runId = newId();
  db.prepare("INSERT INTO runs (id, routine_id, student_id, started_at, finished_at) VALUES (?, ?, ?, ?, ?)").run(
    runId,
    latte.id,
    studentId,
    when.toISOString(),
    when.toISOString(),
  );
  latte.steps.forEach((step, index) => {
    db.prepare(
      "INSERT INTO step_logs (id, run_id, step_id, student_id, help_level, done_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(newId(), runId, step.id, studentId, helpLevels[index], when.toISOString());
  });
  return runId;
}

const today = new Date().getDay(); // keep sample runs inside this week (weeks start Monday)
const earlierThisWeek = Math.min((today + 6) % 7, 2);

pastRun("Sam", 9, [0, 1, 0, 0, 0, 1]); // last week
pastRun("Ava", 8, [0, 0, 0, 0, 0, 0]);
pastRun("Ava", 8, [0, 0, 0, 1, 0, 0]);
pastRun("Jordan", 11, [0, 0, 2, 1, 0, 0]);
pastRun("Jordan", 10, [0, 0, 1, 2, 0, 0]);
pastRun("Jordan", 8, [0, 0, 2, 3, 0, 0]);
pastRun("Sam", earlierThisWeek, [0, 0, 0, 0, 0, 0]);
const samToday = pastRun("Sam", 0, [0, 0, 0, 0, 0, 0]);
pastRun("Ava", 0, [0, 0, 1, 0, 0, 0]);
pastRun("Leo", earlierThisWeek, [0, 2, 3, 1, 0, 0]);

// A little crew life: a cheer on Sam's win, and Leo asking Jordan to make a latte together.
const at = new Date().toISOString();
db.prepare("INSERT INTO cheers (id, from_id, to_id, run_id, phrase, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
  newId(),
  students.Ava,
  students.Sam,
  samToday,
  "Proud of you",
  at,
);
// Leo started an iced latte a few minutes ago and asked Jordan to make one at the same time.
const leoNow = newId();
db.prepare("INSERT INTO runs (id, routine_id, student_id, started_at) VALUES (?, ?, ?, ?)").run(leoNow, latte.id, students.Leo, at);
latte.steps.slice(0, 2).forEach((step) => {
  db.prepare(
    "INSERT INTO step_logs (id, run_id, step_id, student_id, help_level, done_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(newId(), leoNow, step.id, students.Leo, 0, at);
});
db.prepare(
  `INSERT INTO invites (id, from_id, to_id, about, status, created_at, routine_id, from_run_id)
   VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)`,
).run(newId(), students.Leo, students.Jordan, latte.title, at, latte.id, leoNow);

// What each student chose for "how I work best", and Jordan's own goal.
const styles: Record<string, string[]> = {
  Jordan: ["One step at a time", "Show me, then let me try", "Pictures over words"],
  Sam: ["Quiet is good", "Show me, then let me try"],
  Ava: ["Talking it through helps", "Give me time to think"],
  Leo: ["Pictures over words", "Tell me what's changing first"],
};
for (const [name, style] of Object.entries(styles)) {
  db.prepare("UPDATE students SET work_style = ? WHERE id = ?").run(JSON.stringify(style), students[name]);
}
db.prepare("UPDATE students SET goal = ?, goal_routine_id = ? WHERE id = ?").run(
  "Make iced lattes on my own for the café",
  latte.id,
  students.Jordan,
);

// A few raft posts, so the feed has life on first run.
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
function post(name: string, kind: "win" | "ask", body: string, ago: number, stepText?: string): string {
  const id = newId();
  const step = stepText ? latte.steps.find((s) => s.text === stepText) : undefined;
  db.prepare(
    `INSERT INTO posts (id, crew_id, author_id, kind, body, photo, step_id, task_title, status, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'shown', ?)`,
  ).run(id, crewId, students[name], kind, body, step?.id ?? null, latte.title, minutesAgo(ago));
  return id;
}
const samWin = post("Sam", "win", "First time making an iced latte all on my own!", 90);
const avaAsk = post("Ava", "ask", "My milk keeps going over the line. How do you stop in time?", 12, "Pour milk to the line");
post("Leo", "win", "Finished my first latte. Only needed one hint this time.", 60 * 26);
for (const [from, kind] of [["Ava", "proud"], ["Leo", "clap"]] as const) {
  db.prepare("INSERT INTO reactions (post_id, from_id, kind, created_at) VALUES (?, ?, ?, ?)").run(samWin, students[from], kind, minutesAgo(80));
}
db.prepare("INSERT INTO replies (id, post_id, author_id, body, helped, status, created_at) VALUES (?, ?, ?, ?, 0, 'shown', ?)").run(
  newId(),
  avaAsk,
  students.Sam,
  "Pour slowly when it gets close, and stop when the milk touches the bottom of the line. It rises a bit after.",
  minutesAgo(5),
);

console.log(`Seeded the Café raft (${names.join(", ")}) and the "${latte.title}" routine.`);
