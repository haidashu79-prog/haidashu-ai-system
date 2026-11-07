/**
 * 智脑 · 状态机存储层（D1）
 *
 * 保证：
 * 1. 幂等：同一 (user, idem) 只生效一次，前端重复点不会连跳两级。
 * 2. 乐观锁：UPDATE ... WHERE state = 旧状态，并发下只有一个能成功。
 * 3. 只追加：journey_events 不修改不删除，任何状态可回溯。
 * 4. 任务闭环：进入新状态自动关旧任务、开新任务。
 */

import {
  STATES, START_STATE, transition, slaDue, timeoutDecision, view, isTerminal, validateProfile,
} from './_machine.js';

const now = () => Math.floor(Date.now() / 1000);

function parseJson(s, fallback) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

/** 取旅程，没有就建一条 */
export async function ensureJourney(env, userId) {
  const row = await env.DB.prepare('SELECT * FROM journey WHERE user_id = ?').bind(userId).first();
  if (row) return row;

  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO journey
       (user_id, state, risk_prev_state, state_entered_at, sla_due_at, last_event_at, profile, milestones, risk, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, NULL, '[]', 0, ?, ?)`
    ).bind(userId, START_STATE, t, slaDue(START_STATE, t), t, t, t),
    env.DB.prepare(
      `INSERT INTO journey_events (user_id, from_state, to_state, event, payload, idem, created_at)
       VALUES (?, NULL, ?, 'init', NULL, ?, ?)`
    ).bind(userId, START_STATE, `init:${userId}`, t),
  ]);

  return await env.DB.prepare('SELECT * FROM journey WHERE user_id = ?').bind(userId).first();
}

/** 组装给前端的视图 */
export async function loadView(env, userId) {
  const j = await ensureJourney(env, userId);
  const task = await env.DB.prepare(
    `SELECT id, title, detail, artifact, due_at FROM journey_tasks
     WHERE user_id = ? AND status = 'open' ORDER BY due_at ASC LIMIT 1`
  ).bind(userId).first();

  const history = await env.DB.prepare(
    `SELECT from_state, to_state, event, created_at FROM journey_events
     WHERE user_id = ? ORDER BY id DESC LIMIT 10`
  ).bind(userId).all();

  const overdue = j.sla_due_at ? Math.max(0, now() - j.sla_due_at) : 0;

  return view(j.state, {
    profile: parseJson(j.profile, null),
    milestones: parseJson(j.milestones, []),
    risk: j.risk,
    riskPrevState: j.risk_prev_state,
    slaDueAt: j.sla_due_at,
    overdueSeconds: overdue,
    task: task ? { id: task.id, title: task.title, detail: task.detail, artifact: task.artifact, dueAt: task.due_at } : null,
    history: (history.results || []).reverse(),
    updatedAt: j.updated_at,
  });
}

/**
 * 提交一个事件，推进状态。
 * @returns {{ ok, code?, message?, view? }}
 */
export async function applyEvent(env, userId, event, payload = {}, idem = null) {
  const j = await ensureJourney(env, userId);
  const t = now();

  // 幂等：已处理过直接返回当前视图
  const key = idem || `${j.state}:${event}:${t}`;
  if (idem) {
    const dup = await env.DB.prepare('SELECT id FROM journey_events WHERE user_id = ? AND idem = ?')
      .bind(userId, idem).first();
    if (dup) return { ok: true, duplicate: true, view: await loadView(env, userId) };
  }

  // 合并画像：允许分次提交字段
  const curProfile = parseJson(j.profile, {}) || {};
  const nextProfile = payload.profile ? { ...curProfile, ...payload.profile } : curProfile;

  // 校验
  const res = transition(j.state, event, { profile: nextProfile, riskPrevState: j.risk_prev_state });
  if (!res.ok) return { ok: false, code: res.code, message: res.message, missing: res.missing, invalid: res.invalid, allowed: res.allowed };

  // 目标状态与 SLA
  const to = res.to;
  const nextSla = slaDue(to, t);
  const isRiskEntry = to === 'AT_RISK';
  const riskPrev = isRiskEntry ? j.state : (j.state === 'AT_RISK' ? null : j.risk_prev_state);

  // 里程碑：离开 S0 记一次，签下首单记一次
  let milestones = parseJson(j.milestones, []);
  if (to === 'S1_TRACK' && !milestones.includes('profile_done')) milestones.push('profile_done');
  if (to === 'S9_DELIVERY' && !milestones.includes('first_deal')) milestones.push('first_deal');
  if (to === 'DONE' && !milestones.includes('graduated')) milestones.push('graduated');

  // 进入新状态时生成新任务
  const st = STATES[to];
  const taskTitle = st && st.action ? st.action.title : '';
  const taskDetail = st && st.action ? st.action.detail : '';
  const taskArtifact = st ? st.artifact : null;

  const stmts = [];

  // 乐观锁：只有状态没被别人改过才更新
  stmts.push(
    env.DB.prepare(
      `UPDATE journey SET state = ?, risk_prev_state = ?, state_entered_at = ?, sla_due_at = ?,
         last_event_at = ?, profile = ?, milestones = ?, risk = ?, updated_at = ?
       WHERE user_id = ? AND state = ?`
    ).bind(to, riskPrev, t, nextSla, t, JSON.stringify(nextProfile), JSON.stringify(milestones),
      isRiskEntry ? j.risk + 1 : 0, t, userId, j.state)
  );

  stmts.push(
    env.DB.prepare(
      `INSERT OR IGNORE INTO journey_events (user_id, from_state, to_state, event, payload, idem, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, j.state, to, event, JSON.stringify(payload), key, t)
  );

  // 关掉旧任务
  stmts.push(
    env.DB.prepare(`UPDATE journey_tasks SET status = 'done', closed_at = ? WHERE user_id = ? AND status = 'open'`)
      .bind(t, userId)
  );

  // 开新任务（终态不开）
  if (!isTerminal(to) && taskTitle) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO journey_tasks (user_id, state, title, detail, artifact, due_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
      ).bind(userId, to, taskTitle, taskDetail, taskArtifact, nextSla, t)
    );
  }

  const out = await env.DB.batch(stmts);
  const changed = out[0] && out[0].meta ? out[0].meta.changes : 0;
  if (!changed) {
    return { ok: false, code: 'CONFLICT', message: '状态已被另一次操作更新，请刷新后重试' };
  }

  return { ok: true, from: j.state, to, note: res.note, view: await loadView(env, userId) };
}

/**
 * 巡检单个用户：处理超时。
 * @returns {{ acted:boolean, kind?:string, message?:string, state?:string }}
 */
export async function tickUser(env, userId) {
  const j = await ensureJourney(env, userId);
  if (isTerminal(j.state)) return { acted: false };

  const t = now();
  const st = STATES[j.state];

  // 无事件超过 7 天，直接预警
  const idleDays = (t - j.last_event_at) / 86400;
  if (idleDays >= 7 && j.state !== 'AT_RISK') {
    await forceRisk(env, userId, `连续 ${Math.floor(idleDays)} 天没有动作`);
    return { acted: true, kind: 'at_risk', message: `连续 ${Math.floor(idleDays)} 天没有动作，已转入停滞预警`, state: 'AT_RISK' };
  }

  if (!j.sla_due_at) return { acted: false };
  const over = t - j.sla_due_at;
  if (over <= 0) return { acted: false };

  const d = timeoutDecision(j.state, over);
  if (d.kind === 'at_risk') {
    await forceRisk(env, userId, d.message);
    return { acted: true, kind: 'at_risk', message: d.message, state: 'AT_RISK' };
  }
  if (d.kind === 'escalate') {
    await env.DB.prepare('UPDATE journey SET risk = risk + 1, updated_at = ? WHERE user_id = ?').bind(t, userId).run();
    return { acted: true, kind: 'escalate', message: d.message };
  }
  if (d.kind === 'none') return { acted: false };

  // nudge / switch_tactic：只提醒，顺延 SLA 避免天天重复推
  const nextSla = t + 24 * 3600;
  await env.DB.prepare('UPDATE journey SET sla_due_at = ?, risk = risk + 1, updated_at = ? WHERE user_id = ?')
    .bind(nextSla, t, userId).run();
  return { acted: true, kind: d.kind, message: d.message, suggestEvent: d.suggestEvent, state: j.state };
}

/** 强制转入 AT_RISK（超时专用，绕过事件校验） */
export async function forceRisk(env, userId, reason) {
  const j = await ensureJourney(env, userId);
  if (j.state === 'AT_RISK' || isTerminal(j.state)) return;
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE journey SET state = 'AT_RISK', risk_prev_state = ?, state_entered_at = ?, sla_due_at = ?, risk = risk + 1, updated_at = ?
       WHERE user_id = ? AND state = ?`
    ).bind(j.state, t, slaDue('AT_RISK', t), t, userId, j.state),
    env.DB.prepare(
      `INSERT INTO journey_events (user_id, from_state, to_state, event, payload, idem, created_at)
       VALUES (?, ?, 'AT_RISK', 'timeout_to_risk', ?, ?, ?)`
    ).bind(userId, j.state, JSON.stringify({ reason }), `risk:${userId}:${t}`, t),
    env.DB.prepare(`UPDATE journey_tasks SET status = 'expired', closed_at = ? WHERE user_id = ? AND status = 'open'`)
      .bind(t, userId),
  ]);

  // AT_RISK 也要给一个任务
  const st = STATES.AT_RISK;
  await env.DB.prepare(
    `INSERT INTO journey_tasks (user_id, state, title, detail, artifact, due_at, status, created_at)
     VALUES (?, 'AT_RISK', ?, ?, NULL, ?, 'open', ?)`
  ).bind(userId, st.action.title, st.action.detail, slaDue('AT_RISK', t), t).run();
}

/** 批量巡检（外部 cron 触发） */
export async function tickAll(env, limit = 200) {
  const rows = await env.DB.prepare(
    `SELECT user_id FROM journey WHERE state NOT IN ('DONE','CHURNED') ORDER BY updated_at ASC LIMIT ?`
  ).bind(limit).all();

  const results = [];
  for (const r of rows.results || []) {
    try {
      const res = await tickUser(env, r.user_id);
      if (res.acted) results.push({ userId: r.user_id, ...res });
    } catch (e) {
      results.push({ userId: r.user_id, error: String(e && e.message || e) });
    }
  }
  return { scanned: (rows.results || []).length, acted: results.length, results };
}

export { validateProfile };
