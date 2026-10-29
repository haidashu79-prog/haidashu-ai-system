/**
 * 海大叔案例库 · 通用专家问答接口
 * 路径：POST /api/expert
 *
 * 为什么单独开一个：
 *   /api/v1/chat/completions 是"海大叔智脑"外放口，里面写死了商业智脑的人设与口径，
 *   案例库里的法律、体检、占星这些页面需要的是各自领域的专业口吻，
 *   套着商业智脑的人设答题会很别扭。这里只做一件事：
 *   用调用方给的 system（领域人设 + 本地知识）直接跑模型，不注入任何平台人设。
 *
 * 输入：{ system, messages:[{role,content}], temperature, max_tokens, page }
 * 输出：{ ok, reply, model }  或  { ok:false, error }  或  { ok:false, needLogin:true }
 * 说明：走 Workers AI 绑定（env.AI），免密钥、不消耗用户自己的额度。
 *       必须登录后才能问（问答记录归到账号名下，见 ask_log 表）。
 */

import { currentUser, publicUser } from './auth/_lib.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// 已实测可用，中文能力优先
const MODELS = [
  '@cf/openai/gpt-oss-120b',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS },
  });
}

function extractText(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (typeof res.response === 'string') return res.response;
  if (res.choices && res.choices[0]) {
    return (res.choices[0].message && res.choices[0].message.content) || '';
  }
  if (typeof res.text === 'string') return res.text;
  return '';
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return jsonResp({ ok: false, error: '只支持 POST' }, 405);

  // ---------- 必须登录 ----------
  const user = await currentUser(request, env);
  if (!user) {
    return jsonResp(
      { ok: false, needLogin: true, error: '登录后才能提问（免费，10 秒搞定）' },
      401
    );
  }

  if (!env.AI) {
    return jsonResp({ ok: false, error: '推理通道未就绪（AI 绑定未配置）' }, 503);
  }

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return jsonResp({ ok: false, error: '请求体不是合法 JSON' }, 400);
  }

  const system = String(body.system || '').slice(0, 6000);
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (!rawMessages.length) return jsonResp({ ok: false, error: 'messages 不能为空' }, 400);

  // 只保留最近 8 轮，单条截断，防止有人拿它当免费大模型刷
  const messages = rawMessages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!messages.length) return jsonResp({ ok: false, error: '没有有效的对话内容' }, 400);

  const temperature = typeof body.temperature === 'number'
    ? Math.min(Math.max(body.temperature, 0), 1.2)
    : 0.6;
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens, 10) || 1200, 128), 2000);

  const payload = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const question = (lastUser && lastUser.content) || '';
  const page = String(body.page || '').slice(0, 80);

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const res = await env.AI.run(model, {
        messages: payload,
        stream: false,
        max_tokens: maxTokens,
        temperature,
      });
      const reply = String(extractText(res) || '').trim();
      if (reply) {
        // 记录一次问答（不阻塞返回）
        if (env.DB) {
          context.waitUntil(
            env.DB.prepare(
              'INSERT INTO ask_log (user_id, page, question, answer_chars, model, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
              .bind(user.id, page, question.slice(0, 500), reply.length, model, Math.floor(Date.now() / 1000))
              .run()
              .catch(() => {})
          );
        }
        return jsonResp({ ok: true, reply, model, user: publicUser(user) });
      }
      lastErr = new Error('模型返回空内容');
    } catch (e) {
      lastErr = e;
    }
  }

  return jsonResp(
    { ok: false, error: '生成失败：' + (lastErr && lastErr.message ? lastErr.message : '未知错误') },
    502
  );
}
