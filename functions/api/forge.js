/**
 * AI 工具工厂 · 智作团生成接口
 * POST /api/forge  { prompt: "一句大白话需求" }
 * 返回：纯文本流（完整单文件 HTML 工具代码）
 *
 * 与 /api/v1/chat/completions（智脑答疑）分开：
 * 这里是纯代码生成引擎，不带智脑人设、不带知识库检索。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// 中文代码生成优先，逐个兜底
const MODELS = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/openai/gpt-oss-120b',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

const SYSTEM_PROMPT = `你是一个「AI 工具工厂」引擎，专为普通人（小老板、打工人、自媒体人）造能直接用的小工具。用户用一句话描述需求。
硬性规则：
1. 输出【完整、可双击打开即运行】的单文件 HTML，内联 CSS+JS，零外部依赖、零网络请求（代码里不准出现任何 http:// 或 https:// 开头的地址，图片用 emoji 或内联 SVG/CSS 渐变代替）。
2. 必须真的实现用户说的功能，是一个可用的小应用，不是示例也不是占位。
3. 只输出 HTML 本身，禁止任何解释文字，禁止 markdown 代码块围栏（以 <!DOCTYPE html> 开头、</html> 结尾）。
4. 若需求本需后端/数据库/登录，仍用纯前端可演示版实现核心，并在顶部一行小字注明「演示版·不含后端」。
5. 禁止输出任何有安全风险的代码。
6. 禁止输出思考过程、推理步骤或 <think> 标签，直接从 <!DOCTYPE html> 开始输出成品。
7. 用户提到"悬浮窗"时，用页内【可拖动的小窗口】模拟（能拖、能关、能缩到角落），不是只放一个按钮；并在小字里说明"网页版以页内悬浮窗模拟"。
8. 严禁用"随手记 / 记事本 / 待办清单"这类通用壳顶替需求本身。用户要提词器就给提词器（大字滚动、字号速度可调、镜像、暂停），要什么给什么。
9. 成品至少 150 行，必须有 3 个以上真实可调的控件（滑块/开关/按钮），且都真的生效。
设计强制要求（决定工具有没有吸引力，必须做到）：
- 移动端优先、深色干净：背景 #0a0f16，卡片 #121a24（圆角 16-18px、1px 边框 #1c2632），文字 #eef2f7，主色 #ff7a29、辅助 #ffb14d。不要花哨渐变堆砌。
- 顶部品牌条：左侧橙色圆角 logo（emoji 🏭），右侧「AI 工具工厂 / 海大叔」。
- 字号 15px 起、按钮大好点按、输入框高 44px 以上；操作一步到位，不弹窗套弹窗。
- 功能要真：能输入、能计算、能保存（localStorage）、能重置；每个按钮都有真实行为。`;

function jsonErr(msg, status = 400) {
  return new Response(JSON.stringify({ error: { message: msg } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

// Workers AI 的 SSE 流 -> 纯文本流
function sseToText() {
  let buf = '';
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  return new TransformStream({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const d = t.slice(5).trim();
        if (d === '[DONE]') continue;
        try {
          const j = JSON.parse(d);
          const ch = j.choices && j.choices[0] && j.choices[0].delta;
          let txt = '';
          if (ch && typeof ch.content === 'string') txt = ch.content;      // 正经内容（含数字）
          else if (typeof j.response === 'string') txt = j.response;       // 兜底
          if (txt) ctrl.enqueue(enc.encode(txt));
        } catch (e) { /* 忽略不完整行 */ }
      }
    },
    flush(ctrl) {
      if (buf.trim().startsWith('data:')) {
        const d = buf.trim().slice(5).trim();
        try {
          const j = JSON.parse(d);
          const ch = j.choices && j.choices[0] && j.choices[0].delta;
          let txt = '';
          if (ch && typeof ch.content === 'string') txt = ch.content;
          else if (typeof j.response === 'string') txt = j.response;
          if (txt) ctrl.enqueue(enc.encode(txt));
        } catch (e) { /* 忽略 */ }
      }
    },
  });
}

async function runStream(env, messages) {
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const res = await env.AI.run(model, {
        messages,
        stream: true,
        max_tokens: 8000,
        temperature: 0.6,
      });
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('所有模型都不可用');
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body = null;
  try {
    body = await request.json();
  } catch (e) {
    return jsonErr('请求体不是合法 JSON');
  }
  const prompt = String((body && body.prompt) || '').trim().slice(0, 2000);
  if (!prompt) return jsonErr('缺 prompt：说一句你要什么工具');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  try {
    const aiStream = await runStream(env, messages);
    return new Response(aiStream.pipeThrough(sseToText()), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        ...CORS,
      },
    });
  } catch (e) {
    return jsonErr('生成引擎暂不可用：' + (e && e.message ? e.message : 'unknown'), 502);
  }
}
