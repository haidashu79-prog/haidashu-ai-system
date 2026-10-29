/**
 * 海大叔智脑 · 网站外放内核
 * 路径：/api/ask（与页面同域）
 *
 * 链路：页面问题 → 智脑检索（知识卡打分）→ 智脑提示词（人设/方法/家底/红线）
 *        → Cloudflare Workers AI 流式生成 → 末尾回传本次调用的档案
 * 说明：知识快照放在 /zhinao/knowledge.json，通过 env.ASSETS 读取，不占脚本体积。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 已实测可用，中文能力优先
const MODELS = [
  '@cf/openai/gpt-oss-120b',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

const sse = (obj) => 'data: ' + JSON.stringify(obj) + '\n\n';
const chunkOut = (text) => sse({ choices: [{ delta: { content: text } }], text });

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

/* ---------------- 智脑知识库：加载与检索 ---------------- */

let KB = null; // 模块级缓存

async function loadKB(request, env) {
  if (KB) return KB;
  try {
    const url = new URL('/zhinao/knowledge.json', request.url);
    const res = await env.ASSETS.fetch(new Request(url.toString(), { cf: { cacheTtl: 300 } }));
    if (!res.ok) return null;
    KB = await res.json();
    return KB;
  } catch (e) {
    return null;
  }
}

// 中文按 2-gram 切，英文/数字按词切
function grams(text) {
  const s = String(text || '').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ');
  const set = new Set();
  const segs = s.split(' ').filter(Boolean);
  for (const seg of segs) {
    if (/^[a-z0-9]+$/.test(seg)) {
      if (seg.length > 2) set.add(seg);
      continue;
    }
    for (let i = 0; i < seg.length - 1; i++) set.add(seg.slice(i, i + 2));
  }
  return [...set];
}

// 停用 2-gram：疑问词、虚词，命中它们说明不了任何问题意图
const STOP = new Set(('能不 不能 什么 怎么 可以 如何 为什 么办 一步 第一 哪些 多少 有没 没有 是不 不是 我的 我要 想要 ' +
  '么样 一个 这个 那个 现在 时候 帮我 请问 一下 应该 需要 觉得 到底 还是 就是 因为 所以 怎样 能否 是不 可否').split(' '));

// 各域的优先权重：这是赚钱大脑，商业与判断类排前面
const KIND_W = { money: 1.22, judge: 1.1, opc: 1.08, ip: 1.05, eco: 1.02, craft: 0.92, persona: 0.96 };

function retrieve(kb, question, topN = 5) {
  if (!kb || !kb.cards) return [];
  const raw = String(question || '').toLowerCase();
  const q = grams(question).filter((g) => !STOP.has(g)).slice(0, 40);
  if (!q.length) return [];

  const scored = [];
  for (const card of kb.cards) {
    const title = String(card.title || '').toLowerCase();
    const tags = (card.tags || []).join(' ').toLowerCase();
    const text = String(card.text || '').toLowerCase();
    const kws = (card.kw || []).map((k) => String(k).toLowerCase());

    // kw 是人工标的意图短语，命中即强信号，权重远高于散装 2-gram
    let kwHit = 0;
    for (const k of kws) if (k && raw.indexOf(k) >= 0) kwHit++;

    let score = kwHit * 12;
    for (const g of q) {
      if (title.indexOf(g) >= 0) score += 3;
      else if (tags.indexOf(g) >= 0) score += 2;
      else if (text.indexOf(g) >= 0) score += 1;
    }
    if (kwHit === 0 && score < 7) continue; // 没命中意图词又不达阈值，直接丢
    if (kwHit) score *= 1.6;
    score /= Math.sqrt(Math.max(text.length, 60) / 110);
    score *= KIND_W[card.kind] || 1;
    if (score > 0) scored.push({ score, card });
  }
  scored.sort((a, b) => b.score - a.score);

  const picked = [];
  const usedKinds = {};
  for (const s of scored) {
    const k = s.card.kind;
    if (usedKinds[k]) continue; // 每个域只取一条，逼出跨域覆盖
    usedKinds[k] = 1;
    picked.push(s.card);
    if (picked.length >= topN) break;
  }

  // 兜底：一个问题都匹配不上时，给两条主线卡，别让模型空手瞎编
  if (!picked.length) {
    for (const cid of ['money-012', 'judge-001']) {
      const c = kb.cards.find((x) => x.id === cid);
      if (c) picked.push(c);
    }
  }
  return picked;
}

/* ---------------- 智脑提示词 ---------------- */

function buildSystem(cards, pageSystem, kb) {
  const st = (kb && kb.stats) || {};
  const hit = cards.length
    ? cards.map((c, i) => `${i + 1}. 【${c.title}】${c.text}`).join('\n')
    : '（本次没匹配到专门档案，按海大叔通用口径答，别硬编具体数字）';

  return `你是「海大叔智脑」，海大叔 AI 新媒体工作室对外放出来的商业智脑，一个人的公司都能挂上的辅助外挂。你说清楚自己的身份：你不是一个写文案的，你是一台管生意的脑子加一双干活的手，帮人把一件事做成能持续收钱的生意。

【你的六条主线，都归到"怎么赚钱"上】
1. 商业模式大脑：钱从哪来、卖给谁、怎么收、成本结构、定价三档、现金流怎么排、第一笔钱最短路径、这门生意能不能放大。
2. 一人公司运营：一个人怎么把公司跑起来——注册与经营范围、公私账、报价与合同、交付边界、外包与工具替代、把重复活变成资产、自己累垮之前怎么收手。
3. 新媒体 IP 运营：定位一句话、内容配比、选题、涨粉与转化、私域承接、账号不是发作品是攒信任、信任最后要能换成单。
4. AI 新媒体 IP 智慧生态：把 IP、内容、客户、工具、数据连成一套能自己转的系统，而不是靠人每天硬扛；工具、插件、专家怎么互相挂、怎么一起升级。
5. 判断与决策：一个生意能不能做、该不该降价、这单接不接、什么时候该停、这个客户值不值得留。
6. 自动升级、自己学习、替你干活：干过的活回流成档案，越用越准；答不上的明确说不知道，并说清该补什么；重复的检索、算账、拆解、成稿先替你跑一遍，你只做拍板那一下。

【写文案这件事，摆正位置】
写口播稿、脚本、封面文案、剪辑规格，你都会，但那是第 3 条新媒体 IP 运营里面的一个动作，不是你的身份，也不是你的全部。
别人问"你能干什么"，先答经营：钱怎么赚、公司怎么一个人跑、IP 怎么变成资产、生态和工具怎么搭、哪些重复活能替你干。绝不许把回答收成"我能帮你写文案"。

【你是一个底座，不是一个小工具】
你能被接进各种地方替人干活：接进任何支持 OpenAI 协议的客户端、小程序、机器人、企业微信类工具；挂插件（搜索、抓取、图库、剪辑、表格、支付等）；挂专家团和单专家（选题专家、文案专家、经营顾问、法律顾问、财税顾问……）；反过来也能被这些插件和专家当底座调用。
你的价值在三件事：
- 托底：不管谁接进来，都用同一套海大叔档案、口径、红线，不会各说一套。
- 辅助升级：专家和插件干活的结果回流成档案，越用越准；同一条判断被现实推翻就改，不硬撑。
- 辅助干活：接手重复的判断、检索、成稿、复盘，让人只做该他本人做的那一下。
有人问"你能不能接 XX""能不能多个专家一起用""能不能自己进化"，就按这个答：能，说明怎么接、接上之后多出什么，不要绕回写文案。

【说话方式】
先给判断，一句话说死；再给理由；最后给今天能做的一步。说人话、短句、20-40 字一段，不端架子、不喊口号、不写"首先其次最后"。200-450 字为佳。问钱的事就谈钱，别绕成励志。

【你要守的红线】
不承诺收益、不用绝对化极限词（最、第一、百分百）、不夸大功效、不涉政治敏感、不指名道姓做负面评价、不诱导互动。不报价、不代签合同、不替人拍板。涉及法律、财税、医疗的具体处置，只给方向和"该找谁"，不给结论性意见。

【海大叔的家底（可引用，不要编）】
知识库共 ${st.collections || 31} 个集合、${st.files || 4323} 份资料：口播成稿 ${st.scripts || 1676} 篇、成稿归档 ${st.archive || 1840} 篇、历史选题 ${st.topics || 1368} 条、各平台课程课件 ${st.courses || 338} 件、可复用合同模板 ${st.contracts || 15} 份、成案案例 ${st.cases || 6} 个。方法论基石是《赚钱的秘密》《个人IP从0到1》两部著作。海大叔本人是昆明的 AI 新媒体 IP 博主，做 AI 新媒体 + IP + 智慧生态，客户里有企业、有一人公司、也有门店。

【本次从档案里调出来的东西（优先用它回答）】
${hit}

【你还能替人干的活（远不止写文案，按需提，别一次全倒）】
找客户、定价与报价、成本核算、现金流排期、合同要点、交付边界、账号定位、选题策划、内容配比、私域承接、竞品拆解、复盘对账、招商方案、工具选型、工作流编排、带人教学、客户异议应对、判断什么时候该停。

【回答要求】
1. 优先用上面调出的档案，不许添油加醋，档案没有的数字不要编。
2. 尽量往"这事怎么变成钱、下一步谁去做、做什么"上收，别停在道理。
3. 拿不准或者要报价、要签约、要下结论的，直接说"这块得海大叔本人接"，别硬答。
4. 结尾给一个今天就能动手的动作，一句话。
5. 跟海大叔的业务完全无关的问题，照实答，但保持口吻。

${pageSystem ? '【当前专家角色设定，叠加在上面的口径之内】\n' + pageSystem : ''}`;
}

/* ---------------- AI 调用 ---------------- */

async function runAI(env, messages, modelOverride) {
  const models = modelOverride ? [modelOverride, ...MODELS] : MODELS;
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await env.AI.run(model, { messages, stream: true, max_tokens: 1200, temperature: 0.7 });
      return { stream: res, model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('所有模型都不可用');
}

/* ---------------- 入口 ---------------- */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const kb = await loadKB(request, env);

  if (request.method === 'GET') {
    return jsonResp({
      ok: true,
      service: 'haidashu-zhinao',
      brain: (kb && kb.brain) || '海大叔智脑 · 外放内核',
      version: (kb && kb.version) || '',
      cards: kb ? kb.cards.length : 0,
      stats: kb ? kb.stats : null,
      models: MODELS,
      aiBound: !!env.AI,
    });
  }

  if (request.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const question = String(body.question || '').trim();
  if (!question) return jsonResp({ error: '问题不能为空' }, 400);

  const cards = retrieve(kb, question, 4);
  const system = buildSystem(cards, String(body.system || ''), kb);

  if (!env.AI) {
    return new Response(sse({ error: '智脑的推理通道未就绪（AI 绑定未配置）。' }), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', ...CORS },
    });
  }

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: question },
  ];

  let aiStream;
  let usedModel = '';
  try {
    const r = await runAI(env, messages, body.model ? String(body.model) : '');
    aiStream = r.stream;
    usedModel = r.model;
  } catch (e) {
    return new Response(sse({ error: '智脑这会儿没接上：' + (e && e.message ? e.message : '未知错误') }), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', ...CORS },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const out = new ReadableStream({
    async start(controller) {
      // 首帧用 SSE 注释帧传递智脑标识：标准解析器会忽略，驾驶舱页面自行读取
      const meta = {
        brain: (kb && kb.brain) || '海大叔智脑',
        version: (kb && kb.version) || '',
        cards: cards.map((c) => ({ id: c.id, title: c.title, kind: c.kind })),
        model: usedModel,
      };
      controller.enqueue(encoder.encode(': model=' + usedModel + '\n'));
      controller.enqueue(encoder.encode(':zhinao ' + JSON.stringify(meta) + '\n\n'));

      const reader = aiStream.getReader();
      let answer = '';
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
              const j = JSON.parse(payload);
              piece =
                j.response ||
                (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) ||
                '';
            } catch (e) {
              piece = '';
            }
            if (piece) {
              answer += piece;
              controller.enqueue(encoder.encode(chunkOut(piece)));
            }
          }
        }

        // 末尾回传本次调用的档案，让"智脑在干活"看得见
        if (answer.trim() && cards.length) {
          const names = cards.map((c) => c.title).join('、');
          controller.enqueue(encoder.encode(chunkOut(`\n\n〔智脑·调用档案：${names}〕`)));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        controller.enqueue(encoder.encode(sse({ error: '生成中断：' + (e && e.message ? e.message : '未知错误') })));
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
