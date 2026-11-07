/**
 * POST /api/journey/advance
 * body: { event, payload?, idem? }
 *
 * 唯一的状态推进入口。前端不允许直接写 state。
 */
import { json, CORS, currentUser } from '../auth/_lib.js';
import { applyEvent } from './_store.js';
import { STATES } from './_machine.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, code: 'METHOD' , message: '只接受 POST' }, 405);

  const u = await currentUser(request, env);
  if (!u) return json({ ok: false, code: 'LOGIN_REQUIRED', message: '先登录再推进' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, code: 'BAD_JSON', message: '请求体不是合法 JSON' }, 400); }

  const event = String(body && body.event || '').trim();
  if (!event) return json({ ok: false, code: 'NO_EVENT', message: '缺少 event' }, 400);

  const payload = (body && body.payload) || {};
  const idem = body && body.idem ? String(body.idem).slice(0, 120) : null;

  try {
    const r = await applyEvent(env, u.id, event, payload, idem);
    if (!r.ok) {
      const status = r.code === 'CONFLICT' ? 409 : 400;
      return json({ ok: false, code: r.code, message: r.message, missing: r.missing, invalid: r.invalid, allowed: r.allowed }, status);
    }
    return json({ ok: true, duplicate: !!r.duplicate, from: r.from || null, to: r.to || null, note: r.note || '', journey: r.view });
  } catch (e) {
    return json({ ok: false, code: 'DB_ERROR', message: String(e && e.message || e) }, 500);
  }
}

/** GET 返回事件字典，方便前端渲染按钮 */
export async function onRequestGet({ env, request }) {
  const dict = Object.fromEntries(
    Object.entries(STATES).map(([k, s]) => [k, { name: s.name, events: Object.keys(s.events) }])
  );
  return json({ ok: true, states: dict }, 200);
}
