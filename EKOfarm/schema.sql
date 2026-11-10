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

-- v10: tržiště hráčů. Zboží v nabídce už není na farmě prodávajícího (je „v úschově“).
CREATE TABLE IF NOT EXISTS market (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller INTEGER NOT NULL,
  seller_name TEXT NOT NULL,
  item TEXT,                 -- surovina, nebo NULL u stroje
  qty INTEGER NOT NULL DEFAULT 1,
  machine TEXT,              -- model stroje
  price INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_seller ON market(seller);

-- prodané nabídky; paid = 1, když si prodávající peníze vyzvedl (připíšou se při dalším načtení farmy)
CREATE TABLE IF NOT EXISTS market_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller INTEGER NOT NULL,
  buyer_name TEXT NOT NULL,
  item TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  machine TEXT,
  coins INTEGER NOT NULL,
  created INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON market_sales(seller, paid);

-- v11: odběry upozornění (Web Push). last = do kdy už hráč upozornění dostal.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created INTEGER NOT NULL,
  last INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs(user_id);

-- v15: chat pro celý server (zprávy starší než 7 dní se mažou)
CREATE TABLE IF NOT EXISTS chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat(user_id, created);
