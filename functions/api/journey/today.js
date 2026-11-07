/**
 * GET /api/journey/today → 今天只做这一件
 * 顺带做一次超时巡检，保证打开页面就能看到最真实的紧迫度。
 */
import { json, CORS, currentUser } from '../auth/_lib.js';
import { loadView, tickUser } from './_store.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const u = await currentUser(request, env);
  if (!u) return json({ ok: false, code: 'LOGIN_REQUIRED', message: '先登录' }, 401);

  try {
    const tick = await tickUser(env, u.id);
    const v = await loadView(env, u.id);
    return json({ ok: true, tick: tick.acted ? tick : null, today: v.task, journey: v });
  } catch (e) {
    return json({ ok: false, code: 'DB_ERROR', message: String(e && e.message || e) }, 500);
  }
}
