import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config";

// One SQLite file holds everything. No photos are ever stored here.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS crews (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    weekly_goal INTEGER NOT NULL,     -- steps done on our own, together, per week
    cheers      TEXT NOT NULL         -- JSON array of preset cheer phrases staff chose
  );

  CREATE TABLE IF NOT EXISTS students (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    crew_id       TEXT REFERENCES crews(id),
    weekly_target INTEGER NOT NULL,   -- steps on my own that fill this student's ring
    fur_hue       INTEGER NOT NULL DEFAULT 0, -- the student's own otter colour (a hue shift)
    goal          TEXT,                       -- the student's own goal, in their words
    goal_routine_id TEXT,                     -- the task the goal is about, if any
    work_style    TEXT                        -- JSON list of "how I work best" phrases
  );

  CREATE TABLE IF NOT EXISTS routines (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS steps (
    id          TEXT PRIMARY KEY,
    routine_id  TEXT NOT NULL REFERENCES routines(id),
    position    INTEGER NOT NULL,
    text        TEXT NOT NULL,        -- 8 words or fewer
    detail      TEXT NOT NULL,        -- one plain sentence for "show me"
    seconds     INTEGER,              -- only for steps that take a set time
    picture_svg TEXT,                 -- drawn once, then reused
    scene_json  TEXT                  -- the 3D "show me" model, built once, then reused
  );

  CREATE TABLE IF NOT EXISTS runs (
    id          TEXT PRIMARY KEY,
    routine_id  TEXT NOT NULL REFERENCES routines(id),
    student_id  TEXT NOT NULL REFERENCES students(id),
    started_at  TEXT NOT NULL,
    finished_at TEXT
  );

  -- help_level: 0 = on my own, 1 = nudge, 2 = hint, 3 = show me
  CREATE TABLE IF NOT EXISTS step_logs (
    id         TEXT PRIMARY KEY,
    run_id     TEXT NOT NULL REFERENCES runs(id),
    step_id    TEXT NOT NULL REFERENCES steps(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    help_level INTEGER NOT NULL,
    done_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cheers (
    id         TEXT PRIMARY KEY,
    from_id    TEXT NOT NULL REFERENCES students(id),
    to_id      TEXT NOT NULL REFERENCES students(id),
    run_id     TEXT NOT NULL REFERENCES runs(id),
    phrase     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS asks (
    id         TEXT PRIMARY KEY,
    from_id    TEXT NOT NULL REFERENCES students(id),
    to_id      TEXT NOT NULL REFERENCES students(id),
    step_id    TEXT NOT NULL REFERENCES steps(id),
    created_at TEXT NOT NULL
  );

  -- "Practise together" invites between buddies, in preset words
  CREATE TABLE IF NOT EXISTS invites (
    id          TEXT PRIMARY KEY,
    from_id     TEXT NOT NULL REFERENCES students(id),
    to_id       TEXT NOT NULL REFERENCES students(id),
    about       TEXT NOT NULL,        -- the step they'll practise
    status      TEXT NOT NULL,        -- waiting, yes or not-today
    created_at  TEXT NOT NULL
  );

  -- The raft's social side. Posts are wins or help asks; everything stays inside one raft.
  CREATE TABLE IF NOT EXISTS posts (
    id         TEXT PRIMARY KEY,
    crew_id    TEXT NOT NULL REFERENCES crews(id),
    author_id  TEXT NOT NULL REFERENCES students(id),
    kind       TEXT NOT NULL,         -- win or ask
    body       TEXT NOT NULL,
    photo      TEXT,                  -- a photo of the work the student chose to share (checked: no faces)
    step_id    TEXT REFERENCES steps(id),
    task_title TEXT,
    status     TEXT NOT NULL,         -- shown or reported
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS replies (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id),
    author_id  TEXT NOT NULL REFERENCES students(id),
    body       TEXT NOT NULL,
    helped     INTEGER NOT NULL,      -- the asker said "This helped"
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reactions (
    post_id    TEXT NOT NULL REFERENCES posts(id),
    from_id    TEXT NOT NULL REFERENCES students(id),
    kind       TEXT NOT NULL,         -- clap, proud, me-too or wow
    created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, from_id, kind)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id),
    from_id    TEXT NOT NULL REFERENCES students(id),
    created_at TEXT NOT NULL
  );

  -- Small settings saved from the app, like the otter's address
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Button presses from the otter, picked up by the screen at the same station
  CREATE TABLE IF NOT EXISTS button_presses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    button     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

function open(): DatabaseSync {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  const db = new DatabaseSync(config.databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  addMissingColumns(db);
  return db;
}

/** Columns added after the first version, for databases created before them. */
function addMissingColumns(db: DatabaseSync): void {
  const has = (table: string, column: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
  if (!has("steps", "scene_json")) db.exec("ALTER TABLE steps ADD COLUMN scene_json TEXT");
  if (!has("steps", "seconds")) db.exec("ALTER TABLE steps ADD COLUMN seconds INTEGER");
  if (!has("students", "fur_hue")) db.exec("ALTER TABLE students ADD COLUMN fur_hue INTEGER NOT NULL DEFAULT 0");
  if (!has("students", "goal")) db.exec("ALTER TABLE students ADD COLUMN goal TEXT");
  if (!has("students", "goal_routine_id")) db.exec("ALTER TABLE students ADD COLUMN goal_routine_id TEXT");
  if (!has("students", "work_style")) db.exec("ALTER TABLE students ADD COLUMN work_style TEXT");
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { ayinDb?: DatabaseSync };
export const db = globalForDb.ayinDb ?? open();
globalForDb.ayinDb = db;

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
