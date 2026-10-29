/** GET /api/auth/logs → 我的问答记录（最近 100 条 + 合计） */
import { json, CORS, currentUser } from './_lib.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, needLogin: true }, 401);

  const limit = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('limit'), 10) || 100, 1), 300);

  try {
    const { results } = await env.DB.prepare(
      'SELECT page, question, answer_chars, created_at FROM ask_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    )
      .bind(user.id, limit)
      .all();

    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM ask_log WHERE user_id = ?')
      .bind(user.id)
      .first();

    return json({ ok: true, total: (total && total.n) || 0, items: results || [] });
  } catch (e) {
    return json({ ok: false, error: '读记录失败：' + (e.message || '未知错误') }, 500);
  }
}
