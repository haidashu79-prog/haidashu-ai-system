-- 智脑 · 一人公司启动状态机（Journey State Machine）
-- 用法：wrangler d1 execute haidashu --remote --file=schema_journey.sql
-- 依赖：schema.sql 里的 users 表

-- 一人一条旅程，state 是唯一真相来源
CREATE TABLE IF NOT EXISTS journey (
  user_id         INTEGER PRIMARY KEY,
  state           TEXT    NOT NULL,           -- 当前状态码，见 _machine.js STATES
  risk_prev_state TEXT,                       -- 进 AT_RISK 前的状态，用于恢复
  state_entered_at INTEGER NOT NULL,
  sla_due_at      INTEGER,                    -- 当前状态超时时刻（秒）
  last_event_at   INTEGER NOT NULL,
  profile         TEXT,                       -- JSON：城市/行业/资源/时间/资金/目标收入
  milestones      TEXT,                       -- JSON：已达成的里程碑数组
  risk            INTEGER NOT NULL DEFAULT 0,  -- 连续超时次数
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

-- 全量事件流水，只追加不修改
CREATE TABLE IF NOT EXISTS journey_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  from_state TEXT,
  to_state   TEXT,
  event      TEXT    NOT NULL,
  payload    TEXT,
  idem       TEXT,                            -- 幂等键：同一事件重复提交只生效一次
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_events_idem ON journey_events(user_id, idem);
CREATE INDEX IF NOT EXISTS idx_journey_events_user ON journey_events(user_id, created_at DESC);

-- 每个状态生成的待办动作，前端"今天就干这一件"取这里
CREATE TABLE IF NOT EXISTS journey_tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  state      TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  detail     TEXT,
  artifact   TEXT,                            -- 本步应产出的交付物名称
  due_at     INTEGER,
  status     TEXT    NOT NULL DEFAULT 'open', -- open / done / skipped / expired
  created_at INTEGER NOT NULL,
  closed_at  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_journey_tasks_open ON journey_tasks(user_id, status, due_at);
