/* =============================================================
   易玄机 · 历法内核 calendar.js
   干支历（年月日时四柱）、二十四节气、农历、五行、纳音、十神、空亡、大运
   依赖：assets/terms.js（节气，北京时间到分钟）、assets/lunar.js（农历）
   说明：节气由天文算法（太阳视黄经）求得，见 tools/gen_terms.py。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';

  /* ---------------- 基础常量 ---------------- */
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var GAN_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var ZHI_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  var ZHI_CANG = {
    子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
    辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
    申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲']
  };
  var NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土',
    '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金',
    '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
    '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  // 十二节（定月柱）：TERMS 表索引 0=小寒
  var JIE = [
    { t: 2, zhi: 2, name: '立春' }, { t: 4, zhi: 3, name: '惊蛰' },
    { t: 6, zhi: 4, name: '清明' }, { t: 8, zhi: 5, name: '立夏' },
    { t: 10, zhi: 6, name: '芒种' }, { t: 12, zhi: 7, name: '小暑' },
    { t: 14, zhi: 8, name: '立秋' }, { t: 16, zhi: 9, name: '白露' },
    { t: 18, zhi: 10, name: '寒露' }, { t: 20, zhi: 11, name: '立冬' },
    { t: 22, zhi: 0, name: '大雪' }, { t: 0, zhi: 1, name: '小寒' }
  ];

  /* ---------------- 儒略日 ---------------- */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  /* ---------------- 节气 ---------------- */
  // 第 idx 个节气（0-23，小寒起）→ {m,d,h,mi}
  function term(year, idx) {
    var s = window.TERMS && window.TERMS[String(year)];
    if (!s) return null;
    var c = s.substr(idx * 8, 8);
    if (c.length < 8) return null;
    return { m: +c.substr(0, 2), d: +c.substr(2, 2), h: +c.substr(4, 2), mi: +c.substr(6, 2) };
  }
  // (y,m,d,h,mi) 是否不早于时刻 t
  function after(y, m, d, h, mi, t) {
    if (!t) return false;
    mi = mi || 0;
    if (y !== t.y) return y > t.y;
    if (m !== t.m) return m > t.m;
    if (d !== t.d) return d > t.d;
    if (h !== t.h) return h > t.h;
    return mi >= (t.mi || 0);
  }
  function stamp(t) { return t ? { y: t.y, m: t.m, d: t.d, h: t.h, mi: t.mi || 0 } : null; }

  // 所在"节"
  function currentJie(y, m, d, h, mi) {
    var i, list = [];
    for (i = 0; i < JIE.length; i++) {
      var t = term(y, JIE[i].t);
      if (t) list.push({ y: y, m: t.m, d: t.d, h: t.h, mi: t.mi, zhi: JIE[i].zhi, name: JIE[i].name, idx: JIE[i].t });
    }
    list.sort(function (a, b) { return (a.m * 10000 + a.d * 100 + a.h) - (b.m * 10000 + b.d * 100 + b.h); });
    var cur = null;
    for (i = 0; i < list.length; i++) {
      if (after(y, m, d, h, mi, list[i])) cur = list[i]; else break;
    }
    if (!cur) {
      var pt = term(y - 1, 22);
      if (pt) return { y: y - 1, m: pt.m, d: pt.d, h: pt.h, mi: pt.mi, zhi: 0, name: '大雪', idx: 22 };
      return null;
    }
    return cur;
  }

  /* ---------------- 干支 ---------------- */
  function gzName(idx) { return GAN[idx % 10] + ZHI[idx % 12]; } // 0=甲子

  // 年柱：立春为界
  function yearPillar(y, m, d, h, mi) {
    var lc = term(y, 2);
    var wy = y;
    if (lc && !after(y, m, d, h, mi, { y: y, m: lc.m, d: lc.d, h: lc.h, mi: lc.mi })) wy = y - 1;
    var idx = ((wy - 4) % 60 + 60) % 60;
    return { gan: idx % 10, zhi: idx % 12, idx: idx, year: wy };
  }

  // 月柱：十二节为界 + 五虎遁
  function monthPillar(y, m, d, h, mi, yearGan) {
    var jie = currentJie(y, m, d, h, mi);
    if (!jie) return null;
    var zhi = jie.zhi;
    var yinGan = ((yearGan % 5) * 2 + 2) % 10;
    var steps = ((zhi - 2) % 12 + 12) % 12;
    var gan = (yinGan + steps) % 10;
    return { gan: gan, zhi: zhi, jie: jie.name, jieDate: jie };
  }

  // 日柱：JDN 推算（0=甲子）
  function dayPillar(y, m, d) {
    var idx = ((jdn(y, m, d) + 49) % 60 + 60) % 60;
    return { gan: idx % 10, zhi: idx % 12, idx: idx };
  }

  // 时柱：五鼠遁
  function hourPillar(dayGan, h) {
    var zhi = Math.floor((h + 1) / 2) % 12;
    var gan = ((dayGan % 5) * 2 + zhi) % 10;
    return { gan: gan, zhi: zhi };
  }

  /* ---------------- 四柱排盘 ---------------- */
  // 日柱按子时（23 时）换日，与八字正统一致
  function fourPillars(y, m, d, hh, mi) {
    hh = (hh == null) ? 0 : hh; mi = mi || 0;
    var dy = y, dm = m, dd = d;
    if (hh >= 23) {
      var nd = new Date(y, m - 1, d); nd.setDate(nd.getDate() + 1);
      dy = nd.getFullYear(); dm = nd.getMonth() + 1; dd = nd.getDate();
    }
    var Y_ = yearPillar(y, m, d, hh, mi);
    var M_ = monthPillar(y, m, d, hh, mi, Y_.gan);
    var D_ = dayPillar(dy, dm, dd);
    var H_ = hourPillar(D_.gan, hh);
    return {
      year: { gan: Y_.gan, zhi: Y_.zhi, gz: gzName(Y_.idx), year: Y_.year },
      month: M_ ? { gan: M_.gan, zhi: M_.zhi, gz: GAN[M_.gan] + ZHI[M_.zhi], jie: M_.jie } : null,
      day: { gan: D_.gan, zhi: D_.zhi, gz: gzName(D_.idx) },
      hour: { gan: H_.gan, zhi: H_.zhi, gz: GAN[H_.gan] + ZHI[H_.zhi] },
      isLateZi: (hh >= 23),
      solar: { y: y, m: m, d: d, h: hh, mi: mi }
    };
  }

  /* ---------------- 农历 ---------------- */
  var LUNAR_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var LUNAR_DAY = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  function toLunar(y, m, d) {
    var D = window.LUNAR_DATA;
    if (!D) return null;
    var target = jdn(y, m, d);
    var base = jdn(1900, 1, 31); // 1900 年正月初一
    if (target < base) return null;
    var offset = target - base;
    var ly = 1900;
    for (; ly <= 2098; ly++) {
      var info = D[String(ly)];
      if (!info) return null;
      var total = 0;
      for (var i = 0; i < info.days.length; i++) total += info.days[i];
      if (offset < total) break;
      offset -= total;
    }
    var inf = D[String(ly)];
    if (!inf) return null;
    var mm = 1, isLeap = false;
    for (var j = 0; j < inf.days.length; j++) {
      if (offset < inf.days[j]) {
        var seqIdx = j + 1;
        var leapAt = inf.leap ? (inf.leap + 1) : 0;
        isLeap = (leapAt && seqIdx === leapAt);
        mm = isLeap ? inf.leap : (seqIdx - ((leapAt && seqIdx > leapAt) ? 1 : 0));
        break;
      }
      offset -= inf.days[j];
    }
    return {
      year: ly, month: mm, day: offset + 1, isLeap: isLeap,
      cn: (isLeap ? '闰' : '') + LUNAR_MONTH[mm - 1] + '月' + LUNAR_DAY[offset]
    };
  }

  /* ---------------- 五行 / 十神 / 纳音 ---------------- */
  function ganWx(g) { return GAN_WX[g % 10]; }
  function zhiWx(z) { return ZHI_WX[z % 12]; }
  function nayin(gzIdx) { return NAYIN[Math.floor(gzIdx / 2) % 60]; }

  function shiShen(dayGan, otherGan) {
    var dw = GAN_WX[dayGan], ow = GAN_WX[otherGan];
    var same = (dayGan % 2) === (otherGan % 2);
    if (dw === ow) return same ? '比肩' : '劫财';
    if (SHENG[dw] === ow) return same ? '食神' : '伤官';
    if (KE[dw] === ow) return same ? '偏财' : '正财';
    if (KE[ow] === dw) return same ? '七杀' : '正官';
    if (SHENG[ow] === dw) return same ? '偏印' : '正印';
    return '';
  }

  function kongWang(dayIdx) {
    var xun = Math.floor(dayIdx / 10);
    var start = xun * 10;
    return [ZHI[(start + 10) % 12], ZHI[(start + 11) % 12]];
  }

  function gzIndexOf(g, z) {
    for (var i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
    return 0;
  }

  /* ---------------- 五行统计 ---------------- */
  function wuxingStat(fp) {
    var cnt = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var detail = [];
    function addGan(gan, label, w) {
      if (gan == null) return;
      cnt[GAN_WX[gan]] += w;
      detail.push({ p: label, type: '干', ch: GAN[gan], wx: GAN_WX[gan], weight: w });
    }
    function addZhi(zhi, label, w) {
      if (zhi == null) return;
      var cang = ZHI_CANG[ZHI[zhi]];
      for (var i = 0; i < cang.length; i++) {
        var ww = i === 0 ? w : (i === 1 ? w * 0.4 : w * 0.2);
        cnt[GAN_WX[GAN.indexOf(cang[i])]] += ww;
      }
      detail.push({ p: label, type: '支', ch: ZHI[zhi], wx: ZHI_WX[zhi], weight: w });
    }
    addGan(fp.year.gan, '年干', 1); addZhi(fp.year.zhi, '年支', 1);
    if (fp.month) { addGan(fp.month.gan, '月干', 1.2); addZhi(fp.month.zhi, '月支', 1.2); }
    addGan(fp.day.gan, '日干', 1); addZhi(fp.day.zhi, '日支', 1);
    addGan(fp.hour.gan, '时干', 1); addZhi(fp.hour.zhi, '时支', 1);
    var vals = [];
    for (var k in cnt) vals.push({ wx: k, v: Math.round(cnt[k] * 100) / 100 });
    vals.sort(function (a, b) { return b.v - a.v; });
    var total = 0; for (var kk in cnt) total += cnt[kk];
    return {
      count: cnt, list: vals, detail: detail, total: Math.round(total * 100) / 100,
      strongest: vals[0], weakest: vals[vals.length - 1],
      missing: vals.filter(function (x) { return x.v < 0.05; }).map(function (x) { return x.wx; })
    };
  }

  /* ---------------- 大运 ---------------- */
  function nextJieAfter(y, m, d, hh, mi) {
    var list = [];
    for (var i = 0; i < JIE.length; i++) {
      var t = term(y, JIE[i].t);
      if (t) list.push({ y: y, m: t.m, d: t.d, h: t.h, mi: t.mi });
    }
    list.sort(function (a, b) { return (a.m * 10000 + a.d * 100 + a.h) - (b.m * 10000 + b.d * 100 + b.h); });
    for (var j = 0; j < list.length; j++) {
      if (!after(y, m, d, hh, mi, list[j])) return list[j];
    }
    var nt = term(y + 1, 0);
    return nt ? { y: y + 1, m: nt.m, d: nt.d, h: nt.h, mi: nt.mi } : null;
  }

  function dateDiff(y1, m1, d1, h1, t) {
    var a = jdn(y1, m1, d1) + h1 / 24;
    var b = jdn(t.y, t.m, t.d) + (t.h || 0) / 24 + (t.mi || 0) / 1440;
    return Math.abs(b - a);
  }

  function daYun(y, m, d, hh, fp, gender, count) {
    var yangYear = (fp.year.gan % 2) === 0;
    var forward = (yangYear && gender === 'male') || (!yangYear && gender === 'female');
    var days;
    if (forward) {
      var nxt = nextJieAfter(y, m, d, hh, 0);
      days = nxt ? dateDiff(y, m, d, hh, nxt) : 15;
    } else {
      var jie = currentJie(y, m, d, hh, 0);
      days = jie ? dateDiff(jie.y, jie.m, jie.d, jie.h, { y: y, m: m, d: d, h: hh, mi: 0 }) : 15;
    }
    var startAge = days / 3;
    var startY = Math.floor(startAge);
    var startM = Math.round((startAge - startY) * 12);
    if (startM >= 12) { startY++; startM -= 12; }
    var mi = fp.month ? gzIndexOf(fp.month.gan, fp.month.zhi) : 0;
    var list = [];
    for (var i = 1; i <= (count || 8); i++) {
      var idx = ((mi + (forward ? i : -i)) % 60 + 60) % 60;
      list.push({
        n: i, gz: GAN[idx % 10] + ZHI[idx % 12], gan: idx % 10, zhi: idx % 12,
        startAge: startY + (i - 1) * 10,
        startYear: y + startY + (i - 1) * 10
      });
    }
    return { forward: forward, startAge: startY, startMonth: startM, list: list };
  }

  /* ---------------- 导出 ---------------- */
  Y.C = {
    GAN: GAN, ZHI: ZHI, GAN_WX: GAN_WX, ZHI_WX: ZHI_WX, ZHI_CANG: ZHI_CANG,
    NAYIN: NAYIN, SHENG: SHENG, KE: KE, JIE: JIE,
    LUNAR_MONTH: LUNAR_MONTH, LUNAR_DAY: LUNAR_DAY,
    jdn: jdn, term: term, currentJie: currentJie, fourPillars: fourPillars,
    toLunar: toLunar, ganWx: ganWx, zhiWx: zhiWx, nayin: nayin,
    shiShen: shiShen, kongWang: kongWang, wuxingStat: wuxingStat,
    daYun: daYun, gzIndexOf: gzIndexOf, gzName: gzName, after: after,
    nextJieAfter: nextJieAfter, dateDiff: dateDiff
  };
})(window.YXJ);
