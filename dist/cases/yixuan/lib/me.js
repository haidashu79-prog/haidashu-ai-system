/* =============================================================
   易玄机 · 命主
   —— 起卦之前先把「你是谁」收下来。同一卦，不同的人来问，
      落在他命里的喜忌不一样，话说出来就不该一样。
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ = window.YXJ || {};
  var C = Y.C;

  var KEY = 'yxj_me_v1';
  /* 出生年的界：下界 1900，上界取「今年」。出生不可能落在未来，
     写成当前年份自动取值，明年不用再改。 */
  var YMIN = 1900;
  var YMAX = new Date().getFullYear();

  /* 十二时辰 → 取一个代表钟点。
     子时用 0 点，避开 23 点换日那道边界，免得把生日算错一天。 */
  var HOURS = [
    { h: 0, n: '子时', d: '前一天 23 点到当天 1 点' },
    { h: 2, n: '丑时', d: '1 点到 3 点' },
    { h: 4, n: '寅时', d: '3 点到 5 点' },
    { h: 6, n: '卯时', d: '5 点到 7 点' },
    { h: 8, n: '辰时', d: '7 点到 9 点' },
    { h: 10, n: '巳时', d: '9 点到 11 点' },
    { h: 12, n: '午时', d: '11 点到 13 点' },
    { h: 14, n: '未时', d: '13 点到 15 点' },
    { h: 16, n: '申时', d: '15 点到 17 点' },
    { h: 18, n: '酉时', d: '17 点到 19 点' },
    { h: 20, n: '戌时', d: '19 点到 21 点' },
    { h: 22, n: '亥时', d: '21 点到 23 点' }
  ];
  var NOT_SURE = { n: '记不清了', d: '按午时代入，能断个大概，但日柱之外的时柱会有偏差' };

  /* 写不进去时的内存兜底：同一页内反复进不弹。
     跨会话真存住仍靠 localStorage；若那层被禁用/隔离，只能在此页内记住。 */
  var MEMO = null;

  function load() {
    var v;
    try { v = localStorage.getItem(KEY); } catch (e) { v = null; }
    if (v == null) v = MEMO ? JSON.stringify(MEMO) : null;
    try { return JSON.parse(v || 'null'); } catch (e) { return null; }
  }
  /* 写生辰。返回 {o, ok}：ok 表示真写进 localStorage 了；
     写不进去时落到内存兜底（同页内有效），ok 记 false，让上层给明确提示。 */
  function save(o) {
    var ok = false;
    try { localStorage.setItem(KEY, JSON.stringify(o)); ok = true; } catch (e) { }
    if (!ok) MEMO = o;
    return { o: o, ok: ok };
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { }
    MEMO = null;
  }
  function has() { var m = load(); return !!(m && m.y && m.m && m.d); }

  /* 把存下来的生辰算成命：四柱、五行旺衰、日主、喜用 */
  function compute(m) {
    if (!m || !m.y || !m.m || !m.d) return null;
    if (!(m.y >= YMIN && m.y <= YMAX)) return null;
    var unsure = m.h == null;
    var h = unsure ? 12 : m.h;
    var fp = C.fourPillars(m.y, m.m, m.d, h, m.mi || 0);
    if (!fp || !fp.day) return null;
    var stat = C.wuxingStat(fp);
    var dayWx = C.ganWx(fp.day.gan);
    var ys = (Y.RD && Y.RD.yongShen) ? Y.RD.yongShen(dayWx, stat) : null;
    return {
      input: m, unsure: unsure,
      gender: m.gender === 'female' ? 'female' : 'male',
      fp: fp, stat: stat, dayWx: dayWx, dayGan: C.GAN[fp.day.gan], ys: ys,
      /* 乾造 / 坤造 + 四柱，给页面和讲词直接用 */
      zao: (m.gender === 'female' ? '坤造' : '乾造') + '　' +
        fp.year.gz + ' ' + (fp.month ? fp.month.gz : '--') + ' ' + fp.day.gz + ' ' + fp.hour.gz,
      gz: [fp.year.gz, fp.month ? fp.month.gz : '--', fp.day.gz, fp.hour.gz].join(' ')
    };
  }

  function read() { return compute(load()); }

  /* 一句话说清这个人的命：日主是什么、身强身弱、喜用是哪几口 */
  function line(me) {
    if (!me || !me.ys) return '';
    var st = me.ys.strength || {};
    return '日主' + me.dayGan + '，属' + me.dayWx + '，' +
      (st.strong ? '身偏强' : '身偏弱') +
      '，喜用是' + (me.ys.use || []).join('、') + '。';
  }

  /* 给智能大脑看的那一段（讲的时候不许漏） */
  function promptBlock(me) {
    if (!me) return '';
    var st = me.ys && me.ys.strength ? me.ys.strength : {};
    var L = [];
    L.push('【这个人的命，讲的时候必须按他的来，不许讲成谁都适用的场面话】');
    L.push('四柱：' + me.zao + '。');
    L.push('日主' + me.dayGan + '，五行属' + me.dayWx + '，' + (st.strong ? '身偏强' : '身偏弱') + '。');
    if (me.ys) L.push('喜用：' + (me.ys.use || []).join('、') + '；该避的：' + (me.ys.avoid || []).join('、') + '。');
    if (me.unsure) L.push('时辰他没记清，时柱按午时放的，讲的时候别把时柱当成铁板钉钉的。');
    L.push('同一件事，换个八字的人来问，顺逆可能正好相反。所以讲的时候要落在他这个日主上，说清这件事对他哪一口是补、哪一口是耗。');
    return L.join('\n');
  }

  Y.ME = {
    KEY: KEY, HOURS: HOURS, NOT_SURE: NOT_SURE, YMIN: YMIN, YMAX: YMAX,
    load: load, save: save, clear: clear, has: has,
    read: read, compute: compute, line: line, promptBlock: promptBlock
  };
})();
