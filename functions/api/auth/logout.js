/** POST /api/auth/logout → 清会话 */
import { json, CORS, COOKIE, clearCookieHeader } from './_lib.js';

function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const token = readCookie(request, COOKIE);
  if (token) {
    try { await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run(); } catch (e) {}
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader() });
}
