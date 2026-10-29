/**
 * 智脑能力清单
 * GET /api/zhinao
 * 供外部应用、客户端自动配置与健康检查使用。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const MODELS = [
  '@cf/openai/gpt-oss-120b',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

let KB = null;

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

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const kb = await loadKB(request, env);

  const body = {
    brain: (kb && kb.brain) || '海大叔智脑 · 商业智脑',
    version: (kb && kb.version) || '2026-10-23',
    owner: '海大叔 AI 新媒体工作室',
    positioning: '一人公司辅助外挂（商业智脑）：商业模式大脑、一人公司运营、新媒体 IP 运营、AI 新媒体 IP 智慧生态，自动升级、自己学习、替你干活，也是可被接入、可挂载插件的底座',
    stats: (kb && kb.stats) || { collections: 31, files: 4323, scripts: 1676, topics: 1368 },
    cards: kb ? kb.cards.length : 0,
    domains: kb && kb.domains
      ? kb.domains.map((d) => ({ id: d.id, name: d.name, cards: (kb.cards || []).filter((c) => c.kind === d.id).length }))
      : [],
    capabilities: [
      '商业模式大脑：钱从哪来、卖给谁、怎么收、成本结构、定价三档、现金流、第一笔钱路径、能不能放大',
      '一人公司运营：注册与经营范围、公私账、报价与合同、交付边界、工具替代人工',
      '新媒体 IP 运营：定位一句话、内容配比、选题、涨粉与转化、私域承接',
      'AI 新媒体 IP 智慧生态：把 IP、内容、客户、工具、数据连成能自转的系统，工具与专家互相挂载',
      '自动升级 · 学习 · 干活：干过的活回流成档案，越用越准；答不上明确说，重复活先替你跑',
      '写文案（新媒体 IP 运营里的一项）：口播稿、脚本、封面、剪辑规格——是其中一项，不是身份',
      '判断与决策：生意能不能做、该不该降价、接不接单、什么时候停',
      '合规红线：不承诺收益、不用极限词、不贬人、不越界报价签约',
      '档案引用：每次回答标明翻了哪几份资料',
    ],
    mount: {
      what: '智脑是底座，能被挂载，也能被当底座调用',
      apps: ['任意 OpenAI 协议客户端（Cherry Studio / Chatbox / LobeChat / Dify / Coze / 自研 App）', '小程序与公众号', '机器人与群助手', '企业微信类协同工具'],
      plugins: ['联网搜索', '网页抓取', '图库与素材', '剪辑与成片', '表格与数据', '支付与订单'],
      experts: ['选题专家', '文案专家', '经营顾问', '一人公司顾问', '法律顾问', '财税顾问'],
      how: '挂载方只需填 Base URL + 任意 Key + model=zhinao；专家与插件共用同一套档案、口径、红线',
    },
    evolution: {
      why: '越用越准，不靠人工改提示词',
      loops: [
        '结果回流：专家与插件干完的活写回档案，下次检索直接命中',
        '现实对账：被现实推翻的判断改档，不硬撑旧结论',
        '缺口自省：反复答不上的话题自动进补档议程',
        '版本可回：档案改动留痕，改坏能退回',
      ],
    },
    endpoints: {
      chat: '/api/v1/chat/completions',
      models: '/api/v1/models',
      ask: '/api/ask',
      embed: '/zhinao/embed.js',
      page: '/zhinao/',
    },
    compatible: {
      protocol: 'openai-chat-completions',
      base_url: 'https://haidashu.pages.dev/api/v1',
      model: 'zhinao',
      auth: '任意非空字符串（公开试用）',
      stream: true,
      upstream: MODELS,
    },
    limits: {
      note: '公开试用，请勿高频压测；不保存对话内容；不谈价格、不代签合同。',
    },
    ok: true,
    ai_bound: !!env.AI,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}
