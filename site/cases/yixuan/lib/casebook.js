/* =============================================================
   易玄机 · 问事档案（这个人的记忆）
   经验库记的是「事理」，这份档案记的是「这个人」：
   他哪天来问过什么、起的是什么卦、当时断到哪一步。
   下回他再开口，老先生得认得他 —— 「上回那家店转手的事，后来怎么了？」
   只存本机（localStorage），不进云端：这是每个人自己的账本。
   纯数据模块，不碰 DOM。
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ = window.YXJ || {};

  var LS = 'yxj_case_v1';
  var MAX = 60;          // 本机最多记这么多问，够翻旧账又不撑爆

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(LS) || 'null');
      if (d && Array.isArray(d.items)) return d;
    } catch (e) { }
    return { items: [] };
  }
  function save(d) {
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch (e) { }
  }

  function hanstr(s) {
    s = String(s == null ? '' : s);
    var out = '', i;
    for (i = 0; i < s.length; i++) { if (/[\u4e00-\u9fa5]/.test(s.charAt(i))) out += s.charAt(i); }
    return out;
  }
  function grams(s) {
    var k = hanstr(s), g = {}, i;
    for (i = 0; i + 1 < k.length; i++) { var p = k.substr(i, 2); g[p] = (g[p] || 0) + 1; }
    return g;
  }
  function overlap(a, b) {
    var n = 0, k;
    for (k in a) { if (b[k]) n += Math.min(a[k], b[k]); }
    return n;
  }

  /* ---------- 记一笔 ---------- */
  // c: { q, topic, topicName, situation, gua, chg, badge, score, brief }
  function add(c) {
    if (!c || (!c.q && !c.situation)) return null;
    var d = load();
    var it = {
      t: Date.now(),
      q: String(c.q || '').slice(0, 80),
      topic: c.topic || 'general',
      topicName: c.topicName || '运程',
      situation: String(c.situation || '').slice(0, 60),
      gua: String(c.gua || '').slice(0, 12),
      chg: String(c.chg || '').slice(0, 12),
      badge: String(c.badge || '').slice(0, 8),
      score: +c.score || 0,
      brief: String(c.brief || '').slice(0, 200)   // 当时答话的开头一段，当「话头」
    };
    d.items.unshift(it);
    if (d.items.length > MAX) d.items.length = MAX;
    save(d);
    return it;
  }

  function list(n) {
    var d = load();
    return d.items.slice(0, n || 8);
  }
  function count() { return load().items.length; }
  function last() { var d = load(); return d.items[0] || null; }
  function forget() { try { localStorage.removeItem(LS); } catch (e) { } }

  /* ---------- 翻旧账：跟这一问沾边的旧事 ---------- */
  function related(q, topic, n) {
    var d = load();
    if (!d.items.length) return [];
    n = n || 3;
    var g = grams(q || ''), out = [], i, it;
    for (i = 0; i < d.items.length; i++) {
      it = d.items[i];
      var s = 0;
      if (topic && it.topic === topic) s += 5;
      if (g) s += Math.min(overlap(g, grams(it.q + it.situation)), 14) * 1.1;
      // 七天内的旧账加一点近因分，太老的靠字面沾边才上
      var age = Date.now() - it.t;
      if (age < 7 * 864e5) s += 1.5;
      if (s >= 6) out.push({ it: it, s: s });   // 门槛：要么同方向、要么字面真沾边
    }
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, n).map(function (x) { return x.it; });
  }

  /* ---------- 给智脑看的那一段 ---------- */
  function ago(t) {
    var ms = Date.now() - t;
    if (ms < 864e5) { var h = Math.max(1, Math.round(ms / 36e5)); return h + ' 个钟头前'; }
    var day = Math.round(ms / 864e5);
    if (day < 30) return day + ' 天前';
    return Math.round(day / 30) + ' 个月前';
  }
  function textFor(items) {
    if (!items || !items.length) return '';
    var L = [];
    L.push('【这个人是回头客，他以前来问过这些事，你都得认得】');
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      L.push('· ' + ago(it.t) + '问过「' + (it.q || it.situation) + '」（问的是' + it.topicName +
        '，起的是《' + it.gua + '》' + (it.chg ? '变《' + it.chg + '》' : '') + '卦，当时断的是「' + it.badge + '」）' +
        (it.brief ? '。当时话的大意：' + it.brief : ''));
    }
    L.push('怎么用这段旧账：');
    L.push('这回问的还是同一件事（字面沾边、情形相近），就顺着往下说：先把旧事接上（「上回你说……这回……」），再把新卦跟他那件事连起来讲，让他知道你记着他，他的事没断线。旧账里断过的结论不许跟这回的新卦打架；真变了，就明说「局面跟 上回不一样了，变在哪儿」。');
    L.push('这回是件新事，就别硬提旧账，一个字都不带。提旧事要像自家老人念叨晚辈的事那样自然，不许列清单，不许说「根据记录」。');
    return L.join('\n');
  }

  Y.CASE = {
    KEY: LS,
    add: add, list: list, count: count, last: last, forget: forget,
    related: related, textFor: textFor
  };
})();
