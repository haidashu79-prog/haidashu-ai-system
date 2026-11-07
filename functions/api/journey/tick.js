/**
 * POST /api/journey/tick → 批量巡检
 * 由外部 cron 触发（GitHub Actions / Cloudflare Worker Cron / 本机 launchd 均可）
 * 需要请求头 x-tick-key 与环境变量 TICK_KEY 一致，不配 TICK_KEY 时禁用。
 */
import { json, CORS } from '../auth/_lib.js';
import { tickAll } from './_store.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const need = env.TICK_KEY;
  if (!need) return json({ ok: false, code: 'DISABLED', message: '未配置 TICK_KEY，巡检接口关闭' }, 403);
  if ((request.headers.get('x-tick-key') || '') !== need) {
    return json({ ok: false, code: 'FORBIDDEN', message: '巡检密钥不对' }, 403);
  }

  try {
    const limit = Math.min(500, Number(new URL(request.url).searchParams.get('limit')) || 200);
    const r = await tickAll(env, limit);
    return json({ ok: true, ...r });
  } catch (e) {
    return json({ ok: false, code: 'DB_ERROR', message: String(e && e.message || e) }, 500);
  }
}
