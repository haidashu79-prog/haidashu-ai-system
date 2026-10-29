/** POST /api/auth/register  { phone, pass, nickname? } → 注册并登录 */
import { json, CORS, now, hashPass, checkPass, checkPhone, createSession, cookieHeader, publicUser } from './_lib.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, error: '只支持 POST' }, 405);

  let body = {};
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: '请求格式不对' }, 400); }

  const pc = checkPhone(body.phone);
  if (pc.err) return json({ ok: false, error: pc.err }, 400);
  const pe = checkPass(body.pass);
  if (pe) return json({ ok: false, error: pe }, 400);

  const phone = pc.ok;
  const nickname = String(body.nickname || '').trim().slice(0, 20) || null;

  const existed = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first();
  if (existed) return json({ ok: false, error: '这个手机号已经注册过了，直接登录即可' }, 409);

  const salt = crypto.randomUUID();
  const hash = await hashPass(String(body.pass), salt);

  const res = await env.DB.prepare(
    'INSERT INTO users (phone, nickname, pass_hash, pass_salt, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(phone, nickname, hash, salt, now())
    .run();

  const id = res.meta && res.meta.last_row_id;
  const token = await createSession(env, id);

  return json(
    { ok: true, user: publicUser({ id, phone, nickname, created_at: now() }) },
    200,
    { 'Set-Cookie': cookieHeader(token) }
  );
}
