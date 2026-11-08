/**
 * 易玄机 · 专用问答通道（纯净版）
 * POST /api/yixuan/chat
 *
 * 只干一件事：把前端传来的 messages 原样交给模型，流式吐回去。
 * 绝不注入「海大叔智脑」那套人设、不塞「100 种赚钱方法」知识库、
 * 不补微信、不补方法库入口——易玄机问的是卦，不是生意。
 *
 * 与 /api/v1/chat/completions 共用同一个 env.AI 绑定，但走独立路由，
 * 两者互不影响：zhinao 页仍然走智脑那一套。
 *
 * 请求体（OpenAI 兼容）：{ messages, stream, temperature, max_tokens }
 * 响应：stream=true 时返回 text/event-stream；否则返回聚合后的 JSON。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 中文能力优先；与智脑同一批可用模型，任一可跑即用
const MODELS = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/openai/gpt-oss-120b',
];

const jsonErr = (msg, status = 400) =>
  new Response(JSON.stringify({ error: { message: msg, type: 'invalid_request_error', code: status } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

function deltaOf(j) {
  let v = '';
  if (j && typeof j.response === 'string' && j.response) v = j.response;
  else if (j && j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content != null) {
    v = j.choices[0].delta.content;
  } else if (j && j.response != null) {
    v = j.response;
  }
  return v === '' || v == null ? '' : String(v);
}

async function runAI(env, messages, opts = {}) {
  // 前端指名要某个模型（只在候选表里的才认），就优先试它，不行再按默认顺序兜底
  const order = opts.prefer && MODELS.includes(opts.prefer)
    ? [opts.prefer, ...MODELS.filter((m) => m !== opts.prefer)]
    : MODELS;
  let lastErr = null;
  for (const model of order) {
    try {
      const res = await env.AI.run(model, {
        messages,
        stream: !!opts.stream,
        max_tokens: opts.maxTokens || 1600,
        temperature: opts.temperature == null ? 0.8 : opts.temperature,
      });
      return { res, model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('所有模型都不可用');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return jsonErr('method not allowed', 405);

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return jsonErr('请求体不是合法 JSON');
  }

  // 纯透传：只保留 system / user / assistant 且内容是字符串的消息，别的字段一律丢掉
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages = raw
    .filter(
      (m) =>
        m &&
        (m.role === 'system' || m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (!messages.length) return jsonErr('messages 不能为空');
  if (!env.AI) return jsonErr('推理通道未就绪（AI 绑定未配置）', 503);

  const stream = body.stream === true;
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.8;
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens, 10) || 1600, 128), 3000);
  // 可选：前端指定优先用哪个模型（只认候选表里的），用来按题目难度挑模型
  const prefer = typeof body.prefer === 'string' ? body.prefer : '';

  const _uid = () => 'yxj-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const _now = () => Math.floor(Date.now() / 1000);

  /* ── 非流式：内部走流式再聚合，保证结果和流式一致 ── */
  if (!stream) {
    let out;
    try {
      out = await runAI(env, messages, { stream: true, temperature, maxTokens, prefer });
    } catch (e) {
      return jsonErr('生成失败：' + (e && e.message ? e.message : '未知错误'), 502);
    }

    let text = '';
    try {
      const reader = out.res.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t || t.indexOf('data:') !== 0) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            text += deltaOf(JSON.parse(payload));
          } catch (e) {}
        }
      }
    } catch (e) {
      return jsonErr('读取上游内容失败：' + (e && e.message ? e.message : '未知错误'), 502);
    }

    text = String(text).trim();
    return new Response(
      JSON.stringify({
        id: _uid(),
        object: 'chat.completion',
        created: _now(),
        model: 'yixuan',
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 0, completion_tokens: Math.round(text.length / 1.6), total_tokens: 0 },
        yixuan: { upstream_model: out.model },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } }
    );
  }

  /* ── 流式 ── */
  let aiRes, usedModel;
  try {
    const r = await runAI(env, messages, { stream: true, temperature, maxTokens, prefer });
    aiRes = r.res;
    usedModel = r.model;
  } catch (e) {
    return jsonErr('生成失败：' + (e && e.message ? e.message : '未知错误'), 502);
  }

  const id = _uid();
  const created = _now();
  const frame = (delta, finish) =>
    'data: ' +
    JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model: 'yixuan',
      choices: [{ index: 0, delta, finish_reason: finish || null }],
    }) +
    '\n\n';

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const out = new ReadableStream({
    async start(controller) {
      const push = (s) => controller.enqueue(encoder.encode(s));

      // SSE 注释帧：标准 OpenAI 客户端会忽略，前端也只读 data: 行
      push(':yixuan ' + JSON.stringify({ upstream_model: usedModel }) + '\n\n');
      push(frame({ role: 'assistant', content: '' }));

      const reader = aiRes.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t || t.indexOf('data:') !== 0) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let piece = '';
            try {
              piece = deltaOf(JSON.parse(payload));
            } catch (e) {
              piece = '';
            }
            if (piece) push(frame({ content: piece }));
          }
        }
        push(frame({}, 'stop'));
        push('data: [DONE]\n\n');
      } catch (e) {
        push(frame({ content: '\n\n（生成中断：' + (e && e.message ? e.message : '未知错误') + '）' }));
        push(frame({}, 'stop'));
        push('data: [DONE]\n\n');
      } finally {
        try {
          controller.close();
        } catch (e) {}
      }
    },
  });

  return new Response(out, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      ...CORS,
    },
  });
}
