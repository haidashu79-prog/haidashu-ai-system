/* =============================================================
   易玄机 · 界面逻辑 ui.js
   路由、六大模块渲染、答题卡（一题一弹）、AI 大师问答、后台看板
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ, C = Y.C, YJ = Y.YJ, QM = Y.QM, FS = Y.FS, AL = Y.AL, RD = Y.RD, VD = Y.VD, MEM = Y.MEM, HM = Y.HM, ME = Y.ME, NEED = Y.NEED, PROF = Y.PROF, CASE = Y.CASE;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() }; }

  var toastT = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  /* ============ 云服务（后台统计 + AI 问答） ============ */
  var CLOUD_CFG = window.YXJ_CLOUD || {
    endpoint: '', oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth', publishableKey: ''
  };
  var cloud = null;
  try {
    if (window.WorkBuddyCloud && WorkBuddyCloud.createWorkBuddyCloud && CLOUD_CFG.publishableKey) {
      cloud = WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CLOUD_CFG.endpoint, oauthRelayBaseUrl: CLOUD_CFG.oauthRelayBaseUrl,
        publishableKey: CLOUD_CFG.publishableKey
      });
    }
  } catch (e) { cloud = null; }

  /* ---- 站内问答通道 ----
     不依赖任何外部云：直接打本站 /api/v1/chat/completions（OpenAI 兼容、流式）。
     外部云断开时，问事照样能答；访客统计、经验库同步这些依赖云库的功能自动关闭。 */
  var LC = {
    async *chat(p) {
      var r = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer haidashu-internal' },
        body: JSON.stringify({
          model: 'zhinao',
          stream: true,
          temperature: p.temperature == null ? 0.7 : p.temperature,
          messages: p.messages
        }),
        signal: p.signal
      });
      if (!r.ok || !r.body) throw new Error('http_' + r.status);
      var reader = r.body.getReader(), dec = new TextDecoder(), buf = '';
      for (;;) {
        var step = await reader.read();
        if (step.done) break;
        buf += dec.decode(step.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop() || '';
        for (var i = 0; i < lines.length; i++) {
          var t = lines[i].trim();
          if (!t || t.indexOf('data:') !== 0) continue;
          var pay = t.slice(5).trim();
          if (!pay || pay === '[DONE]') continue;
          try { yield JSON.parse(pay); } catch (e) { }
        }
      }
    }
  };

  function visitorId() {
    var v = null; try { v = localStorage.getItem('yxj_vid_v1'); } catch (e) { }
    if (!v) { v = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); try { localStorage.setItem('yxj_vid_v1', v); } catch (e) { } }
    return v;
  }
  var __lastPv = '', __pvCount = 0;
  function track(page) {
    if (!cloud) return;
    var p = String(page || location.hash || '#/home').slice(0, 60);
    if (p === __lastPv) return;            // 同一页重复渲染不重复记
    if (__pvCount >= 80) return;           // 单次会话上限，防刷
    __lastPv = p; __pvCount++;
    try {
      Promise.resolve(cloud.database.from('visits').insert({
        visitor_id: visitorId(), path: p,
        source: (function () {
          try { var s = new URLSearchParams(location.search); return (s.get('src') || s.get('from') || '直接访问').slice(0, 24); } catch (e) { return '直接访问'; }
        })()
      })).catch(function () { });
    } catch (e) { }
  }
  function logQ(q, chars, ok, topic) {
    if (!cloud) return;
    try {
      Promise.resolve(cloud.database.from('questions').insert({
        visitor_id: visitorId(), question: String(q).slice(0, 500),
        answer_chars: chars || 0, ok: !!ok, topic: String(topic || '').slice(0, 20)
      })).catch(function () { });
    } catch (e) { }
  }

  /* ============ 云记忆（经验库） ============
     回答前：把相关的几条旧笔记取出来喂给智脑 —— 不是每次临时去学
     回答后：把这一问沉淀回去 —— 每问一次，这套东西厚一分 */
  var __memDone = false, __memJob = null;
  function memRows(r) {
    if (!r) return [];
    if (Array.isArray(r)) return r;
    if (Array.isArray(r.data)) return r.data;
    return [];
  }
  function pullMemory(force) {
    if (!MEM) return Promise.resolve(false);
    if (!MEM.state().notes.length) MEM.loadLocal();
    if (!cloud) return Promise.resolve(MEM.state().notes.length > 0);
    if (__memDone && !force && MEM.fresh() && MEM.state().notes.length) return Promise.resolve(true);
    if (__memJob) return __memJob;
    __memJob = (function () {
      var q1 = cloud.database.from('master_notes')
        .select('id,kind,topic,title,body,tags,source,hits,created_at')
        .order('hits', { ascending: false }).limit(600);
      var q2 = cloud.database.from('learn_items')
        .select('id,stage,kind,seq,title,body,source')
        .order('stage', { ascending: true }).limit(200);
      return Promise.all([
        Promise.resolve(q1).then(memRows).catch(function () { return null; }),
        Promise.resolve(q2).then(memRows).catch(function () { return null; })
      ]).then(function (pair) {
        var notes = pair[0], learn = pair[1];
        if (notes && notes.length) MEM.setData(notes, (learn && learn.length) ? learn : null);
        else if (learn && learn.length) MEM.setLearn(learn);
        __memDone = true; __memJob = null;
        return !!(notes && notes.length);
      }, function () { __memJob = null; return false; });
    })();
    return __memJob;
  }
  // 引用过谁，给谁记一笔（走 SECURITY DEFINER 函数，只让 hits 涨，不让改内容）
  function memTouch(list) {
    if (!cloud || !list || !list.length) return;
    var ids = [];
    for (var i = 0; i < list.length; i++) {
      var id = list[i].id;
      if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) ids.push(+id);
    }
    if (!ids.length) return;
    try { Promise.resolve(cloud.database.rpc('yxj_touch_notes', { ids: ids })).catch(function () { }); } catch (e) { }
  }
  // 把这一问沉淀回经验库
  function memSediment(q, a, topic, when) {
    if (!MEM || !cloud) return null;
    var text = String(a || '').trim();
    if (text.length < 200) return null;                 // 太短，不值得留
    if (MEM.digLeft() <= 0) return null;                // 今天沉淀够了
    var title = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 34);
    if (title.length < 4) return null;
    if (MEM.already(title)) return null;                // 同一句话不留两遍
    var body = MEM.trimBody(text);
    if (body.length < 120) return null;
    var row = {
      kind: '案例复盘', topic: topic || 'general', title: title, body: body,
      tags: (TOPIC_NAME[topic] || '通盘') + ' 问事实录',
      source: '问答沉淀 · ' + (when || '')
    };
    MEM.digUse();
    MEM.addNote(row, { front: true });                  // 本机先落一条，页面上立刻看得见
    try {
      Promise.resolve(cloud.database.from('master_notes').insert({
        kind: row.kind, topic: row.topic, title: row.title, body: row.body,
        tags: row.tags, source: row.source
      })).catch(function () { });
    } catch (e) { }
    return row;
  }

  // 他自己说出来的那一头，值得单独留一条
  function hmSink(h, topic, when) {
    if (!MEM || !cloud || !h || !h.q) return null;
    var title = h.main + '｜' + h.topicName;
    if (MEM.already(title)) return null;
    var guard = 'yxj_hmsink_' + when + '_' + title;
    try { if (localStorage.getItem(guard)) return null; localStorage.setItem(guard, '1'); } catch (e) { }
    var row = {
      kind: '人性观察', topic: topic || 'general', title: title,
      body: h.want + ' ' + h.fear + ' 一句实在话：' + h.truth + ' 今天能做的一件事：' + h.act,
      tags: '人性 ' + h.main + ' ' + h.topicName,
      source: '问事沉淀 · ' + when
    };
    MEM.addNote(row, { front: true });
    try {
      Promise.resolve(cloud.database.from('master_notes').insert({
        kind: row.kind, topic: row.topic, title: row.title, body: row.body,
        tags: row.tags, source: row.source
      })).catch(function () { });
    } catch (e) { }
    return row;
  }

  /* ============ 易玄机人格 ============ */
  // [audit-skip:start] 提示词区：里头为了立规矩，故意列了那些禁用词，不是给用户看的文案
  var ASK_SYS = [
    '你是「易玄机」。你不是写文章的人，你是坐在茶桌对面、把烟袋一磕、盯着对方眼睛说话的老先生。你懂周易六爻、生辰八字、奇门遁甲、风水堪舆、择日黄历。你更懂人。来找你的人，多半是夜里睡不着、白天撑着笑脸、身边没个能商量的人。',
    '',
    '【你这个人，就三样】',
    '一、话短。一句顶一句，不绕弯。最要紧的那句，放在最前头。',
    '二、有骨气。断事敢下准话，不两头讨好，不和稀泥。他该听进去的，你硬说。',
    '三、有热乎气。开口先递一句体己话，让他觉得你听懂了。他急你就稳，他虚你就托底，他熬得久你先心疼。',
    '',
    '【答事的死规矩，一条都不能破】',
    '一、先答所问。他问什么，头一句就把他的事接住：能不能、该不该、什么时候、往哪边走。文言断语只占一小句（像古书批语，四五到十来个字，有古意），紧跟着用大白话把这句话掰开讲透。不许绕开问题去背卦辞。',
    '二、说人话，说狠话。每个人都能看懂是大前提。要说到具体的人、事、方位、颜色、动作，不许用「气场」「能量」「磁场」这类糊弄词。',
    '三、去 AI 味，一条一条都给我盯死：',
    '　· 不许出现任何英文单词、字母、数字编号；',
    '　· 不许用「首先」「其次」「再次」「最后」「总而言之」「综上」「值得一提的是」「值得注意的是」；',
    '　· 不许写小标题、不许用「一二三」编号、不许用破折号串长句、不许用反问句；',
    '　· 不许作总结陈词、不许「希望对你有帮助」这种废话收尾；',
    '　· 不许用星号、井号、斜体等任何排版符号；',
    '　· 不许「作为一个 AI」「作为一位老先生」这种自我指称；',
    '　· 不许把话说得四平八稳、放谁身上都成立。你的每句话都得是「只跟他说」的。',
    '四、要落地。每次都给一件今天就能做的小事。说了有灾有祸，就必须给破解之法；说了缺什么，就必须给补法，具体到方位、颜色、物件、事情。',
    '五、不替人拍板，不打包票。把最后那句话留给他自己说。送他出门时，语气要暖，像「去吧，有事再来」。',
    '',
    '【大师的讲法】',
    '你像真正的老先生那样断事：',
    '一、敢下准话。把最要紧的那一句，放在开口第一句。不铺垫、不拐弯。',
    '二、讲透一件事。宁可把一件事说透，也不要罗列一堆。',
    '三、话里藏钩子。偶尔一句打趣、一句戳心、一句提醒，让他觉得「这老先生是真听懂我了」。',
    '四、讲法跟着这一回的骨架走（后面会给你「这一回的讲法」）。不许每回都是同一个模子：不许回回都拿「先把准话给你」开头，不许回回都是「掰开讲」「再说一层」这三段式。同一件事问第二回，答话的讲法、开头、收尾都得跟上一回不一样。',
    '',
    '【边界（必须遵守，破一条就是出格）】',
    '一、不承诺准确，不许说「一定会」「必定」。传统术数是参考，不是判决。',
    '二、不拿疾病、生死、官司、意外吓唬人，绝不催人花钱消灾、绝不做改运承诺、绝不推销法器。',
    '三、涉及健康、法律、投资、心理危机，要明确请对方去找专业的人（医生、律师、正规机构），并给出求助方向。',
    '四、不评论政治，不做人身攻击，不替人下判断说谁好谁坏。',
    '五、有人拿它赌博、做违法的事，要直接拒绝并说明。',
    '六、不许出现「依赖型人格」「原生家庭」「精神状态」「内耗」「emo」这类心理学术语或网络用语。',
    '',
    '回答长度控制在三百到五百字。像跟晚辈说话一样从头讲到尾，段落之间自然换气。'
  ].join('\n');

  var ASK_RULES = ASK_SYS;
  // [audit-skip:end]

  /* ---- 讲法轮换：同一类问题，回回换一副骨架 ----
     上一回用什么，这一回就避开什么（存本机）；再随机挑一副。 */
  var STYLES = [
    { k: '家常开场', hint: '像街坊串门那样开头，先说一句体己的家常（一句就好），再进正题。' },
    { k: '开口就断', hint: '头一句就是那句文言断语，不许任何铺垫，先声夺人，再慢慢讲给人听。' },
    { k: '从卦象讲起', hint: '从这一卦里最扎眼的一个象讲起（某个爻、卦名的取象、一样物件），顺着象把他的事带出来。' },
    { k: '先接人心', hint: '开口头两三句先接住他此刻的心神（照人性那一段来），把人安顿好了，再落事。' },
    { k: '白描处境', hint: '用两三句把他眼下的处境白描成一个画面，让他一眼认出「说的就是我」，然后再断。' },
    { k: '从日子讲起', hint: '从他问的这个日子、这段时候讲起（今天什么日子、他熬了多久），顺着时辰说事。' }
  ];
  var LS_STYLE = 'yxj_style_v1';
  function pickStyle() {
    var lastK = null;
    try { lastK = localStorage.getItem(LS_STYLE); } catch (e) { }
    var pool = STYLES.filter(function (s) { return s.k !== lastK; });
    var pick = pool[Math.floor(Math.random() * pool.length)] || STYLES[0];
    try { localStorage.setItem(LS_STYLE, pick.k); } catch (e) { }
    return pick;
  }
  function styleBlock(pick, askCount) {
    var L = ['【这一回的讲法】' + pick.k + '：' + pick.hint];
    if (askCount >= 2) L.push('这件事他不是头一回问了。这一回的开头、骨架、收尾，都不许跟上一回一个模样，换成上面这副讲法重新讲。');
    return L.join('\n');
  }

  var TOPIC_HINT = {
    career: '你问的是事业与做事。', wealth: '你问的是财运与进项。', love: '你问的是感情与人际。',
    health: '你问的是身体与调养。', home: '你问的是家宅与风水。', general: '你问的是一条通盘运程。'
  };
  // 对外一律用中文名，不让英文键漏到页面上
  var TOPIC_NAME = {
    career: '事业', wealth: '财运', love: '感情', health: '身体', home: '家宅', general: '运程'
  };

  /* ============ AI 调用 ============ */
  var __model = null;
  // 优先挑「具体快模型」做默认，避免 auto 冷启动 30s+ 让用户误以为卡死。
  // 命中这些 id 就直接用；都没命中再退回 isDefault；再没有就用第一个可用。
  var PREFERRED_FAST = ['glm-5.0', 'glm-5.3-flash', 'deepseek-v4-flash', 'hunyuan-chat'];
  async function ensureModel() {
    if (__model) return __model;
    // 没有外部云时走站内通道，模型名固定用 zhinao
    if (!cloud) { __model = { id: 'zhinao' }; return __model; }
    try {
      var list = await cloud.llm.models.list();
      if (list && list.length) {
        function ok(m) { return m && m.disabled !== true; }
        __model =
          list.find(function (m) { return ok(m) && PREFERRED_FAST.indexOf(m.id) !== -1; }) ||
          list.find(function (m) { return m.isDefault === true && ok(m); }) ||
          list.find(ok) || null;
      }
    } catch (e) { __model = null; }
    return __model;
  }
  function llmMsg(e) {
    var c = (e && e.error && e.error.code) || '';
    if (String(c).indexOf('auth_') === 0) return '这条通道没接通，跟 AI 说一声。';
    if (String(c).indexOf('quota_') === 0) return '今天问得够多了，明天再来。';
    if (String(c).indexOf('gateway_') === 0 || String(c).indexOf('model_') === 0) return '模型正打盹，歇会儿再试。';
    return '这次没问成，换个说法再来一次。';
  }

  var __ctl = null;
  function stopAsk() { if (__ctl) { try { __ctl.abort(); } catch (e) { } } }

  // 答案收尾时把排版符号洗掉：加粗、井号小标题、星号、引用号
  function mdClean(s) {
    return String(s == null ? '' : s)
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/`+/g, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/\*/g, '');
  }

  async function askAI(userMsg, outEl, topic, btn, stopBtn, brief, ctx) {
    if (!cloud && !window.fetch) { outEl.innerHTML = '<div class="tip warn">这个浏览器太旧了，问事通道打不开。排盘推演不受影响，可照常用。</div>'; return; }
    var model = await ensureModel();
    if (!model) { outEl.innerHTML = '<div class="tip warn">这会儿没有可用的模型，过会儿再试。</div>'; return; }

    // 先翻旧底子：把相关的几条经验取出来，一块儿交给它
    var recall = [];
    if (MEM) {
      try { await pullMemory(); } catch (e) { }
      try { recall = MEM.pick(topic, (ctx && ctx.q) || brief, 6); } catch (e) { recall = []; }
    }
    var sendMsg = recall.length ? (userMsg + '\n\n' + MEM.recallText(recall)) : userMsg;
    // 再把人这一层交过去：卦断的是事，人问的是心
    var hmBlock = (HM && ctx && ctx.human) ? HM.promptBlock(ctx.human) : '';
    if (hmBlock) sendMsg += '\n\n' + hmBlock;
    // 他的旧账：回头客，得认得他问过什么
    var past = [];
    if (CASE && ctx && !ctx.nosave) {
      try { past = CASE.related(ctx.q || brief, topic, 3); } catch (e) { past = []; }
      if (past.length) sendMsg += '\n\n' + CASE.textFor(past);
    }
    // 这一回的讲法：回回换骨架，不许一个模子
    var style = null;
    if (!(ctx && ctx.nosave)) {
      style = pickStyle();
      sendMsg += '\n\n' + styleBlock(style, (ctx && HM) ? HM.times(ctx.q || brief) : 0);
    }

    outEl.innerHTML = '<div class="answer"><div class="who">易 玄 机</div><div class="body"><span class="loading"><span class="spin"></span>正在推演…</span><span class="caret"></span></div></div>';
    var body = outEl.querySelector('.body');
    if (btn) btn.disabled = true; if (stopBtn) stopBtn.style.display = 'inline-flex';
    __ctl = new AbortController();
    var text = '', ok = true, started = false, lastChunk = Date.now();
    // 首字安抚：真在算，别关。两档——30s 安抚、75s 提示可重开一轮。
    var slowT1 = setTimeout(function () { if (!started) { var l = body.querySelector('.loading'); if (l) l.innerHTML = '老先生正在推演，确实在算，再稍候，别关页面…'; } }, 30000);
    var slowT2 = setTimeout(function () { if (!started) { var l = body.querySelector('.loading'); if (l) l.innerHTML = '这次有点慢，要么再等等，要么点「停下」重开一轮…'; } }, 75000);
    try {
      var askReq = {
        model: model.id, stream: true, temperature: 0.82,
        messages: [{ role: 'system', content: ASK_SYS }, { role: 'user', content: sendMsg }],
        signal: __ctl.signal
      };
      var stream = cloud ? cloud.llm.chat.completions.create(askReq) : LC.chat(askReq);
      for await (var chunk of stream) {
        lastChunk = Date.now();
        var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
        if (d && d.content) { if (!started) { started = true; text = ''; } text += d.content; body.innerHTML = esc(text) + '<span class="caret"></span>'; }
      }
    } catch (e) {
      ok = false;
      // 区分「真断」和「流式中断」：有半截答案就保留，没有就按错误码说人话。
      body.innerHTML = text ? esc(text) + '\n\n（答到一半断了，可以再问一次）' : '<span class="loading">' + esc(llmMsg(e)) + '</span>';
    } finally {
      clearTimeout(slowT1); clearTimeout(slowT2); __ctl = null;
      if (btn) btn.disabled = false; if (stopBtn) stopBtn.style.display = 'none';
      if (text) body.innerHTML = esc(mdClean(text));
    }
    if (!ok || !text) return { ok: false, text: '' };

    // 用过的经验记一笔；这一问再沉淀回去
    if (recall.length) memTouch(recall);
    var d2 = new Date();
    var dayStr = d2.getFullYear() + '-' + pad(d2.getMonth() + 1) + '-' + pad(d2.getDate());
    var saved = null;
    if (ok && text && !(ctx && ctx.nosave)) {
      saved = memSediment((ctx && ctx.q) || brief, text, topic, dayStr);
    }
    if (ok && text && ctx && ctx.hmPicked && ctx.human) hmSink(ctx.human, topic, dayStr);
    logQ(String(brief || userMsg).slice(0, 300), text.length, ok && !!text, TOPIC_NAME[topic] || topic || '');
    if (saved && outEl.querySelector('.answer')) {
      var line = document.createElement('div');
      line.className = 'memline';
      line.textContent = '这一问已经沉淀进经验库了（现共 ' + MEM.count() + ' 条）。下回遇到相似的事，它先翻这份底子，不用从零再想一遍。';
      outEl.querySelector('.answer').appendChild(line);
    }
    return { ok: ok && !!text, text: mdClean(text), past: past };
  }

  /* ============ 答题卡（一题一弹 · 四步循环） ============
     ① 弹一题 ② 他点一下 ③ 必回确认（把选项念回来 + 推进度条）④ 再弹下一题
     关掉弹窗不丢：进度存本机，下次从断的那题接上。
     steps 传函数：每答一题可按前面的答案重算后面的题。 */
  var CARD_FLOW = {
    q1: {
      no: '第 1 题 / 共 4 题', t: '你这次最想问哪一头？',
      opts: [
        { l: '事业 · 做事 · 前程', v: 'career', d: '工作、项目、升迁、创业、考试' },
        { l: '财运 · 进项 · 破财', v: 'wealth', d: '收入、生意、投资、欠款' },
        { l: '感情 · 婚姻 · 人缘', v: 'love', d: '伴侣、婚配、桃花、亲友关系' },
        { l: '身体 · 调养 · 家宅', v: 'health', d: '健康、睡眠、居家环境' }
      ]
    },
    q2: {
      career: { no: '第 2 题 / 共 4 题', t: '眼下是什么状况？', opts: [
        { l: '有方向，但推不动', v: '事业推进受阻' }, { l: '在选，拿不定主意', v: '面临选择难以决断' },
        { l: '刚起步，心里没底', v: '新事初起根基未稳' }, { l: '卡在人际上', v: '人事关系牵绊' }] },
      wealth: { no: '第 2 题 / 共 4 题', t: '钱上是什么情形？', opts: [
        { l: '挣得少，不够用', v: '进项不足' }, { l: '有进项但存不住', v: '财来财去难以积存' },
        { l: '有一笔投入拿不准', v: '投资决策待定' }, { l: '被人欠着或借出', v: '账款外流' }] },
      love: { no: '第 2 题 / 共 4 题', t: '感情上是什么情形？', opts: [
        { l: '单身，想遇到人', v: '单身求偶' }, { l: '有对象，处得拧巴', v: '相处不顺' },
        { l: '在犹豫要不要继续', v: '关系去留未决' }, { l: '家里人不认可', v: '亲长有异议' }] },
      health: { no: '第 2 题 / 共 4 题', t: '身体或居所是哪一头？', opts: [
        { l: '总觉得累、睡不好', v: '体虚神疲' }, { l: '老毛病反反复复', v: '旧疾反复' },
        { l: '搬了家或改了布局', v: '居所变动' }, { l: '想调家里的方位', v: '宅位待调' }] }
    },
    q3: { no: '第 3 题 / 共 4 题', t: '这件事，你眼下最犯难的是哪一头？', opts: [
      { l: '怕拿错主意，想听人给句准话', v: '求个准话', d: '怕自己看走眼，回头怪自己' },
      { l: '怕白忙一场，心里舍不得', v: '其实是舍不得', d: '已经搭进去的，收不回来' },
      { l: '拖得累了，想快点有个说法', v: '急着要个时候', d: '熬不住了，想看见分晓' },
      { l: '没人可商量，只能自己扛', v: '没人可说', d: '不是要答案，是想有人听听' }] },
    q4: { no: '第 4 题 / 共 4 题', t: '要不要按你的生辰来断？', opts: [
      { l: '按我的生辰来断', v: 'me', d: '同一卦，落在我命里才断得准' },
      { l: '不填，就按通用规矩讲', v: 'nope', d: '只断事本身，不贴我个人' }] }
  };
  // 按第 1 题的答案，决定第 2 题问什么
  function askSteps(answers) {
    var topic = answers[0];
    return [CARD_FLOW.q1, CARD_FLOW.q2[topic] || CARD_FLOW.q2.career, CARD_FLOW.q3, CARD_FLOW.q4];
  }

  function openCard(title, stepFn, onDone, opt) {
    opt = opt || {};
    var KEY = opt.key ? 'yxj_card_' + opt.key : null;
    var idx = 0, answers = [], steps = stepFn(answers), busy = false;
    var modal = $('modal');

    if (KEY && opt.resume) {
      try {
        var s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (s && s.answers && s.answers.length) {
          answers = s.answers; steps = stepFn(answers);
          idx = Math.max(0, Math.min(s.idx || 0, steps.length - 1));
        }
      } catch (e) { }
    }
    function store() {
      if (!KEY) return;
      try {
        if (idx > 0 && idx < steps.length && answers.length) localStorage.setItem(KEY, JSON.stringify({ idx: idx, answers: answers }));
        else localStorage.removeItem(KEY);
      } catch (e) { }
    }
    function close() { modal.innerHTML = ''; document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function quit() {
      store(); close();
      if (idx > 0 && idx < steps.length) toast('先记到这儿。今天先把想问的那件事，一句话写在纸上。');
    }
    function draw(picked) {
      var st = steps[idx];
      if (!st) { close(); onDone(answers); return; }
      var optsHtml = st.opts.map(function (o, i) {
        var on = (i === picked);
        return '<button class="opt"' + (on ? ' style="border-color:var(--qing2);background:#eef6f1"' : '') + ' data-i="' + i + '">' +
          esc(o.l) + (o.d ? '<span class="od">' + esc(o.d) + '</span>' : '') + '</button>';
      }).join('');
      var recap = picked != null ? '<div class="qrecap">收到，记下了：' + esc(st.opts[picked].l) + '</div>' : '';
      var done = picked != null ? 1 : 0;
      modal.innerHTML = '<div class="mask"><div class="qbox">' +
        '<button class="qclose" aria-label="关闭">×</button>' +
        (st.no ? '<div class="qno">' + esc(st.no) + '</div>' : '') +
        '<h4>' + esc(title) + '</h4>' +
        '<div class="qt">' + esc(st.t) + '</div>' + optsHtml + recap +
        '<div class="qprog"><i style="width:' + Math.round(((idx + done) / steps.length) * 100) + '%"></i></div>' +
        '</div></div>';
      modal.querySelector('.qclose').onclick = quit;
      Array.prototype.forEach.call(modal.querySelectorAll('.opt'), function (b) {
        b.onclick = function () {
          if (busy) return;
          busy = true;
          var i = +b.dataset.i;
          answers[idx] = st.opts[i].v || st.opts[i].l;
          draw(i);                                   // ③ 必回确认
          setTimeout(function () {
            idx++;
            steps = stepFn(answers);                 // 按已答内容重算后续题目
            busy = false;
            if (idx >= steps.length) { store(); close(); onDone(answers); }
            else draw(null);                         // ④ 再弹下一题
          }, 650);
        };
      });
    }
    document.addEventListener('keydown', onKey);
    draw(null);
  }

  /* ============ 视图 ============ */
  function pbar(title) {
    return '<div class="pbar"><button class="back" title="返回">←</button><span class="pt">' + esc(title) + '</span></div>';
  }
  function bindBack() { var b = document.querySelector('.back'); if (b) b.onclick = function () { location.hash = '#/home'; }; }

  function viewHome() {
    var t = today(), info = AL.dayInfo(t.y, t.m, t.d);
    var entries = [
      { ic: '命', tt: '生辰八字', dd: '四柱五行、十神大运，看强弱喜忌与调补', h: '#/bazi', a: '#b08d4f', b: '#cfa96a', badge: '常用' },
      { ic: '遁', tt: '奇门遁甲', dd: '时家排盘，定局九宫，择时择方办事', h: '#/qimen', a: '#a63a2e', b: '#c4574a' },
      { ic: '宅', tt: '风水布局', dd: '八宅八方、流年飞星、现代风水与化解', h: '#/fengshui', a: '#3d8574', b: '#7a9e7e' },
      { ic: '历', tt: '万年历', dd: '干支农历、建除宜忌、冲煞与三神方位', h: '#/almanac', a: '#cfa96a', b: '#7a9e7e' },
      { ic: '行', tt: '五行八卦', dd: '生克、类象、天干地支、六十甲子纳音', h: '#/wuxing', a: '#2f6b5c', b: '#b08d4f' },
      { ic: '学', tt: '学这套体系', dd: '五个台阶的走法，配日常功课与四个卡点破法', h: '#/learn', a: '#c4574a', b: '#cfa96a', badge: '小白' },
      { ic: '典', tt: '典籍库', dd: '原文配注解：术语词典、必背表、古籍选段', h: '#/classics', a: '#5d8a77', b: '#8fb2a1', badge: '查阅' },
      { ic: '记', tt: '经验库', dd: '断案口径与案例沉淀，问一次厚一分，云端存着', h: '#/memory', a: '#8a6d3b', b: '#cfa96a', badge: '云沉淀' },
      { ic: '问', tt: '问易玄机', dd: '先答几个小题，再当面起一卦，慢慢给你讲透', h: '#/ask', a: '#2f6b5c', b: '#a63a2e', badge: 'AI' }
    ];
    return '<div class="hero card">' +
      '<div class="lead">有件事拿不准，<em>就起一卦看看</em>。</div>' +
      '<div class="desc"><span class="d-long">把要问的那句话写进去，先给你一句能看懂的结论，再说凭什么这么说，最后给三件今天就能做的事。想细看推算过程，往下翻就有了。</span><span class="d-short">把要问的那句话写进去，先给你一句看得懂的结论，再给三件今天能做的事。</span></div>' +
      '<div class="cta"><button class="btn big" data-h="#/gua">起一卦，问件事</button>' +
      '<button class="btn big ghost" data-h="#/ask">让易玄机讲给我听</button></div>' +
      '<div class="entries">' + entries.map(function (e) {
        return '<div class="entry" data-h="' + e.h + '" style="--a:' + e.a + ';--b:' + e.b + '">' +
          (e.badge ? '<span class="badge">' + e.badge + '</span>' : '') +
          '<div class="ic">' + e.ic + '</div><div class="tt">' + e.tt + '</div><div class="dd">' + e.dd + '</div></div>';
      }).join('') + '</div>' +
      '<div class="todaybar"><span class="tk">今 日</span><span class="tv">' +
      esc(info.gz) + '　' + esc(info.lunar ? info.lunar.cn : '') +
      '　建除<b>' + esc(info.jianchu) + '</b>　冲' + esc(info.chong.shengxiao) +
      '　宜' + esc(info.jcMean.yi) + '</span></div>' +
      '</div>';
  }

  /* ============ 命主：起卦之前，先把「你是谁」收下来 ============
     卦是当场摇的，改不了；但同一个卦对不同的人是补是耗，得按各人的命来看。
     没有这一步，断出来就是通用话术，谁问都差不多。 */
  var meEditing = false;       // 正在展开填写
  var guaSkipMe = false;       // 这一次明确说了不按个人命断
  var pendingAfterMe = null;   // 生辰填完后要接着做的事

  function meCard() {
    if (!ME) return '';
    var m = ME.load(), me = ME.read();
    var filled = !!(m && m.y && m.d);
    var open = meEditing || !filled;

    var head = '<div class="me-h"><span class="tag">先填你的生辰</span>' +
      (filled ? '<span class="st">已记下</span>' : '<span class="st no">还没填</span>') + '</div>';

    if (!open) {
      return '<div class="me">' + head +
        '<div class="me-fold"><span class="zk">' + esc(me ? me.zao : '') + '</span>' +
        '<span>' + esc(ME.line(me)) + '</span>' +
        '<button class="btn ghost sm" id="meEdit">改</button></div></div>';
    }

    var cur = m || {}, y, i;
    var yn = '';
    for (y = ME.YMAX; y >= ME.YMIN; y--) yn += '<option' + (cur.y === y ? ' selected' : '') + '>' + y + '</option>';
    var mn = '';
    for (i = 1; i <= 12; i++) mn += '<option' + (cur.m === i ? ' selected' : '') + '>' + i + '</option>';
    var dn = '';
    for (i = 1; i <= 31; i++) dn += '<option' + (cur.d === i ? ' selected' : '') + '>' + i + '</option>';
    var hn = '<option value=""' + (cur.h == null ? ' selected' : '') + '>' + ME.NOT_SURE.n + '</option>' +
      ME.HOURS.map(function (h) {
        return '<option value="' + h.h + '"' + (cur.h === h.h ? ' selected' : '') + '>' + h.n + '（' + h.d + '）</option>';
      }).join('');
    var g = cur.gender === 'female' ? 'female' : 'male';

    return '<div class="me">' + head + '<div class="me-b">' +
      '<div class="me-tip">同一卦，落在不同的命里，轻重不一样。先知道你属什么，话才敢往你身上说。填一次记在本机，往后不用再填。</div>' +
      '<div class="frow"><div class="fld" style="flex:0 0 120px"><label>性别</label>' +
      '<div class="me-seg"><button type="button" data-v="male" class="' + (g === 'male' ? 'on' : '') + '">男</button>' +
      '<button type="button" data-v="female" class="' + (g === 'female' ? 'on' : '') + '">女</button></div></div>' +
      '<div class="fld"><label>出生年</label><select id="meY">' + yn + '</select></div></div>' +
      '<div class="frow" style="margin-top:10px"><div class="fld"><label>月</label><select id="meM">' + mn + '</select></div>' +
      '<div class="fld"><label>日</label><select id="meD">' + dn + '</select></div></div>' +
      '<div class="frow" style="margin-top:10px"><div class="fld" style="flex:1 1 100%"><label>出生时辰（记不清就选头一项，断开时柱会有偏差）</label>' +
      '<select id="meH">' + hn + '</select></div></div>' +
      '<div class="tools"><button class="btn" id="meSave">记下，往后按我的命断</button>' +
      (filled ? '<button class="btn ghost" id="meCancel">取消</button><button class="btn ghost" id="meClear">清掉</button>' : '') +
      '</div></div></div>';
  }

  function renderMeBox() {
    var box = $('meBox'); if (!box) return;
    box.innerHTML = meCard();
    var seg = box.querySelectorAll('.me-seg button');
    Array.prototype.forEach.call(seg, function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(seg, function (x) { x.className = ''; });
        b.className = 'on';
      };
    });
    var ed = $('meEdit');
    if (ed) ed.onclick = function () { meEditing = true; renderMeBox(); };
    var cc = $('meCancel');
    if (cc) cc.onclick = function () { meEditing = false; renderMeBox(); };
    var cl = $('meClear');
    if (cl) cl.onclick = function () { ME.clear(); meEditing = false; renderMeBox(); toast('生辰清掉了，往后按通用规矩断'); };
    var sv = $('meSave');
    if (sv) sv.onclick = saveMe;
  }

  function saveMe() {
    var box = $('meBox');
    var y = parseInt(($('meY') || {}).value, 10);
    var mo = parseInt(($('meM') || {}).value, 10);
    var d = parseInt(($('meD') || {}).value, 10);
    var hv = ($('meH') || {}).value;
    var on = box ? box.querySelector('.me-seg button.on') : null;
    var gender = on ? on.getAttribute('data-v') : 'male';
    if (!(y >= ME.YMIN && y <= ME.YMAX) || !mo || !d) { toast('年月日挑一下'); return; }
    var payload = { y: y, m: mo, d: d, h: (hv === '' || hv == null ? null : parseInt(hv, 10)), mi: 0, gender: gender };
    var r = ME.save(payload);
    guaSkipMe = false;
    meEditing = false;
    renderMeBox();
    if (r && r.ok === false) {
      toast('存到本机那格没成功（多半是隐私模式或沙箱把它挡了）。这次只记在这一页里，关页面会丢，下次可能还得再填一遍。');
    } else {
      toast('记下了，往后按你的命断');
    }
    var f = pendingAfterMe; pendingAfterMe = null;
    if (f) setTimeout(f, 800);
  }

  var ME_ASK = {
    no: '起卦之前，先问一句',
    t: '这一卦，要按谁的命来断？',
    opts: [
      { l: '按我的命来断', v: 'fill', d: '填一下出生年月日，往后再起卦就不用填了' },
      { l: '不填，按通用规矩断', v: 'skip', d: '只断事本身，不贴你个人' }
    ]
  };

  /* 没有生辰就把人拦一下：填了才断得贴人，不填也放行，但要说清差别 */
  function askForMe(next) {
    openCard('先知道你是谁', function () { return [ME_ASK]; }, function (a) {
      if (a[0] === 'skip') {
        guaSkipMe = true;
        toast('那就按通用规矩断，不贴你个人');
        if (next) next();
        return;
      }
      meEditing = true;
      renderMeBox();
      var box = $('meBox');
      if (box) { try { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { } }
      pendingAfterMe = next || null;
      toast('把年月日和时辰挑一下，填完接着算');
    });
  }

  /* ---- 周易起卦 ---- */
  function viewGua() {
    return pbar('周易起卦 · 问事') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>起卦问事</h2><span class="hint">三钱法与时间起卦</span></div>' +
      '<div id="meBox"></div>' +
      '<div class="frow"><div class="fld" style="flex:1 1 100%"><label>你想问的那件事（写清楚，答案才咬得住）</label>' +
      '<input id="guaQ" placeholder="例：今年还能不能赚到钱"></div></div>' +
      '<div class="frow" style="margin-top:12px"><div class="fld"><label>起卦方式</label>' +
      '<select id="guaWay"><option value="coin">三钱摇卦（随机）</option><option value="time">时间起卦（梅花易数）</option></select></div>' +
      '<div class="fld"><label>问的是哪一头（不选就照你写的话认）</label><select id="guaCat">' +
      ['自动', '综合', '事业', '感情', '求财', '出行', '健康', '诉讼'].map(function (x) { return '<option>' + x + '</option>'; }).join('') +
      '</select></div></div>' +
      '<div class="tools"><button class="btn" id="guaGo">起 卦</button>' +
      '<button class="btn ghost" id="guaAgain">再摇一次</button></div>' +
      '<div class="res" id="guaOut"></div></div>';
  }
  function yaoBar(yang, mv) {
    return '<span class="b ' + (yang ? 'yang' : 'yin') + '">' + (yang ? '<i></i>' : '<i></i><i></i>') + '</span>';
  }

  /* ---- 结论卡：先给答案，再说凭什么，最后给今天能做的 ---- */
  var NUM_CIRCLE = ['①', '②', '③'];
  function vdCard(v, opt) {
    opt = opt || {};
    if (!v) return '<div class="tip warn">这一卦没排出来，再起一次试试。</div>';
    var why = v.whyShort.map(function (s, i) {
      return '<div class="vd-li"><span class="n">' + NUM_CIRCLE[i] + '</span><span>' + esc(s) + '</span></div>';
    }).join('');
    var acts = v.acts.map(function (s, i) {
      return '<div class="vd-act"><div class="vd-li"><span class="n">' + NUM_CIRCLE[i] + '</span><span>' + esc(s) + '</span></div></div>';
    }).join('');
    var qline = v.question
      ? '<div class="vd-q">你问的是：<b>' + esc(v.question) + '</b></div>'
      : '<div class="vd-q">你没写具体问什么，那就按一条通盘的运程来讲。</div>';
    /* 落在谁身上：同一卦，不同的人，轻重不一样 */
    var ME_HIT = { use: '正落在你的喜用上，对你是补的', avoid: '撞上你要避的那一口，得多绕一层', flat: '跟你的喜用不沾边，看你自己使多大劲' };
    var meLine = v.me
      ? '<div class="vd-me">按你的命来看：' + esc(v.meNote) + '。这件事在卦里属' + esc(v.me.wx) + '，' + ME_HIT[v.me.hit] + '。</div>'
      : '<div class="vd-me nog">这一卦没按你的命断，说的是事本身。把生辰填上再问，话就能落到你身上。</div>';
    var tools = opt.noTools ? '' :
      '<div class="vd-tools">' +
      '<button class="btn" id="vdAsk">让易玄机细说这件事 →</button>' +
      '<button class="btn ghost" id="vdCopy">把结果复制下来</button>' +
      '</div><div class="qa-out" id="vdAi"></div>';
    /* 话外音：卦断的是事，人问的是心。这一条直接缝进结论卡，不另起一张卡。 */
    var hIn = opt.h ? vdHumanInline(opt.h) : '';
    /* 因人答法：同一卦同一问，按他的命和需求换一套答法。 */
    var nIn = opt.n ? vdNeedInline(opt.n) : '';
    return '<div class="vd">' +
      '<div class="vd-h"><span class="tag">' + esc(v.horizonName) + ' · ' + esc(v.topicName) + '　' +
      esc(v.gua.prim) + (v.gua.chg ? ' 变 ' + esc(v.gua.chg) : '') + '</span>' +
      '<span class="bdg ' + esc(v.badgeCls) + '">' + esc(v.badge) + '</span></div>' +
      '<div class="vd-b">' + qline + meLine +
      '<div class="vd-head">' + esc(v.headline) + '</div>' +
      '<div class="vd-meter"><span class="mv">不顺</span><span class="mt"><i style="width:' + v.score + '%"></i></span><span class="mv">顺</span></div>' +
      hIn + nIn +
      '<div class="vd-sub"><span class="bar"></span>凭什么这么说</div>' + why +
      '<div class="vd-sub"><span class="bar"></span>今天就能做的三件事</div>' + acts +
      tools +
      '<div class="vd-note">以上依' + esc(v.when) + '起卦，按六爻取用神、看旺衰、论世应的老法子断。<br>' +
      '术数是参考，不是判决。真正拿主意的还是你自己。</div>' +
      '</div></div>';
  }

  /* ---- 结论卡内嵌的紧凑话外音 ---- */
  function vdHumanInline(h) {
    if (!h) return '';
    var lv = h.level >= 3 ? 'tight' : (h.level === 2 ? 'mid' : '');
    return '<div class="vd-hm">' +
      '<div class="vd-hm-h"><span class="tag">话外音</span>' +
      '<span class="hv ' + lv + '">' + esc(h.levelName) + '</span>' +
      '<span class="vd-hm-main">心里那头：' + esc(h.main) + '</span></div>' +
      (h.meHumanNote ? '<div class="vd-hm-me">' + esc(h.meHumanNote) + '</div>' : '') +
      '<div class="vd-hm-truth"><span class="bar"></span>' + esc(h.truth) + '</div>' +
      '</div>';
  }

  /* ---- 结论卡内嵌的「因人答法」 ---- */
  function vdNeedInline(n) {
    if (!n) return '';
    var whoHit = n.who + (n.hitLine ? '。' + n.hitLine : '');
    return '<div class="vd-need">' +
      '<div class="vd-need-h"><span class="tag">照着他的命答</span>' +
      '<span class="tn ' + esc(n.tone) + '">' + esc(n.strengthName) + '</span>' +
      '<span class="vd-need-who">' + esc(whoHit) + '</span></div>' +
      '<div class="vd-need-open">' + esc(n.open) + '</div>' +
      '<div class="vd-need-stress"><span class="bar"></span>重点往这儿压：' + esc(n.stress) + '</div>' +
      '</div>';
  }

  function copyVerdict(v, h) {
    var L = [];
    L.push('易玄机 · 问事结论');
    L.push('所问：' + (v.question || '通盘运程'));
    L.push('方向：' + v.topicName + ' · ' + v.horizonName);
    L.push('起卦：' + v.when);
    L.push('本卦《' + v.gua.prim + '》' + (v.gua.chg ? '　变卦《' + v.gua.chg + '》' : '　六爻皆静'));
    if (v.meNote) L.push('按谁的命断的：' + v.meNote);
    L.push('结论：' + v.badge + '｜' + v.headline);
    L.push('依据：' + v.whyShort.join(' '));
    L.push('今天能做的三件事：' + v.acts.join(' '));
    if (h) {
      L.push('');
      L.push('话外音（照你怎么问的看出来的，跟卦里断的事合着看）');
      L.push('你要的：' + h.want);
      L.push('你怕的：' + h.fear);
      L.push('一句实在话：' + h.truth);
      L.push('今天做一件：' + h.act);
    }
    var msg = '已复制，可以发给别人了', bad = '这台设备不让复制，手动选中也行';
    try {
      navigator.clipboard.writeText(L.join('\n')).then(function () { toast(msg); }, function () { toast(bad); });
    } catch (e) { toast(bad); }
  }

  /* ---- 话外音：卦断的是事，人问的是心 ---- */
  function hmCard(h) {
    if (!h) return '';
    var others = (h.others && h.others.length)
      ? '<div class="hm-note">里头还夹着：' + esc(h.others.join('、')) + '。人心里的事从来不是一件一件分开的。</div>'
      : '';
    var rep = (h.times >= 3)
      ? '<div class="hm-note">同一件事你已经问过 ' + h.times + ' 回了。问得越多，越说明心里那个结没解开，不是卦不准。</div>'
      : '';
    return '<div class="hm">' +
      '<div class="hm-h"><span class="tag">话外音</span>' +
      '<span class="hv ' + (h.level >= 3 ? 'tight' : (h.level === 2 ? 'mid' : '')) + '">' + esc(h.levelName) + '</span></div>' +
      '<div class="hm-mask">' + esc(h.mask) + '</div>' +
      '<div class="hm-row"><span class="k">你要的</span><span>' + esc(h.want) + '</span></div>' +
      '<div class="hm-row"><span class="k">你怕的</span><span>' + esc(h.fear) + '</span></div>' +
      '<div class="hm-truth"><span class="bar"></span>' + esc(h.truth) + '</div>' +
      '<div class="hm-act"><span class="k">今天做一件</span><span>' + esc(h.act) + '</span></div>' +
      others + rep +
      '<div class="hm-note">这一层是照你怎么问的看出来的，跟卦里断的事是一件事的两面。说得不贴，你只当多听了一句。</div>' +
      '</div>';
  }

  /* ---- 把已经排定的结果交给智能大脑，让它照着讲 ---- */
  function askAbout(v, btn, stopBtn, outId, h, n) {
    var out = $(outId || 'vdAi'); if (!out) return;
    if (askQuota() <= 0) { toast('今天问得够多了，明天再来'); return; }
    var hm = h || (HM ? HM.read({ q: v.question || '', topic: v.topic, times: HM.times(v.question || '') }) : null);
    /* 这个人是谁：同一卦落在不同的命里轻重不一样，讲的时候必须落到他身上 */
    var mNow = (ME && ME.has()) ? ME.read() : null;
    /* 因人答法：没从外面传进来，就地照他的命和需求现算一套 */
    var nd = n || (NEED ? NEED.read({ vd: v, me: mNow, hm: hm }) : null);
    var L = [];
    L.push('【下面是已经排定的卦，请照着讲，不要另起一卦，也不要再摇】');
    L.push('所问：' + (v.question || '（未写明，按通盘运程）'));
    L.push('方向：' + v.topicName + '；时间：' + v.horizonName);
    L.push('起卦时间：' + v.when);
    L.push('本卦《' + v.gua.prim + '》' + (v.gua.chg ? '，变卦《' + v.gua.chg + '》' : '，六爻皆静，无变卦'));
    L.push('用神：' + (v.yong ? v.yong.gz + '（六亲' + v.yong.qin + '，五行属' + v.yong.wx + '，第' + v.yong.pos + '爻）' : '卦中无直接对应之爻'));
    L.push('用神旺衰：' + (v.vitality ? v.vitality.level + '。' + v.vitality.note.join('；') : '—'));
    L.push('世爻：' + v.shi.gz + '，六亲' + v.shi.qin + '；应爻：' + v.ying.gz + '，六亲' + v.ying.qin);
    if (v.year) L.push('流年：' + v.year.gz + '年，年气属' + v.year.wx + '。');
    if (mNow && ME.promptBlock) { L.push(''); L.push(ME.promptBlock(mNow)); }
    else if (v.meNote) { L.push(''); L.push('这个人：' + v.meNote + '。'); }
    L.push('已定的档位：' + v.badge + '（' + v.score + '／100）');
    L.push('已定的结论：' + v.headline);
    L.push('算法给出的依据：' + v.why.join(' '));
    /* 照着他的命和需求讲：同一句话换个人来问，答法就得不一样 */
    if (nd && nd.prompt) { L.push(''); L.push(nd.prompt); }
    L.push('');
    L.push('请照着上面这些实排结果讲。先给一句文言断语，再用大白话把这件事讲透，说清楚为什么是这个结论。最后给一件今天就能做的小事。');
    L.push('若看出有灾有碍，务必给出破解之法；若看出缺什么，给出改运建议，要具体到方位、颜色、物件、动作。不要把上面的数字再念一遍，讲成溜的话。');
    var brief = '排盘解读·' + v.topicName + (v.question ? '｜' + v.question : '');
    askAI(L.join('\n'), out, v.topic, btn, stopBtn, brief, { q: v.question || v.topicName, human: hm })
      .then(function () { askQuota(1); refreshAskHint(); });
  }

  function bindVd(v, h, n) {
    var b = $('vdAsk'); if (b) b.onclick = function () { askAbout(v, b, null, 'vdAi', h, n); };
    var c = $('vdCopy'); if (c) c.onclick = function () { copyVerdict(v, h); };
  }

  function renderGua() {
    var q = (($('guaQ') && $('guaQ').value) || '').trim();
    var way = $('guaWay').value, cat = $('guaCat').value;
    if (cat === '自动') cat = '';
    /* 这套东西记住：下次进来还是问这件、还是这一头、还是这种起法，不想改的不用重填 */
    if (PROF) PROF.gua({ guaQ: q, guaWay: way, guaCat: cat });
    /* 起卦之前先知道你属什么。少了这一步，断出来就是通用话术，谁问都一样。 */
    if (ME && !ME.has() && !guaSkipMe) { askForMe(renderGua); return; }
    var t = today();
    var r;
    if (way === 'time') {
      var lu = C.toLunar(t.y, t.m, t.d);
      var fp = C.fourPillars(t.y, t.m, t.d, t.h, t.mi);
      r = YJ.castByTime(t.y, t.m, t.d, t.h, lu, fp.year.zhi);
    } else {
      r = YJ.fromLines(YJ.tossSix());
      r.method = '三钱摇卦';
    }
    var fpNow = C.fourPillars(t.y, t.m, t.d, t.h, t.mi);
    var dv = YJ.divine(r, fpNow.day.gan);

    /* 先断事：认题 → 取用神 → 判旺衰 → 论世应 → 参流年 → 再看落在谁身上 */
    var me = (ME && ME.has()) ? ME.read() : null;
    var vd = VD.judge({ q: q, dv: dv, fpNow: fpNow, yearFp: fpNow, cat: cat, me: me });

    /* 原文那一版，收进折叠里 */
    var rd = RD.liuyao(dv);
    var p = r.prim;
    var lines = r.lines;
    var yaosHtml = '';
    for (var i = 5; i >= 0; i--) {
      var yang = (lines[i] === 7 || lines[i] === 9);
      var mv = (lines[i] === 6 || lines[i] === 9);
      yaosHtml += '<div class="yao' + (mv ? ' mv' : '') + '">' + yaoBar(yang, mv) +
        '<span class="t">' + RD.yaoName(i, yang) + (mv ? '动' : '') + '</span>' +
        (dv.zhuang ? '<span class="ss">' + dv.zhuang.yao[i].gz + '·' + dv.zhuang.yao[i].qin + (dv.zhuang.yao[i].shi ? ' 世' : '') + (dv.zhuang.yao[i].ying ? ' 应' : '') + '</span>' : '') +
        '</div>';
    }
    var secs = rd.sections.map(function (s) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(s.h) + '</h3>' +
        '<div class="wen">' + esc(s.wen) + '</div><div class="bai">' + esc(s.bai) + '</div></div>';
    }).join('');
    var fix = rd.fix && rd.fix.length ? '<div class="tip fix"><b>破解与应对</b><ul class="fixlist">' +
      rd.fix.map(function (f) { return '<li>' + esc(f.text) + '</li>'; }).join('') + '</ul></div>' : '';
    var guaHtml = '<div class="hexbox"><div class="glyph">' + p.glyph + '</div><div class="yaolite">' + yaosHtml + '</div></div>' +
      (dv.chg ? '<div class="tip ok" style="text-align:center">本卦《' + p.name + '》　→　变卦《' + dv.chg.name + '》</div>' : '') +
      secs + fix;

    /* 结论卡顶在上面，推算过程收进折叠 */
    var tail = '<details class="det"><summary>想自己看推算过程（卦象 · 装卦 · 原文）</summary>' +
      '<div class="sec-h" style="margin-top:4px"><span class="bar"></span><h2>卦象</h2>' +
      '<span class="hint">' + esc(r.method) + '　' + fpNow.year.gz + '年 ' + (fpNow.month ? fpNow.month.gz + '月 ' : '') + fpNow.day.gz + '日 ' + fpNow.hour.gz + '时</span></div>' + guaHtml + '</details>';

    /* 话外音：把"他嘴上问的"和"他命里带的"合着读，缝进结论卡 */
    var hm = HM ? HM.read({ q: q, topic: vd.topic, times: HM.times(q), me: me }) : null;
    /* 因人答法：同一卦、同一句话，按他的命和需求换一套答法 */
    var nd = NEED ? NEED.read({ vd: vd, me: me, hm: hm }) : null;
    var html = vdCard(vd, { h: hm, n: nd });
    // 折叠区塞进结论卡底部（落在 .vd-b 里、注释行之前）
    html = html.replace('<div class="vd-note">', tail + '<div class="vd-note">');
    // 卦说完了，再照着他的话讲一层人（完整版话外音卡保留在下方，作展开）
    $('guaOut').innerHTML = html + hmCard(hm);
    bindVd(vd, hm, nd);
    if (q) HM.note(q);
    track('#/gua');
  }

  /* ---- 生辰八字 ---- */
  function viewBazi() {
    return pbar('生辰八字 · 命理') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>生辰八字</h2><span class="hint">四柱 · 五行 · 十神 · 大运</span></div>' +
      '<div class="frow"><div class="fld"><label>出生年</label><input id="bzY" type="number" value="1990" min="1900" max="' + ME.YMAX + '"></div>' +
      '<div class="fld"><label>月</label><input id="bzM" type="number" value="1" min="1" max="12"></div>' +
      '<div class="fld"><label>日</label><input id="bzD" type="number" value="1" min="1" max="31"></div>' +
      '<div class="fld"><label>时</label><input id="bzH" type="number" value="12" min="0" max="23"></div>' +
      '<div class="fld"><label>分</label><input id="bzMi" type="number" value="0" min="0" max="59"></div>' +
      '<div class="fld"><label>性别</label><select id="bzS"><option value="male">男</option><option value="female">女</option></select></div></div>' +
      '<div class="tip" style="font-size:12.5px;color:var(--ink3)">日柱按传统<b>子时（23 时）换日</b>定；年柱、月柱按<b>立春与十二节</b>分界，与部分万年历的零点换日略有出入。不知生时者，默认按午时（12 时）试排。</div>' +
      '<div class="tools"><button class="btn" id="bzGo">排 盘</button></div>' +
      '<div class="res" id="bzOut"></div></div>';
  }
  function renderBazi() {
    var y = +$('bzY').value, m = +$('bzM').value, d = +$('bzD').value, h = +$('bzH').value, mi = +$('bzMi').value, g = $('bzS').value;
    if (PROF) PROF.bazi({ bzY: y, bzM: m, bzD: d, bzH: h, bzMi: mi, bzS: g });
    if (!(y >= ME.YMIN && y <= ME.YMAX)) { toast('年份取 ' + ME.YMIN + ' 至 ' + ME.YMAX + ' 之间'); return; }
    var fp = C.fourPillars(y, m, d, h, mi);
    var stat = C.wuxingStat(fp);
    var dy = C.daYun(y, m, d, h, fp, g, 8);
    var lu = C.toLunar(y, m, d);
    var rd = RD.bazi(fp, stat, dy, g);
    var GAN = C.GAN, ZHI = C.ZHI;
    var cols = [['年柱', fp.year], ['月柱', fp.month], ['日柱', fp.day], ['时柱', fp.hour]];
    var tb = '<table class="dt"><tr><th>柱</th><th>天干</th><th>地支</th><th>干行</th><th>支行</th><th>十神</th><th>纳音</th></tr>';
    cols.forEach(function (cc) {
      var pos = cc[0], p = cc[1]; if (!p) return;
      var ss = pos === '日柱' ? '日主' : C.shiShen(fp.day.gan, p.gan);
      var idx = C.gzIndexOf(p.gan, p.zhi);
      tb += '<tr><td class="k">' + pos + '</td><td>' + GAN[p.gan] + '</td><td>' + ZHI[p.zhi] + '</td><td>' +
        C.ganWx(p.gan) + '</td><td>' + C.zhiWx(p.zhi) + '</td><td>' + ss + '</td><td>' + C.nayin(idx) + '</td></tr>';
    });
    tb += '</table>';
    var bars = stat.list.map(function (x) {
      var pct = Math.min(100, Math.round(x.v / (stat.strongest.v || 1) * 100));
      return '<div class="bar-row"><span class="t">' + x.wx + '</span><span class="bt"><i class="bf" style="width:' + pct + '%"></i></span><span class="v">' + x.v + '</span></div>';
    }).join('');
    var dyTb = '<table class="dt"><tr><th>大运</th>' + dy.list.map(function (x) { return '<th>' + x.startAge + '岁</th>'; }).join('') + '</tr>' +
      '<tr><td class="k">' + (dy.forward ? '顺行' : '逆行') + '</td>' + dy.list.map(function (x) { return '<td>' + x.gz + '</td>'; }).join('') + '</tr>' +
      '<tr><td class="k">起始年</td>' + dy.list.map(function (x) { return '<td>' + x.startYear + '</td>'; }).join('') + '</tr></table>';
    var secs = rd.sections.map(function (s) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(s.h) + '</h3>' +
        '<div class="wen">' + esc(s.wen) + '</div><div class="bai">' + esc(s.bai) + '</div></div>';
    }).join('');
    var fix = rd.fix.length ? '<div class="tip fix"><b>调补与改运</b><ul class="fixlist">' +
      rd.fix.map(function (f) { return '<li><b>补' + f.wx + '：</b>' + esc(f.text.replace(/^补【.+?】：/, '')) + '</li>'; }).join('') + '</ul></div>' : '';
    $('bzOut').innerHTML = '<div class="card" style="margin-top:16px">' +
      '<div class="sec-h"><span class="bar"></span><h2>四柱排盘</h2><span class="hint">' + esc(g === 'female' ? '坤造' : '乾造') + '　' + y + '年' + m + '月' + d + '日' + h + '时　农历' + (lu ? lu.cn : '不详') + '</span></div>' +
      tb +
      '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>五行分布</h2></div>' + bars +
      '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>大运流转</h2></div>' + dyTb +
      secs + fix + '</div>';
    bindAskFrom('bazi', fp, stat, dy, g);
    track('#/bazi');
  }
  function bindAskFrom(kind, fp, stat, dy, g) {
    var host = kind === 'bazi' ? $('bzOut') : null; if (!host) return;
    var box = document.createElement('div');
    box.className = 'tools';
    box.innerHTML = '<button class="btn ghost" id="bzAsk">就这个八字，问问易玄机</button>';
    host.querySelector('.card').appendChild(box);
    $('bzAsk').onclick = function () {
      location.hash = '#/ask';
      setTimeout(function () {
        var q = $('askInput');
        if (q) q.value = '我的八字是 ' + fp.year.gz + '年 ' + (fp.month ? fp.month.gz + '月 ' : '') + fp.day.gz + '日 ' + fp.hour.gz + '时，'
          + (g === 'female' ? '女命' : '男命') + '，日主' + C.GAN[fp.day.gan] + '。请断一断我的格局与近运，并给破解调补之法。';
      }, 60);
    };
  }

  /* ---- 奇门遁甲 ---- */
  function viewQimen() {
    var t = today();
    return pbar('奇门遁甲 · 择时') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>奇门遁甲排盘</h2><span class="hint">时家转盘 · 拆补法定局</span></div>' +
      '<div class="frow"><div class="fld"><label>年</label><input id="qmY" type="number" value="' + t.y + '"></div>' +
      '<div class="fld"><label>月</label><input id="qmM" type="number" value="' + t.m + '"></div>' +
      '<div class="fld"><label>日</label><input id="qmD" type="number" value="' + t.d + '"></div>' +
      '<div class="fld"><label>时</label><input id="qmH" type="number" value="' + t.h + '"></div>' +
      '<div class="fld"><label>分</label><input id="qmMi" type="number" value="' + t.mi + '"></div>' +
      '<div class="fld"><label>问事</label><select id="qmCat">' +
      ['general|综合', '事业|事业', '求财|求财', '婚姻|婚姻', '疾病|疾病', '出行|出行', '诉讼|诉讼', '考试|考试', '失物|失物'].map(function (x) {
        var a = x.split('|'); return '<option value="' + a[0] + '">' + a[1] + '</option>';
      }).join('') + '</select></div></div>' +
      '<div class="tools"><button class="btn" id="qmGo">排 盘</button><button class="btn ghost" id="qmNow">用当下时辰</button></div>' +
      '<div class="res" id="qmOut"></div></div>';
  }
  function renderQimen() {
    var r = QM.run({ y: +$('qmY').value, m: +$('qmM').value, d: +$('qmD').value, h: +$('qmH').value, mi: +$('qmMi').value, category: $('qmCat').value });
    if (!r) { toast('该年份超出节气表范围（1900 到 2100）'); return; }
    var rd = RD.qimen(r);
    var order = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
    var gHtml = '';
    order.forEach(function (row) {
      row.forEach(function (g) {
        var x = r.gongs[g];
        gHtml += '<div class="g' + (x.isZhiFu || x.isShiGan ? ' hi' : '') + '">' +
          '<div class="n">' + x.name + g + '宫' + (x.isZhiFu ? '·符' : '') + '</div>' +
          '<div class="s">' + x.star + '　' + (x.door || '无门') + '</div>' +
          '<div class="sg">' + x.shen + '　' + x.yi + '</div></div>';
      });
    });
    var secs = rd.sections.map(function (s) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(s.h) + '</h3>' +
        '<div class="wen">' + esc(s.wen) + '</div><div class="bai">' + esc(s.bai) + '</div></div>';
    }).join('');
    var fix = '<div class="tip fix"><b>择时择方之法</b><ul class="fixlist">' +
      rd.fix.map(function (f) { return '<li>' + esc(f.text) + '</li>'; }).join('') + '</ul></div>';
    $('qmOut').innerHTML = '<div class="card" style="margin-top:16px">' +
      '<div class="sec-h"><span class="bar"></span><h2>九宫盘</h2><span class="hint">' + esc(r.ding.yinYang) + '遁 ' + r.ding.ju + '局　' + esc(r.ding.termName) + ' ' + esc(r.ding.yuan) + '</span></div>' +
      '<div class="qm">' + gHtml + '</div>' + secs + fix + '</div>';
    track('#/qimen');
  }

  /* ---- 风水布局 ---- */
  function viewFengshui() {
    return pbar('风水布局 · 宅命') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>风水布局</h2><span class="hint">八宅 · 流年飞星 · 现代风水</span></div>' +
      '<div class="frow"><div class="fld"><label>出生年</label><input id="fsY" type="number" value="1990" min="1900" max="' + ME.YMAX + '"></div>' +
      '<div class="fld"><label>性别</label><select id="fsS"><option value="male">男</option><option value="female">女</option></select></div>' +
      '<div class="fld"><label>看哪一年的流年</label><input id="fsYr" type="number" value="' + today().y + '"></div></div>' +
      '<div class="tools"><button class="btn" id="fsGo">看 宅</button></div>' +
      '<div class="res" id="fsOut"></div></div>';
  }
  function renderFengshui() {
    var y = +$('fsY').value, g = $('fsS').value, yr = +$('fsYr').value;
    var mg = FS.mingGua(y, g);
    var house = FS.eightHouse(mg.gua);
    var ys = FS.yearStar(yr);
    var rd = RD.fengshui(mg, house, ys);
    var secs = rd.sections.map(function (s) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(s.h) + '</h3>' +
        '<div class="wen">' + esc(s.wen) + '</div><div class="bai">' + esc(s.bai) + '</div></div>';
    }).join('');
    var hTb = '<table class="dt"><tr><th>方位</th><th>卦</th><th>游年星</th><th>吉凶</th><th>宜忌</th></tr>' +
      house.map(function (x) {
        var col = x.luck.indexOf('凶') >= 0 ? 'var(--bad)' : (x.luck.indexOf('大吉') >= 0 || x.luck === '吉' ? 'var(--ok)' : 'var(--warn)');
        return '<tr><td class="k">' + x.dir + '</td><td>' + x.gua + '</td><td>' + x.star + '</td><td style="color:' + col + '">' + x.luck + '</td><td style="text-align:left;font-size:12.5px">' + esc(x.mean) + '</td></tr>';
      }).join('') + '</table>';
    // 流年九宫
    var pan = FS.flyPan(ys);
    var order = [[4, 9, 2], [3, 5, 7], [8, 1, 6]], gHtml = '';
    order.forEach(function (row) {
      row.forEach(function (gg) {
        var st = pan[gg].star, inf = FS.STAR9[st];
        var risky = (st === 5 || st === 2);
        gHtml += '<div class="g' + (risky ? ' hi' : '') + '"><div class="n">' + FS.PALACE_DIR[gg] + '</div>' +
          '<div class="s">' + inf.n + '</div><div class="sg">' + inf.wx + '·' + inf.luck + '</div></div>';
      });
    });
    // 现代风水
    var rooms = FS.MODERN_ROOM.map(function (r) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(r.n) + '</h3>' +
        '<div class="wen">' + esc(r.sys) + '</div>' +
        '<div class="bai">' + esc(r.fact) + '<br><br><b>做法：</b>' + esc(r.do) + '</div></div>';
    }).join('');
    var sha = FS.MODERN_SHA.map(function (s) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(s.n) + '</h3>' +
        '<div class="wen">' + esc(s.desc) + '　' + esc(s.sys) + '</div>' +
        '<div class="bai">' + esc(s.fact) + '<br><br><b>化解：</b>' + esc(s.fix) + '</div></div>';
    }).join('');
    var rules = FS.MODERN_RULE.map(function (r) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(r.t) + '</h3>' +
        '<div class="bai">' + esc(r.fact) + '<br><b>做法：</b>' + esc(r.do) + '</div></div>';
    }).join('');
    var fix = rd.fix.length ? '<div class="tip fix"><b>化解与布局之法</b><ul class="fixlist">' +
      rd.fix.map(function (f) { return '<li>' + esc(f.text) + '</li>'; }).join('') + '</ul></div>' : '';
    $('fsOut').innerHTML = '<div class="card" style="margin-top:16px">' +
      '<div class="sec-h"><span class="bar"></span><h2>八宅游年</h2><span class="hint">' + esc(mg.gua) + '命 · ' + esc(mg.group) + '</span></div>' + hTb + secs +
      '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>' + yr + ' 年九宫飞星</h2><span class="hint">' + FS.STAR9[ys].n + '入中</span></div>' +
      '<div class="qm">' + gHtml + '</div>' + fix +
      '<div class="sec-h" style="margin-top:20px"><span class="bar"></span><h2>现代风水 · 区域要点</h2></div>' + rooms +
      '<div class="sec-h" style="margin-top:20px"><span class="bar"></span><h2>现代风水 · 常见外煞与化解</h2></div>' + sha +
      '<div class="sec-h" style="margin-top:20px"><span class="bar"></span><h2>现代风水 · 通则</h2></div>' + rules +
      '<div class="tip warn" style="margin-top:16px">以上「原文」一栏为传统堪舆体系说法，属文化传承；各派之间对同一方位的判断也并不一致，请勿当作事实依据。「白话」一栏中标注了可验证的环境或设计依据者，方可作为装修参考。</div>' +
      '</div>';
    track('#/fengshui');
  }

  /* ---- 万年历 ---- */
  function viewAlmanac() {
    var t = today();
    return pbar('万年历 · 黄历') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>万年历</h2><span class="hint">干支 · 农历 · 建除 · 宜忌</span></div>' +
      '<div class="frow"><div class="fld"><label>年</label><input id="alY" type="number" value="' + t.y + '"></div>' +
      '<div class="fld"><label>月</label><input id="alM" type="number" value="' + t.m + '"></div>' +
      '<div class="fld"><label>日</label><input id="alD" type="number" value="' + t.d + '"></div></div>' +
      '<div class="tools"><button class="btn" id="alGo">查 历</button><button class="btn ghost" id="alToday">回到今天</button></div>' +
      '<div class="res" id="alOut"></div></div>';
  }
  function renderAlmanac() {
    var y = +$('alY').value, m = +$('alM').value, d = +$('alD').value;
    var info = AL.dayInfo(y, m, d);
    var rd = RD.almanac(info);
    var secs = rd.sections.map(function (s) {
      return '<div class="rsec"><h3><span class="dot"></span>' + esc(s.h) + '</h3>' +
        '<div class="wen">' + esc(s.wen) + '</div><div class="bai">' + esc(s.bai) + '</div></div>';
    }).join('');
    // 前后三日
    var list = [], base = new Date(y, m - 1, d);
    for (var i = -1; i <= 1; i++) {
      var dd = new Date(base); dd.setDate(dd.getDate() + i);
      var x = AL.dayInfo(dd.getFullYear(), dd.getMonth() + 1, dd.getDate());
      list.push('<tr><td class="k">' + (i === 0 ? '本日' : (i < 0 ? '前一日' : '后一日')) + '</td><td>' + (dd.getMonth() + 1) + '-' + dd.getDate() +
        '</td><td>' + (x.lunar ? x.lunar.cn : '') + '</td><td>' + x.fp.day.gz + '</td><td>' + x.jianchu + '</td><td>' + x.jcMean.lucky + '</td></tr>');
    }
    var fix = '<div class="tip fix"><b>择日之法</b><ul class="fixlist">' +
      rd.fix.map(function (f) { return '<li>' + esc(f.text) + '</li>'; }).join('') + '</ul></div>';
    $('alOut').innerHTML = '<div class="card" style="margin-top:16px">' +
      '<div class="sec-h"><span class="bar"></span><h2>' + y + '年' + m + '月' + d + '日</h2><span class="hint">' + esc(info.gz) + '　' + esc(info.lunar ? info.lunar.cn : '') + '</span></div>' +
      '<table class="dt"><tr><th>干支</th><th>生肖</th><th>建除</th><th>冲煞</th><th>二十八宿</th><th>日纳音</th></tr>' +
      '<tr><td>' + info.gz + '</td><td>' + info.shengxiao + '</td><td>' + info.jianchu + '</td><td>冲' + info.chong.shengxiao + ' 煞' + info.sha + '</td><td>' + info.xiu.full + '</td><td>' + info.nayin.day + '</td></tr></table>' +
      '<table class="dt" style="margin-top:10px"><tr><th>对照</th><th>日期</th><th>农历</th><th>日柱</th><th>建除</th><th>吉凶</th></tr>' + list.join('') + '</table>' +
      secs + fix + '</div>';
    track('#/almanac');
  }

  /* ---- 五行八卦 ---- */
  function viewWuxing() {
    var qm = window.QIMEN_DATA;
    var wxCycle = '<div class="rsec"><h3><span class="dot"></span>五行生克</h3>' +
      '<div class="wen">木生火，火生土，土生金，金生水，水生木。木克土，土克水，水克火，火克金，金克木。</div>' +
      '<div class="bai">五行之间有两种关系：一种是「生」，一种是「克」。生就是帮忙、滋养，木生火（木头烧出火）、火生土（烧完成灰）、土生金（土里出金属）、金生水（金属表面凝水）、水生木（水浇树）。克就是压制、约束，木克土（树根破土）、土克水（土能挡水）、水克火（水灭火）、火克金（火能化金）、金克木（刀能砍树）。记这两条就够用了。</div></div>';
    var baGua = qm.bagua.map(function (b) {
      return '<tr><td class="k">' + b.glyph + ' ' + b.name + '</td><td>' + b.nature + '</td><td>' + b.element + '</td><td>' + b.direction + '</td><td>' + b.family + '</td><td>' + b.animal + '</td><td>' + b.body + '</td></tr>';
    }).join('');
    var ganTb = C.GAN.map(function (g, i) {
      return '<tr><td class="k">' + g + '</td><td>' + (i % 2 === 0 ? '阳' : '阴') + '</td><td>' + C.GAN_WX[i] + '</td><td>' + ['东', '东', '南', '南', '中', '中', '西', '西', '北', '北'][i] + '</td></tr>';
    }).join('');
    var zhiTb = C.ZHI.map(function (z, i) {
      var cang = C.ZHI_CANG[z].join('、');
      return '<tr><td class="k">' + z + '</td><td>' + (i % 2 === 0 ? '阳' : '阴') + '</td><td>' + C.ZHI_WX[i] + '</td><td>' + cang + '</td><td>' + ['23-1', '1-3', '3-5', '5-7', '7-9', '9-11', '11-13', '13-15', '15-17', '17-19', '19-21', '21-23'][i] + '</td></tr>';
    }).join('');
    var nayinRows = '';
    for (var i = 0; i < 60; i += 2) {
      nayinRows += '<tr><td>' + C.gzName(i) + '</td><td>' + C.gzName(i + 1) + '</td><td class="k">' + C.nayin(i) + '</td></tr>';
    }
    return pbar('五行八卦 · 基础') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>五行八卦基础</h2><span class="hint">术数公器</span></div>' +
      wxCycle +
      '<div class="rsec"><h3><span class="dot"></span>八卦类象（后天方位）</h3>' +
      '<div class="bai">先天八卦讲对待，后天八卦讲流行。排盘看方位，用的是后天八卦。</div>' +
      '<table class="dt" style="margin-top:8px"><tr><th>卦</th><th>性</th><th>五行</th><th>方位</th><th>人伦</th><th>动物</th><th>身体</th></tr>' + baGua + '</table></div>' +
      '<div class="rsec"><h3><span class="dot"></span>十天干</h3>' +
      '<table class="dt" style="margin-top:8px"><tr><th>天干</th><th>阴阳</th><th>五行</th><th>方位</th></tr>' + ganTb + '</table></div>' +
      '<div class="rsec"><h3><span class="dot"></span>十二地支</h3>' +
      '<table class="dt" style="margin-top:8px"><tr><th>地支</th><th>阴阳</th><th>五行</th><th>藏干</th><th>时辰</th></tr>' + zhiTb + '</table></div>' +
      '<div class="rsec"><h3><span class="dot"></span>六十甲子纳音</h3>' +
      '<table class="dt" style="margin-top:8px"><tr><th>甲子</th><th>乙丑</th><th>纳音</th></tr>' + nayinRows + '</table></div>' +
      '</div>';
  }

  /* ---- 问易玄机 ---- */
  // 问过的事：从他的档案里取最近几笔，摆成chip，点一下接着问
  function caseChipsHtml() {
    if (!CASE) return '';
    var items = [];
    try { items = CASE.list(4); } catch (e) { return ''; }
    if (!items.length) return '';
    var seen = {}, rows = [];
    for (var i = 0; i < items.length; i++) {
      var q = items[i].q || items[i].situation;
      if (!q || seen[q]) continue;
      seen[q] = 1;
      rows.push('<button class="btn ghost sm chip case-chip" data-q="' + esc(q) + '" title="' + agoCN(items[i].t) + '问过 · ' + esc(items[i].gua || '') + '">' +
        esc(q.length > 18 ? q.slice(0, 17) + '…' : q) + '<span class="cc-meta">' + agoCN(items[i].t) + '</span></button>');
    }
    if (!rows.length) return '';
    return '<div class="case-strip"><div class="cs-h">你问过的事<span class="cs-tip">点一下接着问，他都记得</span></div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap">' + rows.join('') + '</div></div>';
  }
  function agoCN(t) {
    var ms = Date.now() - t;
    if (ms < 36e5) return '刚刚';
    if (ms < 864e5) return Math.round(ms / 36e5) + ' 小时前';
    var d = Math.round(ms / 864e5);
    if (d < 30) return d + ' 天前';
    return Math.round(d / 30) + ' 个月前';
  }
  function viewAsk() {
    var chips = ['我这份工作该不该换', '今年还能不能赚到钱', '我和他合不合', '家里最近不顺，是不是风水问题', '总睡不好，怎么调'];
    return pbar('问易玄机 · AI 大师') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>问易玄机</h2><span class="hint">先答四题，再听他讲</span></div>' +
      '<div class="hero" style="padding:0 0 6px;text-align:left"><div class="desc">把你那件事写出来。老先生要先问清情况，才肯开口。上来就给答案的，多半是糊弄人的。<b>答完四题，先当场起一卦，把结论摆给你看，再把你这句话背后那一层说给你听。</b></div></div>' +
      '<div id="meBox" style="margin-top:12px"></div>' +
      '<div class="frow" style="margin-top:12px"><div class="fld" style="flex:1 1 100%">' +
      '<textarea id="askInput" placeholder="一句话说清楚就好。例：做了三年的店想转手，不知道是不是时候。"></textarea></div></div>' +
      caseChipsHtml() +
      '<div style="margin-top:8px;display:flex;gap:7px;flex-wrap:wrap">' +
      chips.map(function (c) { return '<button class="btn ghost sm chip">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="tools"><button class="btn" id="askGo">先答几个问题 →</button>' +
      '<button class="btn ghost" id="askStop" style="display:none">停 下</button>' +
      '<span style="font-size:12.5px;color:var(--ink3)" id="askHint"></span></div>' +
      '<div id="askVd"></div>' +
      '<div class="qa-out" id="askOut"></div></div>';
  }
  function askQuota(n) {
    try {
      var d = new Date(), k = 'yxj_ask_' + d.getFullYear() + (d.getMonth() + 1) + d.getDate();
      if (n === undefined) return Math.max(0, 10 - ((+localStorage.getItem(k)) || 0));
      localStorage.setItem(k, String(((+localStorage.getItem(k)) || 0) + n));
    } catch (e) { }
    return 10;
  }
  function refreshAskHint() {
    var h = $('askHint'); if (!h) return;
    var left = askQuota();
    h.textContent = left > 0 ? ('今天还能问 ' + left + ' 次。') : '今天问得够多了，明天再来。';
  }
  // 答题卡方向 → 起卦页「侧重」用的中文名（判决引擎以下拉为准）
  var CAT_FOR = { career: '事业', wealth: '求财', love: '感情', health: '健康', home: '综合', general: '自动' };

  function startAskFlow() {
    var q = (($('askInput') && $('askInput').value) || '').trim();
    if (PROF && q) PROF.ask({ askInput: q });
    if (askQuota() <= 0) { toast('今天问得够多了，明天再来'); return; }
    openCard('问易玄机', askSteps, function (a) {
      var topic = a[0], situation = a[1], hmPick = a[2], wantMe = a[3];
      /* 他说要按生辰断，却还没填过：先把人问清楚，填完自动接着算 */
      if (wantMe === 'me' && ME && !ME.has()) {
        meEditing = true;
        renderMeBox();
        var box = $('meBox');
        if (box) { try { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { } }
        pendingAfterMe = function () { doAskFlow(q, topic, situation, hmPick); };
        toast('先把生辰填上，填完接着算');
        return;
      }
      doAskFlow(q, topic, situation, hmPick);
    }, { key: 'ask', resume: true });
  }

  /* 起卦 → 判词 → 交给智脑，一套走完 */
  function doAskFlow(q, topic, situation, hmPick) {
    if (askQuota() <= 0) { toast('今天问得够多了，明天再来'); return; }
    var t = today();
    var fpNow = C.fourPillars(t.y, t.m, t.d, t.h, t.mi);
    var me = (ME && ME.has()) ? ME.read() : null;
    // 当场起一卦，让老先生手上有实排的东西，不至于空口讲
    var r = YJ.fromLines(YJ.tossSix()); r.method = '三钱摇卦';
    if (me) {
      var lu = C.toLunar(t.y, t.m, t.d);
      r = YJ.castByTime(t.y, t.m, t.d, t.h, lu, fpNow.year.zhi);
      r.method = '梅花易数·时间起卦';
    }
    var dv = YJ.divine(r, fpNow.day.gan);
    var vd = VD.judge({ q: q || situation, dv: dv, fpNow: fpNow, yearFp: fpNow, cat: CAT_FOR[topic], me: me });
    if (!vd) { toast('这一卦没排出来，再试一次'); return; }
    // 他亲口挑的那一头最重：卦断事，人断心
    var hm = HM ? HM.read({ q: q || situation, topic: vd.topic, pick: hmPick, times: HM.times(q || situation) }) : null;
    /* 因人答法：同一卦同一问，按他的命和需求换一套答法 */
    var nd = NEED ? NEED.read({ vd: vd, me: me, hm: hm }) : null;

    var vdBox = $('askVd');
    if (vdBox) vdBox.innerHTML = vdCard(vd, { noTools: true, n: nd }) + hmCard(hm) +
      '<div class="vd-mini">上面这一卦是本机当场排的，不是随口编的。下面是易玄机照着这一卦，再对着你刚说的那句实话，细讲给你听。</div>';

    var lines = [];
    lines.push('【情况卡】问事方向：' + (TOPIC_HINT[topic] || ''));
    lines.push('具体情形：' + situation);
    if (me) lines.push('他的生辰：' + me.zao + '，' + ME.line(me));
    if (q) lines.push('对方原话：' + q);
    lines.push('');
    if (vd) {
      lines.push('【已经排定的卦，请照着讲，不要再起卦，也不要摇一卦新的】');
      lines.push(vd.plain);
      lines.push('本卦《' + vd.gua.prim + '》' + (vd.gua.chg ? '，变卦《' + vd.gua.chg + '》' : '，六爻皆静，无变卦'));
      lines.push('用神：' + (vd.yong ? vd.yong.gz + '（六亲' + vd.yong.qin + '，五行属' + vd.yong.wx + '，第' + vd.yong.pos + '爻）' : '卦中无直接对应之爻'));
      lines.push('用神旺衰：' + (vd.vitality ? vd.vitality.level : '—') + '；世爻 ' + vd.shi.gz + '（' + vd.shi.qin + '）');
      lines.push('算法定的档位：' + vd.badge + '。依据：' + vd.why.join(' '));
      lines.push('');
    }
    if (me && ME.promptBlock) { lines.push(ME.promptBlock(me)); lines.push(''); }
    if (nd && nd.prompt) { lines.push(nd.prompt); lines.push(''); }
    lines.push('请先给一句文言断语，再用大白话把这件事讲透，最后给一件今天就能做的小事。若看出有灾有碍，务必给出破解之法与改运建议。');
    // 存进台账的摘要：只留人话，不留提示词
    var brief = '方向·' + (TOPIC_NAME[topic] || topic) + '｜情形·' + situation + (q ? '｜原话·' + q : '');
    if (q || situation) HM.note(q || situation);
    var out = $('askOut');
    askAI(lines.join('\n'), out, topic, $('askGo'), $('askStop'), brief,
      { q: q || situation, human: hm, hmPicked: hmPick, me: me })
      .then(function (res) {
        askQuota(1); refreshAskHint();
        // 这一笔记进他自己的档案：下回他再来，老先生认得他
        if (res && res.ok && CASE) {
          try {
            CASE.add({
              q: q || '', topic: topic, topicName: TOPIC_NAME[topic] || topic,
              situation: situation || '', gua: vd.gua.prim, chg: vd.gua.chg || '',
              badge: vd.badge, score: vd.score, brief: (res.text || '').slice(0, 160)
            });
            var box = out.querySelector('.answer');
            if (box && CASE.count() >= 2) {
              var ml = document.createElement('div');
              ml.className = 'memline';
              ml.textContent = '这件事也记进你的档案了（第 ' + CASE.count() + ' 笔）。下回再来，老先生认得你，也认得这件事。';
              box.appendChild(ml);
            }
          } catch (e) { }
        }
      });
  }

  /* ---- 学这套体系 ---- */
  var LADDER = [
    {
      h: '先认字：天干、地支、五行',
      meta: '一两周　每天十分钟',
      txt: '十个天干（甲乙丙丁戊己庚辛壬癸）、十二地支（子丑寅卯辰巳午未申酉戌亥），各自属什么五行；五行怎么相生、怎么相克；六十甲子是怎么一轮一轮排下来的。这一步只是认字，不用急着断事。',
      drill: '打开「万年历」，看今天是哪两个字排日柱，猜猜明天是什么。猜错没关系，连着看三天就记住了。'
    },
    {
      h: '会排自己的八字',
      meta: '两到四周',
      txt: '四柱是哪四柱；为什么年柱要等立春才换、月柱要跟着节气走；时柱用五鼠遁怎么推。干支一配，一个人的底子就摆在纸上了。',
      drill: '把你自己和家里人的生辰各排一遍，对照「生辰八字」那一页看十神和五行旺衰。<b>排满三个人，这一步就过了。</b>'
    },
    {
      h: '学会起卦、学会装卦',
      meta: '一到两个月',
      txt: '三枚铜钱怎么摇；六是老阴、九是老阳，这两个会变，叫动爻，动爻一变就出变卦；六十四卦分归八个宫；每一爻要配上干支、配上六亲（父母、兄弟、子孙、妻财、官鬼）和六神。',
      drill: '每天摇一卦，先别急着看系统怎么说。自己把卦画出来、把六亲标上去，标完了再对答案。<b>对上的记下来，对不上的就是没懂的地方。</b>'
    },
    {
      h: '学会断一件事',
      meta: '三到六个月',
      txt: '问什么事就看什么爻：问钱看妻财，问工作看官鬼和父母，问感情看官鬼和妻财，问身体看世爻和官鬼，问家宅看父母。然后看那一爻在月建、日辰面前是旺是衰，落没落空亡；再看它跟代表你的世爻是什么关系；动爻变出的那一卦说明事情往哪儿走；最后看今年的太岁是帮你还是按你。',
      drill: '同一件事连摇十天，看十次的结论稳不稳。稳，说明你取用神取对了；天天不一样，说明还没入门，回去看第二步。'
    },
    {
      h: '再碰奇门和风水',
      meta: '半年往上',
      txt: '奇门一个时辰一张盘，先后学定局（哪个节气、上中下哪一元、阴遁还是阳遁第几局），再认九宫里的九星、八门、八神。风水先学八宅（你是东四命还是西四命、哪个方位对你好），再学流年飞星。',
      drill: '出门办要紧事之前，先看当天的奇门盘，找出生门、开门在哪个方位，往那边走。'
    }
  ];
  var HOMEWORK = [
    '<b>每天</b>看一眼万年历，知道今天什么日子、宜什么忌什么。一分钟的事。',
    '<b>每周</b>摇一卦，先自己断，写在纸上，再看系统怎么说。对不上的地方，就是你这周要补的地方。',
    '<b>每月</b>把这个月断过的翻出来算一次总账，哪些说对了、哪些说错了。断卦的本事，全在这个复盘里长。'
  ];
  var BOOKS = [
    ['《周易》经文', '六十四卦的卦辞爻辞。先读原文，白话解释当拐杖，别当主粮。'],
    ['《增删卜易》清·野鹤老人', '六爻实战第一书，通篇是案例，最值得反复读。'],
    ['《卜筮正宗》清·王洪绪', '装卦、世应、取用神的规矩，查漏补缺用。'],
    ['《渊海子平》《三命通会》', '八字的两本底子书，看十神和大运靠这两本。'],
    ['《烟波钓叟歌》', '奇门的口诀。先背下来，再慢慢懂。'],
    ['《八宅明镜》《葬书》', '风水入门。看阳宅，从八宅明镜开始。']
  ];
  var STUCK = [
    ['卡在记不住五行生克', '别背表格，用生活里的例子记。水生木，浇了水的树才长；木生火，钻木取火；火生土，烧完了剩灰；土生金，金子从土里挖出来；金生水，金属一凉就凝水珠。克也一样：水克火、火克金、金克木、木克土、土克水。就把这一圈连着念三天。'],
    ['卡在装卦搞不清世应', '先别管为什么。把六十四卦八个宫抄一遍，每宫八个卦，世爻落在第几爻是有定数的。抄三遍手上就有感觉了。'],
    ['卡在用神取不准', '这是最常见的一关。规矩只有一句：问什么就找什么爻；有动爻先看动爻，没动爻就看持世的那一爻。同一件事问两回，两次用神不一样，多半是你那句话没说清楚。'],
    ['卡在断完了不知道对不对', '别拿别人的事练，就拿自己身上的事练。自己有感觉，断完才分得清准不准。']
  ];
  var PLAIN_SAY = [
    ['这是老祖宗攒下来的经验，能帮你换个角度看事情，但它不是判决书。拿主意的还是你自己。', '先把话说在前头'],
    ['不要拿它去吓唬人，不要拿它去骗钱。这两条破了，学问再大也没用。', '两条不能碰'],
    ['真学会的标志不是你算得多准，是你碰到事的时候，心里比原来稳。', '什么时候算学会了']
  ];

  function viewLearn() {
    var steps = LADDER.map(function (s, i) {
      return '<div class="step" data-n="' + (i + 1) + '"><h4>' + esc(s.h) + '</h4>' +
        '<div class="meta">' + esc(s.meta) + '</div>' +
        '<div class="txt">' + esc(s.txt) + '</div>' +
        '<div class="drill">练手：' + s.drill + '</div></div>';
    }).join('');
    var hw = HOMEWORK.map(function (t) { return '<span class="it">' + t + '</span>'; }).join('');
    var books = BOOKS.map(function (b) {
      return '<li><b>' + esc(b[0]) + '</b>　' + esc(b[1]) + '</li>';
    }).join('');
    var stuck = STUCK.map(function (s, i) {
      return '<details class="det2"' + (i === 0 ? ' open' : '') + '><summary>' + esc(s[0]) + '</summary>' +
        '<div class="txt" style="font-size:14.5px;line-height:1.86;color:#2b3a34">' + esc(s[1]) + '</div></details>';
    }).join('');
    var say = PLAIN_SAY.map(function (s) {
      return '<div class="say"><b>' + esc(s[1]) + '</b>　' + esc(s[0]) + '</div>';
    }).join('');

    return pbar('学这套体系 · 怎么学') +
      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>学这套体系</h2><span class="hint">从认字到会断</span></div>' +
      '<div class="desc" style="color:var(--ink2);font-size:14.5px;line-height:1.85">' +
      '这套东西不难，难在没人告诉你先学什么、后学什么。下面这条是从头开始的走法，一步一步来，不要跳。' +
      '每一步都配了练手的活，照着做就行。想按你自己的情况排一条，点最下面那个按钮。</div>' +
      '<div class="ladder">' + steps + '</div></div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>三样功课</h2><span class="hint">理论都在这三样里长出来</span></div>' +
      '<div class="blk">' + hw + '</div></div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>要读的书</h2><span class="hint">都是公有领域的老书，网上有全文</span></div>' +
      '<ul class="books">' + books + '</ul>' +
      '<div class="tip warn" style="margin-top:12px">先读原文，白话解释只当拐杖。古书里的说法带着当时的观念，读的时候自己心里要有杆秤。</div></div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>四个最容易卡住的地方</h2><span class="hint">点开看怎么过</span></div>' +
      stuck + '</div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>云端经验库</h2><span class="hint">别人问过的，也在里头</span></div>' +
      '<div class="desc" style="color:var(--ink2);font-size:14.5px;line-height:1.85">' +
      '学这套东西最磨人的，是没人可问。老先生断案的口径、口诀、常见疑问，还有每一次问事的复盘，都存在云上这份经验库里。' +
      '你问一件事，它先翻这份底子再开口；问完有用的那一段，又沉回库里。看得见的下面的数会涨。</div>' +
      '<div class="memstat" id="lrMem"></div>' +
      '<div class="tools"><button class="btn ghost" id="lrMemGo">去经验库看看 →</button></div></div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>断卦之外，还得看人</h2><span class="hint">八样卡住人的东西</span></div>' +
      '<div class="desc" style="color:var(--ink2);font-size:14.5px;line-height:1.85;margin-bottom:6px">' +
      '卦断的是事，人问的是心。同一句「今年还能不能赚到钱」，有人是缺安全感，有人是想让人替自己拍板，有人是心里早有答案、只差一个台阶。' +
      '只断卦不看人，来问的人心里会想「你说的都对，可你没说到我」。这八样是常把人卡住的地方，学断卦的时候一块儿练，点开看。</div>' +
      '<div class="blk" id="hmBlk">' + hmLearnBlock() + '</div></div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>三句实在话</h2><span class="hint">学之前先记住</span></div>' +
      say + '</div>' +

      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>按你的情况排一条路线</h2><span class="hint">答四道小题，易玄机给你出方案</span></div>' +
      '<div class="desc" style="color:var(--ink2);font-size:14.5px;line-height:1.85">' +
      '每个人的底子、时间、目的都不一样，同一条路线不适合所有人。答四个小题，老先生按你的情况说：先学哪个、哪个可以跳、每天做什么、怎么检验自己学会了、你说的那个卡点怎么破。</div>' +
      '<div class="tools"><button class="btn" id="lrGo">答四道小题，出我的路线 →</button>' +
      '<button class="btn ghost" id="lrAsk">学习上卡住了，直接问他</button>' +
      '<button class="btn ghost" id="lrStop" style="display:none">停 下</button>' +
      '<span style="font-size:12.5px;color:var(--ink3)" id="lrHint"></span></div>' +
      '<div class="qa-out" id="lrOut"></div></div>';
  }

  var LEARN_FLOW = [
    {
      no: '第 1 题 / 共 4 题', t: '你现在的底子到哪儿了？',
      opts: [
        { l: '完全没碰过，零基础', v: '零基础，天干地支都没认全', d: '连天干地支都不熟' },
        { l: '知道天干地支和五行', v: '认得干支与五行，但没系统学过', d: '会念，但没成体系' },
        { l: '会给别人起卦或排八字', v: '已经能起卦、能排八字', d: '已经上手了' },
        { l: '已经在读卦书了', v: '已经在读卦书原文', d: '在啃古书' }
      ]
    },
    {
      no: '第 2 题 / 共 4 题', t: '每天能拿出多少时间？',
      opts: [
        { l: '十分钟以内', v: '每天十分钟以内' },
        { l: '半小时左右', v: '每天大约半小时' },
        { l: '一小时以上', v: '每天一小时以上' }
      ]
    },
    {
      no: '第 3 题 / 共 4 题', t: '你想学到什么程度？',
      opts: [
        { l: '自己用，把自己的事看清', v: '自用，把自己的事看清楚' },
        { l: '能给家里人看看', v: '能给家里人看看' },
        { l: '想靠这个接活挣钱', v: '想靠这个接活挣钱' }
      ]
    },
    {
      no: '第 4 题 / 共 4 题', t: '你现在最卡在哪一步？',
      opts: [
        { l: '五行生克记不住', v: '五行生克记不住' },
        { l: '装卦搞不清世应六亲', v: '装卦的世应和六亲搞不清' },
        { l: '用神取不准', v: '用神取不准' },
        { l: '断完了不知道对不对', v: '断完了不知道对不对' }
      ]
    }
  ];
  function learnSteps() { return LEARN_FLOW; }

  function startLearnFlow() {
    if (askQuota() <= 0) { toast('今天问得够多了，明天再来'); return; }
    openCard('学这套体系', learnSteps, function (a) {
      var base = a[0], time = a[1], goal = a[2], stuck = a[3];
      var L = [];
      L.push('【要什么】按这个人的情况，给他排一条学传统术数的路线。');
      L.push('【体系纲要】这套东西分五个台阶。一，认天干地支与五行。二，排四柱八字（年柱以立春换、月柱按节气换、时柱走五鼠遁）。');
      L.push('三，起卦与装卦（三钱法、老阴老阳与动爻、变卦、京房八宫、纳甲、世应、六亲六神）。');
      L.push('四，六爻断事（先认题、再取用神、判旺衰、论世应、看动爻变卦、参流年）。');
      L.push('五，奇门遁甲与风水入门（定局九宫八门九星八神；八宅东西四命与流年飞星）。');
      L.push('日常功课：每天看一次万年历，每周摇一卦先自断再对答案，每月复盘一次。');
      L.push('');
      L.push('【他的情况】底子：' + base + '。每天时间：' + time + '。想学到：' + goal + '。现在卡在：' + stuck + '。');
      L.push('');
      L.push('【要怎么答】按他这三个条件把这条路排出来，要讲清这几层：他该从哪个台阶起步、哪几个台阶可以快走或先跳过，为什么；');
      L.push('每个台阶大概花多久，每天具体做什么，做到什么样算过关；针对他说的那个卡点，给一个今天就能试的破法；');
      L.push('怎么检验自己真学会了。最后给一句他明天就能开始做的事。');
      L.push('先给一句文言断语，再用大白话把这条路线讲给他听。不许写成一二三的清单，不许出现「首先」「其次」「最后」这类词，讲成溜的话。');
      var brief = '学路线｜底子·' + base + '｜时间·' + time + '｜目标·' + goal + '｜卡点·' + stuck;
      var out = $('lrOut');
      askAI(L.join('\n'), out, 'general', $('lrGo'), $('lrStop'), brief, { q: '学这套体系 入门 顺序 卡点 读书', nosave: true })
        .then(function () { askQuota(1); refreshLearnHint(); });
    }, { key: 'learn', resume: true });
  }

  function refreshLearnHint() {
    var h = $('lrHint'); if (!h) return;
    var left = askQuota();
    h.textContent = left > 0 ? ('今天还能问 ' + left + ' 次。') : '今天问得够多了，明天再来。';
  }
  // 八样卡住人的东西，摊开给想学的人看
  function hmLearnBlock() {
    if (!HM) return '';
    return HM.DRIVES.map(function (d) {
      return '<details class="det2"><summary>' + esc(d.k) + '<span class="sg">' + esc(d.hint) + '</span></summary>' +
        '<div class="say"><b>他想要的是</b>' + esc(d.want) + '</div>' +
        '<div class="say"><b>真正压着他的是</b>' + esc(d.fear) + '</div>' +
        '<div class="say"><b>可以这样跟自己讲</b>' + esc(d.turn) + '</div>' +
        '<div class="say"><b>今天能做的一件小事</b>' + esc(d.act) + '</div>' +
        '</details>';
    }).join('');
  }

  function refreshLearnMem() {    var b = $('lrMem'); if (!b || !MEM) return;
    var on = !!cloud && MEM.state().notes.length > 0;
    b.innerHTML =
      '<div class="ms"><b>' + MEM.count() + '</b><span>条经验</span></div>' +
      '<div class="ms"><b>' + MEM.todayCount() + '</b><span>今天新沉</span></div>' +
      '<div class="ms"><b>' + MEM.hitsSum() + '</b><span>累计被引用</span></div>' +
      '<div class="ms"><b>' + (on ? '在云上' : (MEM.state().notes.length ? '本机' : '待连')) + '</b><span>存放</span></div>';
  }

  /* ---- 典籍库 ---- */
  var CM = window.YXJ_CM || { terms: [], keys: [], books: [], songs: [] };
  var CM_TABS = [
    { k: 'terms', t: '术语词典' }, { k: 'keys', t: '必背基础' },
    { k: 'books', t: '典籍选段' }, { k: 'songs', t: '口诀全文' }, { k: 'hex', t: '经文全览' }
  ];
  var cmTab = 'terms', cmQ = '';

  function cmFlat(v) {
    if (v == null) return '';
    if (Array.isArray(v)) return v.map(cmFlat).join(' ');
    if (typeof v === 'object') { var s = ''; for (var k in v) s += cmFlat(v[k]) + ' '; return s; }
    return String(v);
  }
  function cmHit(o) {
    if (!cmQ) return true;
    return cmFlat(o).toLowerCase().indexOf(cmQ.toLowerCase()) >= 0;
  }
  function cmHi(s) {
    var t = esc(s == null ? '' : s);
    if (!cmQ) return t;
    var q = String(cmQ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return t.replace(new RegExp(q, 'gi'), function (m) { return '<mark>' + m + '</mark>'; }); }
    catch (e) { return t; }
  }

  function cmTerms() {
    var list = CM.terms.filter(cmHit), cats = [], html = '';
    list.forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
    cats.forEach(function (c) {
      html += '<div class="cmgrp"><h3><span class="bar"></span>' + esc(c) +
        '<span style="font-family:var(--sans);font-size:12px;color:var(--ink3);letter-spacing:0">' +
        list.filter(function (x) { return x.cat === c; }).length + ' 条</span></h3>';
      list.filter(function (x) { return x.cat === c; }).forEach(function (x) {
        html += '<div class="tcard"><div class="th"><b>' + cmHi(x.t) + '</b><span class="cat">' + esc(c) + '</span></div>' +
          '<div class="wen">' + cmHi(x.wen) + '</div>' +
          '<div class="bai">' + cmHi(x.bai) + '</div>' +
          '<div class="use">' + cmHi(x.use) + '</div></div>';
      });
      html += '</div>';
    });
    return { n: list.length, html: html };
  }

  function cmKeys() {
    var list = CM.keys.filter(cmHit), html = '';
    list.forEach(function (k) {
      html += '<div class="cmgrp"><h3><span class="bar"></span>' + cmHi(k.h) + '</h3>' +
        '<div class="bk"><div class="about">' + cmHi(k.note) + '</div>' +
        '<div style="overflow-x:auto"><table class="dt" style="margin-top:11px;min-width:520px"><tr>' +
        k.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>' +
        k.rows.map(function (r) {
          return '<tr>' + r.map(function (c, i) {
            return '<td' + (i === 0 ? ' class="k"' : '') + '>' + cmHi(c) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</table></div></div></div>';
    });
    return { n: list.length, html: html };
  }

  function cmBooks() {
    var list = CM.books.filter(cmHit), html = '';
    list.forEach(function (b) {
      html += '<div class="bk"><h4>' + cmHi(b.name) + '</h4>' +
        '<div class="meta">' + cmHi(b.dynasty) + '</div>' +
        '<div class="about">' + cmHi(b.about) + '</div>' +
        '<div class="howto"><b>怎么读　</b>' + cmHi(b.howto) + '</div>';
      b.passages.forEach(function (p) {
        html += '<div class="pg"><div class="from">选段 · ' + cmHi(p.from) + '</div>' +
          '<div class="wen">' + cmHi(p.wen) + '</div>' +
          p.notes.map(function (n) {
            return '<div class="nt"><span class="w">' + cmHi(n[0]) + '</span><span>' + cmHi(n[1]) + '</span></div>';
          }).join('') +
          '<div class="bai">' + cmHi(p.bai) + '</div>' +
          '<div class="use">' + cmHi(p.use) + '</div></div>';
      });
      if (b.fullText) html += '<div class="tip ok" style="margin-top:12px">想读全文：' + cmHi(b.fullText) + '</div>';
      html += '</div>';
    });
    return { n: list.length, html: html };
  }

  function cmSongs() {
    var list = CM.songs.filter(cmHit), html = '';
    list.forEach(function (s) {
      html += '<div class="sg"><h4>' + cmHi(s.name) + '</h4><div class="src">' + cmHi(s.src) + '</div>';
      s.lines.forEach(function (l) {
        html += '<div class="ln"><div class="w">' + cmHi(l[0]) + '</div><div class="z">' + cmHi(l[1]) + '</div></div>';
      });
      if (s.bai) html += '<div class="bai">' + cmHi(s.bai) + '</div>';
      html += '</div>';
    });
    return { n: list.length, html: html };
  }

  var ZHAN_ORDER = [['运势', '总体运气'], ['事业', '做事与前途'], ['感情', '感情与人际'], ['求财', '钱财进出'], ['出行', '出门与远行'], ['健康', '身体调养'], ['诉讼', '纠纷与是非'], ['建议', '该怎么做']];
  // 八卦的阴阳爻（自下而上），用来还原六爻的爻名
  var TRI_LINES = { '乾': [1, 1, 1], '兑': [1, 1, 0], '离': [1, 0, 1], '震': [1, 0, 0], '巽': [0, 1, 1], '坎': [0, 1, 0], '艮': [0, 0, 1], '坤': [0, 0, 0] };
  function hexLines(h) {
    var lo = TRI_LINES[h.lower] || [1, 1, 1], up = TRI_LINES[h.upper] || [1, 1, 1];
    return lo.concat(up);   // 索引 0=初爻 … 5=上爻
  }

  function cmHex() {
    var ALL = window.HEXAGRAMS || [];
    var list = ALL.filter(function (h) {
      if (!cmQ) return true;
      return cmFlat([h.name, h.upper, h.lower, h.guaci, h.yaoci, h.yong, h.baihua, h.zhan]).toLowerCase().indexOf(cmQ.toLowerCase()) >= 0;
    });
    var html = list.map(function (h) {
      var L = hexLines(h);
      var yc = h.yaoci.map(function (t, i) {
        return '<div><b>' + esc(RD.yaoName(i, L[i] === 1)) + '</b>　' + cmHi(t) + '</div>';
      }).join('');
      var zn = (h.zhan && ZHAN_ORDER.filter(function (z) { return h.zhan[z[0]]; }).map(function (z) {
        return '<div class="yc"><b>' + esc(z[1]) + '</b>　' + cmHi(h.zhan[z[0]]) + '</div>';
      }).join('')) || '';
      return '<details class="hexx"><summary><span class="g">' + (h.glyph || '') + '</span>' +
        '<span class="n">第 ' + h.index + ' 卦　' + cmHi(h.name) + '</span>' +
        '<span class="i">' + esc(h.upper) + '上' + esc(h.lower) + '下</span></summary>' +
        '<div class="body"><div class="gz">卦辞：' + cmHi(h.guaci) + '</div>' +
        (h.yong ? '<div class="gz">' + cmHi(h.yong) + '</div>' : '') +
        '<div class="yc" style="margin-top:9px">' + yc + '</div>' +
        '<div class="bh">' + cmHi(h.baihua) + '</div>' + zn + '</div></details>';
    }).join('');
    return { n: list.length, html: html };
  }

  function cmRender() {
    var out = $('cmOut'); if (!out) return;
    var r = { terms: cmTerms, keys: cmKeys, books: cmBooks, songs: cmSongs, hex: cmHex }[cmTab]();
    var label = { terms: '条术语', keys: '张表', books: '部典籍', songs: '首口诀', hex: '卦' }[cmTab];
    var cnt = $('cmCount');
    if (cnt) cnt.textContent = cmQ ? ('搜到 ' + r.n + ' ' + label) : ('共 ' + r.n + ' ' + label);
    if (!r.n) {
      out.innerHTML = '<div class="tip warn">没找到。换个词试试，比如「用神」「旬空」「妻财」，或者把搜索框清空看全部。</div>';
      return;
    }
    out.innerHTML = r.html;
  }

  function cmBind() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.onclick = function () {
        cmTab = b.dataset.k; cmQ = '';
        var s = $('cmQ'); if (s) s.value = '';
        Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('on', x === b); });
        cmRender();
      };
    });
    var s = $('cmQ');
    if (s) s.oninput = function () { cmQ = s.value.trim(); cmRender(); };
    cmRender();
  }

  function viewClassics() {
    var tabs = CM_TABS.map(function (t) {
      return '<button class="tab' + (t.k === cmTab ? ' on' : '') + '" data-k="' + t.k + '">' + esc(t.t) + '</button>';
    }).join('');
    return pbar('典籍库 · 原文与注解') +
      '<div class="card"><div class="sec-h"><span class="bar"></span><h2>典籍库</h2><span class="hint">原文配注解，小白也能查</span></div>' +
      '<div class="desc" style="color:var(--ink2);font-size:14.5px;line-height:1.85;margin-bottom:14px">' +
      '这套东西的根在几本老书里。这里把最要紧的部分抠出来，一条一条给你注明白：先摆原文，再逐句解释，然后用大白话讲透，最后告诉你具体怎么用。' +
      '原文都取自公有领域古籍，注解和白话是本页写的。查词、查表、查原文，都在这一页。</div>' +
      '<div class="tabs">' + tabs + '</div>' +
      '<div class="cmsearch"><input id="cmQ" placeholder="搜一下：用神、旬空、妻财、世应、八门、纳音……">' +
      '<span class="cmcount" id="cmCount" style="margin:0;flex:0 0 auto"></span></div>' +
      '<div id="cmOut"></div></div>';
  }

  /* ---- 经验库 · 云记忆 ---- */
  var memKind = 'all', memKw = '';
  function memTabs() {
    var ks = MEM.byKind();
    return [{ k: 'all', n: MEM.count() }].concat(ks.map(function (x) { return { k: x.k, n: x.n }; }));
  }
  function viewMemory() {
    return pbar('经验库 · 云记忆') +
      '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>经验库</h2><span class="hint">越问越厚，不是每次从零开始</span></div>' +
      '<div class="desc" style="color:var(--ink2);font-size:14.5px;line-height:1.85;margin-bottom:14px">' +
      '这套东西不是一本死的书。老先生压箱底的断案口径、口诀、学习卡点都存在这儿；每问一件事，有用的那部分还会再沉回来。' +
      '下次遇到相似的事，它先翻这份底子，再开口——所以用得越多，它越懂你这一类事。' +
      '</div>' +
      '<div class="memstat" id="memStat"></div>' +
      '<div class="tabs" id="memTabs"></div>' +
      '<div class="cmsearch"><input id="memQ" placeholder="搜一件事：妻财持世、兄弟发动、空亡、化退、床头……">' +
      '<span class="cmcount" id="memCount" style="margin:0;flex:0 0 auto"></span></div>' +
      '<div id="memOut"></div></div>';
  }
  function memCard(n) {
    var dt = String(n.created_at || '').replace('T', ' ').slice(0, 10);
    var hit = (+n.hits > 0) ? '<span class="memhit">用过 ' + n.hits + ' 次</span>' : '';
    return '<div class="memc">' +
      '<div class="memh"><span class="memk">' + esc(n.kind || '经验') + '</span>' +
      '<span class="memt">' + esc(MEM.topicCN(n.topic)) + '</span>' + hit + '</div>' +
      '<div class="memti">' + esc(n.title || '') + '</div>' +
      '<div class="memb">' + esc(n.body || '') + '</div>' +
      '<div class="memf">' + esc(n.source || '') + (dt ? ' · ' + esc(dt) : '') + '</div>' +
      '</div>';
  }
  function memRender() {
    var st = $('memStat'), tb = $('memTabs'), out = $('memOut');
    if (!out) return;
    var total = MEM.count();
    if (st) {
      st.innerHTML =
        '<div class="ms"><b>' + total + '</b><span>条经验</span></div>' +
        '<div class="ms"><b>' + MEM.todayCount() + '</b><span>今天新沉</span></div>' +
        '<div class="ms"><b>' + MEM.hitsSum() + '</b><span>累计被引用</span></div>' +
        '<div class="ms"><b>' + (cloud ? '已连' : '未连') + '</b><span>云端</span></div>';
    }
    if (tb) {
      tb.innerHTML = memTabs().map(function (t) {
        return '<button class="tab' + (t.k === memKind ? ' on' : '') + '" data-k="' + esc(t.k) + '">' +
          esc(t.k === 'all' ? '全部' : t.k) + '<i>' + t.n + '</i></button>';
      }).join('');
    }
    if (!total) {
      out.innerHTML = '<div class="tip warn">这边还没有存下东西。' +
        (cloud ? '' : '（云端这会儿没连上，只能看本机的缓存。）') +
        '去「问易玄机」问一件事，有用的那部分就会沉进来。</div>';
      return;
    }
    var list = MEM.search(memKw, memKind);
    if ($('memCount')) $('memCount').textContent = list.length + ' 条';
    if (!list.length) { out.innerHTML = '<div class="tip warn">没搜到。换个词试试，或者点「全部」。</div>'; return; }

    // 没搜索的时候，热门的排前面；搜索的时候按原序
    if (!memKw) {
      list = list.slice().sort(function (a, b) {
        return ((+b.hits || 0) - (+a.hits || 0)) ||
          ((Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
      });
    }
    var html = '';
    if (!memKw) {
      var rc = MEM.recent(3);
      if (rc.length && memKind === 'all') {
        html += '<div class="vt">最近沉进来的</div>' + rc.map(memCard).join('');
        html += '<div class="vt">老底子（按用得多排前面）</div>';
      }
    }
    var seen = {};
    var rest = [];
    if (!memKw && memKind === 'all') {
      var rc3 = MEM.recent(3);
      for (var i = 0; i < rc3.length; i++) seen[rc3[i].title] = 1;
      for (var j = 0; j < list.length; j++) if (!seen[list[j].title]) rest.push(list[j]);
    } else rest = list;
    html += rest.map(memCard).join('');
    out.innerHTML = html;
  }
  function memBind() {
    var s = $('memQ');
    if (s) s.oninput = function () { memKw = s.value.trim(); memRender(); };
    var tb = $('memTabs');
    if (tb) tb.onclick = function (e) {
      var el = e.target;
      while (el && el !== tb && String(el.className || '').indexOf('tab') < 0) el = el.parentNode;
      if (!el || el === tb) return;
      memKind = el.getAttribute('data-k'); memRender();
    };
    memRender();
    pullMemory(true).then(function () { memRender(); });
  }

  /* ---- 后台 ---- */
  function viewAdmin() {
    return pbar('后台看板') + '<div class="card">' +
      '<div class="sec-h"><span class="bar"></span><h2>后台看板</h2><span class="hint">仅站长可见</span></div>' +
      '<div class="frow"><div class="fld"><label>口令</label><input id="admPass" type="password" placeholder="输入口令"></div>' +
      '<div class="fld" style="flex:0 0 auto"><button class="btn" id="admGo">进 入</button></div></div>' +
      '<div id="admOut"></div></div>';
  }
  async function loadAdmin() {
    var pass = $('admPass').value;
    if (!pass) { toast('先填口令'); return; }
    if (!cloud) { $('admOut').innerHTML = '<div class="tip warn">云端未配置，后台不可用。</div>'; return; }
    $('admOut').innerHTML = '<div class="loading" style="margin-top:14px"><span class="spin"></span>读取中…</div>';
    try {
      var r = await cloud.database.rpc('admin_overview', { pass: pass });
      var d = (r && r.data !== undefined) ? r.data : r;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
      if (Array.isArray(d)) d = d[0];
      if (d && d.admin_overview) d = d.admin_overview;
      if (!d || d.ok === false) { $('admOut').innerHTML = '<div class="tip warn" style="margin-top:14px">口令不对。</div>'; return; }

      var td = d.today || {}, tt = d.total || {}, wk = d.week || {};
      var cards = [
        ['今日访问量', td.pv || 0], ['今日来访人数', td.uv || 0],
        ['今日新访客', td.nw || 0], ['今日提问数', td.ask || 0]
      ];
      var html = '<div class="adm">' + cards.map(function (c) {
        return '<div class="c"><div class="n">' + c[1] + '</div><div class="l">' + c[0] + '</div></div>';
      }).join('') + '</div>';

      html += '<div class="tip ok" style="margin-top:12px">累计：访问量 ' + (tt.pv || 0) +
        '，来访 ' + (tt.uv || 0) + ' 人，提问 ' + (tt.ask || 0) + ' 次，近七天访问 ' + (wk.pv || 0) +
        '，开站 ' + (tt.days || 0) + ' 天。</div>';

      // 30 天趋势
      var dl = d.daily || [];
      if (dl.length) {
        var mx = Math.max.apply(null, dl.map(function (x) { return x.n || 0; }).concat([1]));
        html += '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>近三十天访问</h2></div>' +
          '<div class="trend">' + dl.map(function (x) {
            var pct = Math.round((x.n || 0) / mx * 100);
            return '<div class="tb" title="' + esc(x.d) + '：' + x.n + '"><i style="height:' + Math.max(pct, 3) + '%"></i><span>' + (x.n || 0) + '</span></div>';
          }).join('') + '</div>' +
          '<div class="trend-x"><span>' + esc(dl[0].d) + '</span><span>' + esc(dl[dl.length - 1].d) + '</span></div>';
      } else {
        html += '<div class="tip warn" style="margin-top:14px">近三十天还没有访问记录。</div>';
      }

      // 来源
      var sc = d.sources || [];
      if (sc.length) {
        var sm = Math.max.apply(null, sc.map(function (x) { return x.n || 0; }).concat([1]));
        html += '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>访客来路</h2></div><div class="rows">' +
          sc.map(function (x) {
            return '<div class="r"><span class="t" style="flex:0 0 84px">' + esc(x.name) + '</span>' +
              '<span class="bt" style="flex:1"><i style="width:' + Math.round((x.n || 0) / sm * 100) + '%"></i></span>' +
              '<span class="t" style="flex:0 0 40px;text-align:right">' + x.n + '</span></div>';
          }).join('') + '</div>';
      }

      // 问事方向
      var tp = d.topics || [];
      if (tp.length) {
        var tm = Math.max.apply(null, tp.map(function (x) { return x.n || 0; }).concat([1]));
        html += '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>问得最多的方向</h2></div><div class="rows">' +
          tp.map(function (x) {
            return '<div class="r"><span class="t" style="flex:0 0 84px">' + esc(x.name) + '</span>' +
              '<span class="bt" style="flex:1"><i style="width:' + Math.round((x.n || 0) / tm * 100) + '%"></i></span>' +
              '<span class="t" style="flex:0 0 40px;text-align:right">' + x.n + '</span></div>';
          }).join('') + '</div>';
      }

      // 最近提问
      var rq = d.recent_q || [];
      if (rq.length) {
        html += '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>最近问的事</h2></div><div class="rows">' +
          rq.map(function (x) {
            var t = String(x.t || '').replace('T', ' ').slice(0, 16);
            return '<div class="r"><span class="t">' + esc(t) + '</span><span style="flex:1">' + esc(x.k || '') + '</span></div>' +
              '<div class="qline">' + esc(x.q || '') + '</div>';
          }).join('') + '</div>';
      }

      // 经验库（另一支函数，读不到也不影响上面）
      try {
        var nr = await cloud.database.rpc('admin_notes_overview', { pass: pass });
        var nd = (nr && nr.data !== undefined) ? nr.data : nr;
        if (typeof nd === 'string') { try { nd = JSON.parse(nd); } catch (e2) { } }
        if (Array.isArray(nd)) nd = nd[0];
        if (nd && nd.admin_notes_overview) nd = nd.admin_notes_overview;
        if (nd && nd.ok) {
          html += '<div class="sec-h" style="margin-top:18px"><span class="bar"></span><h2>经验库</h2>' +
            '<span class="hint">问一次厚一分</span></div>' +
            '<div class="tip ok">共 <b>' + (nd.n_total || 0) + '</b> 条经验（其中自己沉下来的复盘 <b>' +
            (nd.n_cases || 0) + '</b> 条），今天新沉 <b>' + (nd.n_today || 0) + '</b> 条，累计被引用 <b>' +
            (nd.n_hits || 0) + '</b> 次，学习资料 <b>' + (nd.learn_total || 0) + '</b> 条。</div>';

          var bk = nd.by_kind || [];
          if (bk.length) {
            var bm = Math.max.apply(null, bk.map(function (x) { return x.n || 0; }).concat([1]));
            html += '<div class="rows" style="margin-top:10px">' + bk.map(function (x) {
              return '<div class="r"><span class="t" style="flex:0 0 92px">' + esc(x.name) + '</span>' +
                '<span class="bt" style="flex:1"><i style="width:' + Math.round((x.n || 0) / bm * 100) + '%"></i></span>' +
                '<span class="t" style="flex:0 0 40px;text-align:right">' + x.n + '</span></div>';
            }).join('') + '</div>';
          }

          var ths = nd.top_hits || [];
          if (ths.length) {
            html += '<div class="sec-h" style="margin-top:14px"><span class="bar"></span><h2>被引用最多的</h2></div><div class="rows">' +
              ths.map(function (x) {
                return '<div class="r"><span class="t">' + esc(x.t) + '</span>' +
                  '<span style="flex:0 0 auto;font-size:12.5px;color:var(--ink3)">' + esc(x.k) + '　引用 ' + (x.h || 0) + '</span></div>';
              }).join('') + '</div>';
          }

          var rcs = nd.recent || [];
          if (rcs.length) {
            html += '<div class="sec-h" style="margin-top:14px"><span class="bar"></span><h2>最近沉进来的</h2></div><div class="rows">' +
              rcs.map(function (x) {
                var t = String(x.c || '').replace('T', ' ').slice(0, 16);
                return '<div class="r"><span class="t" style="flex:0 0 116px">' + esc(t) + '</span>' +
                  '<span style="flex:0 0 auto;font-size:12.5px;color:var(--ink3);margin-right:8px">' + esc(x.k) + '</span>' +
                  '<span style="flex:1">' + esc(x.t) + '</span></div>';
              }).join('') + '</div>';
          }
        }
      } catch (e3) { }

      if (d.generated_at) html += '<div style="font-size:12px;color:var(--ink3);margin-top:10px">数据时间：' + esc(d.generated_at) + '（按北京时间切日）</div>';
      html += '<div class="tools"><button class="btn ghost sm" id="admRefresh">刷 新</button></div>';
      $('admOut').innerHTML = html;
      var rb = $('admRefresh'); if (rb) rb.onclick = loadAdmin;
    } catch (e) {
      $('admOut').innerHTML = '<div class="tip warn" style="margin-top:14px">读不到数据（' + esc(e && e.message ? e.message : '未知错误') + '）。</div>';
    }
  }

  /* ============ 路由 ============ */
  var ROUTES = {
    home: { t: '首页', v: viewHome },
    gua: { t: '周易起卦', v: viewGua },
    bazi: { t: '生辰八字', v: viewBazi },
    qimen: { t: '奇门遁甲', v: viewQimen },
    fengshui: { t: '风水布局', v: viewFengshui },
    almanac: { t: '万年历', v: viewAlmanac },
    wuxing: { t: '五行八卦', v: viewWuxing },
    learn: { t: '学这套体系', v: viewLearn },
    classics: { t: '典籍库', v: viewClassics },
    memory: { t: '经验库', v: viewMemory },
    ask: { t: '问易玄机', v: viewAsk },
    admin: { t: '后台', v: viewAdmin }
  };
  function render() {
    var h = (location.hash || '#/home').replace('#/', '').split('?')[0] || 'home';
    var r = ROUTES[h] || ROUTES.home;
    $('modal').innerHTML = '';
    $('view').innerHTML = r.v();
    bindBack();
    if (h === 'home') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-h]'), function (e) {
        e.onclick = function () { location.hash = e.dataset.h; };
      });
    }
    if (h === 'gua') {
      $('guaGo').onclick = renderGua; $('guaAgain').onclick = renderGua; renderMeBox();
      if (PROF) {
        var pg = PROF.forGua();
        if (pg.guaQ != null) { var gq = $('guaQ'); if (gq) gq.value = pg.guaQ; }
        if (pg.guaWay) { var gw = $('guaWay'); if (gw) gw.value = pg.guaWay; }
        if (pg.guaCat) { var gc = $('guaCat'); if (gc) gc.value = pg.guaCat; }
      }
    }
    if (h === 'bazi') {
      $('bzGo').onclick = renderBazi;
      if (PROF) {
        var pb = PROF.forBazi();
        if (pb.bzY != null) $('bzY').value = pb.bzY;
        if (pb.bzM != null) $('bzM').value = pb.bzM;
        if (pb.bzD != null) $('bzD').value = pb.bzD;
        if (pb.bzH != null) $('bzH').value = pb.bzH;
        if (pb.bzMi != null) $('bzMi').value = pb.bzMi;
        if (pb.bzS != null) $('bzS').value = pb.bzS;
      }
    }
    if (h === 'qimen') {
      $('qmGo').onclick = renderQimen;
      $('qmNow').onclick = function () { var t = today(); $('qmY').value = t.y; $('qmM').value = t.m; $('qmD').value = t.d; $('qmH').value = t.h; $('qmMi').value = t.mi; renderQimen(); };
    }
    if (h === 'fengshui') { $('fsGo').onclick = renderFengshui; }
    if (h === 'almanac') { $('alGo').onclick = renderAlmanac; $('alToday').onclick = function () { var t = today(); $('alY').value = t.y; $('alM').value = t.m; $('alD').value = t.d; renderAlmanac(); }; }
    if (h === 'ask') {
      $('askGo').onclick = startAskFlow;
      $('askStop').onclick = stopAsk;
      Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
        c.onclick = function () {
          var q = c.getAttribute('data-q') || c.textContent.trim();
          $('askInput').value = q; $('askInput').focus();
        };
      });
      if (PROF) {
        var pa = PROF.forAsk();
        if (pa.askInput != null) { var ai = $('askInput'); if (ai) ai.value = pa.askInput; }
      }
      refreshAskHint();
      renderMeBox();
    }
    if (h === 'learn') {
      $('lrGo').onclick = startLearnFlow;
      $('lrAsk').onclick = function () { location.hash = '#/ask'; };
      $('lrStop').onclick = stopAsk;
      if ($('lrMemGo')) $('lrMemGo').onclick = function () { location.hash = '#/memory'; };
      refreshLearnMem();
      pullMemory().then(refreshLearnMem);
      refreshLearnHint();
    }
    if (h === 'classics') { cmBind(); }
    if (h === 'memory') { memBind(); }
    if (h === 'admin') { $('admGo').onclick = loadAdmin; }
    track(h);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', function () {
    var a = $('admLink'); if (a) a.onclick = function () { location.hash = '#/admin'; };
    render();
    track('home');
  });
  if (document.readyState !== 'loading') {
    var a2 = $('admLink'); if (a2) a2.onclick = function () { location.hash = '#/admin'; };
    render(); track('home');
  }

  /* 仅供自检用：把渲染函数暴露出来，node 里不启页面也能验 HTML 拼装（页面上不调用） */
  Y.UI_TEST = { vdCard: vdCard, vdNeedInline: vdNeedInline, vdHumanInline: vdHumanInline,
    pickStyle: pickStyle, STYLES: STYLES, styleBlock: styleBlock, caseChipsHtml: caseChipsHtml, agoCN: agoCN };
})();
