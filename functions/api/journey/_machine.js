/**
 * 智脑 · 一人公司启动状态机（纯逻辑，无 IO，可单测）
 *
 * 设计原则：
 * 1. 状态唯一真相：journey.state 决定这个人现在到哪一步。
 * 2. 事件驱动推进：只能通过"当前状态允许的事件"前进，禁止跳步。
 * 3. 每状态自带 SLA：超时不是失败，是触发换打法或转人工的信号。
 * 4. 每状态必须产出交付物：走完一个状态，手里要能多一份能用文件。
 *
 * 状态轨迹 = 一个普通人从"想创业"到"收到第一笔钱"的完整路径。
 */

export const VERSION = '1.0.0';

/* ---------------- 状态定义 ---------------- */

export const STATES = {
  S0_INTAKE: {
    day: 0,
    name: '基本情况登记',
    goal: '把城市、原有行业、手里资源、每周可投入时间、启动资金、目标收入六项填清楚',
    artifact: '创业者画像',
    slaHours: 72,
    onTimeout: 'nudge',
    action: {
      title: '填完六项，智脑才知道给你排哪条赛道',
      detail: '不是问卷，是给你算账。填错一项，后面全偏。',
    },
    events: {
      submit_profile: { to: 'S1_TRACK', note: '画像入账，进入赛道诊断' },
    },
  },

  S1_TRACK: {
    day: 1,
    name: '赛道诊断',
    goal: '在五大赛道里锁定一条，并说清为什么不选另外四条',
    artifact: '赛道诊断书',
    slaHours: 48,
    onTimeout: 'nudge',
    action: {
      title: '确认你的赛道',
      detail: '智脑按你的资源给出候选，你选一条进落地。选错可以回来重选，但每次重选会多花一周。',
    },
    events: {
      accept_track: { to: 'S2_ENTITY', note: '赛道锁定' },
      reject_track: { to: 'S1_TRACK', reset: true, note: '重新出候选' },
    },
  },

  S2_ENTITY: {
    day: 2,
    name: '主体落地',
    goal: '定下用什么主体接单，经营范围能覆盖业务，公私账分开',
    artifact: '经营范围模板 + 开户与公私账清单',
    slaHours: 96,
    onTimeout: 'nudge',
    action: {
      title: '把主体这件事一次办对',
      detail: '先用经营范围模板对照，别自己瞎写，写漏一项以后开发票就卡住。',
    },
    events: {
      confirm_entity: { to: 'S3_OFFER', note: '主体方案确认' },
      back_to_track: { to: 'S1_TRACK', note: '发现赛道不成立，回退' },
    },
  },

  S3_OFFER: {
    day: 3,
    name: '产品与定价',
    goal: '把能力打包成一个能报价的产品，给出价格区间和不允许跌破的底价',
    artifact: '服务包说明 + 报价单 + 议价话术',
    slaHours: 96,
    onTimeout: 'nudge',
    action: {
      title: '先想清楚你卖的是什么，再谈客户',
      detail: '同一件事散着卖收不上价，打包成一个结果再卖。底价写下来，谈的时候不许破。',
    },
    events: {
      publish_offer: { to: 'S4_LEADS', note: '服务包与报价发布' },
      back_to_entity: { to: 'S2_ENTITY', note: '主体没落地，回退' },
    },
  },

  S4_LEADS: {
    day: 4,
    name: '客户从哪来',
    goal: '按你的城市和行业，圈出第一批可以触达的客户方向，并准备好开场话术',
    artifact: '目标客户画像 + 触达话术 + 渠道清单',
    slaHours: 72,
    onTimeout: 'nudge',
    action: {
      title: '先圈人，别先做官网',
      detail: '一人公司死在没人可谈，不死在东西不好。先有 20 个能开口的人。',
    },
    events: {
      leads_ready: { to: 'S5_OUTREACH', note: '名单与话术就绪' },
      back_to_offer: { to: 'S3_OFFER', note: '产品不对，回退改包' },
    },
  },

  S5_OUTREACH: {
    day: 5,
    name: '第一次开口',
    goal: '真实发出第一批触达，拿到至少一个正面回应',
    artifact: '触达记录 + 首轮反馈',
    slaHours: 120,
    onTimeout: 'switch_tactic',
    action: {
      title: '今天只做一件事：开口',
      detail: '发 10 个，别发 100 个。发完记录谁回了、谁没回，回的内容原话记下来。',
    },
    events: {
      outreach_replied: { to: 'S6_PROPOSAL', note: '有客户愿意听方案' },
      switch_channel: { to: 'S5_OUTREACH', reset: true, note: '换渠道或换话术，原地重来' },
      no_market: { to: 'S4_LEADS', note: '这类客户根本不回，回退换池' },
    },
  },

  S6_PROPOSAL: {
    day: 8,
    name: '出方案',
    goal: '把客户的具体问题写成一页能看懂的方案，带价格和交付节点',
    artifact: '一页式方案书',
    slaHours: 72,
    onTimeout: 'nudge',
    action: {
      title: '一页纸讲完：问题、你怎么解、多久、多少钱',
      detail: '不要发长文档，没人看。一页，手机上能读完。',
    },
    events: {
      proposal_sent: { to: 'S7_NEGOTIATE', note: '方案已发出' },
      need_more_info: { to: 'S6_PROPOSAL', reset: true, note: '信息不够，补充重出' },
    },
  },

  S7_NEGOTIATE: {
    day: 10,
    name: '议价与推进',
    goal: '扛住第一轮压价，把价格谈到底价之上，并拿到明确的下一步',
    artifact: '议价记录 + 最终报价',
    slaHours: 120,
    onTimeout: 'at_risk',
    action: {
      title: '被嫌贵是正常的，别第一句就降价',
      detail: '先拆价值，再谈范围，最后才是价格。降价的唯一条件是砍掉一部分交付。',
    },
    events: {
      accept_price: { to: 'S8_CONTRACT', note: '客户接受报价' },
      reject_price: { to: 'S6_PROPOSAL', note: '被压价或拒，回改方案' },
      lost_deal: { to: 'S5_OUTREACH', note: '这一单丢了，回到开口环节' },
    },
  },

  S8_CONTRACT: {
    day: 12,
    name: '签约与回款',
    goal: '签成合同，收到第一笔款，交付标准写死',
    artifact: '合同框架 + 收款凭证',
    slaHours: 96,
    onTimeout: 'at_risk',
    action: {
      title: '合同可以简单，但三件事必须写',
      detail: '交付物写清、交付时间写清、付款节点写清。没有这三条，后面全是扯皮。',
    },
    events: {
      contract_signed: { to: 'S9_DELIVERY', note: '合同签署' },
      stalled: { to: 'S7_NEGOTIATE', note: '客户拖着不签，回议价' },
    },
  },

  S9_DELIVERY: {
    day: 15,
    name: '首单交付',
    goal: '按合同交付完成，客户确认验收',
    artifact: '交付物 + 验收记录',
    slaHours: 168,
    onTimeout: 'at_risk',
    action: {
      title: '交付只做合同上写的，多做会掉价',
      detail: '超出的部分记下来，下次单独报价。这次白送，下次他就默认该送。',
    },
    events: {
      delivered: { to: 'S10_REVIEW', note: '客户验收通过' },
      delivery_blocked: { to: 'S9_DELIVERY', reset: true, note: '客户不配合，原地处理' },
    },
  },

  S10_REVIEW: {
    day: 22,
    name: '复盘与复购',
    goal: '算清这一单真实赚多少，拿到转介绍，谈成续费或第二单',
    artifact: '首单复盘表 + 转介绍话术',
    slaHours: 120,
    onTimeout: 'nudge',
    action: {
      title: '第一单真正值钱的不是钱，是能复制的流程',
      detail: '把这次从找到人到收到钱的每一步写下来，这就是你的产品说明书。',
    },
    events: {
      renew_won: { to: 'S11_SCALE', note: '拿到续费或转介绍' },
      no_renew: { to: 'S5_OUTREACH', note: '没续费，重新开口找新客' },
    },
  },

  S11_SCALE: {
    day: 30,
    name: '复制放大',
    goal: '同一套流程再复制一遍，把单客收入或客户数翻一倍',
    artifact: '复制计划 + 第二单',
    slaHours: 240,
    onTimeout: 'nudge',
    action: {
      title: '能被复制一遍的流程，才叫生意',
      detail: '只加量不加流程，第三单就会崩。先固化流程，再谈放大。',
    },
    events: {
      cycle_done: { to: 'S5_OUTREACH', note: '一轮闭环完成，进入下一轮开口' },
      graduate: { to: 'DONE', note: '已稳定出单，毕业' },
    },
  },

  /* ---------- 旁路状态 ---------- */

  AT_RISK: {
    day: null,
    name: '停滞预警',
    goal: '连续超时或长期无动作，需要人工介入判断卡在哪',
    artifact: null,
    slaHours: 72,
    onTimeout: 'risk_escalate',
    action: {
      title: '停下来了，先别硬推',
      detail: '说一句卡在哪：没客户、不会做、不敢报价、还是不想干了。四种卡法四种解法。',
    },
    events: {
      resume: { to: 'RISK_PREV', note: '恢复推进，回到原状态' },
      restart: { to: 'S1_TRACK', note: '推倒重来，重新诊断赛道' },
      quit: { to: 'CHURNED', note: '明确放弃' },
    },
  },

  DONE: {
    day: null,
    name: '已完成',
    goal: '稳定出单，进入自我复制',
    artifact: '完整经营档案',
    slaHours: null,
    onTimeout: null,
    action: { title: '你已经跑通了，接下来是加量', detail: '把流程交给智脑盯，你只做决策。' },
    events: {},
  },

  CHURNED: {
    day: null,
    name: '已退出',
    goal: '暂时不做了',
    artifact: null,
    slaHours: null,
    onTimeout: null,
    action: { title: '账号保留，随时可以回来', detail: '回来时从上次停的地方接着走。' },
    events: { revive: { to: 'S0_INTAKE', note: '重新开始' } },
  },
};

/* 主干顺序，用于算进度百分比 */
export const TRUNK = [
  'S0_INTAKE', 'S1_TRACK', 'S2_ENTITY', 'S3_OFFER', 'S4_LEADS',
  'S5_OUTREACH', 'S6_PROPOSAL', 'S7_NEGOTIATE', 'S8_CONTRACT',
  'S9_DELIVERY', 'S10_REVIEW', 'S11_SCALE', 'DONE',
];

export const START_STATE = 'S0_INTAKE';

/* ---------------- 画像校验 ---------------- */

const NICK = {
  city: '所在城市',
  industry_bg: '原有行业或技能',
  resource: '手里资源',
  weekly_hours: '每周可投入小时',
  capital: '启动资金',
  goal_income: '目标月收入',
};

/** 返回 { ok, missing:[] } */
export function validateProfile(p) {
  if (!p || typeof p !== 'object') return { ok: false, missing: Object.keys(NICK) };
  const missing = [];
  for (const k of Object.keys(NICK)) {
    const v = p[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) missing.push(k);
  }
  const weekly = Number(p.weekly_hours);
  if (p.weekly_hours !== undefined && p.weekly_hours !== '' && (!Number.isFinite(weekly) || weekly <= 0 || weekly > 112)) {
    return { ok: false, missing: [], invalid: { weekly_hours: '每周可投入小时需在 1–112 之间' } };
  }
  const capital = Number(p.capital);
  if (p.capital !== undefined && p.capital !== '' && (!Number.isFinite(capital) || capital < 0)) {
    return { ok: false, missing: [], invalid: { capital: '启动资金填数字，没有就填 0' } };
  }
  if (missing.length) return { ok: false, missing };
  return { ok: true, missing: [] };
}

export const PROFILE_LABELS = NICK;

/* ---------------- 状态机核心 ---------------- */

export function stateOf(key) {
  return STATES[key] || null;
}

export function isTerminal(key) {
  return key === 'DONE' || key === 'CHURNED';
}

/** 进度：0–100，旁路状态沿用最近主干节点 */
export function progressOf(key) {
  const k = key === 'AT_RISK' || key === 'RISK_PREV' ? 'S5_OUTREACH' : key;
  const i = TRUNK.indexOf(k);
  if (i < 0) return 0;
  return Math.round((i / (TRUNK.length - 1)) * 100);
}

/**
 * 计算一次状态转移。
 * @param {string} cur      当前状态码
 * @param {string} event    事件名
 * @param {object} ctx      { profile, riskPrevState }
 * @returns {{ ok:boolean, code?:string, message?:string, to?:string, reset?:boolean, note?:string }}
 */
export function transition(cur, event, ctx = {}) {
  const st = STATES[cur];
  if (!st) return { ok: false, code: 'BAD_STATE', message: `未知状态：${cur}` };

  const def = st.events[event];
  if (!def) {
    return {
      ok: false,
      code: 'EVENT_NOT_ALLOWED',
      message: `当前阶段「${st.name}」不接受「${event}」这个动作`,
      allowed: Object.keys(st.events),
    };
  }

  // 守卫：画像必须完整才能离开 S0
  if (cur === 'S0_INTAKE' && event === 'submit_profile') {
    const v = validateProfile(ctx.profile);
    if (!v.ok) {
      return { ok: false, code: 'PROFILE_INCOMPLETE', message: '画像还没填全', missing: v.missing, invalid: v.invalid };
    }
  }

  // 旁路恢复：AT_RISK 的 resume 回到进预警前的状态
  let to = def.to;
  if (to === 'RISK_PREV') {
    to = ctx.riskPrevState && STATES[ctx.riskPrevState] ? ctx.riskPrevState : 'S5_OUTREACH';
  }

  if (!STATES[to]) return { ok: false, code: 'BAD_TARGET', message: `目标状态不存在：${to}` };

  return { ok: true, to, reset: !!def.reset, note: def.note || '' };
}

/** 新状态的到期时间（秒时间戳）；无 SLA 返回 null */
export function slaDue(state, nowSec) {
  const h = STATES[state] && STATES[state].slaHours;
  return h ? nowSec + h * 3600 : null;
}

/**
 * 超时策略：到点后系统该做什么
 * nudge        → 只提醒，状态不动
 * switch_tactic→ 强制催办，并建议换打法（状态不动，但风险 +1）
 * at_risk      → 转入 AT_RISK
 * risk_escalate→ 已在 AT_RISK 且再超时，转人工
 */
export function timeoutDecision(state, overBySec) {
  const st = STATES[state];
  if (!st || !st.slaHours) return { kind: 'none' };
  const policy = st.onTimeout;
  if (policy === 'at_risk') return { kind: 'at_risk', message: `「${st.name}」已超时 ${Math.round(overBySec / 3600)} 小时，转入停滞预警` };
  if (policy === 'switch_tactic') return { kind: 'switch_tactic', suggestEvent: 'switch_channel', message: `「${st.name}」卡了 ${Math.round(overBySec / 3600)} 小时，建议换渠道或换话术` };
  if (policy === 'risk_escalate') return { kind: 'escalate', message: '停滞预警再次超时，转人工介入' };
  return { kind: 'nudge', message: `「${st.name}」卡了 ${Math.round(overBySec / 3600)} 小时，该动了` };
}

/** 给前端的完整视图 */
export function view(state, extra = {}) {
  const st = STATES[state] || STATES[S0_INTAKE];
  return {
    state,
    day: st.day,
    name: st.name,
    goal: st.goal,
    artifact: st.artifact,
    action: st.action,
    allowedEvents: Object.keys(st.events),
    progress: progressOf(state),
    terminal: isTerminal(state),
    ...extra,
  };
}
