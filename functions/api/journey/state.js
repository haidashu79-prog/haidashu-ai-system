/** GET /api/journey/state → 当前旅程完整视图 */
import { json, CORS, currentUser } from '../auth/_lib.js';
import { loadView } from './_store.js';
import { VERSION } from './_machine.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const u = await currentUser(request, env);
  if (!u) return json({ ok: false, code: 'LOGIN_REQUIRED', message: '先登录再看进度' }, 401);

  try {
    const v = await loadView(env, u.id);
    return json({ ok: true, version: VERSION, journey: v });
  } catch (e) {
    return json({ ok: false, code: 'DB_ERROR', message: String(e && e.message || e) }, 500);
  }
}
