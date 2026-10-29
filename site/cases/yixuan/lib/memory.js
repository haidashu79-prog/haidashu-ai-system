/* =============================================================
   易玄机 · 云记忆（经验库）
   把老师傅压箱底的断案口径、案例复盘、学习卡点存到云端。
   回答前先取相关的几条喂给智脑 —— 不再是每次临时去学；
   回答后再把这一问沉淀回去 —— 每问一次，这套东西就厚一分。
   纯数据模块，不碰 DOM；云端读写由 ui.js 接线。
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ = window.YXJ || {};

  var LS = 'yxj_mem_v1';
  var MAX_NOTES = 600;      // 本机缓存的条数上限
  var CACHE_MS = 30 * 60 * 1000;  // 半小时内不重复拉云端

  var S = { notes: [], learn: [], at: 0 };

  /* ---------- 本机缓存 ---------- */
  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        at: S.at,
        notes: S.notes.slice(0, MAX_NOTES),
        learn: S.learn
      }));
    } catch (e) { }
  }
  function loadLocal() {
    try {
      var raw = localStorage.getItem(LS);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (d && d.notes && d.notes.length) {
        S.notes = d.notes; S.learn = d.learn || []; S.at = d.at || 0;
        return true;
      }
    } catch (e) { }
    return false;
  }
  function fresh() { return S.notes.length > 0 && (Date.now() - S.at) < CACHE_MS; }

  /* ---------- 取字、切词 ---------- */
  var CN = /[\u4e00-\u9fa5]/;
  function hanstr(s) {
    s = String(s == null ? '' : s);
    var out = '', i;
    for (i = 0; i < s.length; i++) { if (CN.test(s.charAt(i))) out += s.charAt(i); }
    return out;
  }
  // 双字组：中文用不着分词，两字一组已经够认题了
  function grams(s) {
    var k = hanstr(s), g = {}, i;
    for (i = 0; i + 1 < k.length; i++) {
      var p = k.substr(i, 2);
      g[p] = (g[p] || 0) + 1;
    }
    return g;
  }
  function overlap(a, b) {
    var n = 0, k;
    for (k in a) { if (b[k]) n += Math.min(a[k], b[k]); }
    return n;
  }

  /* ---------- 挑最相关的几条 ---------- */
  function scoreOne(n, topic, q) {
    var s = 0;
    // 自己沉下来的复盘：只当旁证，不许把老师傅的老底子挤下去
    if (n.kind === '案例复盘') s -= 7;
    if (n.source && String(n.source).indexOf('问答沉淀') === 0) s -= 2;
    // 方向对不对是第一位：问钱就先给钱的规矩
    if (topic) { if (n.topic === topic) s += 11; else if (n.topic === 'general') s += 2.5; else s -= 2; }
    else if (n.topic === 'general') s += 2;
    if (n.kind === '断案心法') s += 1.6;
    else if (n.kind === '分类断法') s += 1.2;
    else if (n.kind === '口诀') s += 0.8;
    // 看人那一条是通盘的理，别让它顶掉对口的断法
    if (n.kind === '人性观察' && n.topic !== topic) s -= 2;
    if (q) {
      var o = overlap(grams(q), grams((n.title || '') + (n.tags || '') + (n.body || '')));
      if (o) s += Math.min(o, 9) * 1.2;
    }
    s += Math.min(+n.hits || 0, 60) * 0.1;   // 被人引用得多的，往前站
    return s;
  }
  var MAX_CASES = 2;    // 一次最多带两条自己的复盘
  // 老底子先坐满，看人那一条占一个位子，自己的复盘再补位当旁证。
  // 这条是硬规矩，不靠打分比大小 —— 否则哪天一条复盘跟题面字字重合，
  // 就会把自己上一次的回答顶到最前面，越用越偏。
  function pick(topic, q, n) {
    n = n || 6;
    if (!S.notes.length) return [];
    var core = [], human = [], cases = [], i, x, s;
    for (i = 0; i < S.notes.length; i++) {
      x = S.notes[i]; s = scoreOne(x, topic, q);
      if (s <= 0) continue;
      if (x.kind === '案例复盘') cases.push({ x: x, s: s });
      else if (x.kind === '人性观察') human.push({ x: x, s: s });
      else core.push({ x: x, s: s });
    }
    var byScore = function (a, b) { return b.s - a.s; };
    core.sort(byScore); cases.sort(byScore);
    // 看人那一条：跟今天的题目对口的先上，没有对口的才比分数
    human.sort(function (a, b) {
      var am = (a.x.topic === topic) ? 1 : 0, bm = (b.x.topic === topic) ? 1 : 0;
      if (am !== bm) return bm - am;
      return b.s - a.s;
    });

    var hSlot = human.length ? 1 : 0;
    var cSlot = cases.length ? 1 : 0;
    var room = Math.min(n, core.length + hSlot + Math.min(cases.length, MAX_CASES));
    var coreCap = Math.max(1, room - hSlot - cSlot);
    var out = [];
    for (i = 0; i < core.length && out.length < coreCap; i++) out.push(core[i].x);
    if (hSlot && out.length < room) out.push(human[0].x);
    for (i = 0; i < cases.length && out.length < room && i < MAX_CASES; i++) out.push(cases[i].x);
    return out;
  }

  /* ---------- 拼给智脑看的那一段 ---------- */
  function recallText(list) {
    if (!list || !list.length) return '';
    var core = [], human = [], cases = [], i;
    for (i = 0; i < list.length; i++) {
      if (list[i].kind === '案例复盘') cases.push(list[i]);
      else if (list[i].kind === '人性观察') human.push(list[i]);
      else core.push(list[i]);
    }
    var L = [];
    if (core.length) {
      L.push('【老师傅压箱底的旧笔记，按这个口径讲，不要照抄字句，也不要提「笔记」两个字】');
      for (i = 0; i < core.length; i++) L.push('· ' + core[i].title + '：' + core[i].body);
    }
    if (human.length) {
      if (core.length) L.push('');
      L.push('【看人这一层：别只顾着断卦。问的人要的是「你说到了我」】');
      for (i = 0; i < human.length; i++) L.push('· ' + human[i].title + '：' + human[i].body);
    }
    if (cases.length) {
      if (core.length || human.length) L.push('');
      L.push('【以前有人的情形跟这个相近，当时是这么答的，可以参考，但别照搬，也别说「上次」这种话】');
      for (i = 0; i < cases.length; i++) L.push('· ' + cases[i].title + '：' + cases[i].body);
    }
    return L.join('\n');
  }

  /* ---------- 沉淀 ---------- */
  var DIG_MAX = 5;   // 一天最多沉淀这么多条，防刷
  function digKey() {
    var d = new Date();
    return 'yxj_dig_' + d.getFullYear() + (d.getMonth() + 1) + d.getDate();
  }
  function digLeft() {
    var v = 0; try { v = +localStorage.getItem(digKey()) || 0; } catch (e) { }
    return Math.max(0, DIG_MAX - v);
  }
  function digUse() {
    try { localStorage.setItem(digKey(), String(((+localStorage.getItem(digKey())) || 0) + 1)); } catch (e) { }
  }
  // 同一句话不重复沉淀
  function already(t) {
    var k = hanstr(t).slice(0, 18);
    for (var i = 0; i < S.notes.length; i++) {
      if (hanstr(S.notes[i].title).slice(0, 18) === k) return true;
    }
    return false;
  }
  // 把答案里的客套话、文言壳子、排版符号削掉，只留讲事的部分
  function trimBody(text) {
    var t = String(text || '');
    t = t.replace(/\*\*(.+?)\*\*/g, '$1')      // 加粗
      .replace(/^\s*#{1,6}\s*/gm, '')          // 小标题
      .replace(/`+/g, '')                      // 代码符号
      .replace(/^\s*[-*·•]\s+/gm, '')          // 项目符
      .replace(/^\s*>\s?/gm, '')               // 引用号
      .replace(/——/g, '，')                    // 长破折号
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    t = t.replace(/^（.*?）/, '').trim();
    if (t.length <= 520) return t;
    var cut = t.slice(0, 520);
    var p = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'));
    return (p > 240 ? cut.slice(0, p + 1) : cut) + '…';
  }

  // 本机时间写成 ISO 样子。
  // 不能用 toISOString()：那是 UTC，东八区下午会变成当天更早的钟点，
  // 排序和「今天沉了几条」都会算错。
  function localISO() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function ts(x) { var t = Date.parse(x); return isNaN(t) ? 0 : t; }

  function addNote(row, opts) {
    if (!row) return null;
    var n = {
      id: row.id || ('local' + Date.now().toString(36)),
      kind: row.kind || '案例复盘',
      topic: row.topic || 'general',
      title: String(row.title || '').slice(0, 60),
      body: String(row.body || ''),
      tags: row.tags || '',
      source: row.source || '问答沉淀',
      hits: +row.hits || 0,
      created_at: row.created_at || localISO()
    };
    if (opts && opts.front) S.notes.unshift(n);
    else S.notes.push(n);
    if (S.notes.length > MAX_NOTES) S.notes.length = MAX_NOTES;
    return n;
  }

  /* ---------- 云端整批覆盖（拉回来的时候用） ---------- */
  function setData(notes, learn) {
    if (Array.isArray(notes)) S.notes = notes;
    if (Array.isArray(learn)) S.learn = learn;
    S.at = Date.now();
    save();
  }
  function setLearn(learn) { if (Array.isArray(learn)) { S.learn = learn; save(); } }

  /* ---------- 查、看 ---------- */
  function all() { return S.notes.slice(); }
  function search(kw, kind) {
    var k = String(kw || '').trim();
    return S.notes.filter(function (n) {
      if (kind && kind !== 'all' && n.kind !== kind) return false;
      if (!k) return true;
      return (n.title + n.body + n.tags).indexOf(k) >= 0;
    });
  }
  function count(kind) {
    if (!kind || kind === 'all') return S.notes.length;
    var n = 0;
    for (var i = 0; i < S.notes.length; i++) if (S.notes[i].kind === kind) n++;
    return n;
  }
  function hitsSum() {
    var n = 0;
    for (var i = 0; i < S.notes.length; i++) n += (+S.notes[i].hits || 0);
    return n;
  }
  function recent(n) {
    return S.notes.slice().sort(function (a, b) {
      return ts(b.created_at) - ts(a.created_at);
    }).slice(0, n || 8);
  }
  function hot(n) {
    return S.notes.slice().sort(function (a, b) { return (+b.hits || 0) - (+a.hits || 0); }).slice(0, n || 8);
  }
  // 今天新沉进来的复盘（种子和书本上的老底子不算）
  function todayCount() {
    var d = new Date(), p = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    var n = 0;
    for (var i = 0; i < S.notes.length; i++) {
      if (S.notes[i].kind !== '案例复盘') continue;
      if (String(S.notes[i].created_at || '').slice(0, 10) === p) n++;
    }
    return n;
  }

  var KIND_ORDER = ['断案心法', '分类断法', '口诀', '人性观察', '学习卡点', '常见疑问', '案例复盘'];
  function byKind() {
    var m = {}, i, k;
    for (i = 0; i < S.notes.length; i++) { k = S.notes[i].kind || '其他'; m[k] = (m[k] || 0) + 1; }
    return KIND_ORDER.filter(function (x) { return m[x]; }).map(function (x) { return { k: x, n: m[x] }; })
      .concat(Object.keys(m).filter(function (x) { return KIND_ORDER.indexOf(x) < 0; })
        .map(function (x) { return { k: x, n: m[x] }; }));
  }

  var TOPIC_CN = { wealth: '求财', career: '事业', love: '感情', health: '身体', home: '家宅', general: '通用' };
  function topicCN(t) { return TOPIC_CN[t] || '通用'; }

  Y.MEM = {
    loadLocal: loadLocal, save: save, fresh: fresh,
    setData: setData, setLearn: setLearn, addNote: addNote,
    pick: pick, recallText: recallText,
    digLeft: digLeft, digUse: digUse, already: already, trimBody: trimBody,
    all: all, search: search, count: count, hitsSum: hitsSum,
    recent: recent, hot: hot, todayCount: todayCount, byKind: byKind,
    topicCN: topicCN, KIND_ORDER: KIND_ORDER,
    state: function () { return S; }
  };
})();
