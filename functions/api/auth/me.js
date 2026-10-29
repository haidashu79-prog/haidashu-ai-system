/** GET /api/auth/me → { ok, user|null } */
import { json, CORS, currentUser, publicUser } from './_lib.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const u = await currentUser(request, env);
  return json({ ok: true, user: publicUser(u) });
}
