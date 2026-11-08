// 全站通用语音解读后端（所有页面共用，不止易玄机）
// 走 Cloudflare Workers AI 的 melotts 神经网络语音（多语含中文），出自然女声，
// 不像系统自带那种机器人腔。文本由前端按句切开，每句单独来一次，长文不会截断。
// 该模型 2026-11-20 起下线，到时把 MODEL 换成新模型即可，前端不用动。
export async function onRequest(ctx) {
  const { request, env } = ctx;
  let text = '';
  let lang = 'zh';
  try {
    if (request.method === 'POST') {
      const j = await request.json().catch(() => ({}));
      text = (j && j.text ? j.text : '').toString();
      if (j && j.lang) lang = j.lang;
    } else {
      const u = new URL(request.url);
      text = u.searchParams.get('t') || '';
      lang = u.searchParams.get('lang') || 'zh';
    }
  } catch (e) { /* 忽略解析错误，下面判空 */ }
  text = (text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!text) return new Response('empty', { status: 400 });

  const MODEL = '@cf/myshell-ai/melotts';

  // Workers AI 把音频以 base64 字符串返回（UklGRg== 即 RIFF/WAVE 头）；
  // 也可能包在 {audio:"..."} 里，或直接是 ArrayBuffer。统一解成二进制。
  function b64ToBytes(b64) {
    const bin = atob(b64);
    return Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
  }
  function toWavBytes(res) {
    if (typeof res === 'string') return b64ToBytes(res);
    if (res && typeof res.audio === 'string') return b64ToBytes(res.audio);
    if (res instanceof ArrayBuffer) return res;
    if (res && res.audio instanceof ArrayBuffer) return res.audio;
    return res; // 兜底：原样返回
  }

  try {
    if (!env || !env.AI) return new Response('no_ai_binding', { status: 503 });
    const res = await env.AI.run(MODEL, { prompt: text, lang });
    const body = toWavBytes(res);
    return new Response(body, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response('TTS_FAIL ' + (e && e.message ? e.message : String(e)), {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
