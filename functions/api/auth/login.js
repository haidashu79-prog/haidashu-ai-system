/** POST /api/auth/login  { phone, pass } → 登录 */
import { json, CORS, hashPass, checkPhone, createSession, cookieHeader, publicUser } from './_lib.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, error: '只支持 POST' }, 405);

  let body = {};
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: '请求格式不对' }, 400); }

  const pc = checkPhone(body.phone);
  if (pc.err) return json({ ok: false, error: pc.err }, 400);

  const row = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(pc.ok).first();
  if (!row) return json({ ok: false, error: '这个手机号还没注册' }, 404);

  const hash = await hashPass(String(body.pass || ''), row.pass_salt);
  if (hash !== row.pass_hash) return json({ ok: false, error: '密码不对' }, 401);

  const token = await createSession(env, row.id);
  return json({ ok: true, user: publicUser(row) }, 200, { 'Set-Cookie': cookieHeader(token) });
}
