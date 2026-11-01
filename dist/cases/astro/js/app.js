/* ============================================================
 * 海大叔·星语 · 应用逻辑 app.js
 * 纯前端 · 离线可用 · AI 用自带 Key（BYOK）
 * 数据来自 data/*.js（全局变量），不走 fetch，file:// 双击即用
 * ============================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var store = (typeof localStorage !== "undefined")
    ? localStorage
    : { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };

  /* ---------- 状态 ---------- */
  var state = { provider: "deepseek", key: "", unlocked: false, birth: null, calls: { date: "", n: 0 } };
  try { var s = JSON.parse(store.getItem("xy_state") || "{}"); if (s && typeof s === "object") state = Object.assign(state, s); } catch (e) {}
  function saveState() { try { store.setItem("xy_state", JSON.stringify(state)); } catch (e) {} }

  /* ---------- AI 服务商（OpenAI 兼容） ---------- */
  var PROVIDERS = {
    deepseek: { url: "https://api.deepseek.com/chat/completions", model: "deepseek-chat" },
    qwen:     { url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" },
    glm:      { url: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4-air" },
    kimi:     { url: "https://api.moonshot.cn/v1/chat/completions", model: "moonshot-v1-8k" }
  };
  var SYS_PROMPT =
    "你是「星语」，一个温柔、懂塔罗与占星的陪伴者。请用朋友聊天的口吻：温暖、不恐吓、不宿命论；" +
    "把解读落在「自我觉察、心理投射、可能性与正向引导」上；每条结尾给一个具体的「你可以…」小建议；" +
    "只给可能性与思考角度，不替用户下决定；不预测吉凶，不给医疗、投资、法律等专业建议；" +
    "不用「大凶/厄运」等词（改说「需要留意」）。结尾统一提示：仅供娱乐参考。用简体中文，口语化、简短。";

  /* ---------- 占星算法（离线简化近似，仅供娱乐） ---------- */
  function julianDay(y, m, d, h, mi) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    var day = d + ((h || 0) + (mi || 0) / 60) / 24;
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  }
  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function lonToSign(lam) {
    var names = ["白羊座","金牛座","双子座","巨蟹座","狮子座","处女座","天秤座","天蝎座","射手座","摩羯座","水瓶座","双鱼座"];
    var i = Math.floor(norm360(lam) / 30); if (i > 11) i = 11; if (i < 0) i = 0;
    return names[i];
  }
  function sunSign(m, d) {
    var s = [[1,20,"水瓶座"],[2,19,"双鱼座"],[3,21,"白羊座"],[4,20,"金牛座"],[5,21,"双子座"],
             [6,22,"巨蟹座"],[7,23,"狮子座"],[8,23,"处女座"],[9,23,"天秤座"],[10,24,"天蝎座"],
             [11,23,"射手座"],[12,22,"摩羯座"]];
    var sign = "摩羯座";
    for (var i = 0; i < s.length; i++) { if (m > s[i][0] || (m === s[i][0] && d >= s[i][1])) sign = s[i][2]; }
    return sign;
  }
  function sunLongitude(y, m, d) {
    var n = julianDay(y, m, d, 12, 0) - 2451545.0;
    var L = norm360(280.466 + 0.9856474 * n);
    var g = (357.529 + 0.98560028 * n) * Math.PI / 180;
    return norm360(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  }
  function moonSign(y, m, d) {
    var d0 = julianDay(y, m, d, 12, 0) - 2451545.0;
    var L = norm360(218.316 + 13.176396 * d0);
    var M = (134.963 + 13.064993 * d0) * Math.PI / 180;
    return lonToSign(L + 6.289 * Math.sin(M));
  }
  function moonLongitude(y, m, d) {
    var d0 = julianDay(y, m, d, 12, 0) - 2451545.0;
    var L = norm360(218.316 + 13.176396 * d0);
    var M = (134.963 + 13.064993 * d0) * Math.PI / 180;
    return norm360(L + 6.289 * Math.sin(M));
  }
  function rising(y, m, d, h, mi, lat, lon) {
    var jd = julianDay(y, m, d, h || 0, mi || 0);
    var T = (jd - 2451545) / 36525;
    var gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - (T * T * T) / 38710000);
    var lst = norm360(gmst + lon);
    var th = lst * Math.PI / 180, eps = 23.4393 * Math.PI / 180, phi = lat * Math.PI / 180;
    var asc = Math.atan2(-Math.cos(th), Math.sin(th) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
    var lam = norm360(asc * 180 / Math.PI);
    return { sign: lonToSign(lam), longitude: lam };
  }

  /* ---------- 抽牌 ---------- */
  function drawCards(count) {
    var pool = TAROT_CARDS.slice(), picked = [];
    for (var i = 0; i < count && pool.length; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      var card = pool.splice(idx, 1)[0];
      picked.push({ card: card, reversed: Math.random() < 0.5 });
    }
    return picked;
  }
  function builtinReading(spread, drawn) {
    var lines = [];
    lines.push("星语想轻轻对你说——「" + spread.name + "」"); 
    for (var i = 0; i < drawn.length; i++) {
      var p = spread.positions[i] || ("第" + (i + 1) + "张");
      var c = drawn[i];
      lines.push("【" + p + "】" + c.card.name + (c.reversed ? "（逆位）" : "（正位）") + "：" + (c.reversed ? c.card.reversed : c.card.upright));
    }
    lines.push("把这些话当成一面镜子照见自己，不代表命运注定。你可以挑最有感觉的那一句，今天去做一点点。仅供娱乐参考。");
    return lines.join("\n");
  }

  /* ---------- AI 调用 ---------- */
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function canCallAI() {
    if (!state.key) return { ok: false, msg: "还没填 AI 钥匙，先在设置里填上，或先用内置内容。" };
    if (state.calls.date !== todayKey()) { state.calls.date = todayKey(); state.calls.n = 0; }
    if (state.calls.n >= 50) return { ok: false, msg: "今天的 AI 解读次数到顶了（防刷额度），先用内置内容，明天再来。" };
    return { ok: true };
  }
  async function callAI(userText) {
    var p = PROVIDERS[state.provider] || PROVIDERS.deepseek;
    var res = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + state.key },
      body: JSON.stringify({ model: p.model, temperature: 0.85, messages: [{ role: "system", content: SYS_PROMPT }, { role: "user", content: userText }] })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    if (data && data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content;
    throw new Error("返回格式异常");
  }
  function bumpCall() { if (state.calls.date !== todayKey()) { state.calls.date = todayKey(); state.calls.n = 0; } state.calls.n++; saveState(); }

  /* ---------- 导航 ---------- */
  function showPage(p) {
    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove("show");
    var el = $("page-" + p); if (el) el.classList.add("show");
    var btns = document.querySelectorAll("#nav button");
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle("active", btns[j].getAttribute("data-page") === p);
    window.scrollTo(0, 0);
  }
  if (typeof window !== "undefined") window.showPage = showPage;

  /* ---------- 首页 ---------- */
  function renderHome() {
    var q = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];
    var el = $("home-quote"); if (el) el.textContent = "💫 " + q;
  }

  /* ---------- 塔罗 ---------- */
  var currentTarot = null, currentDrawn = null;
  function lockTag(spread) {
    return (!spread.free && !state.unlocked) ? '<span class="lock" title="付费解锁">🔒</span>' : "";
  }
  function renderSpreads() {
    var box = $("spread-list"); if (!box) return;
    box.innerHTML = SPREADS.map(function (s) {
      return '<div class="card" data-spread="' + s.id + '">' + lockTag(s) +
        '<div class="emoji">🃏</div><div class="t">' + s.name + (s.free ? "" : " · 付费") + '</div>' +
        '<div class="d">' + s.tip + '</div></div>';
    }).join("");
    box.querySelectorAll("[data-spread]").forEach(function (node) {
      node.addEventListener("click", function () {
        var s = SPREADS.find(function (x) { return x.id === node.getAttribute("data-spread"); });
        if (!s.free && !state.unlocked) { showPage("settings"); setTimeout(function(){ var a=$("activate-code"); if(a) a.focus(); },200); return; }
        currentTarot = s; renderTarotStage(s);
      });
    });
  }
  function renderTarotStage(s) {
    var stage = $("tarot-stage"); if (!stage) return;
    stage.innerHTML =
      '<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<div><b>' + s.name + '</b> <span class="muted">· ' + s.count + ' 张 · ' + s.tip + '</span></div>' +
      '<div><button class="btn" id="btn-draw">🎴 开始抽牌</button> ' +
      '<button class="btn ghost small" id="btn-back-spread">换个牌阵</button></div></div>' +
      '<div id="draw-out"></div></div>';
    $("btn-draw").addEventListener("click", function () { doDraw(s); });
    $("btn-back-spread").addEventListener("click", function () { stage.innerHTML = ""; });
  }
  function cardHTML(card, reversed, pos) {
    return '<div class="tcard' + (reversed ? " rev" : "") + '">' +
      '<div class="face">' + (reversed ? "🙃" : "🃏") + '</div>' +
      '<div class="nm">' + card.name + '</div>' +
      '<div class="pos">' + (pos || "") + '</div>' +
      '<div class="ori">' + (reversed ? "逆位" : "正位") + '</div></div>';
  }
  function doDraw(s) {
    var drawn = drawCards(s.count); currentDrawn = { s: s, drawn: drawn };
    var out = $("draw-out"); if (!out) return;
    var html = '<div class="tarot-grid">';
    for (var i = 0; i < drawn.length; i++) html += cardHTML(drawn[i].card, drawn[i].reversed, s.positions[i] || ("第" + (i + 1) + "张"));
    html += '</div>';
    html += '<div class="reading" id="reading-basic"></div>';
    html += '<div style="margin-top:10px"><button class="btn" id="btn-deep">✨ 让星语深度解读</button> ' +
            '<button class="btn ghost small" id="btn-redraw">🔁 再抽一次</button></div>';
    out.innerHTML = html;
    renderBasicReading();
    $("btn-redraw").addEventListener("click", function () { doDraw(s); });
    $("btn-deep").addEventListener("click", function () { deepRead(); });
  }
  function renderBasicReading() {
    var box = $("reading-basic"); if (!box || !currentDrawn) return;
    var text = builtinReading(currentDrawn.s, currentDrawn.drawn).split("\n").map(function (l) { return '<div class="block">' + l + '</div>'; }).join("");
    box.innerHTML = '<p class="muted" style="margin:6px 0">内置解读（离线可用）：</p>' + text;
  }
  async function deepRead() {
    var box = $("reading-basic"); if (!box) return;
    var guard = canCallAI();
    if (!guard.ok) { box.innerHTML = '<div class="notice">' + guard.msg + '</div>' + '<p class="muted">（可先用上面的内置解读）</p>'; return; }
    box.innerHTML = '<p class="muted">星语正在为你解读…</p>';
    var desc = currentDrawn.s.name + "：" + currentDrawn.drawn.map(function (p, i) {
      return (currentDrawn.s.positions[i] || "") + " " + p.card.name + (p.reversed ? "逆位" : "正位");
    }).join("；");
    try {
      var text = await callAI("请用塔罗" + currentDrawn.s.name + "帮我解读这次抽牌：\n" + desc +
        "\n请温柔地逐张点到为止，再给一段整体的话和一个「你可以…」的小建议。简短些。");
      bumpCall();
      box.innerHTML = '<p class="muted" style="margin:6px 0">星语的深度解读：</p>' +
        text.split(/\n+/).map(function (l) { return '<div class="block">' + l + '</div>'; }).join("");
    } catch (e) {
      box.innerHTML = '<div class="notice">AI 暂时连不上（' + e.message + '），先看内置解读吧：</div>' +
        builtinReading(currentDrawn.s, currentDrawn.drawn).split("\n").map(function (l) { return '<div class="block">' + l + '</div>'; }).join("");
    }
  }

  /* ---------- 运势 ---------- */
  var fortuneMode = "daily";
  function renderSigns() {
    var box = $("sign-list"); if (!box) return;
    box.innerHTML = ZODIAC_SIGNS.map(function (z) {
      var sym = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"][z.id - 1] || "✦";
      return '<div class="sign-cell" data-sign="' + z.id + '"><span class="sym">' + sym + '</span>' + z.name + '</div>';
    }).join("");
    box.querySelectorAll("[data-sign]").forEach(function (n) {
      n.addEventListener("click", function () {
        box.querySelectorAll(".sign-cell").forEach(function (c) { c.classList.remove("active"); });
        n.classList.add("active");
        renderFortune(parseInt(n.getAttribute("data-sign"), 10));
      });
    });
    var tg = $("fortune-toggle");
    if (tg) tg.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        tg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); fortuneMode = b.getAttribute("data-mode");
        var act = box.querySelector(".sign-cell.active"); if (act) renderFortune(parseInt(act.getAttribute("data-sign"), 10));
      });
    });
  }
  function renderFortune(id) {
    var z = ZODIAC_SIGNS.find(function (x) { return x.id === id; }); if (!z) return;
    var box = $("fortune-result"); if (!box) return;
    var d = z.daily, w = z.weekly;
    var isDaily = fortuneMode === "daily";
    var src = isDaily ? d : w;
    var head = z.name + " · " + (isDaily ? "今日运势" : "本周运势");
    var html = '<div class="panel"><h3 style="margin:0 0 4px">' + head + '</h3>' +
      '<div class="kv"><span class="chip">' + z.element + '象</span><span class="chip">守护星 ' + z.ruler + '</span>' +
      '<span class="chip">幸运色 ' + z.luckyColor + '</span><span class="chip">幸运数 ' + z.luckyNumber + '</span></div>' +
      '<div class="block"><b>整体：</b>' + src.summary + '</div>';
    if (isDaily) {
      html += '<div class="block"><b>爱情：</b>' + d.love + '</div>' +
              '<div class="block"><b>事业/学业：</b>' + d.career + '</div>' +
              '<div class="block"><b>健康：</b>' + d.health + '</div>';
    }
    html += '<div class="block"><b>星语小建议：</b>' + src.advice + '</div>';
    html += '<p class="muted" style="margin:6px 0">（离线内置示例 · 仅供娱乐参考）</p>';
    if (state.unlocked) {
      html += '<button class="btn small" id="btn-fortune-ai">✨ 让星语多说几句（AI）</button>';
    }
    html += '</div>';
    box.innerHTML = html;
    var b = $("btn-fortune-ai");
    if (b) b.addEventListener("click", async function () {
      var guard = canCallAI(); if (!guard.ok) { box.querySelector(".panel").insertAdjacentHTML("beforeend", '<div class="notice">' + guard.msg + '</div>'); return; }
      b.textContent = "星语思考中…"; b.disabled = true;
      try {
        var t = await callAI("请给「" + z.name + "」写一段" + (isDaily ? "今日" : "本周") + "的温和运势与建议，简短，结尾给一个「你可以…」。");
        bumpCall(); box.querySelector(".panel").insertAdjacentHTML("beforeend", '<div class="block"><b>星语补充：</b>' + t + '</div>');
      } catch (e) { box.querySelector(".panel").insertAdjacentHTML("beforeend", '<div class="notice">AI 连不上（' + e.message + '），先看内置的吧。</div>'); }
      b.disabled = false; b.textContent = "✨ 让星语多说几句（AI）";
    });
  }

  /* ---------- 星座档案 ---------- */
  function fillCities() {
    var sel = $("b-city"); if (!sel) return;
    sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join("");
    sel.value = "北京";
  }
  function wheelSVG(sun, moon, rise) {
    var pts = [{ l: sun.longitude, c: "#e0a83b", n: "太阳" }, { l: moon.longitude, c: "#7f9bb3", n: "月亮" }, { l: rise.longitude, c: "#c05a6e", n: "上升" }];
    var R = 110, cx = 130, cy = 130, ticks = "";
    var names = ["白羊","金牛","双子","巨蟹","狮子","处女","天秤","天蝎","射手","摩羯","水瓶","双鱼"];
    for (var i = 0; i < 12; i++) {
      var a = (i * 30) * Math.PI / 180;
      var x1 = cx + (R - 4) * Math.cos(a), y1 = cy + (R - 4) * Math.sin(a);
      var x2 = cx + (R + 8) * Math.cos(a), y2 = cy + (R + 8) * Math.sin(a);
      var lx = cx + (R + 22) * Math.cos(a), ly = cy + (R + 22) * Math.sin(a) + 4;
      ticks += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#d9c7b6"/>' +
               '<text x="' + lx + '" y="' + ly + '" font-size="11" fill="#8a7d74" text-anchor="middle">' + names[i] + '</text>';
    }
    var dots = "";
    pts.forEach(function (p) {
      var a = p.l * Math.PI / 180, x = cx + (R - 30) * Math.cos(a), y = cy + (R - 30) * Math.sin(a);
      dots += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + p.c + '" stroke="#fff" stroke-width="1.5"/>';
    });
    return '<div class="wheel"><svg width="260" height="260" viewBox="0 0 260 260">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#c9a86a"/>' + ticks + dots + '</svg></div>' +
      '<p class="muted" style="text-align:center">' +
      '<span style="color:#e0a83b">●</span> 太阳　<span style="color:#7f9bb3">●</span> 月亮　<span style="color:#c05a6e">●</span> 上升</p>';
  }
  function computeAstro() {
    var dv = $("b-date").value, tv = $("b-time").value || "12:00", cityName = $("b-city").value || "北京";
    if (!dv) { $("astro-result").innerHTML = '<div class="notice">先填一下出生日期哦。</div>'; return; }
    var parts = dv.split("-"), y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    var tp = tv.split(":"), h = parseInt(tp[0], 10) || 0, mi = parseInt(tp[1], 10) || 0;
    var city = CITIES.find(function (c) { return c.name === cityName; }) || CITIES[0];
    var sun = { sign: sunSign(m, d), longitude: sunLongitude(y, m, d) };
    var moon = { sign: moonSign(y, m, d), longitude: moonLongitude(y, m, d) };
    var rise = rising(y, m, d, h, mi, city.lat, city.lon);
    state.birth = { date: dv, time: tv, city: cityName }; saveState();
    var zfind = function (nm) { return ZODIAC_SIGNS.find(function (x) { return x.name === nm; }); };
    var zs = zfind(sun.sign);
    $("astro-result").innerHTML =
      '<div class="panel"><h3 style="margin:0 0 8px">你的三大关键星座</h3>' +
      '<div class="big3">' +
      '<div class="cell"><div class="lab">☀️ 太阳星座</div><div class="val">' + sun.sign + '</div></div>' +
      '<div class="cell"><div class="lab">🌙 月亮星座</div><div class="val">' + moon.sign + '</div></div>' +
      '<div class="cell"><div class="lab">⬆️ 上升星座</div><div class="val">' + rise.sign + '</div></div>' +
      '</div>' + wheelSVG(sun, moon, rise) +
      '<div class="block"><b>太阳·' + sun.sign + '：</b>你的核心底色——' + (zs ? zs.traits.join("、") + "，" : "") + '大致是「' + (zs ? zs.daily.summary : "") + '」</div>' +
      '<div class="block"><b>月亮·' + moon.sign + '：</b>情绪与安全感的方向，独处时你更像这一面。</div>' +
      '<div class="block"><b>上升·' + rise.sign + '：</b>别人第一眼感觉到的你，也是你的"门面气质"。</div>' +
      '<p class="muted">说明：太阳星座按生日精确判定；月亮与上升为<b>离线简化估算</b>（尤其靠近星座交界或出生地经纬度偏差时可能有出入），仅供参考娱乐。想看更准的，可用精确出生时间与地点。</p></div>';
  }

  /* ---------- 牌义库 ---------- */
  function renderLibrary(filter, q) {
    var box = $("lib-list"); if (!box) return;
    var list = TAROT_CARDS.filter(function (c) {
      if (filter === "major") { if (c.arcana !== "major") return false; }
      else if (filter !== "all") { if (c.suit !== filter) return false; }
      if (q) { var s = (c.name + " " + c.nameEn + " " + (c.keywords || []).join(" ") + " " + c.brief).toLowerCase(); if (s.indexOf(q.toLowerCase()) < 0) return false; }
      return true;
    });
    box.innerHTML = list.map(function (c) {
      return '<div class="lib-item" data-card="' + c.id + '"><span><b>' + c.name + '</b> <span class="arc">' + c.nameEn + '</span></span>' +
        '<span class="arc">' + (c.arcana === "major" ? "大阿尔卡那" : c.suit) + '</span></div>';
    }).join("") || '<p class="muted">没找到相关的牌。</p>';
    box.querySelectorAll("[data-card]").forEach(function (n) {
      n.addEventListener("click", function () { showCardDetail(TAROT_CARDS.find(function (x) { return x.id === parseInt(n.getAttribute("data-card"), 10); })); });
    });
  }
  function showCardDetail(c) {
    var box = $("lib-detail"); if (!box || !c) return;
    box.innerHTML =
      '<div class="panel"><h3 style="margin:0 0 4px">' + c.name + ' <span class="muted">' + c.nameEn + '</span></h3>' +
      '<div class="kv"><span class="chip">' + (c.arcana === "major" ? "大阿尔卡那" : "小阿尔卡那 · " + c.suit) + '</span>' +
      '<span class="chip">' + c.element + '象</span>' + (c.keywords || []).map(function (k) { return '<span class="chip">' + k + '</span>'; }).join("") + '</div>' +
      '<div class="block"><b>一句话：</b>' + c.brief + '</div>' +
      '<div class="block"><b>正位：</b>' + c.upright + '</div>' +
      '<div class="block"><b>逆位：</b>' + c.reversed + '</div>' +
      '<p class="muted">仅供娱乐参考 · 心理投射</p></div>';
  }

  /* ---------- 设置 ---------- */
  function initSettings() {
    var ps = $("provider-select"); if (ps) { ps.value = state.provider; ps.addEventListener("change", function () { state.provider = ps.value; saveState(); }); }
    var key = $("ai-key"); if (key) { key.value = state.key; key.addEventListener("change", function () { state.key = key.value.trim(); saveState(); }); }
    var t = $("btn-test-ai"); if (t) t.addEventListener("click", testAI);
    var a = $("btn-activate"); if (a) a.addEventListener("click", activate);
    var c = $("btn-clear"); if (c) c.addEventListener("click", function () {
      if (confirm("确定清除本地所有数据（AI Key、出生信息、激活状态）吗？")) { store.removeItem("xy_state"); location.reload(); }
    });
    if (state.unlocked) { var st = $("activate-status"); if (st) { st.textContent = "✅ 已激活付费功能"; st.className = "status ok"; } }
  }
  async function testAI() {
    var st = $("ai-status"); if (!st) return;
    var k = $("ai-key").value.trim(); state.key = k; saveState();
    if (!k) { st.textContent = "先填一个 Key 再测"; st.className = "status bad"; return; }
    st.textContent = "连接中…"; st.className = "status";
    try { await callAI("请回复：连接成功"); st.textContent = "✅ 连接成功，AI 解读可用"; st.className = "status ok"; }
    catch (e) { st.textContent = "❌ 连不上：" + e.message + "（检查 Key / 网络 / 服务商）"; st.className = "status bad"; }
  }
  function activate() {
    var code = $("activate-code").value.trim(); var st = $("activate-status");
    if (!code) { if (st) { st.textContent = "输入激活码"; st.className = "status bad"; } return; }
    // 本地软锁占位：任意非空码即通过（后续接发卡平台真实校验）
    state.unlocked = true; saveState();
    if (st) { st.textContent = "🎉 激活成功！高级牌阵 / 周运详版 / AI 深度解读已解锁"; st.className = "status ok"; }
    renderSpreads(); renderFortuneRefresh();
  }
  function renderFortuneRefresh() { var act = document.querySelector("#sign-list .sign-cell.active"); if (act) renderFortune(parseInt(act.getAttribute("data-sign"), 10)); }

  /* ---------- 初始化 ---------- */
  function init() {
    renderHome(); renderSpreads(); renderSigns(); fillCities(); renderLibrary("all", ""); initSettings();
    var nav = $("nav");
    if (nav) nav.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { showPage(b.getAttribute("data-page")); }); });
    var ls = $("lib-search"), lf = $("lib-filter");
    if (ls) ls.addEventListener("input", function () { renderLibrary(lf.value, ls.value.trim()); });
    if (lf) lf.addEventListener("change", function () { renderLibrary(lf.value, ls.value.trim()); });
    var ba = $("btn-astro"); if (ba) ba.addEventListener("click", computeAstro);
  }
  if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }

  /* ---------- node 测试导出 ---------- */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { julianDay: julianDay, sunSign: sunSign, moonSign: moonSign, moonLongitude: moonLongitude,
      sunLongitude: sunLongitude, rising: rising, lonToSign: lonToSign, drawCards: drawCards,
      builtinReading: builtinReading, SYS_PROMPT: SYS_PROMPT };
  }
})();
