// Demo data: one café crew with a little practice history, so the crew screen isn't
// empty on first run. This is sample data for trying the app, not part of the app.
// Running it again wipes the database and starts over.

import { createRoutine } from "../src/lib/data/routines";
import { close, exec, newId, run } from "../src/lib/db";

const TABLES = [
  "reports",
  "reactions",
  "replies",
  "posts",
  "invites",
  "cheers",
  "step_logs",
  "runs",
  "steps",
  "routines",
  "students",
  "crews",
  "button_presses",
  "blocks",
  "settings",
];

async function main() {
  await exec(`TRUNCATE ${TABLES.join(", ")}`);

  // Staff set these up: the crew, its weekly goal, the cheers students can send and the code to join.
  // Fixed ids, so a browser that picked a student still knows them after re-seeding.
  const crewId = "crew-cafe";
  await run(
    "INSERT INTO crews (id, name, weekly_goal, cheers, join_code) VALUES (?, ?, ?, ?, ?)",
    crewId,
    "Café raft",
    30,
    JSON.stringify([
      "Nice work!",
      "You did it on your own!",
      "Proud of you",
      "Keep going",
    ]),
    "OTTER",
  );

  // Each student picked their own otter colour (a hue shift; 0 is the painted brown).
  const otters: Record<string, number> = {
    Jordan: 0,
    Ava: 300,
    Sam: 150,
    Leo: 210,
  };
  const names = Object.keys(otters);
  const students: Record<string, string> = {};
  for (const name of names) {
    students[name] = `student-${name.toLowerCase()}`;
    await run(
      "INSERT INTO students (id, name, crew_id, weekly_target, fur_hue) VALUES (?, ?, ?, ?, ?)",
      students[name],
      name,
      crewId,
      8,
      otters[name],
    );
  }

  // One task staff set up for the whole raft, with practice history. Every other task is
  // created in the app by Claude, when a student asks, and belongs to that student.
  const latte = await createRoutine(
    {
      title: "Make an iced latte",
      steps: [
        {
          text: "Take a medium cup",
          detail: "Take one 16 oz clear cup from the stack by the register.",
          seconds: null,
        },
        {
          text: "Fill a cup with ice",
          detail: "Scoop ice into a tall cup until it is full.",
          seconds: null,
        },
        {
          text: "Pour milk to the line",
          detail: "Pour cold milk into the cup up to the line.",
          seconds: null,
        },
        {
          text: "Pull one espresso shot",
          detail: "Press the one-shot button on the espresso machine.",
          seconds: null,
        },
        {
          text: "Pour the shot over the milk",
          detail: "Pour the espresso slowly over the milk and ice.",
          seconds: null,
        },
        {
          text: "Put on a lid",
          detail: "Press a lid onto the cup until it clicks all the way round.",
          seconds: null,
        },
      ],
    },
    { crewId },
  );

  /** Record a past run: `helpLevels` is the help each step took. */
  async function pastRun(
    name: string,
    daysAgo: number,
    helpLevels: number[],
  ): Promise<string> {
    const studentId = students[name];
    const when = new Date();
    when.setDate(when.getDate() - daysAgo);
    const runId = newId();
    await run(
      "INSERT INTO runs (id, routine_id, student_id, started_at, finished_at) VALUES (?, ?, ?, ?, ?)",
      runId,
      latte.id,
      studentId,
      when.toISOString(),
      when.toISOString(),
    );
    for (const [index, step] of latte.steps.entries()) {
      await run(
        "INSERT INTO step_logs (id, run_id, step_id, student_id, help_level, done_at) VALUES (?, ?, ?, ?, ?, ?)",
        newId(),
        runId,
        step.id,
        studentId,
        helpLevels[index],
        when.toISOString(),
      );
    }
    return runId;
  }

  const today = new Date().getDay(); // keep sample runs inside this week (weeks start Monday)
  const earlierThisWeek = Math.min((today + 6) % 7, 2);

  await pastRun("Sam", 9, [0, 1, 0, 0, 0, 1]); // last week
  await pastRun("Ava", 8, [0, 0, 0, 0, 0, 0]);
  await pastRun("Ava", 8, [0, 0, 0, 1, 0, 0]);
  await pastRun("Jordan", 11, [0, 0, 2, 1, 0, 0]);
  await pastRun("Jordan", 10, [0, 0, 1, 2, 0, 0]);
  await pastRun("Jordan", 8, [0, 0, 2, 3, 0, 0]);
  await pastRun("Sam", earlierThisWeek, [0, 0, 0, 0, 0, 0]);
  const samToday = await pastRun("Sam", 0, [0, 0, 0, 0, 0, 0]);
  await pastRun("Ava", 0, [0, 0, 1, 0, 0, 0]);
  await pastRun("Leo", earlierThisWeek, [0, 2, 3, 1, 0, 0]);

  // A little crew life: a cheer on Sam's win, and Leo asking Jordan to make a latte together.
  const at = new Date().toISOString();
  await run(
    "INSERT INTO cheers (id, from_id, to_id, run_id, phrase, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    newId(),
    students.Ava,
    students.Sam,
    samToday,
    "Proud of you",
    at,
  );
  // Leo started an iced latte a few minutes ago and asked Jordan to make one at the same time.
  const leoNow = newId();
  await run(
    "INSERT INTO runs (id, routine_id, student_id, started_at) VALUES (?, ?, ?, ?)",
    leoNow,
    latte.id,
    students.Leo,
    at,
  );
  for (const step of latte.steps.slice(0, 2)) {
    await run(
      "INSERT INTO step_logs (id, run_id, step_id, student_id, help_level, done_at) VALUES (?, ?, ?, ?, ?, ?)",
      newId(),
      leoNow,
      step.id,
      students.Leo,
      0,
      at,
    );
  }
  await run(
    `INSERT INTO invites (id, from_id, to_id, about, status, created_at, routine_id, from_run_id)
     VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)`,
    newId(),
    students.Leo,
    students.Jordan,
    latte.title,
    at,
    latte.id,
    leoNow,
  );

  // What each student chose for "how I work best", and Jordan's own goal.
  const styles: Record<string, string[]> = {
    Jordan: [
      "One step at a time",
      "Show me, then let me try",
      "Pictures over words",
    ],
    Sam: ["Quiet is good", "Show me, then let me try"],
    Ava: ["Talking it through helps", "Give me time to think"],
    Leo: ["Pictures over words", "Tell me what's changing first"],
  };
  for (const [name, style] of Object.entries(styles)) {
    await run(
      "UPDATE students SET work_style = ? WHERE id = ?",
      JSON.stringify(style),
      students[name],
    );
  }
  await run(
    "UPDATE students SET goal = ?, goal_routine_id = ? WHERE id = ?",
    "Make iced lattes on my own for the café",
    latte.id,
    students.Jordan,
  );

  // A few raft posts, so the feed has life on first run.
  const minutesAgo = (m: number) =>
    new Date(Date.now() - m * 60_000).toISOString();
  async function post(
    name: string,
    kind: "win" | "ask",
    body: string,
    ago: number,
    stepText?: string,
  ): Promise<string> {
    const id = newId();
    const step = stepText
      ? latte.steps.find((s) => s.text === stepText)
      : undefined;
    await run(
      `INSERT INTO posts (id, crew_id, author_id, kind, body, photo, step_id, task_title, status, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'shown', ?)`,
      id,
      crewId,
      students[name],
      kind,
      body,
      step?.id ?? null,
      latte.title,
      minutesAgo(ago),
    );
    return id;
  }
  const samWin = await post(
    "Sam",
    "win",
    "First time making an iced latte all on my own!",
    90,
  );
  const avaAsk = await post(
    "Ava",
    "ask",
    "My milk keeps going over the line. How do you stop in time?",
    12,
    "Pour milk to the line",
  );
  await post(
    "Leo",
    "win",
    "Finished my first latte. Only needed one hint this time.",
    60 * 26,
  );
  for (const [from, kind] of [
    ["Ava", "proud"],
    ["Leo", "clap"],
  ] as const) {
    await run(
      "INSERT INTO reactions (post_id, from_id, kind, created_at) VALUES (?, ?, ?, ?)",
      samWin,
      students[from],
      kind,
      minutesAgo(80),
    );
  }
  await run(
    "INSERT INTO replies (id, post_id, author_id, body, helped, status, created_at) VALUES (?, ?, ?, ?, 0, 'shown', ?)",
    newId(),
    avaAsk,
    students.Sam,
    "Pour slowly when it gets close, and stop when the milk touches the bottom of the line. It rises a bit after.",
    minutesAgo(5),
  );

  console.log(
    `Seeded the Café raft (${names.join(", ")}) and the "${latte.title}" routine.`,
  );
}

main().finally(close);
