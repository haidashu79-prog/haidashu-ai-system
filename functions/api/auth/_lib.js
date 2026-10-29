/**
 * 账号体系公共库（简单版）
 * 存储：Cloudflare D1（env.DB）
 * 会话：随机 token 存 sessions 表，通过 HttpOnly Cookie 传递
 * 密码：PBKDF2-SHA256 加盐（不存明文）
 */

export const COOKIE = 'hsd_sid';
export const SESSION_DAYS = 30;

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS, ...extraHeaders },
  });
}

export const now = () => Math.floor(Date.now() / 1000);

/* ---------- 密码 ---------- */
function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function randHex(n = 24) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPass(pass, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 20000, hash: 'SHA-256' },
    key,
    256
  );
  return b64(bits);
}

/* 简单的弱密码检查：够用就好，不搞复杂规则 */
export function checkPass(pass) {
  const s = String(pass || '');
  if (s.length < 6) return '密码至少 6 位';
  if (s.length > 64) return '密码太长了（64 位以内）';
  return '';
}

export function checkPhone(phone) {
  const s = String(phone || '').replace(/\s|-/g, '');
  if (!/^1[3-9]\d{9}$/.test(s)) return { err: '手机号填得不对，11 位大陆手机号' };
  return { ok: s };
}

/* ---------- 会话 ---------- */
export async function createSession(env, userId) {
  const token = randHex(24);
  const t = now();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, t, t + SESSION_DAYS * 86400)
    .run();
  return token;
}

export function cookieHeader(token, maxAge = SESSION_DAYS * 86400) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookieHeader() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

/** 从请求里取出当前用户；没登录返回 null */
export async function currentUser(request, env) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  try {
    const row = await env.DB.prepare(
      'SELECT u.id, u.phone, u.nickname, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
    )
      .bind(token, now())
      .first();
    return row || null;
  } catch (e) {
    return null;
  }
}

/** 隐藏手机号中间四位 */
export function maskPhone(p) {
  const s = String(p || '');
  return s.length === 11 ? s.slice(0, 3) + '****' + s.slice(7) : s;
}

export function publicUser(u) {
  return u ? { id: u.id, phone: maskPhone(u.phone), nickname: u.nickname || maskPhone(u.phone), since: u.created_at } : null;
}
