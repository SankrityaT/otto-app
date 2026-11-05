// Demo data: one café crew with a little practice history, so the crew screen isn't
// empty on first run. This is sample data for trying the app, not part of the app.
// Running it again wipes the database and starts over.

import { createRoutine } from "../src/lib/data/routines";
import { db, newId } from "../src/lib/db";

const TABLES = ["asks", "cheers", "step_logs", "runs", "steps", "routines", "students", "crews", "button_presses"];
for (const table of TABLES) db.exec(`DELETE FROM ${table}`);

// Staff set these up: the crew, its weekly goal and the cheers students can send.
const crewId = newId();
db.prepare("INSERT INTO crews (id, name, weekly_goal, cheers) VALUES (?, ?, ?, ?)").run(
  crewId,
  "Café crew",
  30,
  JSON.stringify(["Nice work!", "You did it on your own!", "Proud of you", "Keep going"]),
);

// Each student picked their own otter colour (a hue shift; 0 is the painted brown).
const otters: Record<string, number> = { Jordan: 0, Ava: 300, Sam: 150, Leo: 210 };
const names = Object.keys(otters);
const students = Object.fromEntries(
  names.map((name) => {
    const id = newId();
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
    { text: "Wash your hands", detail: "Wash your hands with soap for 20 seconds, then dry them." },
    { text: "Fill a cup with ice", detail: "Scoop ice into a tall cup until it is full." },
    { text: "Pour milk to the line", detail: "Pour cold milk into the cup up to the line." },
    { text: "Pull one espresso shot", detail: "Press the one-shot button on the espresso machine." },
    { text: "Pour the shot over the milk", detail: "Pour the espresso slowly over the milk and ice." },
    { text: "Put on a lid", detail: "Press a lid onto the cup until it clicks all the way round." },
  ],
});

/** Record a past run: `helpLevels` is the help each step took. */
function pastRun(name: string, daysAgo: number, helpLevels: number[]) {
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
pastRun("Sam", 0, [0, 0, 0, 0, 0, 0]);
pastRun("Ava", 0, [0, 0, 1, 0, 0, 0]);
pastRun("Leo", earlierThisWeek, [0, 2, 3, 1, 0, 0]);

console.log(`Seeded the Café crew (${names.join(", ")}) and the "${latte.title}" routine.`);
