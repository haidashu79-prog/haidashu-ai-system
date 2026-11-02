/**
 * 智脑 · OpenAI 兼容接口
 * POST /api/v1/chat/completions
 * GET  /api/v1/models
 *
 * 目的：让任何"能填 Base URL + Key + Model"的应用直接接上智脑。
 * 协议按 OpenAI Chat Completions 实现，客户端无需改代码。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

import { currentUser } from '../../auth/_lib.js';

/* 登录了就记一笔（不登录也能用，只是没有记录）
   做法：先把「问了什么」写成一行（字数 0），答完再补字数。
   为什么不一次性写：流式收尾时客户可能已经拿到 [DONE] 就断开，
   那段续跑不保证执行；先落行，记录就丢不了。 */
/* 上游流式增量：content 可能是数字（如 "0"、"100"），必须转成字符串再判断，否则 0 会被当成空丢掉 */
const METHODS_RE = /(怎么赚|咋赚|赚钱|挣钱|挣点钱|搞钱|方法|路子|副业|创业|干嘛|干什么|干啥|做什么|怎么开始|能做啥|能干啥|能做什么|能干什么|接单|变现|零基础|不会技术|啥都不会)/;
const isMethodsAsk = (q) => METHODS_RE.test(String(q || ''));
function methodsLine(kb) {
  const m = (kb && kb.methods) || null;
  const url = (m && m.url) || 'https://haidashu.com.cn/zhinao/aimoney/';
  const n = (m && m.count) || 100;
  const wx = (m && m.learn_wechat) || (kb && kb.pricing && kb.pricing.wechat) || 'haidashu79';
  return `普通人用 AI 赚钱 ${n} 种方法，全表在这儿（每条都有真实案例、三步做法、门槛、第一笔钱、坑）：[${url}](${url})\n想学其中哪一条、要完整操作手册和话术模板的，加海大叔微信 ${wx}，说清你会什么、每天几个小时、想挣多少。`;
}

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

function logPage(request) {
  try {
    const ref = request.headers.get('referer') || '';
    if (ref) return new URL(ref).pathname.slice(0, 80) || '/zhinao/';
  } catch (e) {}
  return '/zhinao/';
}

async function logStart(env, user, request, question, model) {
  if (!user || !env || !env.DB) return null;
  try {
    const r = await env.DB.prepare(
      'INSERT INTO ask_log (user_id, page, question, answer_chars, model, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user.id, logPage(request), String(question).slice(0, 500), 0, model, Math.floor(Date.now() / 1000))
      .run();
    return (r && r.meta && r.meta.last_row_id) || null;
  } catch (e) {
    return null;
  }
}

function logChars(env, rowId, chars) {
  if (!rowId || !env || !env.DB) return null;
  try {
    return env.DB.prepare('UPDATE ask_log SET answer_chars = ? WHERE id = ?')
      .bind(chars, rowId).run().catch(() => {});
  } catch (e) {
    return null;
  }
}

// 已实测可用，中文能力优先
const MODELS = [
  '@cf/qwen/qwen3-30b-a3b-fp8',            // 中文商业问答最稳，不乱吐英文推理
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/openai/gpt-oss-120b',              // 兜底：强但偶发把思维链当正文吐出来
];
const PUBLIC_MODEL_ID = 'zhinao';

const uid = () => 'chatcmpl-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const now = () => Math.floor(Date.now() / 1000);

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

const oaiErr = (msg, status = 400, type = 'invalid_request_error') =>
  new Response(JSON.stringify({ error: { message: msg, type, code: status } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

/* ───────── 知识库 ───────── */

let KB = null;

async function loadKB(request, env) {
  if (KB) return KB;
  try {
    const url = new URL('/zhinao/kb.json', request.url);
    const res = await env.ASSETS.fetch(new Request(url.toString(), { cf: { cacheTtl: 30 } }));
    if (!res.ok) return null;
    KB = await res.json();
    return KB;
  } catch (e) {
    return null;
  }
}

function grams(text) {
  const s = String(text || '').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ');
  const set = new Set();
  for (const seg of s.split(' ').filter(Boolean)) {
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
// 口语 → 业务词的同义扩展：普通人问"给自己开多少工资"，档案里写的是"成本"，得先接上
const SYN = {
  '工资': '成本 净利 收入', '薪酬': '成本', '人工': '成本 外包', '房租': '成本 固定支出',
  '流水': '收入 营业额 客单', '营业额': '收入 客单', '毛利': '成本 利润 净利', '净利': '利润 成本',
  '回本': '投入 成本 现金流', '库存': '成本 现金流', '压货': '成本 现金流', '借钱': '现金流 风险',
  '亏': '成本 现金流 该停', '赔': '成本 该停', '账': '公私账 现金流', '发票': '财税 合同',
  '税': '财税 发票', '社保': '财税 一人公司', '执照': '注册 经营范围', '注册': '注册 经营范围',
  '招人': '外包 成本 交付', '员工': '外包 成本', '离职': '交付 外包', '合伙人': '股权 交付 边界',
  '降价': '定价 报价', '涨价': '定价 报价', '报价': '定价 报价', '谈单': '报价 成交 诊断',
  '客户': '获客 客单 转化', '没人买': '获客 转化 定位', '卖不动': '获客 转化 定位',
  '涨粉': '涨粉 选题 定位', '播放': '选题 内容配比', '变现': '变现 客单 私域',
  '同行': '竞品 定价', '累': '交付 外包 收手', '忙不过来': '交付 外包 收手', '不赚钱': '成本 定价 该停',
  '接不接': '判断 该停 交付', '该不该': '判断 该停', '要不要': '判断 该停',
  'AI': 'AI 工具 赚钱 路子', 'ai': 'AI 工具 赚钱 路子',
  '赚钱': '赚钱 路子 变现 第一笔', '挣钱': '赚钱 路子 变现 第一笔', '搞钱': '赚钱 路子 副业',
  '副业': '副业 路子 接单', '变现': '变现 客单 私域 路子', '创业': '一人公司 路子 赚钱 定价',
  '一百种': '100种 路子 分类 方法', '方法': '路子 分类 怎么做', '路子': '路子 分类 门槛',
  '接单': '接单 服务 报价 交付', '不会技术': '入门 门槛 工具', '一个人': '一人公司 外包 工具',
};
function expandQ(raw) {
  let s = raw;
  for (const k in SYN) if (raw.indexOf(k) >= 0) s += ' ' + SYN[k];
  return s;
}

const KIND_W = { money: 1.22, judge: 1.1, opc: 1.08, ip: 1.05, eco: 1.02, craft: 0.92, persona: 0.96 };

function retrieve(kb, question, topN = 5) {
  if (!kb || !kb.cards) return [];
  const raw = String(question || '').toLowerCase();
  const rawX = expandQ(raw);   // 逐词扩展过的问句，专供意图词匹配
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
    for (const k of kws) {
      if (!k || STOP.has(k)) continue;   // "多少/怎么"这类泛问词不算意图
      if (rawX.indexOf(k) >= 0) kwHit++;
    }

    let score = kwHit * 12;
    for (const g of q) {
      if (title.indexOf(g) >= 0) score += 3;
      else if (tags.indexOf(g) >= 0) score += 2;
      else if (text.indexOf(g) >= 0) score += 1;
    }
    if (kwHit === 0 && score < 4.5) continue; // 没命中意图词又不达阈值，直接丢
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

  // 补位：跨域凑不满时，用同域次优卡补齐，别让模型只拿到一张卡硬答
  const minCards = Math.min(3, topN);
  if (picked.length < minCards) {
    for (const s of scored) {
      if (picked.indexOf(s.card) >= 0) continue;
      picked.push(s.card);
      if (picked.length >= minCards) break;
    }
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

/* ── 收费问答：问到价，除正常报价外，末尾补一句海大叔微信（服务端兜底，保证只在这一类回答出现） ── */
const PRICING_RE = /(收费|费用|多少钱|价格|报价|价钱|怎么算钱|怎么收钱|怎么收费|贵不贵|按什么收|月付|包月)/;
const isPricingAsk = (q) => PRICING_RE.test(String(q || ''));
const contactLine = (kb) =>
  (kb && kb.pricing && kb.pricing.contact) ||
  '想直接问的，加海大叔微信 haidashu79，说清你会什么、每天有几个小时，他本人回。';

function pickMethodDetail(kb, q) {
  const det = (kb && kb.methods_detail) || [];
  if (!det.length) return '';
  const s = String(q || '').replace(/\s/g, '');
  const grams = [];
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
  const uniq = Array.from(new Set(grams));
  const scored = det.map(it => {
    const blob = it.name + it.what + it.case + it.gate + (it.steps || []).join('') + it.cat;
    let sc = 0;
    uniq.forEach(g => { if (blob.indexOf(g) >= 0) sc += 1; });
    return { it, sc };
  }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 5);
  const list = scored.length ? scored : det.filter(it => it.no <= 3).map(it => ({ it }));
  return list.map(x => {
    const it = x.it;
    return `#${it.no}【${it.cat}】${it.name}\n干什么：${it.what}\n三步：${(it.steps || []).join(' / ')}\n真事：${it.case}\n能不能成：${it.read}\n门槛：${it.gate}｜第一笔钱：${it.first}｜坑：${it.pit}`;
  }).join('\n\n');
}

/* 指定条目直答：问「第N条」或点名某条方法时，直接用档案原文拼答案，避免模型改写案例里的人名金额 */
function directAnswer(kb, q) {
  const det = (kb && kb.methods_detail) || [];
  if (!det.length) return '';
  const s = String(q || '');
  let it = null;
  const m = s.match(/第\s*([0-9]{1,3})\s*条/);
  if (m) it = det.find((x) => x.no === parseInt(m[1], 10)) || null;
  if (!it) {
    let best = null;
    let bs = 0;
    det.forEach((x) => {
      const chars = Array.from(new Set(x.name.replace(/[，。、·\s]/g, '').split('')));
      if (!chars.length) return;
      let hitc = 0;
      chars.forEach((ch) => { if (s.indexOf(ch) >= 0) hitc += 1; });
      const sc = hitc / chars.length;
      if (sc > bs) { bs = sc; best = x; }
    });
    if (best && bs >= 0.8) it = best;
  }
  if (!it) return '';
  const url = (kb.methods && kb.methods.url) || 'https://haidashu.com.cn/zhinao/aimoney/';
  const wx = (kb.methods && kb.methods.learn_wechat) || 'haidashu79';
  const steps = (it.steps || []).map((x, i) => `${'①②③④⑤'[i] || i + 1 + '.'} ${x}`).join('\n');
  return [
    `**第 ${it.no} 条 · ${it.name}**（${it.cat}类）`,
    '',
    `**这件事具体干什么**：${it.what}`,
    '',
    `**三步怎么做**：`,
    steps,
    '',
    `**真人真事**：${it.case}`,
    '',
    `**为什么能成立**：${it.read}`,
    '',
    `**门槛**：${it.gate}`,
    '',
    `**第一笔钱从哪来**：${it.first}`,
    '',
    `**最容易栽的坑**：${it.pit}`,
    '',
    `[普通人用 AI 赚钱 100 种方法 · 全表](<${url}>)`,
    '',
    `想学这一条的完整操作手册和话术模板，加海大叔微信 ${wx}，说清你会什么、每天几个小时、想挣多少。`,
    '',
    `（要我再按你的情况挑三条最能马上动手的，说一下你现在会什么、每天能腾几个小时。）`,
  ].join('\n');
}

function buildSystem(cards, pageSystem, kb, q) {
  const st = (kb && kb.stats) || {};
  const pr = (kb && kb.pricing) || null;
  const priceBlock = pr ? `【海大叔这边能帮的事（事实资料）】
${pr.line}
对外统一用这句话说：${pr.reply}
各档明细：${pr.items.map(i => `${i.name}——${i.price}，交付${i.deliver}`).join('；')}` : '';
  const detQ = (typeof isMethodsAsk === 'function' && isMethodsAsk(q) && kb && kb.methods_detail) ? pickMethodDetail(kb, q) : '';
  const mth = (kb && kb.methods) ? `【普通人用 AI 赚钱一百种方法（详解版，档案里有全表）】
一共 ${kb.methods.count} 条，分 ${kb.methods.categories.length} 类：${kb.methods.categories.map(c => c.name).join('、')}。
每条都有六样东西：这件事具体干什么、三步怎么做、一个真人真事的例子（什么处境、做了什么、收了多少钱）、为什么能成立（适合谁不适合谁）、要什么门槛、第一笔钱从哪来、最容易栽的坑。
${kb.methods.rule}
全表链接（回答里要写成可点的 Markdown 链接）：[${kb.methods.url}](${kb.methods.url})
学习入口：想照着做、要完整操作手册与话术模板的，加海大叔微信 ${(kb.methods && kb.methods.learn_wechat) || 'haidashu79'}。${detQ ? '\n\n【本次挑出来的几条真条目：要讲就照这个讲，案例里的人名、地名、金额、做法一个字都不许改，更不许另编】\n' + detQ : ''}` : '';
  const hit = cards.length
    ? cards.map((c, i) => `${i + 1}. 【${c.title}】${String(c.text || "").slice(0, 320)}`).join('\n')
    : '（本次没匹配到专门档案，按海大叔通用口径答，别硬编具体数字）';

  return `你是「海大叔智脑」，海大叔 AI 新媒体工作室对外放出来的商业智脑，一个人的公司都能挂上的辅助外挂。你说清楚自己的身份：你不是一个写文案的，你是一台管生意的脑子加一双干活的手，帮人把一件事做成能持续收钱的生意。
你对外只主打一件事：普通人（不会技术、没有团队、手里钱不多）怎么用 AI 赚到钱——先挑一条能动手的路子，再做出第一份能收钱的交付，最后做成每月收得住的生意。所有回答都往这条主线上收。

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
不承诺收益、不用绝对化极限词（最、第一、百分百）、不夸大功效、不涉政治敏感、不指名道姓做负面评价、不诱导互动。客户问自家怎么收费，照上面口径说：没有固定套餐价，先看他要做什么，钱的事海大叔本人跟他谈；不许自造价格、不许编档位；别家东西的价一律不报。不代签合同、不替人拍板。涉及法律、财税、医疗的具体处置，只给方向和"该找谁"，不给结论性意见。

【数字纪律（最容易被扣分的就这条）】
用户没给的数字，一个都不许替他填。不许自拟人工工资、单价、毛利率、转化率、月销、回本周期。
要算账时按这个顺序：①先只用他给出的数字推；②缺关键数就点明缺哪个，并给一个区间算法（"你按你实际的 X% 换进去"）；③必须假设时，写成"假设毛利 30%（你按实际换）"，绝不许把假设说成事实。
算错一个数，整段判断就废了，宁可少算一步。

【案例纪律（讲方法时最容易被扣分的就这条）】
讲例子只能用档案里真实存在的案例，地名、姓、金额、耗时都要和档案一致。
绝不许自己编「云南小李」「成都小张」这类人物和数字，也不许把"举个例子"写成真事。
档案里这条没案例，就直接讲这一步怎么做，别补故事；想知道真事，让他点全表链接看第几条。
讲的那条方法，名字必须和 100 条清单里的名字一字不差；清单里没有的，先说明"这条不在 100 条里"，再按常识答。

【海大叔的家底（可引用，不要编）】
知识库共 ${st.collections || 31} 个集合、${st.files || 4323} 份资料：口播成稿 ${st.scripts || 1676} 篇、成稿归档 ${st.archive || 1840} 篇、历史选题 ${st.topics || 1368} 条、各平台课程课件 ${st.courses || 338} 件、可复用合同模板 ${st.contracts || 15} 份、成案案例 ${st.cases || 6} 个。方法论基石是《赚钱的秘密》《个人IP从0到1》两部著作。海大叔本人是昆明的 AI 新媒体 IP 博主，做 AI 新媒体 + IP + 智慧生态，客户里有企业、有一人公司、也有门店。

${priceBlock}

${mth}

【本次从档案里调出来的东西（优先用它回答）】
${hit}

【你还能替人干的活（远不止写文案，按需提，别一次全倒）】
找客户、定价与报价、成本核算、现金流排期、合同要点、交付边界、账号定位、选题策划、内容配比、私域承接、竞品拆解、复盘、招商方案、工具选型、工作流编排、带人教学、客户异议应对、判断什么时候该停。

【回答要求】
1. 优先用上面调出的档案，不许添油加醋，档案没有的数字不要编。
2. 尽量往"这事怎么变成钱、下一步谁去做、做什么"上收，别停在道理。
3. 对方问"普通人怎么用 AI 赚钱/AI 怎么赚钱/有哪些路子/我啥都不会能干什么/有没有更多方法"这一类，必须先把【普通人用 AI 赚钱一百种方法】用上：①第一句说清共 100 条、分 10 类，类名报全（内容与流量、一人接单服务、小工具与小产品、卖货与电商、教与陪跑、本地生意、职场与专业加持、出海与跨境、自动化与代运营、资产型与长期）；②从里面挑 1–2 条最贴他情况的讲透，每条都要给：这件事具体干什么、三步怎么做、一个真人案例（什么处境、做了什么、收了多少钱）、为什么能成立、门槛、第一笔钱从哪来、最容易栽的坑；③第三条起只报名字，别展开；④最后给全表链接，写成可点的 Markdown 链接 [https://haidashu.com.cn/zhinao/aimoney/](https://haidashu.com.cn/zhinao/aimoney/)。一次最多讲 2 条详解、列 6 条名字，不许把 100 条全倒出来。
4. 只有对方明确问收费/多少钱/怎么算钱时，才按收费答：先讲【对外统一用这句话说】那句原话，再补 1–2 档细节（原话讲过一次就不再重复贴）；资料里没有的项目，说"这项得海大叔本人跟你谈"。对方没问价（只问你能干什么、怎么做、怎么落地），别主动报价，也别写"若涉及收费"这类括号提示。
5. 拿不准或者要报价、要签约、要下结论的，直接说"这块得海大叔本人接"，别硬答。
6. 结尾给一个今天就能动手的动作，一句话。
7. 只要这轮谈到了具体路子、方法、怎么做，结尾固定加两行：第一行放可点全表链接，第二行写"想学哪一条、要完整操作手册和话术模板，加海大叔微信 haidashu79，说清你会什么、每天几个小时、想挣多少"。跟方法无关的问题别硬塞。
8. 跟海大叔的业务完全无关的问题，照实答，但保持口吻。

${pageSystem ? '【当前专家角色设定，叠加在上面的口径之内】\n' + pageSystem : ''}`;
}

async function runAI(env, messages, opts = {}) {
  const models = opts.model ? [opts.model, ...MODELS] : MODELS;
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await env.AI.run(model, {
        messages,
        stream: !!opts.stream,
        max_tokens: opts.maxTokens || 2000,
        temperature: opts.temperature == null ? 0.7 : opts.temperature,
      });
      return { res, model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('所有模型都不可用');
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

/* ───────── 请求处理 ───────── */

function pickQuestion(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'user') continue;
    const c = m.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) {
      return c.map((p) => (typeof p === 'string' ? p : p && p.text ? p.text : '')).join('\n');
    }
  }
  return '';
}

function pickClientSystem(messages) {
  return messages
    .filter((m) => m && m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join('\n')
    .trim();
}

function recentHistory(messages, max = 6) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-max)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (request.method === 'GET') {
    return jsonResp({
      object: 'list',
      data: MODELS.map((m, i) => ({
        id: i === 0 ? PUBLIC_MODEL_ID : m,
        object: 'model',
        created: now(),
        owned_by: 'haidashu-zhinao',
        root: m,
      })),
    });
  }

  if (request.method !== 'POST') return oaiErr('method not allowed', 405);

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return oaiErr('请求体不是合法 JSON');
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return oaiErr('messages 不能为空');

  const stream = body.stream === true;
  const question = pickQuestion(messages).trim();
  if (!question) return oaiErr('没有找到 user 消息内容');

  const user = await currentUser(request, env).catch(() => null);
  // 先落一行「问了什么」，答完再补字数：这样即使客户端中途断开也不会丢记录
  const logRow = await logStart(env, user, request, question, PUBLIC_MODEL_ID);

  const kb = await loadKB(request, env);
  const cards = retrieve(kb, question, 4);
  const system = buildSystem(cards, pickClientSystem(messages), kb, question);

  const history = recentHistory(messages, 6);
  const finalMessages = [{ role: 'system', content: system }, ...history];
  if (!history.length) finalMessages.push({ role: 'user', content: question });

  const trace = {
    brain: (kb && kb.brain) || '海大叔智脑',
    version: (kb && kb.version) || '',
    cards: cards.map((c) => ({ id: c.id, title: c.title, kind: c.kind })),
  };

  const directText = directAnswer(kb, question);
  if (directText) {
    if (!stream) {
      const upd0 = logChars(env, logRow, directText.length);
      if (upd0) { try { context.waitUntil(upd0); } catch (e) {} }
      return jsonResp({
        id: uid(),
        object: 'chat.completion',
        created: now(),
        model: PUBLIC_MODEL_ID,
        choices: [{ index: 0, message: { role: 'assistant', content: directText }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: Math.round(directText.length / 1.6),
          total_tokens: 0,
        },
        zhinao: { ...trace, upstream_model: 'zhinao-direct' },
      });
    }
    const enc0 = new TextEncoder();
    const id0 = uid();
    const cr0 = now();
    const fr0 = (delta, finish) =>
      'data: ' + JSON.stringify({
        id: id0,
        object: 'chat.completion.chunk',
        created: cr0,
        model: PUBLIC_MODEL_ID,
        choices: [{ index: 0, delta, finish_reason: finish || null }],
      }) + '\n\n';
    const st0 = new ReadableStream({
      start(c) {
        const push0 = (x) => c.enqueue(enc0.encode(x));
        push0(':zhinao ' + JSON.stringify({ ...trace, upstream_model: 'zhinao-direct' }) + '\n\n');
        push0(fr0({ role: 'assistant', content: '' }));
        for (let i = 0; i < directText.length; i += 18) push0(fr0({ content: directText.slice(i, i + 18) }));
        push0(fr0({}, 'stop'));
        push0('data: [DONE]\n\n');
        c.close();
      },
    });
    return new Response(st0, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', ...CORS },
    });
  }

  const temp = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens, 10) || 2000, 128), 3000);

  if (!env.AI) {
    return oaiErr('智脑的推理通道未就绪（AI 绑定未配置）', 503, 'service_unavailable');
  }

  /* ── 非流式：内部走流式再聚合，保证与流式结果完全一致 ── */
  if (!stream) {
    let out;
    try {
      out = await runAI(env, finalMessages, { stream: true, temperature: temp, maxTokens });
    } catch (e) {
      return oaiErr('生成失败：' + (e && e.message ? e.message : '未知错误'), 502, 'upstream_error');
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
      return oaiErr('读取上游内容失败：' + (e && e.message ? e.message : '未知错误'), 502, 'upstream_error');
    }

    text = String(text).trim();
    if (text && isPricingAsk(question) && !/haidashu79/.test(text)) text += '\n\n' + contactLine(kb);
    if (text && isMethodsAsk(question) && !/aimoney/.test(text)) text += '\n\n' + methodsLine(kb);
    const upd = logChars(env, logRow, text.length);
    if (upd) { try { context.waitUntil(upd); } catch (e) {} }
    return jsonResp({
      id: uid(),
      object: 'chat.completion',
      created: now(),
      model: PUBLIC_MODEL_ID,
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: Math.round(finalMessages.reduce((n, m) => n + m.content.length, 0) / 1.6),
        completion_tokens: Math.round(text.length / 1.6),
        total_tokens: 0,
      },
      zhinao: { ...trace, upstream_model: out.model },
    });
  }

  /* ── 流式 ── */
  let aiRes, usedModel;
  try {
    const r = await runAI(env, finalMessages, { stream: true, temperature: temp, maxTokens });
    aiRes = r.res;
    usedModel = r.model;
  } catch (e) {
    return oaiErr('生成失败：' + (e && e.message ? e.message : '未知错误'), 502, 'upstream_error');
  }

  const id = uid();
  const created = now();
  const frame = (delta, finish) =>
    'data: ' + JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model: PUBLIC_MODEL_ID,
      choices: [{ index: 0, delta, finish_reason: finish || null }],
    }) + '\n\n';

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const out = new ReadableStream({
    async start(controller) {
      const push = (s) => controller.enqueue(encoder.encode(s));
      let sentChars = 0;
      let lastMark = 0;
      let seenText = '';

      // SSE 注释帧：标准 OpenAI 客户端会忽略，智脑页面自行读取
      push(':zhinao ' + JSON.stringify({ ...trace, upstream_model: usedModel }) + '\n\n');
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
            if (piece) {
              sentChars += piece.length;
              seenText += piece;
              push(frame({ content: piece }));
              // 边流边补字数：客户端万一中途断开，记录里也有接近真实的字数
              if (sentChars - lastMark >= 120) {
                lastMark = sentChars;
                const pu = logChars(env, logRow, sentChars);
                if (pu) { try { await pu; } catch (e2) {} }
              }
            }
          }
        }
        // 问到价才补微信，且全场只补一次
        if (seenText.trim() && isPricingAsk(question) && !/haidashu79/.test(seenText)) {
          const cl = '\n\n' + contactLine(kb);
          seenText += cl;
          sentChars += cl.length;
          push(frame({ content: cl }));
        }

        // 问到路子/方法/怎么赚钱，兜底补一行方法库入口
        if (seenText.trim() && isMethodsAsk(question) && !/aimoney/.test(seenText)) {
          const ml = '\n\n' + methodsLine(kb);
          seenText += ml;
          sentChars += ml.length;
          push(frame({ content: ml }));
        }

        // 在推 stop 帧之前补字数：此时客户端还在等尾巴，这一段一定跑得到
        {
          const p2 = logChars(env, logRow, sentChars);
          if (p2) { try { await p2; } catch (e) {} }
        }
        push(frame({}, 'stop'));
        push('data: [DONE]\n\n');
      } catch (e) {
        {
          const p3 = logChars(env, logRow, sentChars);
          if (p3) { try { await p3; } catch (err) {} }
        }
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
