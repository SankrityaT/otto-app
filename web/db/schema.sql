-- Ayin's database (Postgres, hosted on Supabase). Run with `npm run db:setup`; safe to run again.
-- Times are ISO 8601 strings, so they sort and compare as text. No photos of people are stored.

CREATE TABLE IF NOT EXISTS crews (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  weekly_goal INTEGER NOT NULL,     -- steps done on our own, together, per week
  cheers      TEXT NOT NULL,        -- JSON array of preset cheer phrases staff chose
  join_code   TEXT UNIQUE           -- the code staff give students to join this raft
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
  created_at TEXT NOT NULL,
  student_id TEXT REFERENCES students(id),  -- the student who asked for it: only they see it
  crew_id    TEXT REFERENCES crews(id)      -- or a task staff set up for a whole raft
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

-- "Do it together": one student invites a raftmate to do the same task at the same time.
-- Each works in their own step coach; the two runs are linked so they see each other's progress.
CREATE TABLE IF NOT EXISTS invites (
  id          TEXT PRIMARY KEY,
  from_id     TEXT NOT NULL REFERENCES students(id),
  to_id       TEXT NOT NULL REFERENCES students(id),
  about       TEXT NOT NULL,        -- the task's title
  status      TEXT NOT NULL,        -- waiting, yes or not-today
  created_at  TEXT NOT NULL,
  routine_id  TEXT REFERENCES routines(id),
  from_run_id TEXT REFERENCES runs(id),
  to_run_id   TEXT REFERENCES runs(id)  -- set when the raftmate joins
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
  photo      TEXT,                  -- a photo of the work, checked for faces before it's saved
  scene_step_id TEXT,               -- a step whose 3D "show me" model is shared in the reply
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

-- A student who blocks someone stops seeing their posts and replies, and they can't reply back.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES students(id),
  blocked_id TEXT NOT NULL REFERENCES students(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
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
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  button     TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Ayin's server connects as the owner of these tables. Row-level security is on with no rules,
-- so Supabase's public API (the "anon" key) can't read or change anything.
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE button_presses ENABLE ROW LEVEL SECURITY;
