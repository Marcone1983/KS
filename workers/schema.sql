-- Kurstaki Strike - D1 Database Schema
-- Enterprise-grade game data storage

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  username TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT,
  total_playtime INTEGER DEFAULT 0,
  highest_level INTEGER DEFAULT 1,
  total_pests_killed INTEGER DEFAULT 0
);

-- Premium users table
CREATE TABLE IF NOT EXISTS premium_users (
  user_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  is_lifetime INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TEXT NOT NULL,
  captured_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Game progress table
CREATE TABLE IF NOT EXISTS game_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  wave INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  plants_saved INTEGER NOT NULL DEFAULT 0,
  pests_killed INTEGER NOT NULL DEFAULT 0,
  spray_used INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Player inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Daily missions table
CREATE TABLE IF NOT EXISTS daily_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  UNIQUE(user_id, mission_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Plant collection table
CREATE TABLE IF NOT EXISTS plant_collection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  plant_name TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  level INTEGER NOT NULL DEFAULT 1,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, plant_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Spray collection table
CREATE TABLE IF NOT EXISTS spray_collection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  spray_id TEXT NOT NULL,
  spray_name TEXT NOT NULL,
  damage INTEGER NOT NULL DEFAULT 10,
  range INTEGER NOT NULL DEFAULT 5,
  special_effect TEXT,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, spray_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_game_progress_user ON game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
