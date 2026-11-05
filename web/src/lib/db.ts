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
    weekly_target INTEGER NOT NULL    -- steps on my own that fill this student's ring
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
  const columns = db.prepare("PRAGMA table_info(steps)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "scene_json")) {
    db.exec("ALTER TABLE steps ADD COLUMN scene_json TEXT");
  }
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
