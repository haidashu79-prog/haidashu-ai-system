/* =============================================================
   易玄机 · 周易六爻引擎 yijing.js
   起卦（三钱法 / 梅花时间起卦）、本卦变卦、纳甲装卦（卦宫/世应/六亲/六神）
   卦辞爻辞数据见 assets/hexagrams.js（《周易》公有领域原文）
   装卦规则为传统六爻通用规则（京房纳甲、八宫卦序、世应）。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';
  var C = Y.C, GAN = C.GAN, ZHI = C.ZHI, ZHI_CANG = C.ZHI_CANG;

  /* ---------- 索引 ---------- */
  var HEX = window.HEXAGRAMS || [];
  var BY_PATTERN = {};
  HEX.forEach(function (h) { BY_PATTERN[h.pattern.join('')] = h; });

  // 先天八卦数（乾1 兑2 离3 震4 巽5 坎6 艮7 坤8）
  var NUM2GUA = ['', '乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  var GUA2NUM = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 };

  /* ---------- 八宫卦序（京房易） ---------- */
  var PALACE = [
    { g: '乾', w: '金', h: ['乾', '姤', '遁', '否', '观', '剥', '晋', '大有'] },
    { g: '坎', w: '水', h: ['坎', '节', '屯', '既济', '革', '丰', '明夷', '师'] },
    { g: '艮', w: '土', h: ['艮', '贲', '大畜', '损', '睽', '履', '中孚', '渐'] },
    { g: '震', w: '木', h: ['震', '豫', '解', '恒', '升', '井', '大过', '随'] },
    { g: '巽', w: '木', h: ['巽', '小畜', '家人', '益', '无妄', '噬嗑', '颐', '蛊'] },
    { g: '离', w: '火', h: ['离', '旅', '鼎', '未济', '蒙', '涣', '讼', '同人'] },
    { g: '坤', w: '土', h: ['坤', '复', '临', '泰', '大壮', '夬', '需', '比'] },
    { g: '兑', w: '金', h: ['兑', '困', '萃', '咸', '蹇', '谦', '小过', '归妹'] }
  ];
  // 宫内卦序（1-8）→ 世应
  var SHI_YING = [[6, 3], [1, 4], [2, 5], [3, 6], [4, 1], [5, 2], [4, 1], [3, 6]];

  var HEX2PALACE = {};
  PALACE.forEach(function (p) {
    p.h.forEach(function (n, i) {
      HEX2PALACE[n] = { gong: p.g, wx: p.w, seq: i + 1, shi: SHI_YING[i][0], ying: SHI_YING[i][1] };
    });
  });

  /* ---------- 纳甲（八经卦地支；前3为内卦初二三，后3为外卦四五上） ---------- */
  var NAJIA = {
    乾: { gan: ['甲', '壬'], zhi: ['子', '寅', '辰', '午', '申', '戌'] },
    坤: { gan: ['乙', '癸'], zhi: ['未', '巳', '卯', '丑', '亥', '酉'] },
    震: { gan: ['庚', '庚'], zhi: ['子', '寅', '辰', '午', '申', '戌'] },
    巽: { gan: ['辛', '辛'], zhi: ['丑', '亥', '酉', '未', '巳', '卯'] },
    坎: { gan: ['戊', '戊'], zhi: ['寅', '辰', '午', '申', '戌', '子'] },
    离: { gan: ['己', '己'], zhi: ['卯', '丑', '亥', '酉', '未', '巳'] },
    艮: { gan: ['丙', '丙'], zhi: ['辰', '午', '申', '戌', '子', '寅'] },
    兑: { gan: ['丁', '丁'], zhi: ['巳', '卯', '丑', '亥', '酉', '未'] }
  };

  /* ---------- 六亲 ---------- */
  function liuQin(gongWx, yaoWx) {
    var S = C.SHENG, K = C.KE;
    if (gongWx === yaoWx) return '兄弟';
    if (S[gongWx] === yaoWx) return '子孙';
    if (K[gongWx] === yaoWx) return '妻财';
    if (K[yaoWx] === gongWx) return '官鬼';
    if (S[yaoWx] === gongWx) return '父母';
    return '';
  }

  /* ---------- 六神 ---------- */
  var LIUSHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
  function liuShen(dayGan) {
    // 甲乙起青龙，丙丁起朱雀，戊起勾陈，己起螣蛇，庚辛起白虎，壬癸起玄武
    var start = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5 }[dayGan];
    var arr = [];
    for (var i = 0; i < 6; i++) arr.push(LIUSHEN[(start + i) % 6]);
    return arr;
  }

  /* ---------- 起卦 ---------- */
  // 三钱法：三背为老阳(9)、两背少阳(7)、一背少阴(8)、三字老阴(6)
  function tossLine() {
    var backs = 0;
    for (var i = 0; i < 3; i++) if (Math.random() < 0.5) backs++;
    return backs === 0 ? 6 : (backs === 1 ? 8 : (backs === 2 ? 7 : 9));
  }
  function tossSix() {
    var a = [];
    for (var i = 0; i < 6; i++) a.push(tossLine());
    return a;
  }

  // 由六爻值（6/7/8/9，初→上）构造
  function fromLines(lines) {
    var primPat = lines.map(function (v) { return (v === 7 || v === 9) ? 1 : 0; }).join('');
    var moves = [];
    lines.forEach(function (v, i) { if (v === 6 || v === 9) moves.push(i); });
    var chgPat = lines.map(function (v, i) {
      var b = (v === 7 || v === 9) ? '1' : '0';
      return (v === 6 || v === 9) ? (b === '1' ? '0' : '1') : b;
    }).join('');
    var allOld = (lines.every(function (v) { return v === 9; })) || (lines.every(function (v) { return v === 6; }));
    return {
      lines: lines, moves: moves,
      prim: BY_PATTERN[primPat] || null,
      chg: (moves.length && !allOld) ? (BY_PATTERN[chgPat] || null) : null,
      allOld: allOld, primPat: primPat, chgPat: chgPat
    };
  }

  // 梅花易数·时间起卦
  function castByTime(y, m, d, h, lunar, yearZhiIdx) {
    var yz = yearZhiIdx + 1;               // 年支序 1-12
    var lm = lunar ? lunar.month : m;
    var ld = lunar ? lunar.day : d;
    var hz = Math.floor((h + 1) / 2) % 12 + 1; // 时支序 1-12
    var up = (yz + lm + ld) % 8 || 8;
    var low = (yz + lm + ld + hz) % 8 || 8;
    var mv = (yz + lm + ld + hz) % 6 || 6;
    // 上卦为外、下卦为内 → pattern 初→上 = 下卦三爻 + 上卦三爻
    var lp = guaPattern(NUM2GUA[low]), up2 = guaPattern(NUM2GUA[up]);
    var pat = lp.concat(up2);
    // 动爻 mv(1-6) 为老阳/老阴（此处取老阳动）
    var lines = pat.map(function (b, i) { return (i === mv - 1) ? (b ? 9 : 6) : (b ? 7 : 8); });
    var r = fromLines(lines);
    r.method = '时间起卦（梅花易数）';
    r.nums = { up: up, low: low, move: mv, yz: yz, lm: lm, ld: ld, hz: hz };
    return r;
  }

  // 八经卦三爻 pattern（初→上）
  var GUA_PAT = {
    乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
    巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0]
  };
  function guaPattern(name) { return GUA_PAT[name] ? GUA_PAT[name].slice() : [0, 0, 0]; }

  /* ---------- 装卦 ---------- */
  function zhuang(hex, dayGan) {
    if (!hex) return null;
    var pal = HEX2PALACE[hex.name];
    if (!pal) return null;
    var inn = NAJIA[hex.lower], out = NAJIA[hex.upper];
    var shen = liuShen(dayGan);
    var yao = [];
    for (var i = 0; i < 6; i++) {
      var isInner = i < 3;
      var src = isInner ? inn : out;
      var pos = isInner ? i : (i - 3);
      var ganCh = src.gan[isInner ? 0 : 1];
      var zhiCh = src.zhi[i];             // 地支表 0-5 对应初-上
      var yaoWx = C.zhiWx(ZHI.indexOf(zhiCh));
      yao.push({
        pos: i + 1, gan: ganCh, zhi: zhiCh, gz: ganCh + zhiCh,
        wx: yaoWx, qin: liuQin(pal.wx, yaoWx), shen: shen[i],
        shi: (i + 1) === pal.shi, ying: (i + 1) === pal.ying, yang: hex.pattern[i] === 1
      });
    }
    return { gong: pal.gong, gongWx: pal.wx, seq: pal.seq, shi: pal.shi, ying: pal.ying, yao: yao };
  }

  // 完整排卦
  function divine(r, dayGan) {
    var z = zhuang(r.prim, dayGan), zc = r.chg ? zhuang(r.chg, dayGan) : null;
    return { cast: r, prim: r.prim, chg: r.chg, moves: r.moves, zhuang: z, zhuangChg: zc, allOld: r.allOld };
  }

  Y.YJ = {
    HEX: HEX, BY_PATTERN: BY_PATTERN, NUM2GUA: NUM2GUA, GUA2NUM: GUA2NUM,
    PALACE: PALACE, HEX2PALACE: HEX2PALACE, NAJIA: NAJIA, GUA_PAT: GUA_PAT,
    LIUSHEN: LIUSHEN,
    tossLine: tossLine, tossSix: tossSix, fromLines: fromLines,
    castByTime: castByTime, zhuang: zhuang, divine: divine,
    liuQin: liuQin, guaPattern: guaPattern
  };
})(window.YXJ);
