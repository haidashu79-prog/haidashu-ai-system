-- 海大叔账号体系（简单版：手机号 + 密码，不发短信不发验证码）
-- 用法：wrangler d1 execute haidashu --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT    NOT NULL UNIQUE,       -- 当账号用，不验证，只做唯一标识
  nickname   TEXT,
  pass_hash  TEXT    NOT NULL,
  pass_salt  TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 每次 AI 问答留一条记录，归到账号名下
CREATE TABLE IF NOT EXISTS ask_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  page         TEXT,                        -- 在哪个案例页问的
  question     TEXT,                        -- 问题原文（截断 500 字）
  answer_chars INTEGER,                     -- 回答字数
  model        TEXT,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ask_user_time ON ask_log(user_id, created_at DESC);
