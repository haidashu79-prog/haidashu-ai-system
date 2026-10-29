/* =============================================================
   易玄机 · 奇门遁甲引擎 qimen.js（时家转盘）
   定局采用拆补法：以日辰符头（甲/己日）定三元，符头所在节气定阴阳遁与局数；
   排盘：地盘三奇六仪、值符值使、天盘九星、人盘八门、神盘八神、用神落宫。
   规则数据见 assets/qimen.js。传统术数通用规则，民俗文化参考。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';
  var C = Y.C;
  var Q = window.QIMEN_DATA || {};
  var PAL = Q.palaces || {};
  var TERM_NAMES = window.TERM_NAMES || [];

  var YI_CYCLE = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
  var STAR_CYCLE = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
  var DOOR_CYCLE = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
  var SPIRIT_CYCLE = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

  var DOORS = {}; (Q.doors || []).forEach(function (d) { DOORS[d.palace] = d; });
  var STARS = {}; (Q.stars || []).forEach(function (s) { STARS[s.palace] = s; });

  /* ---------- 工具 ---------- */
  function dayIdx(y, m, d) { return ((C.jdn(y, m, d) + 49) % 60 + 60) % 60; }

  function rotatePalace(start, steps, yin) {
    var seq = yin ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var i0 = seq.indexOf(start);
    return seq[((i0 + steps) % 9 + 9) % 9];
  }

  function gongOfYi(diYi, ch) {
    for (var p in diYi) if (diYi[p] === ch) return +p;
    return 0;
  }

  // 时干支在 60 甲子中的序号（1-60）
  function hzIndex(hg1, hz1) {
    for (var n = 1; n <= 60; n++) if (((n - 1) % 10) + 1 === hg1 && ((n - 1) % 12) + 1 === hz1) return n;
    return 1;
  }

  // 某日所在的二十四节气
  function termOfDay(y, m, d, h, mi) {
    h = h || 0; mi = mi || 0;
    var list = [];
    for (var i = 0; i < 24; i++) {
      var t = C.term(y, i);
      if (t) list.push({ i: i, y: y, m: t.m, d: t.d, h: t.h, mi: t.mi, name: TERM_NAMES[i] });
    }
    list.sort(function (a, b) { return (a.m * 10000 + a.d * 100 + a.h) - (b.m * 10000 + b.d * 100 + b.h); });
    var cur = null;
    for (var k = 0; k < list.length; k++) {
      if (C.after(y, m, d, h, mi, list[k])) cur = list[k]; else break;
    }
    if (!cur) {
      var pt = C.term(y - 1, 23);
      if (pt) return { i: 23, y: y - 1, m: pt.m, d: pt.d, h: pt.h, mi: pt.mi, name: TERM_NAMES[23] || '冬至' };
      return null;
    }
    return cur;
  }

  /* ---------- 定局（拆补法） ---------- */
  function dingJu(y, m, d, h, mi) {
    // 1) 回溯符头（天干为甲或己之日）
    var di = dayIdx(y, m, d);
    var yy = y, mm = m, dd = d, back = 0;
    while (!(di % 10 === 0 || di % 10 === 5)) {
      var nd = new Date(yy, mm - 1, dd); nd.setDate(nd.getDate() - 1);
      yy = nd.getFullYear(); mm = nd.getMonth() + 1; dd = nd.getDate();
      di = (di - 1 + 60) % 60; back++;
    }
    var yuanMod = di % 15;                 // 0 上元 / 5 中元 / 10 下元
    var yuan = yuanMod === 0 ? 0 : (yuanMod === 5 ? 1 : 2);
    // 2) 符头所在节气 → 阴阳遁与局数
    var t = termOfDay(yy, mm, dd, 12, 0);
    if (!t) return null;
    var rec = (Q.solar_terms || {})[t.name];
    if (!rec) return null;
    var yinYang = rec[0], ju = rec[1][yuan];
    return {
      yinYang: yinYang, ju: ju, termName: t.name,
      termDate: { m: t.m, d: t.d, h: t.h }, yuan: ['上元', '中元', '下元'][yuan],
      fuTou: { y: yy, m: mm, d: dd, idx: di, back: back, gz: C.gzName(di) }
    };
  }

  /* ---------- 排盘 ---------- */
  function pan(yinYang, ju, hourG1, hourZhi1, dayGan0) {
    var yin = (yinYang === '阴');
    // 地盘三奇六仪
    var seq = yin ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var diYi = {}, startI = seq.indexOf(ju);
    for (var k = 0; k < 9; k++) diYi[seq[(startI + k) % 9]] = YI_CYCLE[k];
    // 值符：时干支 → 旬首 → 六仪
    var hz = hzIndex(hourG1, hourZhi1);
    var zhouXun = Math.floor((hz - 1) / 10);           // 0..5
    var zhiFuYi = YI_CYCLE[zhouXun];                   // 甲子→戊 ... 甲寅→癸
    var zhiFuGong = gongOfYi(diYi, zhiFuYi);
    var zhiFuStar = (STARS[zhiFuGong] || {}).name || '天禽';
    var zhiShiDoor = (DOORS[zhiFuGong] || {}).name || '死';
    // 日干落宫（甲遁于戊＝值符宫）
    var dgChar = C.GAN[dayGan0];
    var dayGanGong = gongOfYi(diYi, dgChar) || zhiFuGong;
    // 时干落宫（甲遁于值符）
    var shiGanGong = (hourG1 === 1) ? zhiFuGong : (gongOfYi(diYi, C.GAN[hourG1 - 1]) || zhiFuGong);
    // 天盘九星：值符星落时干宫，其余阳顺阴逆
    var tianStar = {};
    var star0 = STAR_CYCLE.indexOf(zhiFuStar);
    for (var a = 0; a < 9; a++) tianStar[rotatePalace(shiGanGong, a, yin)] = STAR_CYCLE[(star0 + a) % 9];
    // 人盘八门：值使门随时辰顺逆飞宫，中宫无门（落中宫者寄坤二宫）
    var zhiShiGongRaw = rotatePalace(zhiFuGong, hourZhi1 - 1, yin);
    var renDoor = {}, d0 = DOOR_CYCLE.indexOf(zhiShiDoor), cnt = 0, kk = 0;
    var doorStart = (zhiShiGongRaw === 5 ? 2 : zhiShiGongRaw);
    while (cnt < 8) {
      var g = rotatePalace(doorStart, kk, yin);
      if (g === 5) { kk++; continue; }
      renDoor[g] = DOOR_CYCLE[(d0 + cnt) % 8] + '门';
      cnt++; kk++;
    }
    // 值使门实际落宫（若起手落中宫，则寄坤二宫后再算）
    var zhiShiGong = zhiShiGongRaw;
    for (var dg in renDoor) if (renDoor[dg] === zhiShiDoor + '门') { zhiShiGong = +dg; break; }
    // 神盘八神：值符落时干宫，其余顺逆旋转；八神只布八宫，中宫不排神（落中宫者寄坤二宫）
    var shen = {}, sp = 0, bk = 0;
    var shenStart = (shiGanGong === 5 ? 2 : shiGanGong);
    while (sp < 8) {
      var gs = rotatePalace(shenStart, bk, yin);
      if (gs === 5) { bk++; continue; }
      shen[gs] = SPIRIT_CYCLE[sp % 8];
      sp++; bk++;
    }
    return {
      diYi: diYi, tianStar: tianStar, renDoor: renDoor, shen: shen, yin: yin, ju: ju,
      zhiFuGong: zhiFuGong, zhiFuStar: zhiFuStar, zhiShiDoor: zhiShiDoor, zhiShiGong: zhiShiGong,
      shiGanGong: shiGanGong, dayGanGong: dayGanGong, zhiFuYi: zhiFuYi
    };
  }

  /* ---------- 用神 ---------- */
  var CAT_LABEL = { general: '综合运程' };
  function yongShenRead(p, category) {
    var map = (Q.yongshen || {});
    var targets = map[category] || map['general'] || [];
    var out = [];
    function at(g, note) {
      var pl = PAL[String(g)] || {};
      return {
        gong: g, name: pl.name || '', dir: pl.dir || '',
        star: p.tianStar[g] || '无', door: g === 5 ? '无门' : (p.renDoor[g] || '无'),
        shen: p.shen[g] || '无', yi: p.diYi[g] || '无', note: note
      };
    }
    targets.forEach(function (t) {
      if (t.indexOf('日干') === 0) { out.push(Object.assign(at(p.dayGanGong, '求测人自身'), { yong: t })); return; }
      if (t.indexOf('时干') === 0) { out.push(Object.assign(at(p.shiGanGong, '所占事体'), { yong: t })); return; }
      var g = 0;
      for (var gp in p.renDoor) if (p.renDoor[gp] === t) { g = +gp; break; }
      if (!g) for (var gs in p.tianStar) if (p.tianStar[gs] === t) { g = +gs; break; }
      if (!g) for (var gy in p.diYi) if (p.diYi[gy] === t) { g = +gy; break; }
      if (!g) for (var gn in p.shen) if (p.shen[gn] === t) { g = +gn; break; }
      if (!g) { out.push({ yong: t, missing: true }); return; }
      out.push(Object.assign(at(g), { yong: t }));
    });
    return out;
  }

  /* ---------- 主入口 ---------- */
  function run(opts) {
    opts = opts || {};
    var now = new Date();
    var y = opts.y != null ? opts.y : now.getFullYear();
    var m = opts.m != null ? opts.m : now.getMonth() + 1;
    var d = opts.d != null ? opts.d : now.getDate();
    var h = opts.h != null ? opts.h : now.getHours();
    var mi = opts.mi != null ? opts.mi : now.getMinutes();
    var ju = dingJu(y, m, d, h, mi);
    if (!ju) return null;
    var fp = C.fourPillars(y, m, d, h, mi);
    var hg1 = fp.hour.gan + 1, hz1 = fp.hour.zhi + 1;
    var p = pan(ju.yinYang, ju.ju, hg1, hz1, fp.day.gan);
    var gongs = {};
    for (var g = 1; g <= 9; g++) {
      var pl = PAL[String(g)] || {};
      gongs[g] = {
        gong: g, name: pl.name || '', dir: pl.dir || '',
        star: p.tianStar[g] || '无', door: g === 5 ? '' : (p.renDoor[g] || ''),
        shen: p.shen[g] || '无', yi: p.diYi[g] || '无',
        isZhiFu: g === p.zhiFuGong, isShiGan: g === p.shiGanGong, isDayGan: g === p.dayGanGong
      };
    }
    var cat = opts.category && (Q.yongshen || {})[opts.category] ? opts.category : 'general';
    return {
      time: { y: y, m: m, d: d, h: h, mi: mi },
      ding: ju, fp: fp, pan: p, gongs: gongs,
      category: cat, categoryLabel: CAT_LABEL[cat] || cat, yongShen: yongShenRead(p, cat),
      pillars: fp.year.gz + '年 ' + (fp.month ? fp.month.gz + '月 ' : '') + fp.day.gz + '日 ' + fp.hour.gz + '时'
    };
  }

  Y.QM = {
    run: run, dingJu: dingJu, pan: pan, yongShenRead: yongShenRead,
    termOfDay: termOfDay, rotatePalace: rotatePalace, dayIdx: dayIdx,
    YI_CYCLE: YI_CYCLE, STAR_CYCLE: STAR_CYCLE, DOOR_CYCLE: DOOR_CYCLE, SPIRIT_CYCLE: SPIRIT_CYCLE
  };
})(window.YXJ);
