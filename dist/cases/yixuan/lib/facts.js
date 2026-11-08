/* =============================================================
   易玄机 · 命盘硬数据 facts.js
   把一个人的四柱拆成「讲得出口」的硬数据：十神、纳音、空亡、藏干、
   五行缺旺、大运、流年、神煞、地支刑冲合害、调补。
   —— 数据全在本机算准，AI 只管照数讲，不许自己另算。
   —— 每一条术语后面都跟一句大白话（＝就是……），
      这样讲出来的话，不懂命理的人也听得懂。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';
  var C = Y.C;
  var GAN = C.GAN, ZHI = C.ZHI;

  /* ---------- 属相 ---------- */
  var XIAO = {
    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
    午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪'
  };

  /* ---------- 三合局 / 神煞 ---------- */
  var JU = {
    申: '申子辰', 子: '申子辰', 辰: '申子辰',
    亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未',
    寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌',
    巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑'
  };
  var TAO = { 申子辰: '酉', 亥卯未: '子', 寅午戌: '卯', 巳酉丑: '午' };      // 桃花
  var YIMA = { 申子辰: '寅', 亥卯未: '巳', 寅午戌: '申', 巳酉丑: '亥' };     // 驿马
  var HUA = { 申子辰: '辰', 亥卯未: '未', 寅午戌: '戌', 巳酉丑: '丑' };      // 华盖
  var TIANYI = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' };
  var WENCHANG = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
  var LUSHEN = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
  var YANGREN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

  /* ---------- 刑冲合害 ---------- */
  var CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
  var HE6 = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  var HAI6 = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
  var XING = ['子卯', '卯子', '寅巳', '巳申', '申寅', '巳寅', '申巳', '寅申',
    '丑戌', '戌未', '未丑', '戌丑', '未戌', '丑未'];
  var ZIXING = { 辰: 1, 午: 1, 酉: 1, 亥: 1 };

  /* ---------- 十神的大白话 ---------- */
  var SS_BAI = {
    比肩: '跟你同一路的人——兄弟、朋友、同行、平辈的竞争者',
    劫财: '来分你东西的同类——合伙人、抢生意的、手足',
    食神: '你自己生出来的、顺着你的那份才气——享受、手艺、口福、子女',
    伤官: '你的才气，但不服管——锋芒、创意、嘴上不让人',
    正财: '辛苦挣的、按月进账的钱——工资、正业，男命也指妻子',
    偏财: '外面的、不固定的钱——生意、投资、外快，男命也指父亲',
    正官: '正经的位子和约束——体制、上司、职务，女命也指丈夫',
    七杀: '硬压过来的那股劲——强对手、强势领导、突发的麻烦',
    正印: '生你护你的人——母亲、长辈、学历、靠山',
    偏印: '偏门的护佑——继母、技术、偏门学问、灵感'
  };
  function ssBai(ss) { return SS_BAI[ss] ? ('（就是' + SS_BAI[ss] + '）') : ''; }

  /* ---------- 术语白话小抄（给页面和 AI 共用） ---------- */
  var GLOSS = [
    ['十神', '以你自己为中心，看别的字跟你的关系，一共十种，管的是六亲和事象'],
    ['纳音', '老派叫法，把一柱干支配成一个画面，比如「路旁土」，只讲气象，不论吉凶'],
    ['空亡', '两个字对应的那股力道打了折——落在这儿的事容易落空、迟到、说了不算'],
    ['藏干', '地支里藏着的天干，像暗里的人、暗里的事，明面上看不见'],
    ['大运', '十年一换的运势班车，一步管十年'],
    ['流年', '今年的干支，管这一年'],
    ['喜用', '补你的那两口，沾上就顺'],
    ['忌神', '添乱的那两口，越多越拧'],
    ['神煞', '老书在盘上做的记号，看有没有贵人、桃花、驿马这一类'],
    ['天乙贵人', '一辈子帮你兜底的那股运，栽跟头的时候有人拉一把'],
    ['桃花', '人缘、异性缘，也主感情上的纠葛'],
    ['驿马', '动——跑动、搬迁、出差、往外发展'],
    ['文昌', '读书、考试、文书、脑子清楚'],
    ['华盖', '清高、爱独处、爱钻冷门学问，也主艺术和宗教'],
    ['禄神', '自己的饭碗，正当收入落在哪儿'],
    ['羊刃', '一股狠劲和拼劲，也主刀伤手术、脾气冲'],
    ['六冲', '两个属相正对着干，最容易翻脸、拆伙'],
    ['六合', '两个属相天生合得来，处着省力'],
    ['六害', '不吵不闹，但暗里互相消耗'],
    ['相刑', '磨人、拖累，事情反复'],
    ['三合', '三个属相凑成一股合力，适合搭伙']
  ];

  /* ---------- 两个地支之间什么关系 ---------- */
  function relOf(a, b) {
    if (!a || !b) return [];
    var out = [];
    if (a === b) {
      if (ZIXING[a]) out.push('自刑');
      return out;
    }
    if (CHONG[a] === b) out.push('六冲');
    if (HE6[a] === b) out.push('六合');
    if (HAI6[a] === b) out.push('六害');
    if (JU[a] === JU[b]) out.push('半合（三合缺一）');
    var p = a + b;
    for (var i = 0; i < XING.length; i++) if (XING[i] === p) { out.push('相刑'); break; }
    return out;
  }

  function ageNow(birth) {
    var d = new Date();
    var a = d.getFullYear() - birth.y;
    var mm = d.getMonth() + 1, dd = d.getDate();
    if (mm < birth.m || (mm === birth.m && dd < birth.d)) a--;
    return a < 0 ? 0 : a;
  }

  function hourCN(h) {
    var map = [[23, '子时'], [1, '丑时'], [3, '寅时'], [5, '卯时'], [7, '辰时'], [9, '巳时'],
      [11, '午时'], [13, '未时'], [15, '申时'], [17, '酉时'], [19, '戌时'], [21, '亥时']];
    var hh = h % 24;
    if (hh >= 23 || hh < 1) return '子时';
    for (var i = 0; i < map.length; i++) if (hh >= map[i][0] && hh < map[i][0] + 2) return map[i][1];
    return '';
  }

  /* =============================================================
     主函数：把 me 拆成一整套硬数据
     ============================================================= */
  function of(me) {
    if (!me || !me.fp) return null;
    var fp = me.fp, m = me.input || {};
    var dayGan = fp.day.gan, dayWx = C.ganWx(dayGan);
    var dayGanCN = GAN[dayGan];

    /* 1. 四柱明细 */
    var defs = [['年柱', fp.year], ['月柱', fp.month], ['日柱', fp.day], ['时柱', fp.hour]];
    var pillars = [];
    defs.forEach(function (d) {
      var pos = d[0], p = d[1];
      if (!p) return;
      var idx = C.gzIndexOf(p.gan, p.zhi);
      var isDay = pos === '日柱';
      var cang = (C.ZHI_CANG[ZHI[p.zhi]] || []).map(function (g) {
        var gi = GAN.indexOf(g);
        return { gan: g, wx: C.ganWx(gi), ss: C.shiShen(dayGan, gi) };
      });
      pillars.push({
        pos: pos, gan: GAN[p.gan], zhi: ZHI[p.zhi], gz: p.gz,
        ganWx: C.ganWx(p.gan), zhiWx: C.zhiWx(p.zhi),
        ss: isDay ? '日主（你自己）' : C.shiShen(dayGan, p.gan),
        ssOfZhi: cang[0] ? cang[0].ss : '',
        nayin: C.nayin(idx),
        cang: cang,
        xiao: XIAO[ZHI[p.zhi]]
      });
    });

    /* 2. 空亡（按日柱） */
    var dayIdx = C.gzIndexOf(fp.day.gan, fp.day.zhi);
    var kong = C.kongWang(dayIdx);

    /* 3. 五行 */
    var stat = me.stat;
    var count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach(function (p) { count[p.ganWx]++; count[p.zhiWx]++; });
    /* 字面上一个都没有的，才算真缺；权重法里漏掉的那点，是藏干里藏着的 */
    var zeroWx = [];
    for (var wz in count) if (count[wz] === 0) zeroWx.push(wz);

    /* 4. 日主强弱与喜忌 */
    var ys = me.ys || {};
    var strong = !!(ys.strength && ys.strength.strong);
    var ratio = ys.strength ? ys.strength.ratio : 0;

    /* 5. 大运 */
    var dy = null, dyCur = null;
    try {
      dy = C.daYun(m.y, m.m, m.d, me.unsure ? 12 : (m.h == null ? 12 : m.h), fp, me.gender, 8);
    } catch (e) { dy = null; }
    var age = ageNow(m);
    if (dy && dy.list && dy.list.length) {
      for (var i = 0; i < dy.list.length; i++) {
        if (age >= dy.list[i].startAge) dyCur = dy.list[i];
      }
    }
    var dyWithSS = [];
    if (dy && dy.list) {
      dy.list.forEach(function (x) {
        dyWithSS.push({
          gz: x.gz, startAge: x.startAge, startYear: x.startYear,
          ss: C.shiShen(dayGan, x.gan), zhiWx: C.zhiWx(x.zhi), ganWx: C.ganWx(x.gan),
          rel: relOf(ZHI[fp.day.zhi], ZHI[x.zhi])
        });
      });
    }

    /* 当前这步运要用带十神的那份 */
    var curSS = null;
    if (dyCur) {
      for (var c2 = 0; c2 < dyWithSS.length; c2++) {
        if (dyWithSS[c2].startAge === dyCur.startAge) { curSS = dyWithSS[c2]; break; }
      }
      if (!curSS) curSS = dyWithSS[dyWithSS.length - 1] || null;
    }

    /* 6. 流年 */
    var nowY = new Date().getFullYear();
    function yearGZ(y) {
      var t = C.fourPillars(y, 7, 1, 12, 0);
      return t && t.year ? t.year : null;
    }
    function lnInfo(y) {
      var g = yearGZ(y);
      if (!g) return null;
      var rels = [];
      var lnZhi = ZHI[g.zhi];
      pillars.forEach(function (p) {
        var r = relOf(lnZhi, p.zhi);
        if (r.length) rels.push({ pos: p.pos, zhi: p.zhi, rel: r });
      });
      return {
        y: y, gz: g.gz, ss: C.shiShen(dayGan, g.gan),
        xiao: XIAO[ZHI[g.zhi]], zhiWx: C.zhiWx(g.zhi),
        rels: rels,
        chongXiao: XIAO[CHONG[ZHI[g.zhi]]] || ''
      };
    }
    var ln = lnInfo(nowY), ln2 = lnInfo(nowY + 1);

    /* 7. 神煞 */
    var zhiSet = {};
    pillars.forEach(function (p) { (zhiSet[p.zhi] = zhiSet[p.zhi] || []).push(p.pos); });
    var tyZ = TIANYI[dayGanCN] || TIANYI[GAN[fp.year.gan]] || '';
    var ju = JU[ZHI[fp.day.zhi]] || JU[ZHI[fp.year.zhi]] || '';
    function hit(z) { return zhiSet[z] ? zhiSet[z].join('、') : ''; }
    var shen = [
      { n: '天乙贵人', z: tyZ, hit: tyZ ? (hit(tyZ.charAt(0)) + hit(tyZ.charAt(1))) : '',
        bai: '一辈子帮你兜底的那股运，栽跟头时有人拉一把' },
      { n: '桃花', z: TAO[ju] || '', hit: hit(TAO[ju] || ''), bai: '人缘、异性缘，也主感情上的牵扯' },
      { n: '驿马', z: YIMA[ju] || '', hit: hit(YIMA[ju] || ''), bai: '动——跑动、搬迁、出差、往外走' },
      { n: '华盖', z: HUA[ju] || '', hit: hit(HUA[ju] || ''), bai: '清高爱独处、爱钻冷门学问，也主艺术宗教' },
      { n: '文昌', z: WENCHANG[dayGanCN] || '', hit: hit(WENCHANG[dayGanCN] || ''), bai: '读书、考试、文书、脑子清楚' },
      { n: '禄神', z: LUSHEN[dayGanCN] || '', hit: hit(LUSHEN[dayGanCN] || ''), bai: '自己的饭碗，正当收入落在哪儿' },
      { n: '羊刃', z: YANGREN[dayGanCN] || '', hit: hit(YANGREN[dayGanCN] || ''), bai: '一股狠劲拼劲，也主刀伤手术、脾气冲' }
    ];

    /* 8. 四柱地支之间的关系 */
    var rels = [];
    for (var a = 0; a < pillars.length; a++) {
      for (var b = a + 1; b < pillars.length; b++) {
        var r = relOf(pillars[a].zhi, pillars[b].zhi);
        if (r.length) rels.push({ a: pillars[a].pos, az: pillars[a].zhi, b: pillars[b].pos, bz: pillars[b].zhi, rel: r });
      }
    }

    /* 9. 调补：喜用五行 → 方位/颜色/数字/行业 */
    var fix = [];
    var WF = (Y.RD && Y.RD.WX_FIX) || {};
    (ys.use || []).forEach(function (wx) {
      var f = WF[wx];
      if (f) fix.push({ wx: wx, dir: f.dir, color: f.color, num: f.num, trade: f.trade, food: f.food, item: f.item, note: f.note });
    });

    return {
      me: me,
      zao: me.zao, gender: me.gender,
      genderCN: me.gender === 'female' ? '女命（坤造）' : '男命（乾造）',
      born: m.y ? (m.y + '年' + m.m + '月' + m.d + '日' + (me.unsure ? '（时辰记不清）' : (m.h + '时' + (m.mi || 0) + '分'))) : '',
      hourName: me.unsure ? '' : hourCN(m.h || 0),
      age: age, yearNow: nowY,
      pillars: pillars,
      kong: kong,
      wx: {
        count: count, list: stat.list, missing: stat.missing, zero: zeroWx,
        strongest: stat.strongest, weakest: stat.weakest, total: stat.total
      },
      day: { gan: dayGanCN, wx: dayWx, strong: strong, ratio: ratio, use: ys.use || [], avoid: ys.avoid || [] },
      yearXiao: XIAO[ZHI[fp.year.zhi]],
      dy: dy ? { forward: dy.forward, startAge: dy.startAge, startMonth: dy.startMonth, list: dyWithSS, cur: curSS } : null,
      ln: ln, ln2: ln2,
      shen: shen,
      rels: rels,
      ju: ju,
      fix: fix
    };
  }

  /* =============================================================
     给 AI 的那一段：全是硬数据，每行都带大白话
     ============================================================= */
  function prompt(me) {
    var f;
    try { f = of(me); } catch (e) { return ''; }
    if (!f) return '';
    var L = [];
    L.push('【他这一盘已经排好了，下面都是准数。讲的时候照着这些数讲，不许自己另算、不许改数、不许说「大概是」】');
    L.push('命主：' + f.genderCN + '，' + f.born + '生' + (f.hourName ? '，' + f.hourName : '') + '，今年 ' + f.age + ' 岁。');
    L.push('四柱：' + f.zao + '（属' + f.yearXiao + '）');
    L.push('');

    L.push('【一、四柱拆开看】');
    f.pillars.forEach(function (p) {
      var cang = p.cang.map(function (c) {
        return c.gan + '（' + c.wx + '，对你＝' + (c.ss || '—') + '）';
      }).join('、');
      L.push('· ' + p.pos + '　' + p.gan + p.zhi +
        '｜天干' + p.gan + '属' + p.ganWx + '，对你是「' + p.ss + '」' + (p.ss === '日主（你自己）' ? '' : ssBai(p.ss)) +
        '｜地支' + p.zhi + '属' + p.zhiWx + '（' + p.xiao + '），里头藏着：' + cang +
        '｜纳音「' + p.nayin + '」（＝老派给这一柱配的一个画面，只讲气象，不论吉凶）');
    });
    L.push('· 空亡落在「' + f.kong.join('、') + '」（＝这两个字代表的力道打折，落在这儿的事容易落空、迟到、说了不算）');
    L.push('');

    L.push('【二、五行】');
    var cnt = [];
    for (var k in f.wx.count) cnt.push(k + ' ' + f.wx.count[k] + ' 个');
    L.push('· 八个字里：' + cnt.join('、') + '。');
    L.push('· 带权重算：' + f.wx.list.map(function (x) { return x.wx + ' ' + x.v; }).join('、') +
      '（月令的分量最重，所以跟单纯数个数不一样）');
    L.push('· 最旺：' + f.wx.strongest.wx + '；最弱：' + f.wx.weakest.wx + '。');
    if (f.wx.zero.length) {
      L.push('· 字面上缺：' + f.wx.zero.join('、') + '（＝八个字里头一个都没有，只在藏干里藏了一点点，等于这口最虚，得靠方位、颜色、行业、吃穿慢慢补）');
    } else {
      L.push('· 字面上五行都齐，没有真正缺的那一口。');
    }
    L.push('');

    L.push('【三、日主与喜忌】');
    L.push('· 日主' + f.day.gan + '，属' + f.day.wx + '；帮你生你的那股力量占全局 ' +
      Math.round(f.day.ratio * 100) + '%，所以是「' + (f.day.strong ? '身偏强' : '身偏弱') + '」' +
      (f.day.strong ? '（＝底子足、扛得住，但也容易一根筋）' : '（＝心细、扛不住压，得靠人扶）'));
    L.push('· 喜用：' + (f.day.use.join('、') || '—') + '（＝补这两口就顺，沾上就是帮你的）');
    L.push('· 忌：' + (f.day.avoid.join('、') || '—') + '（＝这两口越多越拧，该躲）');
    if (f.fix.length) {
      f.fix.forEach(function (x) {
        L.push('· 补' + x.wx + '的办法：方位' + x.dir + '；颜色' + x.color + '；数字' + x.num +
          '；行业' + x.trade + '；吃的' + x.food + '；能摆能戴' + x.item);
      });
    }
    L.push('');

    if (f.dy) {
      L.push('【四、大运（＝十年一换的运势班车）】');
      L.push('· ' + f.dy.startAge + ' 岁上运，' + f.dy.startMonth + ' 个月，' + (f.dy.forward ? '顺排' : '倒排') + '。');
      L.push('· 八步运：' + f.dy.list.map(function (x) {
        return x.startAge + '岁起 ' + x.gz + '（' + x.ss + '）';
      }).join('｜'));
      if (f.dy.cur) {
        L.push('· 他现在 ' + f.age + ' 岁，正走第 ' + Math.round((f.dy.cur.startAge - f.dy.startAge) / 10 + 1) +
          ' 步：' + f.dy.cur.gz + '，' + f.dy.cur.startAge + ' 岁到 ' + (f.dy.cur.startAge + 9) + ' 岁（' +
          f.dy.cur.startYear + ' 到 ' + (f.dy.cur.startYear + 9) + ' 年）。天干对他是「' + f.dy.cur.ss + '」' + ssBai(f.dy.cur.ss) +
          '，地支属' + f.dy.cur.zhiWx +
          (f.dy.cur.rel.length ? '，跟他日支是「' + f.dy.cur.rel.join('、') + '」' : ''));
      }
      L.push('');
    }

    if (f.ln) {
      L.push('【五、流年（＝今年的运势）】');
      L.push('· ' + f.ln.y + ' 年 ' + f.ln.gz + '年（属' + f.ln.xiao + '）：天干对他是「' + f.ln.ss + '」' + ssBai(f.ln.ss) +
        '，地支属' + f.ln.zhiWx + '，冲属' + f.ln.chongXiao + '的人。');
      if (f.ln.rels.length) {
        L.push('· 今年这个字跟他的四柱：' + f.ln.rels.map(function (r) {
          return '与' + r.pos + r.zhi + '是「' + r.rel.join('、') + '」';
        }).join('；'));
      }
      if (f.ln2) {
        L.push('· 明年 ' + f.ln2.y + ' 年 ' + f.ln2.gz + '：天干对他是「' + f.ln2.ss + '」' + ssBai(f.ln2.ss) + '。');
      }
      L.push('');
    }

    L.push('【六、神煞（＝老书在盘上做的记号，有就说有，没有就直说没有）】');
    f.shen.forEach(function (s) {
      if (!s.z) return;
      L.push('· ' + s.n + '在「' + s.z + '」（＝' + s.bai + '）——' +
        (s.hit ? '他四柱里' + s.hit + '就带着，这条是真的，要讲' : '他四柱里没有，得碰上对应的大运流年才应，别硬说有'));
    });
    L.push('');

    L.push('【七、地支之间的关系】');
    if (f.rels.length) {
      f.rels.forEach(function (r) {
        L.push('· ' + r.a + r.az + ' 与 ' + r.b + r.bz + '：' + r.rel.join('、'));
      });
    } else {
      L.push('· 四柱之间没有明显的冲、合、害、刑，气比较散，靠自己攒。');
    }
    L.push('');

    L.push('【八、讲的时候，术语必须翻成大白话】');
    L.push('· 上面每一条术语后面的「＝就是……」，讲的时候要跟着说出来，不许只丢一个术语就走。');
    L.push('· 说「偏财」，后头得跟一句「就是外面来的、不固定的钱」；说「空亡」，得跟一句「就是这块力道打折，事容易落空」。');
    L.push('· 不许出现他听不懂的词还不管。宁可少说一个术语，也不能让他读完不知道你在说什么。');
    return L.join('\n');
  }

  /* 一句话命格（页面顶部用） */
  function line(me) {
    var f;
    try { f = of(me); } catch (e) { return ''; }
    if (!f) return '';
    return f.zao + '　日主' + f.day.gan + '（' + f.day.wx + '）' +
      (f.day.strong ? '身强' : '身弱') + '　喜' + (f.day.use.join('、') || '—');
  }

  Y.FACTS = { of: of, prompt: prompt, line: line, GLOSS: GLOSS, XIAO: XIAO, relOf: relOf, ssBai: ssBai };
})(window.YXJ);
