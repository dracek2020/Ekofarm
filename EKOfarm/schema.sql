-- EKOfarm – databáze D1
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT,            -- NULL u účtů jen s Googlem
  salt TEXT,
  google_sub TEXT UNIQUE,    -- trvalé ID Google účtu
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS farms (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated INTEGER NOT NULL
);
