/**
 * 海大叔智脑 · 语音转文字
 * 路径：/api/asr
 * 链路：页面录音(webm / mp4) → Workers AI Whisper → 返回纯文本
 * 成本：走 Workers AI 免费额度（Whisper 约 41 units / 分钟音频）
 * 注：只传 audio，不传 language/task，Whisper 自动判定语种（传 zh 会吞内容返回空）
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AI) return json({ error: '语音通道未就绪' }, 503);

  let buf;
  try {
    buf = await request.arrayBuffer();
  } catch (e) {
    return json({ error: '音频读取失败' }, 400);
  }
  if (!buf || !buf.byteLength) return json({ error: '没收到音频' }, 400);
  if (buf.byteLength > 6 * 1024 * 1024) return json({ error: '说得太长了，分两句说' }, 413);

  const bytes = new Uint8Array(buf);
  const audio = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) audio[i] = bytes[i];

  try {
    const r = await env.AI.run('@cf/openai/whisper', { audio });
    const text = String((r && (r.text || r.transcription)) || '').trim();
    if (!text) return json({ text: '', error: '没听清，再说一遍' });
    return json({ text });
  } catch (e) {
    return json({ error: '识别失败：' + ((e && e.message) || '未知错误') }, 502);
  }
}
