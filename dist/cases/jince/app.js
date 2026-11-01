'use strict';
/* app.js — 金策终端前端逻辑 */

const STATE = { asset: 'gold', horizon: 'today', chartPeriod: 'day', data: null, silver: null, chart: null, learnChart: null, dashChart: null };
let predicted = false; // 是否已点击一键预测

// 设备指纹（用于访问审计：识别同一密码在几台设备上活跃）
function getDeviceId() {
  let d = localStorage.getItem('bk_device');
  if (!d) { d = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('bk_device', d); }
  return d;
}
const DEVICE_ID = getDeviceId();
let ACCESS_KEY = localStorage.getItem('bk_key') || ''; // 管理口令（仅管理员用 ?k= 直登，普通用户走账号）

/* ---------- 账号会话（2026-10-13 新增）----------
 * 客户要求：加账号体系、不要联系方式。
 *  → 身份靠「用户名 + 密码」登录拿到的 token，试用/订阅都绑账号，不再绑设备。
 *  → 前端只存 token（不具备密码），密码不回传、不落任何本地存储。
 */
const TOKEN_KEY = 'bk_token';
let TOKEN = localStorage.getItem(TOKEN_KEY) || '';
let ME = null;                 // { user, trial }
let PENDING_CODE = '';         // 链接带来的使用码，登录后再兑换
let AUTH_MODE = 'login';       // login | register

const UP = '#e23b3b', DOWN = '#16a34a'; // 国内习惯：涨红跌绿
const fmt = (n, d = 2) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
const r2 = x => Math.round(x * 100) / 100;
const r1 = x => Math.round(x * 10) / 10;
const cls = x => x > 0.05 ? 'up' : x < -0.05 ? 'down' : '';
const sign = x => x > 0.05 ? 1 : x < -0.05 ? -1 : 0;

function sma(arr, p) { if (arr.length < p) return null; return arr.slice(-p).reduce((a, b) => a + b, 0) / p; }

// —— 前端指标序列（随日/周/月周期切换本地重算，保证图表专业且对齐）——
function smaArr(arr, p) { const out = []; for (let i = 0; i < arr.length; i++) { if (i < p - 1) { out.push(null); continue; } out.push(r2(arr.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p)); } return out; }
function emaArr(arr, p) { const k = 2 / (p + 1); const out = []; let prev = null; for (let i = 0; i < arr.length; i++) { if (i < p - 1) { out.push(null); continue; } if (prev == null) { const s = arr.slice(0, p).reduce((a, b) => a + b, 0) / p; prev = s; out.push(r2(s)); } else { prev = arr[i] * k + prev * (1 - k); out.push(r2(prev)); } } return out; }
function bollingerArr(arr, p, m) { const out = []; for (let i = 0; i < arr.length; i++) { if (i < p - 1) { out.push({ mid: null, upper: null, lower: null }); continue; } const sl = arr.slice(i - p + 1, i + 1); const mid = sl.reduce((a, b) => a + b, 0) / p; const va = sl.reduce((a, b) => a + (b - mid) ** 2, 0) / p; const sd = Math.sqrt(va); out.push({ mid: r2(mid), upper: r2(mid + m * sd), lower: r2(mid - m * sd) }); } return out; }
function rsiArr(arr, p) { const out = []; for (let i = 0; i < arr.length; i++) { if (i < p) { out.push(50); continue; } let g = 0, l = 0; for (let j = i - p + 1; j <= i; j++) { const d = arr[j] - arr[j - 1]; if (d >= 0) g += d; else l -= d; } if (l === 0) { out.push(100); continue; } const rs = (g / p) / (l / p); out.push(r2(100 - 100 / (1 + rs))); } return out; }
function macdArr(arr) { const ef = emaArr(arr, 12), es = emaArr(arr, 26); const ml = arr.map((_, i) => (ef[i] == null || es[i] == null) ? null : r2(ef[i] - es[i])); const k = 2 / 10; const sig = []; let prev = null; for (let i = 0; i < ml.length; i++) { if (ml[i] == null) { sig.push(null); continue; } if (prev == null) { prev = ml[i]; sig.push(r2(prev)); } else { prev = ml[i] * k + prev * (1 - k); sig.push(r2(prev)); } } const hist = ml.map((v, i) => (v == null || sig[i] == null) ? null : r2(v - sig[i])); return { macd: ml, signal: sig, hist }; }

async function fetchJSON(u) {
  const headers = {};
  if (ACCESS_KEY) headers['x-access-key'] = ACCESS_KEY;   // 管理口令通道（管理员）
  // 【2026-10-13 线上实测】公网反代会吃掉标准 Authorization 头，改用 x-auth-token 自定义头带 token
  if (TOKEN) headers['x-auth-token'] = TOKEN; // 账号通道（普通用户）
  headers['x-device-id'] = DEVICE_ID;
  const r = await fetch(u, { headers });
  if (r.status === 401) {
    const j = await r.json().catch(() => ({}));
    if (j.locked) {
      if (j.needLogin && TOKEN) { TOKEN = ''; localStorage.removeItem(TOKEN_KEY); } // token 失效，清掉
      showAuth(j.message || '请先登录');
      throw new Error('need-login');
    }
  }
  if (r.status === 402) {
    // 免费试用到期：弹出开通引导，不再往下渲染
    const j = await r.json().catch(() => ({}));
    showPaywall(j.paywall);
    throw new Error('trial-expired');
  }
  if (!r.ok) throw new Error(u + ' ' + r.status);
  return r.json();
}

/* ---------- 账号：登录 / 注册面板 ---------- */
function setAuthMode(mode) {
  AUTH_MODE = mode === 'register' ? 'register' : 'login';
  const tl = document.getElementById('tabLogin'), tr = document.getElementById('tabReg');
  const btn = document.getElementById('lockBtn'), pass = document.getElementById('lockPass'), foot = document.getElementById('lockFoot');
  if (tl) tl.classList.toggle('active', AUTH_MODE === 'login');
  if (tr) tr.classList.toggle('active', AUTH_MODE === 'register');
  if (btn) btn.textContent = AUTH_MODE === 'login' ? '登录' : '注册并开始 3 天试用';
  if (pass) pass.placeholder = AUTH_MODE === 'login' ? '密码' : '设置密码（至少 6 位）';
  if (foot) foot.textContent = AUTH_MODE === 'login'
    ? '不需要邮箱和手机号 —— 用户名 + 密码即可。'
    : '注册即开通 3 天免费试用 · 不需要邮箱和手机号。';
  const tip = document.getElementById('lockTip');
  if (tip && !tip.classList.contains('err')) {
    tip.textContent = AUTH_MODE === 'login' ? '登录后继续使用' : '注册即送 3 天免费试用';
  }
}
function showAuth(msg) {
  const el = document.getElementById('lockScreen');
  if (el) el.classList.remove('hidden');
  setAuthMode(AUTH_MODE);
  const tip = document.getElementById('lockTip');
  if (tip) {
    tip.textContent = msg || (AUTH_MODE === 'login' ? '登录后继续使用' : '注册即送 3 天免费试用');
    tip.classList.toggle('err', !!msg);
  }
  setTimeout(() => { const i = document.getElementById('lockUser'); if (i) i.focus(); }, 60);
}
function hideLock() { const el = document.getElementById('lockScreen'); if (el) el.classList.add('hidden'); }

/** 顶栏展示当前登录账号 + 退出入口 */
function renderUser(u) {
  const box = document.getElementById('userBox');
  if (!box) return;
  if (!u) { box.classList.remove('show'); return; }
  box.classList.add('show');
  const n = document.getElementById('ubName');
  if (n) n.textContent = u.username || '—';
}

/** 提交登录 / 注册 */
async function submitAuth() {
  const tip = document.getElementById('lockTip');
  const userEl = document.getElementById('lockUser');
  const passEl = document.getElementById('lockPass');
  const btn = document.getElementById('lockBtn');
  const username = ((userEl && userEl.value) || '').trim();
  const password = (passEl && passEl.value) || '';
  if (!username) { tip.textContent = '请输入用户名'; tip.classList.add('err'); return; }
  if (!password) { tip.textContent = '请输入密码'; tip.classList.add('err'); return; }
  if (AUTH_MODE === 'register' && password.length < 6) { tip.textContent = '密码至少 6 位'; tip.classList.add('err'); return; }

  if (btn) btn.disabled = true;
  tip.textContent = AUTH_MODE === 'login' ? '正在登录…' : '正在创建账号…';
  tip.classList.remove('err');
  try {
    const r = await fetch('/api/auth/' + AUTH_MODE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { tip.textContent = j.error || '操作失败，请重试'; tip.classList.add('err'); return; }

    TOKEN = j.token; localStorage.setItem(TOKEN_KEY, TOKEN);
    ME = { user: j.user, trial: j.trial };
    TRIAL = j.trial; renderTrialBar(j.trial); renderUser(j.user);
    if (passEl) passEl.value = '';
    hideLock(); hidePaywall();

    // 链接带来的使用码：登录/注册成功后自动兑换，客户一步到位
    if (PENDING_CODE) {
      const rr = await redeemCode(PENDING_CODE);
      PENDING_CODE = '';
      try { localStorage.removeItem('bk_pending_code'); } catch (_) {}
      if (rr.ok) { toast('使用码已开通 · 感谢支持'); setTimeout(() => reload(true), 250); return; }
      toast(rr.error || '使用码开通失败', true);
      showPaywall(null, { firstOpen: true });
      return;
    }
    setTimeout(() => reload(true), 250);
  } catch (e) {
    tip.textContent = '网络异常，请重试'; tip.classList.add('err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** 退出登录：只撤当前会话，其他设备不受影响 */
async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-auth-token': TOKEN } }); } catch (_) {}
  TOKEN = ''; localStorage.removeItem(TOKEN_KEY);
  ME = null; TRIAL = null; predicted = false;
  renderUser(null);
  renderTrialBar(null);
  showAuth('已退出登录');
}
function hidePlaceholders() {
  const ids = ['heroPlaceholder', 'phChart', 'phRisk', 'phLearn', 'phArchive', 'phReview', 'phScenarios', 'phBuyback', 'phToolbox', 'phDash'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}
/** 管理口令通道的解锁上报（设备/IP/时间）——供后台「访问监控」识别口令是否被扩散 */
function reportAccess() {
  if (!ACCESS_KEY) return;
  fetch('/api/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-access-key': ACCESS_KEY, 'x-device-id': DEVICE_ID },
    body: JSON.stringify({ deviceId: DEVICE_ID }),
  }).catch(() => {});
}

/* ---------- 试用 / 订阅（免费 3 天 → 按月收费）· 绑账号 ---------- */
let TRIAL = null;

/** 静默刷新账号状态（试用剩余 / 是否到期） */
async function refreshMe() {
  if (!TOKEN) return;
  try {
    const me = await fetchJSON('/api/auth/me');
    ME = { user: me.user, trial: me.trial };
    TRIAL = me.trial;
    renderUser(me.user);
    renderTrialBar(me.trial);
    if (me.trial && me.trial.state === 'expired') showPaywall(me.trial.config);
  } catch (_) {}
}

/** 兑换使用码（绑到当前登录账号） */
async function redeemCode(code) {
  if (!TOKEN) return { ok: false, error: '请先登录，再输入使用码' };
  try {
    const r = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': TOKEN },
      body: JSON.stringify({ code }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return { ok: false, error: j.error || '开通失败，请核对使用码' };
    TRIAL = j.status;
    renderTrialBar(j.status);
    return { ok: true, status: j.status };
  } catch (e) { return { ok: false, error: '网络异常，请重试' }; }
}
function renderTrialBar(st) {
  const bar = document.getElementById('trialBar');
  const txt = document.getElementById('trialText');
  const btn = document.getElementById('trialRedeem');
  if (!bar || !txt) return;
  if (!st) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const who = (ME && ME.user && ME.user.username) ? ME.user.username + ' · ' : '';
  if (st.state === 'expired') {
    bar.classList.add('expired');
    txt.textContent = who + '免费试用已结束 · 开通后继续使用';
    if (btn) btn.textContent = '立即开通';
    return;
  }
  bar.classList.remove('expired');
  const d = st.daysLeft;
  // 【2026-10-13 修复】天数向上取整：刚开通时 daysLeft = 2.99998（少了几秒），
  // 用 floor 会立刻显示「剩余 2 天」，等于白送的第 1 天被吞掉，客户会以为少了。
  // 向上取整后：3 天试用依次显示 3 → 3 → 2 → 1 → 小时，符合直觉。
  const dTxt = d >= 1 ? `${Math.ceil(d)} 天` : `${Math.max(1, Math.round(d * 24))} 小时`;
  txt.textContent = who + (st.isPaid ? `已订阅 · 剩余 ${dTxt}` : `免费试用中 · 剩余 ${dTxt}（到期后按月续费）`);
  if (btn) btn.textContent = st.isPaid ? '续期' : '输入使用码';
}
function showPaywall(pw, opts) {
  const el = document.getElementById('paywallScreen');
  if (!el) return;
  el.classList.remove('hidden');
  const firstOpen = !!(opts && opts.firstOpen);   // 试用到期 → 常规开通；从顶栏「输入使用码」进来 → 填码开通
  const c = pw || (TRIAL && TRIAL.config) || ME && ME.trial && ME.trial.config || {};
  const titleEl = document.getElementById('pwTitle');
  if (titleEl) titleEl.textContent = firstOpen ? '填使用码即可开通' : '免费试用已结束';
  const priceEl = document.getElementById('pwPrice');
  if (priceEl) priceEl.textContent = c.price ? `${c.price} ${c.priceUnit || ''}` : '—';
  const noteEl = document.getElementById('pwNote');
  if (noteEl) noteEl.textContent = c.note || '凭使用码开通：输入使用码即可开通 30 天。';
  const qr = document.getElementById('pwQr');
  if (qr) {
    // 分步引导（不含任何个人联系方式——客户明确要求「不要加联系方式，微信这些」）
    const days = c.subDays || 30;
    qr.innerHTML = firstOpen
      ? `<div class="pw-steps">
           <div class="pw-step"><b>1</b><span>把购买到的使用码复制出来（形如 HS-XXXX-XXXX）</span></div>
           <div class="pw-step"><b>2</b><span>粘贴到下面的输入框</span></div>
           <div class="pw-step"><b>3</b><span>点「开通并继续使用」，即刻生效</span></div>
         </div>`
      : `<div class="pw-steps">
           <div class="pw-step"><b>1</b><span>获取一张使用码（形如 HS-XXXX-XXXX）</span></div>
           <div class="pw-step"><b>2</b><span>粘贴到下面的输入框</span></div>
           <div class="pw-step"><b>3</b><span>点「开通并继续使用」，自动开通 ${days} 天</span></div>
         </div>`;
  }
  setTimeout(() => { const i = document.getElementById('pwCode'); if (i) i.focus(); }, 60);
}
function hidePaywall() { const el = document.getElementById('paywallScreen'); if (el) el.classList.add('hidden'); }
async function submitRedeem() {
  const inp = document.getElementById('pwCode');
  const tip = document.getElementById('pwTip');
  const code = ((inp && inp.value) || '').trim();
  if (!code) { tip.textContent = '请输入使用码'; tip.classList.add('err'); return; }
  if (!TOKEN) { hidePaywall(); showAuth('请先登录，再输入使用码'); return; }
  tip.textContent = '校验中…'; tip.classList.remove('err');
  const rr = await redeemCode(code);
  if (!rr.ok) { tip.textContent = rr.error; tip.classList.add('err'); return; }
  tip.textContent = '✓ 开通成功，正在进入…';
  setTimeout(() => { hidePaywall(); hideLock(); reload(true); }, 600);
}

/** 记下地址栏里的 ?code= 并立刻清掉（防止使用码留在浏览器历史里被二次点击） */
function captureUrlCode() {
  try {
    const urlCode = new URLSearchParams(location.search).get('code') || '';
    if (urlCode) {
      PENDING_CODE = urlCode;
      try { localStorage.setItem('bk_pending_code', urlCode); } catch (_) {}
      const u = new URL(location.href);
      u.searchParams.delete('code');
      history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
    } else {
      PENDING_CODE = localStorage.getItem('bk_pending_code') || '';
    }
  } catch (_) {}
}

async function init() {
  bindEvents();
  tickClock();
  setInterval(tickClock, 1000);
  setAuthMode('login');
  migrateLocalAlerts(); // 旧版本地警报迁移到服务端（后台常驻盯盘）

  // ① 链接带来的使用码（?code=）：先暂存，等登录/注册成功后自动兑换，客户一步到位
  captureUrlCode();

  if (ACCESS_KEY) {
    // ② 管理员带 ?k= 口令：跳过账号登录直接进（口令只存本机浏览器）
    hideLock();
    reportAccess();
    setTimeout(() => reload(true), 200);
  } else if (TOKEN) {
    // ③ 有登录态 → 校验账号并进入
    try {
      const me = await fetchJSON('/api/auth/me');
      ME = { user: me.user, trial: me.trial };
      TRIAL = me.trial;
      renderUser(me.user);
      renderTrialBar(me.trial);
      if (PENDING_CODE) {
        const rr = await redeemCode(PENDING_CODE);
        PENDING_CODE = '';
        try { localStorage.removeItem('bk_pending_code'); } catch (_) {}
        if (rr.ok) toast('使用码已开通 · 感谢支持');
      }
      if (TRIAL && TRIAL.state === 'expired') showPaywall(TRIAL.config);
      else setTimeout(() => reload(true), 200);
    } catch (e) {
      if (e.message !== 'need-login') showAuth();
    }
  } else {
    // ④ 未登录 → 弹登录 / 注册（注册即送 3 天免费试用）
    showAuth();
  }

  setInterval(refreshMe, 30 * 60 * 1000);   // 每 30 分钟刷新剩余时间与开通状态
  setInterval(() => { if (predicted && document.visibilityState === 'visible') reload(false); }, 60000);
  setInterval(() => { if (document.visibilityState === 'visible') renderAutoPilot(); }, 45000);
}

async function reload(first) {
  try {
    const [g, s] = await Promise.all([
      fetchJSON('/api/analyze?asset=gold'),
      fetchJSON('/api/analyze?asset=silver'),
    ]);
    STATE.gold = g; STATE.silver = s; predicted = true;
    STATE.data = STATE.asset === 'silver' ? s : g; // 保持用户当前选择的资产，不强制跳回黄金
    const cur = STATE.data;
    hidePlaceholders();
    renderTicker(g, s);
    renderChart(cur);
    renderCard();
    renderRisk();
    renderResonance(cur); renderScenarios(cur); renderReview(cur);
    renderToolbox(cur, g, s); renderAutoPilot();
    renderSpotCny(g, s);
    renderBuyback(g, s);
    renderLearning();
    renderAccuracy();
    renderDashboard();
    document.querySelector('.hero-panel').classList.add('predicted');
    hideLock(); // 数据正常加载即解锁（密码正确或后端未设密码）
    if (first) toast('数据已接入 · 专家团在线');
  } catch (e) {
    console.error(e);
    if (e.message === 'trial-expired') { hideLock(); return; } // 开通引导已由 fetchJSON 弹出
    if (e.message === 'need-login') return;                    // 等待登录 / 注册
    toast('数据接入异常：' + e.message, true);
  }
}

/* ---------- 行情条 ---------- */
function renderTicker(g, s) {
  const m = g.macro;
  const items = [
    ['伦敦金 XAU', g.spot, g.dayChange ? g.dayChange.pct : null],
    ['伦敦银 XAG', s.spot, s.dayChange ? s.dayChange.pct : null],
    ['美元指数 DXY', m.dxy, m.dxy5dPct],
    ['美债10Y', m.us10y, m.us10y5dPct],
    ['金银比', m.goldSilverRatio, null],
    ['数据源', g.source === 'live' ? '实时' : g.source === 'spot-only' ? '现货' : '演示', null],
  ];
  const track = document.getElementById('tickerTrack');
  const make = () => items.map(([nm, px, ch]) => {
    let chHtml = '';
    if (ch != null) { const c = cls(ch); chHtml = `<span class="ch ${c}">${ch >= 0 ? '▲' : '▼'}${fmt(Math.abs(ch), 2)}%</span>`; }
    const pxTxt = px == null ? '—' : (nm.includes('比') || nm.includes('DXY') || nm.includes('10Y')) ? fmt(px, 2) : fmt(px, 2);
    return `<span class="tk"><span class="nm">${nm}</span><span class="px">${pxTxt}</span>${chHtml}</span>`;
  }).join('');
  track.innerHTML = make() + make(); // 双份用于无缝滚动
  document.getElementById('srcBadge').textContent = g.source === 'live' ? '实时数据' : g.source === 'spot-only' ? '现货源' : '演示数据';
}

/* ---------- K线（日/周/月 + 布林 + 量能 + MACD + RSI 四段） ---------- */
function renderChart(g, period) {
  if (!g) return;
  period = period || STATE.chartPeriod || 'day';
  let candles = period === 'week' ? (g.weekly && g.weekly.length ? g.weekly : g.candles)
    : period === 'month' ? (g.monthly && g.monthly.length ? g.monthly : g.candles) : g.candles;
  candles = candles || [];
  if (!STATE.chart) STATE.chart = echarts.init(document.getElementById('chart'), null, { renderer: 'canvas' });
  const dates = candles.map(c => c.date);
  const ohlc = candles.map(c => [c.open, c.close, c.low, c.high]);
  const closes = candles.map(c => c.close);
  const vols = candles.map(c => c.volume);
  const ma20 = smaArr(closes, 20), ma60 = smaArr(closes, 60);
  const bb = bollingerArr(closes, 20, 2);
  const rsi = rsiArr(closes, 14);
  const macd = macdArr(closes);

  STATE.chart.setOption({
    backgroundColor: 'transparent', animation: false,
    grid: [
      { left: 52, right: 14, top: 8, height: '46%' },
      { left: 52, right: 14, top: '56%', height: '9%' },
      { left: 52, right: 14, top: '67%', height: '17%' },
      { left: 52, right: 14, top: '86%', height: '12%' },
    ],
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: '#ffffff', borderColor: '#c8d2e2', textStyle: { color: '#1b2433', fontSize: 11 } },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    visualMap: { show: false, seriesIndex: 6, pieces: [{ lte: 0, color: DOWN }, { gt: 0, color: UP }], outOfRange: { color: '#9aa3b8' } },
    xAxis: [
      { type: 'category', data: dates, gridIndex: 0, axisLine: { lineStyle: { color: '#c8d2e2' } }, axisLabel: { color: '#6b7689', fontSize: 10 }, splitLine: { show: false } },
      { type: 'category', data: dates, gridIndex: 1, axisLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false } },
      { type: 'category', data: dates, gridIndex: 2, axisLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false } },
      { type: 'category', data: dates, gridIndex: 3, axisLine: { lineStyle: { color: '#c8d2e2' } }, axisLabel: { color: '#6b7689', fontSize: 9 }, axisTick: { show: false } },
    ],
    yAxis: [
      { scale: true, gridIndex: 0, axisLine: { lineStyle: { color: '#c8d2e2' } }, axisLabel: { color: '#6b7689', fontSize: 10 }, splitLine: { lineStyle: { color: '#e7ecf4' } } },
      { scale: true, gridIndex: 1, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
      { scale: true, gridIndex: 2, axisLine: { show: false }, axisLabel: { color: '#6b7689', fontSize: 9 }, splitLine: { lineStyle: { color: '#e7ecf4' } } },
      { scale: true, gridIndex: 3, min: 0, max: 100, axisLine: { show: false }, axisLabel: { color: '#6b7689', fontSize: 9 }, splitLine: { lineStyle: { color: '#e7ecf4' } } },
    ],
    dataZoom: [{ type: 'inside', xAxisIndex: [0, 1, 2, 3], start: 30, end: 100 }],
    series: [
      { name: 'K', type: 'candlestick', data: ohlc, xAxisIndex: 0, yAxisIndex: 0, itemStyle: { color: UP, color0: DOWN, borderColor: UP, borderColor0: DOWN } },
      { name: 'MA20', type: 'line', data: ma20, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { color: '#e7b94e', width: 1.2 } },
      { name: 'MA60', type: 'line', data: ma60, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { color: '#3b82f6', width: 1.2 } },
      { name: 'BOLL-U', type: 'line', data: bb.map(b => b.upper), xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { color: '#6b7280', width: 0.8, type: 'dashed' } },
      { name: 'BOLL-L', type: 'line', data: bb.map(b => b.lower), xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { color: '#6b7280', width: 0.8, type: 'dashed' } },
      { name: '量', type: 'bar', data: vols, xAxisIndex: 1, yAxisIndex: 1, itemStyle: { color: '#cdd6e4' } },
      { name: 'MACD', type: 'bar', data: macd.hist, xAxisIndex: 2, yAxisIndex: 2 },
      { name: 'DIF', type: 'line', data: macd.macd, xAxisIndex: 2, yAxisIndex: 2, smooth: true, showSymbol: false, lineStyle: { color: '#e7b94e', width: 1 } },
      { name: 'DEA', type: 'line', data: macd.signal, xAxisIndex: 2, yAxisIndex: 2, smooth: true, showSymbol: false, lineStyle: { color: '#3b82f6', width: 1 } },
      { name: 'RSI', type: 'line', data: rsi, xAxisIndex: 3, yAxisIndex: 3, smooth: true, showSymbol: false, lineStyle: { color: '#a78bfa', width: 1.2 } },
    ],
  }, true);

  const last = candles[candles.length - 1];
  const pname = period === 'week' ? '周K' : period === 'month' ? '月K' : '日K';
  document.getElementById('chartTitle').textContent = `${g.name} 现货${pname} · 近${candles.length}根`;
  document.getElementById('chartMeta').innerHTML =
    `<span>最新 <b>${fmt(g.last)}</b></span><span>今开 <b>${fmt(last.open)}</b></span>` +
    `<span>高 <b class="up">${fmt(last.high)}</b></span><span>低 <b class="down">${fmt(last.low)}</b></span>` +
    `<span>MA20 <b>${fmt(ma20[ma20.length - 1])}</b></span><span>MA60 <b>${fmt(ma60[ma60.length - 1])}</b></span>` +
    `<span>RSI <b>${fmt(rsi[rsi.length - 1])}</b></span>`;
}

/* ---------- 研判作战卡 ---------- */
function renderCard() {
  if (!STATE.data) return;
  const g = STATE.data; const p = g.predictions[STATE.horizon];
  const dirEl = document.getElementById('verdictDir');
  dirEl.textContent = p.directionText;
  dirEl.className = 'verdict-dir ' + (p.direction === 'up' ? 'up' : p.direction === 'down' ? 'down' : 'flat');
  document.getElementById('verdictReturn').textContent = `预期 ${p.expectedReturnPct >= 0 ? '+' : ''}${fmt(p.expectedReturnPct)}%`;
  const winRate = (typeof p.winRate === 'number') ? p.winRate
    : (p.direction === 'down' ? 100 - p.upProb : p.upProb);
  document.getElementById('verdictUpProb').textContent = `${p.directionText}胜率 ${winRate}%`;

  // 一句话人话结论（小白直接读）
  const name = g.name;
  const dirWord = p.direction === 'up' ? '上涨' : p.direction === 'down' ? '下跌' : '横盘震荡';
  const retTxt = p.direction === 'flat' ? '' : `，预期${dirWord}约 ${Math.abs(p.expectedReturnPct)}%`;
  const summary = `综合判断：${p.horizonLabel}内<b>${name}</b>大概率<b>${p.directionText}</b>${retTxt}，` +
    `把握约 <b>${winRate}%</b>。三档目标价：最坏 ${fmt(p.targets.pessimistic)} / 最可能 ${fmt(p.targets.base)} / 最好 ${fmt(p.targets.optimistic)}。`;
  document.getElementById('plainSummary').innerHTML = summary;

  const cf = Math.round(p.confidence * 100);
  document.getElementById('confFill').style.width = cf + '%';
  document.getElementById('confVal').textContent = cf + '%';

  document.getElementById('tPess').textContent = fmt(p.targets.pessimistic);
  document.getElementById('tBase').textContent = fmt(p.targets.base);
  document.getElementById('tOpt').textContent = fmt(p.targets.optimistic);

  // 信号拆解条（小白友好命名）
  const sigNameMap = { trend: '大趋势', momentum: '涨跌劲头', meanReversion: '偏离回归', macro: '美元利率', intel: '情报·大脑' };
  const list = document.getElementById('sigList');
  list.innerHTML = p.breakdown.map(b => {
    const w = 50 + b.contribution * 50; // -1..1 -> 0..100%, 中点50
    const col = b.contribution > 0 ? UP : b.contribution < 0 ? DOWN : '#6b7689';
    const left = b.contribution > 0 ? 50 : w;
    const label = sigNameMap[b.key] || b.name;
    return `<div class="sig-row">
      <span class="sig-name">${label}</span>
      <div class="sig-bar"><div class="mid"></div><div class="fill" style="left:${left}%;width:${Math.abs(50 - w)}%;background:${col}"></div></div>
      <span class="sig-val ${cls(b.score)}">${b.score >= 0 ? '+' : ''}${b.score}</span>
    </div>`;
  }).join('');

  const bias = g.learning.biasCorrection;
  document.getElementById('biasNote').innerHTML = bias
    ? `🧠 自学习偏差修正已生效：模型历史平均${bias > 0 ? '高估' : '低估'} ${fmt(Math.abs(bias))}%/周期，已自动扣减。权重随每次真实价比对动态进化。`
    : `🧠 自学习引擎已就绪：权重均衡，等待真实价比对积累样本后自动进化。`;
}

/* ---------- 研判看板（需求 C：三档价 + 走势，小白一眼懂） ---------- */
function renderDashboard() {
  if (!STATE.data) return;
  const g = STATE.data;
  const dashCards = document.getElementById('dashCards');
  const dashChart = document.getElementById('dashChart');
  const dashSummary = document.getElementById('dashSummary');
  const phDash = document.getElementById('phDash');
  if (!dashCards || !dashChart || !dashSummary) return;

  const badge = document.getElementById('dashAssetBadge');
  if (badge) badge.textContent = g.name;
  if (phDash) phDash.style.display = 'none';

  const last = g.last;
  const dirCls = d => d === 'up' ? 'up' : d === 'down' ? 'down' : 'flat';
  const pctOf = (px) => (px - last) / last * 100;

  // —— 三档价卡片（今日 / 明日 / 周预判）——
  const order = ['today', 'day', 'week'];
  dashCards.innerHTML = order.map(hk => {
    const p = g.predictions[hk]; if (!p) return '';
    const pess = p.targets.pessimistic, base = p.targets.base, opt = p.targets.optimistic;
    const d = dirCls(p.direction);
    const dc = (lab, px, rowCls) => {
      const pc = pctOf(px);
      const c = cls(pc);
      return `<div class="dc-row ${rowCls || c}"><span class="dc-lab">${lab}</span>` +
        `<span class="dc-val">${fmt(px)}</span>` +
        `<span class="dc-pct">${pc >= 0 ? '+' : ''}${fmt(pc)}%</span></div>`;
    };
    const wr = (typeof p.winRate === 'number') ? p.winRate
      : (p.direction === 'down' ? 100 - p.upProb : p.upProb);
    return `<div class="dash-card ${d}">
      <div class="dc-head"><span class="dc-h">${p.horizonLabel}</span><span class="dc-badge ${d}">${p.directionText}</span></div>
      ${dc('能跌到', pess, 'down')}
      ${dc('最可能', base, 'base')}
      ${dc('能涨到', opt, 'up')}
      <div class="dc-foot">预期 ${p.expectedReturnPct >= 0 ? '+' : ''}${fmt(p.expectedReturnPct)}% · 胜率 ${wr}%</div>
    </div>`;
  }).join('');

  // —— 走势图：实线历史 + 绿虚线最可能路径 + 阴影波动区间 ——
  if (!STATE.dashChart) STATE.dashChart = echarts.init(dashChart);
  const candles = (g.candles && g.candles.length) ? g.candles : [];
  const histDates = candles.map(c => c.date);
  const histCloses = candles.map(c => c.close);
  const n = histDates.length;
  const hk = STATE.horizon || 'today';
  const p = g.predictions[hk];
  const baseT = p.targets.base, pessT = p.targets.pessimistic, optT = p.targets.optimistic;

  // 未来延伸点数：今日=1，明日=1，周=5
  const steps = hk === 'week' ? 5 : 1;
  const fwdDates = [], fwdBase = [], fwdPess = [], fwdOpt = [];
  const lastDate = histDates[n - 1] || '';
  for (let i = 1; i <= steps; i++) {
    fwdDates.push(hk === 'week' ? ('T+' + i) : (hk === 'today' ? '今日预估' : '明日'));
    fwdBase.push(r2(last + (baseT - last) * i / steps));
    fwdPess.push(r2(last + (pessT - last) * i / steps));
    fwdOpt.push(r2(last + (optT - last) * i / steps));
  }
  const fullDates = histDates.concat(fwdDates);
  const nulls = () => fullDates.map(() => null);
  const baseData = nulls(); baseData[n - 1] = r2(last); fwdBase.forEach(v => baseData.push(v));
  const pessData = nulls(); pessData[n - 1] = r2(last); fwdPess.forEach(v => pessData.push(v));
  const optData = nulls(); optData[n - 1] = r2(last); fwdOpt.forEach(v => optData.push(v));
  // 阴影带：下轨透明打底 + 上轨(差值)堆叠填充
  const bandLow = pessData.map(v => v == null ? null : r2(v));
  const bandHi = optData.map((v, i) => (v == null || pessData[i] == null) ? null : r2(v - pessData[i]));

  const histData = nulls(); for (let i = 0; i < n; i++) histData[i] = histCloses[i];

  STATE.dashChart.setOption({
    backgroundColor: 'transparent', animation: false,
    grid: { left: 56, right: 16, top: 18, bottom: 28 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: '#ffffff', borderColor: '#c8d2e2', textStyle: { color: '#1b2433', fontSize: 11 } },
    legend: { data: ['历史收盘', '最可能路径', '波动区间'], top: 0, right: 8, textStyle: { color: '#6b7689', fontSize: 10 }, itemWidth: 14, itemHeight: 8 },
    xAxis: { type: 'category', data: fullDates, axisLine: { lineStyle: { color: '#c8d2e2' } }, axisLabel: { color: '#6b7689', fontSize: 9, formatter: (v) => v && v.length > 6 ? v.slice(5) : v } },
    yAxis: { scale: true, axisLine: { lineStyle: { color: '#c8d2e2' } }, axisLabel: { color: '#6b7689', fontSize: 10 }, splitLine: { lineStyle: { color: '#eef2f8' } } },
    dataZoom: [{ type: 'inside', start: Math.max(0, 100 - Math.round(80 * n / fullDates.length)), end: 100 }],
    series: [
      { name: '波动区间', type: 'line', data: bandLow, stack: 'band', lineStyle: { opacity: 0 }, symbol: 'none', areaStyle: { opacity: 0 }, silent: true, z: 1 },
      { name: '波动区间', type: 'line', data: bandHi, stack: 'band', lineStyle: { opacity: 0 }, symbol: 'none', areaStyle: { color: 'rgba(231,185,78,.18)' }, silent: true, z: 1 },
      { name: '历史收盘', type: 'line', data: histData, smooth: false, showSymbol: false, lineStyle: { color: '#3b6fb0', width: 1.6 }, z: 3, markLine: { silent: true, symbol: 'none', lineStyle: { color: '#9aa3b8', type: 'dashed', width: 1 }, data: [{ yAxis: r2(last), label: { formatter: '现价 ' + fmt(last), color: '#6b7689', fontSize: 9, position: 'insideStartTop' } }] } },
      { name: '最可能路径', type: 'line', data: baseData, smooth: false, showSymbol: steps > 1, symbolSize: 5, lineStyle: { color: '#16a34a', width: 2, type: 'dashed' }, itemStyle: { color: '#16a34a' }, z: 4, markPoint: steps >= 1 ? { symbol: 'pin', symbolSize: 38, data: [{ coord: [fullDates[fullDates.length - 1], baseData[baseData.length - 1]], value: fmt(baseT), itemStyle: { color: '#16a34a' }, label: { color: '#fff', fontSize: 9 } }] } : undefined },
    ],
  }, true);

  // —— 人话结论 ——
  const width = optT - pessT;
  const halfPct = width / 2 / last * 100;
  const wr = (typeof p.winRate === 'number') ? p.winRate
    : (p.direction === 'down' ? 100 - p.upProb : p.upProb);
  dashSummary.innerHTML =
    `<b>${p.horizonLabel}研判：</b>现价 <b>${fmt(last)}</b>，这一轮真实能摸到的区间在 ` +
    `<b class="down">${fmt(pessT)}</b> 到 <b class="up">${fmt(optT)}</b> 之间（窗口约 ±${fmt(halfPct)}%）。` +
    `最可能的落点是 <b>${fmt(baseT)}</b>（预期 ${p.expectedReturnPct >= 0 ? '+' : ''}${fmt(p.expectedReturnPct)}%，胜率 ${wr}%）。` +
    `<br><span class="ds-tip">💡 别只记「${p.directionText}」——三档价之间的幅度，才是这一波真金白银能吃到 / 要扛住的肉。绿虚线是最可能走法，阴影是正常波动带，破带就要重新看。</span>`;
}

/* ---------- 风控方案 ---------- */
function computeRisk(asset, signals, pred, capital, riskPct) {
  const entry = asset.last;
  const sr = signals.supportResistance || {};
  const atrPct = (signals.volatility && signals.volatility.atrPct) || 1.2;
  const atr = entry * atrPct / 100;
  const tp = pred.targets;
  const tpArr = [
    { l: '一档(保)', p: r2(tp.pessimistic), pc: r2((tp.pessimistic - entry) / entry * 100) },
    { l: '二档(基准)', p: r2(tp.base), pc: r2((tp.base - entry) / entry * 100) },
    { l: '三档(乐观)', p: r2(tp.optimistic), pc: r2((tp.optimistic - entry) / entry * 100) },
  ];
  // 【2026-10-13 根因修复】与后端 computeRiskPlan 同源：flat（震荡）必须观望，不能当多。
  // 旧代码 `isLong = pred.direction !== 'down'` 会把「震荡」渲染成「做多、满仓」，与研判自相矛盾。
  const dir3 = pred.direction;
  if (dir3 !== 'up' && dir3 !== 'down') {
    return {
      entry: r2(entry), dir: '观望', stop: null, stopPct: null,
      riskAmount: 0, positionValue: 0, positionPct: 0, units: 0,
      tp: [], watching: true,
      batches: ['震荡行情不建仓：方向未明时进场，涨跌都容易被来回扫',
                '等价格放量突破区间上沿（跟多）或跌穿下沿（跟空）再动手，宁可错过、不做错'],
    };
  }
  const isLong = dir3 === 'up';
  let stop, stopPct;
  if (isLong) { const a = entry - 1.5 * atr; stop = (sr.support && sr.support > a) ? sr.support : a; stopPct = (entry - stop) / entry * 100; }
  else { const a = entry + 1.5 * atr; stop = (sr.resistance && sr.resistance < a) ? sr.resistance : a; stopPct = (stop - entry) / entry * 100; }
  stopPct = Math.max(0.3, r2(stopPct));
  const riskAmount = capital * riskPct / 100;
  let positionValue = Math.min(riskAmount / (stopPct / 100), capital);
  const positionPct = r1(positionValue / capital * 100);
  const units = r1(positionValue / entry);
  return {
    entry: r2(entry), dir: isLong ? '多' : '空', stop: r2(stop), stopPct,
    riskAmount: Math.round(riskAmount), positionValue: Math.round(positionValue), positionPct, units,
    tp: tpArr, watching: false,
    batches: isLong ? ['现价建 50%，回落至支撑区补 50%', '跌破止损价全平，不补'] : ['现价建 50%，反弹至阻力区补 50%', '突破止损价全平，不补'],
  };
}

function renderRisk() {
  if (!STATE.data) return;
  const g = STATE.data;
  const capital = +document.getElementById('capital').value || 100000;
  const riskPct = +document.getElementById('riskPct').value || 3;
  const rp = computeRisk(g, g.signals, g.predictions[STATE.horizon], capital, riskPct);
  const grid = document.getElementById('riskGrid');
  const dash = '—';
  const dirCls = rp.watching ? '' : (rp.dir === '多' ? 'up' : 'down');
  grid.innerHTML = `
    <div class="rk"><div class="rk-lab">建议方向<small>买涨或买跌</small></div><div class="rk-val ${dirCls}">${rp.dir}</div></div>
    <div class="rk"><div class="rk-lab">建议买入价<small>参考成交价</small></div><div class="rk-val">${rp.watching ? dash : fmt(rp.entry)}</div></div>
    <div class="rk"><div class="rk-lab">止损价<small>跌到这必须卖</small></div><div class="rk-val down">${rp.stop == null ? dash : fmt(rp.stop)}</div></div>
    <div class="rk"><div class="rk-lab">止损幅度<small>最多亏这么%</small></div><div class="rk-val">${rp.stopPct == null ? dash : fmt(rp.stopPct) + '%'}</div></div>
    <div class="rk"><div class="rk-lab">单笔风险额<small>这笔最多亏</small></div><div class="rk-val">¥${(rp.riskAmount || 0).toLocaleString()}</div></div>
    <div class="rk"><div class="rk-lab">建议投入<small>建议买多少</small></div><div class="rk-val">¥${(rp.positionValue || 0).toLocaleString()}</div></div>
    <div class="rk"><div class="rk-lab">占本金<small>占总钱比例</small></div><div class="rk-val">${fmt(rp.positionPct)}%</div></div>
    <div class="rk"><div class="rk-lab">约可买<small>盎司单位</small></div><div class="rk-val">${rp.watching ? dash : fmt(rp.units)}</div></div>
    <div class="rk-note"><b>分批节奏：</b><ul>${rp.batches.map(b => `<li>${b}</li>`).join('')}</ul>
      ${(rp.tp && rp.tp.length) ? `<b>止盈三档：</b>${rp.tp.map(t => `${t.l} ${fmt(t.p)} (${t.pc >= 0 ? '+' : ''}${fmt(t.pc)}%)`).join(' ｜ ')}<br>` : ''}
      <span style="color:#c0392b">${rp.watching ? '当前为震荡研判：不提供方向性仓位，等方向明确再进场。' : '非杠杆方案，仓位价值已封顶为本金；'}仅供研究参考，不构成投资建议。</span></div>`;
}

/* ---------- 多周期共振 ---------- */
function renderResonance(g) {
  if (!g || !g.resonance) return;
  const r = g.resonance;
  const labelMap = { up: '看多', down: '看空', flat: '震荡' };
  const clsMap = { up: 'up', down: 'down', flat: '' };
  document.getElementById('rcDirs').innerHTML = [['日', r.dirs[0]], ['周', r.dirs[1]], ['月', r.dirs[2]]]
    .map(([lab, d]) => `<span class="rc-dir ${clsMap[d]}">${lab} ${labelMap[d]}</span>`).join('');
  const rc = document.getElementById('rcText');
  rc.textContent = r.text + (r.boost > 0 ? `（置信度 +${Math.round(r.boost * 100)}%）` : '');
  rc.className = 'rc-text ' + (r.aligned ? 'rc-strong' : '');
}

/* ---------- 情景压力测试 ---------- */
function renderScenarios(g) {
  if (!g || !g.scenarios) return;
  const clsMap = { up: 'up', down: 'down' };
  document.getElementById('scenarioGrid').innerHTML = g.scenarios.map(s => `
    <div class="sc-card">
      <div class="sc-name">${s.name}</div>
      <div class="sc-dir ${clsMap[s.dir]}">${s.dir === 'up' ? '▲ 利好金价' : '▼ 利空金价'}</div>
      <div class="sc-impact ${clsMap[s.dir]}">${s.impactPct >= 0 ? '+' : ''}${s.impactPct}%</div>
      <div class="sc-target">推演价 ${fmt(s.target)}</div>
      <div class="sc-desc">${s.desc}</div>
    </div>`).join('');
}

/* ---------- 深度复盘 ---------- */
function renderReview(g) {
  if (!g || !g.review) return;
  const rv = g.review;
  document.getElementById('rvTech').textContent = rv.tech;
  document.getElementById('rvFund').textContent = rv.fundamental;
  document.getElementById('rvRisk').textContent = rv.risk;
  document.getElementById('rvAct').textContent = rv.action;
}

/* ---------- 学习进化 ---------- */
async function renderLearning() {
  const L = await fetchJSON('/api/learning');
  const st = L.state;
  const btTag = L.backtestTotal ? ` · 另有回测 ${L.backtestTotal}（不计战绩）` : '';
  document.getElementById('learnBadge').textContent = `真实样本 ${L.predsTotal} · 已评 ${L.evaluated}${btTag}`;
  const acc = st.accuracyByHorizon;
  document.getElementById('learnStats').innerHTML = `
    <div class="ls"><div class="ls-lab">综合命中率</div><div class="ls-val">${Math.round(st.overallAcc * 100)}%</div></div>
    <div class="ls"><div class="ls-lab">今日命中</div><div class="ls-val">${Math.round((acc.today || 0.5) * 100)}%</div></div>
    <div class="ls"><div class="ls-lab">明日命中</div><div class="ls-val">${Math.round(acc.day * 100)}%</div></div>
    <div class="ls"><div class="ls-lab">周命中</div><div class="ls-val">${Math.round(acc.week * 100)}%</div></div>
    <div class="ls"><div class="ls-lab">黄金命中</div><div class="ls-val">${Math.round(((st.overallAccByAsset && st.overallAccByAsset.gold) || st.overallAcc) * 100)}%</div></div>
    <div class="ls"><div class="ls-lab">白银命中</div><div class="ls-val">${Math.round(((st.overallAccByAsset && st.overallAccByAsset.silver) || st.overallAcc) * 100)}%</div></div>
    <div class="ls"><div class="ls-lab">偏差修正</div><div class="ls-val">${fmt(st.biasCorrection)}</div></div>`;

  // 权重条
  const w = st.weights;
  document.getElementById('weightBars').innerHTML = Object.keys(w).map(k =>
    `<div class="wb"><div class="wb-name">${nameMap(k)}</div><div class="wb-val">${fmt(w[k] * 100, 1)}%</div></div>`).join('');

  // 准确率曲线
  if (!STATE.learnChart) STATE.learnChart = echarts.init(document.getElementById('learnChart'));
  const log = st.log || [];
  STATE.learnChart.setOption({
    backgroundColor: 'transparent', animation: false,
    grid: { left: 38, right: 12, top: 14, bottom: 22 },
    tooltip: { trigger: 'axis', backgroundColor: '#ffffff', borderColor: '#c8d2e2', textStyle: { color: '#1b2433', fontSize: 11 } },
    xAxis: { type: 'category', data: log.map((_, i) => i + 1), axisLine: { lineStyle: { color: '#c8d2e2' } }, axisLabel: { color: '#6b7689', fontSize: 9 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#6b7689', fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e7ecf4' } } },
    series: [{ type: 'line', data: log.map(l => Math.round(l.overallAcc * 100)), smooth: true, showSymbol: false, lineStyle: { color: '#e7b94e', width: 2 }, areaStyle: { color: 'rgba(231,185,78,.18)' } }],
  }, true);
}

function nameMap(k) { return { trend: '趋势', momentum: '动量', meanReversion: '均值回归', macro: '宏观', intel: '情报·大脑' }[k] || k; }

/* ---------- 预测档案 ---------- */
/* ---------- 现货黄金/白银 人民币实时价（位于回收价之上） ---------- */
function renderSpotCny(g, s) {
  const grid = document.getElementById('scGrid');
  const ph = document.getElementById('phSpotCny');
  const badge = document.getElementById('scBadge');
  if (!grid) return;
  if (!g || !s || !g.spotCny || !s.spotCny) { if (ph) ph.style.display = ''; grid.innerHTML = ''; return; }
  if (ph) ph.style.display = 'none';

  // 国内基准（上金所）与「国际价×汇率」是两个口径：国内价通常含溢价（金=进口溢价，银溢价更大）。
  // 把两个口径并排亮出来 + 标注价差，消除「回收价怎么比现货还高」的误解——回收价按国内基准打折，本来就该跟国内基准比。
  const domRow = (cnyPerGram, bb, isGold) => {
    if (!bb || !bb.available || !bb.basis) return '';
    const price = isGold ? bb.basis.goldPrice : bb.basis.silverPrice;
    const src = ((isGold ? bb.basis.goldSource : bb.basis.silverSource) || '上金所国内基准').replace(/（.*?）/g, '');
    if (!(price > 0)) return '';
    const diff = price - cnyPerGram;
    const dir = diff >= 0 ? 'up' : 'down';
    const dirTxt = diff >= 0 ? '高' : '低';
    return `<div class="sc-dom">国内基准 ${src} <b>${fmt(price, 2)}</b> 元/克 · 比国际换算价<span class="${dir}">${dirTxt} ${fmt(Math.abs(diff), 2)}</span><small>国内价含溢价属正常 · 下方回收价按国内基准打折</small></div>`;
  };

  const items = [
    { icon: '🥇', name: '现货黄金', gold: true,  c: g.spotCny, usd: g.spot, src: g.spotSource, dom: domRow(g.spotCny.cnyPerGram, g.buyback, true) },
    { icon: '🥈', name: '现货白银', gold: false, c: s.spotCny, usd: s.spot, src: s.spotSource, dom: domRow(s.spotCny.cnyPerGram, s.buyback, false) },
  ];
  grid.innerHTML = items.map(it => `
    <div class="sc-card ${it.gold ? '' : 'ag'}">
      <div class="sc-card-h">${it.icon} ${it.name} · 人民币实时价</div>
      <div class="sc-price">¥${fmt(it.c.cnyPerGram, 2)}<span class="sc-unit">元/克</span></div>
      <div class="sc-sub">≈ ¥${fmt(it.c.cnyPerOz, 2)} /盎司 · 国际价 $${fmt(it.usd, 2)}</div>
      ${it.dom}
      <div class="sc-meta"><span>汇率 USD/CNY ${fmt(it.c.rate, 4)}</span><span>源 ${it.src || '实时'}</span></div>
    </div>`).join('');
  if (badge) badge.textContent = '60秒自动刷新 · ' + new Date().toLocaleTimeString('zh-CN');
}

/* ---------- 金银二手回收参考（融通金体系） ---------- */
function renderBuyback(g, s) {
  const bbAu = g.buyback, bbAg = s ? s.buyback : null;
  const auP = document.getElementById('bbAuPrice'), auM = document.getElementById('bbAuMeta');
  const agP = document.getElementById('bbAgPrice'), agM = document.getElementById('bbAgMeta');
  const auT = document.getElementById('bbAuTable'), agT = document.getElementById('bbAgTable');
  const auA = document.getElementById('bbAuAdvice'), agA = document.getElementById('bbAgAdvice');
  const honest = document.getElementById('bbHonest');
  const ph = document.getElementById('phBuyback');
  if (!auP) return;

  const tierRows = (tiers) => tiers.map(t => `
    <tr><td class="bt-td-name">${t.name}<small>${t.note}</small></td>
    <td class="bt-td-range"><b>${t.low} ~ ${t.high}</b></td></tr>`).join('');

  if (bbAu && bbAu.available && bbAu.gold) {
    const b = bbAu.basis;
    auP.textContent = fmt(b.goldPrice, 2);
    auM.innerHTML = `${b.goldSource} · ${b.date} ${b.time}` + (b.marketOpen ? ' · 交易中' : ' · 休市中(最近收盘)') + (bbAu.ldnGoldRef ? ` · 伦敦金换算 ${fmt(bbAu.ldnGoldRef, 1)} 元/克` : '');
    auT.innerHTML = `<tr class="bb-thead"><td>品种</td><td>回收价区间</td></tr>` + tierRows(bbAu.gold.tiers);
    const ad = bbAu.gold.advice;
    auA.innerHTML = ad ? `<div class="bb-stance">🧑‍⚖️ <b>${ad.stance}</b></div>` + ad.points.map(p => `<div class="bb-point">· ${p}</div>`).join('') : '';
  } else {
    auP.textContent = '—'; auM.textContent = '黄金行情源暂不可达';
    auT.innerHTML = ''; auA.innerHTML = '';
  }

  if (bbAg && bbAg.available && bbAg.silver) {
    const b = bbAg.basis;
    agP.textContent = fmt(b.silverPrice, 2);
    agM.innerHTML = `${b.silverSource} · ${b.date} ${b.time}` + (b.marketOpen ? ' · 交易中' : ' · 休市中(最近收盘)') + (bbAg.ldnSilverRef ? ` · 伦敦银换算 ${fmt(bbAg.ldnSilverRef, 2)} 元/克` : '');
    agT.innerHTML = `<tr class="bb-thead"><td>品种</td><td>回收价区间</td></tr>` + tierRows(bbAg.silver.tiers);
    const ad = bbAg.silver.advice;
    agA.innerHTML = ad ? `<div class="bb-stance">🧑‍⚖️ <b>${ad.stance}</b></div>` + ad.points.map(p => `<div class="bb-point">· ${p}</div>`).join('') : '';
  } else {
    agP.textContent = '—'; agM.textContent = '白银行情源暂不可达';
    agT.innerHTML = ''; agA.innerHTML = '';
  }

  if (honest) honest.textContent = (bbAu && bbAu.available) ? 'ℹ ' + bbAu.honest + '；实际成交以回收平台当面实报价为准' : '';
}

/* ---------- 专业分析工具箱（评级/情绪/警报/事件） ---------- */
const RATING_COLOR = { strongBuy: '#e23b3b', buy: '#e07b54', neutral: '#6b7689', sell: '#3a9d6b', strongSell: '#16a34a' };
async function fetchServerAlerts() {
  try { const r = await fetchJSON('/api/alerts'); return (r && r.alerts) || []; } catch (_) { return []; }
}
async function migrateLocalAlerts() {
  // 旧版本警报存 localStorage，首次升级自动迁移到服务端（后台常驻检查）
  try {
    const local = JSON.parse(localStorage.getItem('bullion_alerts') || '[]');
    const live = local.filter(a => a && !a.hit && a.price > 0);
    if (!live.length) { localStorage.removeItem('bullion_alerts'); return; }
    const server = await fetchServerAlerts();
    for (const a of live) {
      if (server.some(s => s.asset === a.asset && s.price === a.price && !s.hit)) continue;
      await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset: a.asset, price: a.price }) }).catch(() => {});
    }
    localStorage.removeItem('bullion_alerts');
  } catch (_) {}
}
function renderToolbox(cur, gold, silver) {
  const r = cur.technicalRating;
  const gauge = document.getElementById('tbGauge'), sub = document.getElementById('tbGaugeSub');
  const bull = document.getElementById('tbBull'), neut = document.getElementById('tbNeut'), bear = document.getElementById('tbBear'), lab = document.getElementById('tbBarLab');
  const votes = document.getElementById('tbVotes'), events = document.getElementById('eventList');
  if (!gauge) return;
  if (r) {
    gauge.textContent = r.ratingLabel;
    gauge.style.color = RATING_COLOR[r.rating] || '#1b2433';
    sub.textContent = `${cur.name} · ${r.total} 项指标投票 · 综合得分 ${r.score > 0 ? '+' : ''}${r.score}`;
    const b = r.total ? r.bull / r.total * 100 : 33, n = r.total ? r.neutral / r.total * 100 : 34, be = 100 - b - n;
    bull.style.width = b + '%'; neut.style.width = n + '%'; bear.style.width = be + '%';
    lab.textContent = `看多 ${r.bull} 票 · 中性 ${r.neutral} 票 · 看空 ${r.bear} 票`;
    votes.innerHTML = `<tr class="bb-thead"><td>指标</td><td>信号</td><td>说明</td></tr>` +
      r.votes.map(v => `<tr><td class="bt-td-name">${v.name}</td><td class="tb-vote ${v.dir === 1 ? 'up' : v.dir === -1 ? 'dn' : 'nt'}">${v.dir === 1 ? '▲ 看多' : v.dir === -1 ? '▼ 看空' : '— 中性'}</td><td class="tb-td-detail">${v.detail || ''}</td></tr>`).join('');
  }
  if (events) events.innerHTML = (cur.keyEvents || []).map(e => `<div class="tb-event"><b class="tb-impact ${e.impact === '极高' ? 'hi' : e.impact === '高' ? 'mid' : ''}">${e.impact}</b><span class="tb-ev-name">${e.name}</span><span class="tb-ev-when">${e.when}</span><span class="tb-ev-note">${e.note}</span></div>`).join('');
  renderBigData(cur);
  renderAlerts(gold, silver);
}

/* ---------- 大数据依据（免费公开源：COMEX持仓 + 财经日历） ---------- */
function renderBigData(cur) {
  const box = document.getElementById('bigDataList');
  if (!box) return;
  const bd = cur && cur.bigData;
  if (!bd || !bd.available) {
    box.innerHTML = '<div class="tb-empty">大数据源暂不可用（已自动降级，不影响研判）。</div>';
    return;
  }
  let html = '';
  const p = bd.positioning;
  if (p) {
    const dirCls = p.signal === 'bullish' ? 'up' : p.signal === 'bearish' ? 'down' : 'flat';
    const dirTxt = p.signal === 'bullish' ? '聪明钱增持 · 偏多' : p.signal === 'bearish' ? '聪明钱减持 · 偏空' : '持仓中性';
    // 迷你走势：用净头寸序列画 sparkline
    const ser = (p.series || []).map(x => x.ton);
    let spark = '';
    if (ser.length >= 2) {
      const mn = Math.min.apply(null, ser), mx = Math.max.apply(null, ser), rg = (mx - mn) || 1;
      const pts = ser.map((v, i) => `${(i / (ser.length - 1) * 100).toFixed(1)},${(28 - (v - mn) / rg * 24).toFixed(1)}`).join(' ');
      spark = `<svg class="bd-spark" viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${p.signal === 'bullish' ? '#e23b3b' : p.signal === 'bearish' ? '#16a34a' : '#8a94a6'}" stroke-width="2"/></svg>`;
    }
    html += `<div class="bd-card ${dirCls}">
      <div class="bd-h"><span class="bd-tag">COMEX 持仓净头寸</span><span class="bd-sig ${dirCls}">${dirTxt}</span></div>
      <div class="bd-num">${fmt(p.netTon, 1)} 吨</div>
      <div class="bd-sub">近${p.basis === '周' ? '一周' : '一日'}${p.winChangeTon >= 0 ? '+' : ''}${fmt(p.winChangeTon, 1)} 吨 · 数据日 ${p.date}</div>
      ${spark}
    </div>`;
  }
  if (bd.nextHighImpact) {
    const e = bd.nextHighImpact;
    html += `<div class="bd-card flat">
      <div class="bd-h"><span class="bd-tag">最近重要事件</span><span class="bd-sig flat">${e.date}</span></div>
      <div class="bd-num bd-evt">${e.name}</div>
      <div class="bd-sub">未来14天共 ${bd.events.length} 个金银相关宏观事件</div>
    </div>`;
  }
  box.innerHTML = html || '<div class="tb-empty">暂无可用大数据。</div>';
}
async function renderAlerts(g, s) {
  const list = document.getElementById('alertList');
  if (!list) return;
  const alerts = await fetchServerAlerts();
  if (!alerts.length) { list.innerHTML = '<div class="tb-empty">暂无警报。设置目标价后，后台自动驾驶每 5 分钟自动检查（页面关了也照常盯），到达即记录并可推送。</div>'; return; }
  list.innerHTML = alerts.map((a, i) => {
    const cur = a.asset === 'silver' ? (s && s.spot) : (g && g.spot);
    return `<div class="tb-alert ${a.hit ? 'hit' : ''}"><span class="tb-alert-name">${a.asset === 'silver' ? '🥈 白银' : '🥇 黄金'}</span><span class="tb-alert-target">${a.dir === 'up' ? '≥' : '≤'} ${a.price}</span><span class="tb-alert-cur">现价 ${cur != null ? fmt(cur, 2) : '—'}</span><span class="tb-alert-status">${a.hit ? '🔔 已触发' + (a.hitPrice ? ' @' + fmt(a.hitPrice, 2) : '') : '后台盯盘中'}</span><button class="tb-alert-del" data-id="${a.id}">删</button></div>`;
  }).join('');
  list.querySelectorAll('.tb-alert-del').forEach(b => b.addEventListener('click', async () => {
    await fetch('/api/alerts?id=' + b.dataset.id, { method: 'DELETE' }).catch(() => {});
    renderAlerts(STATE.gold || STATE.data, STATE.silver);
  }));
}
let apNotified = 0; // 已通知过的触发警报条数
async function renderAutoPilot() {
  const bar = document.getElementById('apBar'), txt = document.getElementById('apText');
  if (!bar || !txt) return;
  let ap = null;
  try { ap = await fetchJSON('/api/auto-pilot'); } catch (_) {}
  if (!ap) { txt.textContent = 'L3 自动驾驶状态获取失败（后台仍在运行）'; return; }
  const t = ap.lastRunAt ? new Date(ap.lastRunAt).toLocaleTimeString('zh-CN', { hour12: false }) : '—';
  const g = ap.latest && ap.latest.gold, s = ap.latest && ap.latest.silver;
  const parts = [`L3 自动驾驶运行中 · 已自动研判 ${ap.runs} 轮 · 上轮 ${t}`];
  if (g && g.today && s && s.today) parts.push(`金${g.today.dir}${g.today.exp >= 0 ? '+' : ''}${g.today.exp}% / 银${s.today.dir}${s.today.exp >= 0 ? '+' : ''}${s.today.exp}%`);
  const an = (ap.anomalies || []).length, at = (ap.alertsTriggered || []).length;
  if (an) parts.push(`⚠ 异动 ${an} 条`);
  if (ap.activeAlerts) parts.push(`🔔 盯盘警报 ${ap.activeAlerts} 条`);
  if (ap.lastRunError) parts.push('<span class="warn">部分源异常已自动降级</span>');
  txt.innerHTML = parts.join(' · ');
  const triggered = ap.alertsTriggered || [];
  for (let i = apNotified; i < triggered.length; i++) toast('🔔 ' + triggered[i].msg);
  apNotified = Math.max(apNotified, triggered.length);
  if (triggered.length) renderAlerts(STATE.gold || STATE.data, STATE.silver);
}

/* ---------- 预判复盘·命中率 ---------- */
async function renderAccuracy() {
  let R;
  try { R = await fetchJSON('/api/forecast-review'); } catch (_) { return; }
  const sum = R.summary || {};
  const pct = x => Math.round((x || 0) * 100);
  const badge = document.getElementById('accBadge');
  if (badge) badge.textContent = `真实样本 ${sum.evaluated || 0} · 待评 ${sum.pending || 0}` + (sum.backtestCount ? `（另有回测 ${sum.backtestCount}，不计战绩）` : '');
  const wrap = document.getElementById('accSummary');
  if (wrap) {
    const card = (lab, val, sub) => `<div class="acc-card"><div class="acc-lab">${lab}</div><div class="acc-big">${val}</div>${sub ? `<div class="acc-sub">${sub}</div>` : ''}</div>`;
    const hz = sum.byHorizon || {}, byA = sum.byAsset || {};
    const show = c => (c && c.count) ? pct(c.acc) + '%' : '—';
    wrap.innerHTML =
      card('综合命中率', pct(sum.overallAcc) + '%', `真实样本 ${sum.evaluated || 0}`) +
      card('今日命中', show(hz.today), '当日') +
      card('明日命中', show(hz.day), '次日') +
      card('周预判命中', show(hz.week), '约5日') +
      card('黄金命中', show(byA.gold), '金品种') +
      card('白银命中', show(byA.silver), '银品种');
  }
  const tbl = document.getElementById('accTable');
  if (!tbl) return;
  const rows = R.records || [];
  if (!rows.length) { tbl.innerHTML = '<div style="color:#6b7689;padding:12px">暂无留档。系统每天每品种每周期自动留档一条预判，到期后拿真实行情比对，结果会显示在这里。</div>'; return; }
  const body = rows.map(r => {
    const dirTxt = r.directionText || (r.direction === 'up' ? '看多' : r.direction === 'down' ? '看空' : '震荡');
    const dirCls = r.direction === 'up' ? 'up' : r.direction === 'down' ? 'down' : '';
    const tr = r.targetRange ? `${fmt(r.targetRange.pessimistic)}~${fmt(r.targetRange.optimistic)}` : '—';
    let result;
    if (!r.evaluated) result = '<span class="acc-pill pend">⏳ 待到期</span>';
    else if (r.hit) result = '<span class="acc-pill hit">✓ 命中</span>';
    else result = '<span class="acc-pill miss">✗ 未中</span>';
    const predRet = (r.predictedReturnPct >= 0 ? '+' : '') + fmt(r.predictedReturnPct);
    const actRet = r.evaluated ? ((r.actualReturnPct >= 0 ? '+' : '') + fmt(r.actualReturnPct)) : '—';
    const actPx = r.evaluated ? fmt(r.actualPrice) : '—';
    const err = r.evaluated ? ((r.errorPct >= 0 ? '+' : '') + fmt(r.errorPct) + '%') : '—';
    return `<tr>
      <td>${r.date}</td>
      <td>${r.assetKey === 'gold' ? '🥇 黄金' : '🥈 白银'}</td>
      <td>${r.horizonLabel || (r.horizon === 'today' ? '今日' : r.horizon === 'day' ? '明日' : '周')}</td>
      <td><span class="${dirCls}">${dirTxt}</span> <span class="acc-range">[${tr}]</span></td>
      <td class="${cls(r.predictedReturnPct)}">${predRet}%</td>
      <td class="${r.evaluated ? cls(r.actualReturnPct) : ''}">${actRet}%</td>
      <td>${actPx}</td>
      <td>${result}</td>
      <td>${err}</td>
    </tr>`;
  }).join('');
  tbl.innerHTML = `<table><thead><tr><th>日期</th><th>品种</th><th>周期</th><th>我的预判(方向·区间)</th><th>预测收益</th><th>实际收益</th><th>实际价</th><th>结果</th><th>误差</th></tr></thead><tbody>${body}</tbody></table>`;
}

/* ---------- L3 大脑 · 情报中台（主页不展示，状态在运营后台；脑作为第 5 路信号参与研判） ---------- */
function fmtClock(iso) {
  if (!iso) return '—';
  const d = new Date(iso); if (isNaN(d)) return '—';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- 交互 ---------- */
function bindEvents() {
  document.getElementById('assetToggle').addEventListener('click', e => {
    const b = e.target.closest('.at-btn'); if (!b) return;
    document.querySelectorAll('.at-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); STATE.asset = b.dataset.asset;
    STATE.data = STATE.asset === 'silver' ? STATE.silver : STATE.gold;
    renderChart(STATE.data); renderCard(); renderRisk();
    renderResonance(STATE.data); renderScenarios(STATE.data); renderReview(STATE.data);
    renderToolbox(STATE.data, STATE.gold, STATE.silver); renderDashboard();
  });
  document.getElementById('btnRefresh').addEventListener('click', async () => {
    const btn = document.getElementById('btnRefresh');
    btn.disabled = true; btn.textContent = '⟳ 刷新中…';
    try {
      await reload(false);
      toast('已刷新 · 最新行情与回收价');
    } finally {
      btn.disabled = false; btn.textContent = '⟳ 刷新';
    }
  });
  document.getElementById('btnAddAlert').addEventListener('click', async () => {
    const price = parseFloat(document.getElementById('alertPrice').value);
    const asset = document.getElementById('alertAsset').value;
    const cur = asset === 'silver' ? (STATE.silver && STATE.silver.spot) : (STATE.gold || STATE.data)?.spot;
    if (!(price > 0)) { toast('请输入有效的目标价', true); return; }
    if (!cur) { toast('请等自动研判接入行情后再设警报', true); return; }
    try {
      const r = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset, price }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || '保存失败');
      document.getElementById('alertPrice').value = '';
      renderAlerts(STATE.gold || STATE.data, STATE.silver);
      toast(j.dup ? '该警报已存在，无需重复添加' : `警报已设：${asset === 'silver' ? '白银' : '黄金'} ${price >= cur ? '涨到' : '跌到'} ${price} 时提醒（后台常驻盯盘，页面关了也生效）`);
    } catch (e) { toast('警报保存失败：' + e.message, true); }
  });
  document.getElementById('horizonTabs').addEventListener('click', e => {
    const b = e.target.closest('.hz-btn'); if (!b) return;
    document.querySelectorAll('.hz-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); STATE.horizon = b.dataset.h;
    renderCard(); renderRisk(); renderDashboard();
  });
  document.getElementById('periodSwitch').addEventListener('click', e => {
    const b = e.target.closest('.ps-btn'); if (!b) return;
    document.querySelectorAll('.ps-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); STATE.chartPeriod = b.dataset.period;
    renderChart(STATE.data, STATE.chartPeriod);
  });
  document.getElementById('btnRisk').addEventListener('click', renderRisk);
  document.getElementById('btnLearn').addEventListener('click', async () => {
    toast('正在用真实价比对到期预判并更新权重…');
    const r = await fetchJSON('/api/learn');
    renderLearning(); renderAccuracy();
    toast(`学习完成 · 综合命中率 ${Math.round(r.state.overallAcc * 100)}%`);
  });
  document.getElementById('btnBootstrap').addEventListener('click', async () => {
    toast('回测初始化中（约120个交易日）…');
    const r = await fetchJSON('/api/bootstrap');
    if (r.ok) { await reload(false); toast(`回测完成 · 样本${r.samples} · 综合命中${Math.round(r.overallAcc * 100)}%`); }
    else toast(r.msg || '回测失败', true);
  });
  document.getElementById('btnPredict').addEventListener('click', () => {
    toast('正在重新研判（拉取最新行情）…');
    reload(true);
  });
  document.getElementById('btnAudit').addEventListener('click', openAudit);
  document.getElementById('auditClose').addEventListener('click', () => document.getElementById('auditModal').classList.remove('show'));
  document.getElementById('auditModal').addEventListener('click', e => { if (e.target.id === 'auditModal') e.currentTarget.classList.remove('show'); });

  // 账号：登录 / 注册面板（只问必要信息：用户名 + 密码，不要邮箱手机）
  const lockBtn = document.getElementById('lockBtn');
  const lockUser = document.getElementById('lockUser');
  const lockPass = document.getElementById('lockPass');
  if (lockBtn) lockBtn.addEventListener('click', submitAuth);
  [lockUser, lockPass].forEach(el => {
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
  });
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabReg');
  if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
  if (tabReg) tabReg.addEventListener('click', () => setAuthMode('register'));

  // 顶栏：退出登录（只撤当前会话）
  const ubLogout = document.getElementById('ubLogout');
  if (ubLogout) ubLogout.addEventListener('click', logout);

  // 管理员带 ?k= 口令直达：记住口令并清掉地址栏（口令只存活在本机浏览器）
  try {
    const urlK = new URLSearchParams(location.search).get('k');
    if (urlK) {
      ACCESS_KEY = urlK;
      try { localStorage.setItem('bk_key', urlK); } catch (_) {}
      const u = new URL(location.href);
      u.searchParams.delete('k');
      history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
    }
  } catch (_) {}

  // 试用 / 订阅：使用码提交 + 状态条按钮
  const pwBtn = document.getElementById('pwBtn');
  const pwCode = document.getElementById('pwCode');
  if (pwBtn) pwBtn.addEventListener('click', submitRedeem);
  if (pwCode) pwCode.addEventListener('keydown', e => { if (e.key === 'Enter') submitRedeem(); });
  const trialRedeem = document.getElementById('trialRedeem');
  if (trialRedeem) trialRedeem.addEventListener('click', () => showPaywall(null));
}

function tickClock() { const el = document.getElementById('updateTime'); if (el) el.textContent = '实时 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }); }

/* ---------- 访问监控（管理视图） ---------- */
async function openAudit() {
  const m = document.getElementById('auditModal');
  m.classList.add('show');
  document.getElementById('auditBody').innerHTML = '<div style="color:#6b7689;padding:20px;text-align:center">加载中…</div>';
  try {
    const L = await fetchJSON('/api/audit?d=' + encodeURIComponent(DEVICE_ID));
    const tsShort = t => (t || '').replace('T', ' ').slice(0, 16);
    const uaShort = u => {
      if (!u) return '未知';
      if (/iPhone|Android|Mobile/i.test(u)) return '手机端';
      if (/Macintosh|Windows|Linux/i.test(u)) return '电脑端';
      return '其他';
    };
    const alertHtml = L.alert ? `<div class="audit-alert">${L.alertMsg}</div>` : '<div class="audit-ok">✓ 目前仅在本设备/本 IP 登录，未发现明显分享</div>';
    const rows = L.recent.map(r => `<tr class="${r.isCurrent ? 'cur' : ''}">
      <td>${tsShort(r.ts)}</td><td>${r.ip}</td><td>${uaShort(r.ua)}</td>
      <td>${r.isCurrent ? '本机' : (r.deviceId || '').slice(0, 8)}</td></tr>`).join('');
    document.getElementById('auditBody').innerHTML = `
      <div class="audit-stats">
        <div class="as"><div class="as-lab">总登录</div><div class="as-val">${L.total}</div></div>
        <div class="as"><div class="as-lab">活跃设备</div><div class="as-val">${L.devices}</div></div>
        <div class="as"><div class="as-lab">活跃IP</div><div class="as-val">${L.ips}</div></div>
      </div>
      ${alertHtml}
      <div class="audit-tip">💡 出现陌生设备/IP 即代表密码已被分享。点顶部「⟳ 回测」旁的说明：重置密码（改密码）可让所有旧用户失效，分享者需重新向你索取。</div>
      <div class="audit-table-wrap"><table class="audit-table">
        <thead><tr><th>时间</th><th>IP</th><th>端</th><th>设备</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" style="color:#6b7689;text-align:center;padding:12px">暂无记录</td></tr>'}</tbody>
      </table></div>`;
  } catch (e) {
    document.getElementById('auditBody').innerHTML = '<div style="color:#c0392b;padding:20px;text-align:center">加载失败：' + e.message + '</div>';
  }
}

function toast(msg, isErr) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;bottom:18px;right:18px;background:#ffffff;border:1px solid #c8d2e2;color:#1b2433;padding:10px 16px;border-radius:10px;font-size:12px;z-index:99;box-shadow:0 6px 22px rgba(28,40,72,.18);transition:opacity .3s'; document.body.appendChild(t); }
  t.style.borderColor = isErr ? '#ef4444' : '#e7b94e';
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._t); t._t = setTimeout(() => t.style.opacity = '0', 2600);
}

window.addEventListener('resize', () => { if (STATE.chart) STATE.chart.resize(); if (STATE.learnChart) STATE.learnChart.resize(); if (STATE.dashChart) STATE.dashChart.resize(); });
init();
