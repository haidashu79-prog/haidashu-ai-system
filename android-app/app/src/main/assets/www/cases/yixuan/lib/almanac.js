/* =============================================================
   易玄机 · 万年历日课引擎 almanac.js
   十二建除、黄黑道、冲煞、三煞方、喜神/财神/福神方位、二十八宿、建除宜忌
   规则为传统择日通用规则，民俗文化参考。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';
  var C = Y.C;

  var JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
  var JIANCHU_MEAN = {
    建: { lucky: '平', yi: '出行、上任、见贵、祈福', ji: '动土、开仓、掘井' },
    除: { lucky: '吉（黄道）', yi: '扫舍、除服、疗病、驱邪', ji: '出行、求财、嫁娶' },
    满: { lucky: '平', yi: '祭祀、祈福、开市、立契', ji: '服药、栽种、上任' },
    平: { lucky: '平', yi: '修饰墙垣、平治道涂、理发', ji: '开渠、栽种、开市' },
    定: { lucky: '吉（黄道）', yi: '祭祀、订盟、纳采、安床', ji: '诉讼、出行、交涉' },
    执: { lucky: '吉（黄道）', yi: '捕捉、结网、造屋、竖柱', ji: '开市、移徙、出行' },
    破: { lucky: '凶', yi: '破屋、求医、拆卸', ji: '嫁娶、开市、签约' },
    危: { lucky: '吉（黄道）', yi: '安床、祭祀、祈福', ji: '登高、行船、冒险' },
    成: { lucky: '吉（黄道）', yi: '嫁娶、开市、入学、开业', ji: '诉讼、争执' },
    收: { lucky: '平', yi: '纳财、捕捉、进人口、收帐', ji: '开市、安葬、远行' },
    开: { lucky: '吉（黄道）', yi: '祭祀、入学、开市、动土（轻）', ji: '安葬、动土（重）、伐木' },
    闭: { lucky: '凶', yi: '筑堤、埋葬、塞穴、修补', ji: '开市、出行、就医' }
  };

  // 二十八宿（东方苍龙 / 北方玄武 / 西方白虎 / 南方朱雀）
  var XIU = [
    ['角', '木', '蛟'], ['亢', '金', '龙'], ['氐', '土', '貉'], ['房', '日', '兔'],
    ['心', '月', '狐'], ['尾', '火', '虎'], ['箕', '水', '豹'],
    ['斗', '木', '獬'], ['牛', '金', '牛'], ['女', '土', '蝠'], ['虚', '日', '鼠'],
    ['危', '月', '燕'], ['室', '火', '猪'], ['壁', '水', '貐'],
    ['奎', '木', '狼'], ['娄', '金', '狗'], ['胃', '土', '雉'], ['昴', '日', '鸡'],
    ['毕', '月', '乌'], ['觜', '火', '猴'], ['参', '水', '猿'],
    ['井', '木', '犴'], ['鬼', '金', '羊'], ['柳', '土', '獐'], ['星', '日', '马'],
    ['张', '月', '鹿'], ['翼', '火', '蛇'], ['轸', '水', '蚓']
  ];
  var XIU_REF = 2461322; // 2026-10-08 为「角」宿（已与黄历核对）

  // 三煞方（按日支三合局）
  function shaFang(zhiIdx) {
    if ([8, 0, 4].indexOf(zhiIdx) >= 0) return '南';       // 申子辰
    if ([5, 9, 1].indexOf(zhiIdx) >= 0) return '东';       // 巳酉丑
    if ([2, 6, 10].indexOf(zhiIdx) >= 0) return '北';      // 寅午戌
    return '西';                                            // 亥卯未
  }

  // 喜神（甲己艮、乙庚乾、丙辛坤、丁壬离、戊癸巽）
  function xiShen(gan) {
    var g = gan % 10;
    if (g === 0 || g === 5) return '东北';
    if (g === 1 || g === 6) return '西北';
    if (g === 2 || g === 7) return '西南';
    if (g === 3 || g === 8) return '正南';
    return '东南';
  }
  // 财神（甲乙艮、丙丁坤、戊己坎、庚辛震、壬癸离）
  function caiShen(gan) {
    var g = gan % 10;
    if (g === 0 || g === 1) return '东北';
    if (g === 2 || g === 3) return '西南';
    if (g === 4 || g === 5) return '正北';
    if (g === 6 || g === 7) return '正东';
    return '正南';
  }
  // 福神（甲乙巽、丙丁震、戊坎、己离、庚辛坤、壬癸乾）
  function fuShen(gan) {
    var g = gan % 10;
    if (g === 0 || g === 1) return '东南';
    if (g === 2 || g === 3) return '正东';
    if (g === 4) return '正北';
    if (g === 5) return '正南';
    if (g === 6 || g === 7) return '西南';
    return '西北';
  }

  // 冲生肖（日支六冲）
  var CHONG = { 0: '马', 1: '羊', 2: '猴', 3: '鸡', 4: '狗', 5: '猪', 6: '鼠', 7: '牛', 8: '虎', 9: '兔', 10: '龙', 11: '蛇' };
  var SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  function dayInfo(y, m, d) {
    var fp = C.fourPillars(y, m, d, 12, 0);
    var monthZhi = fp.month ? fp.month.zhi : 0;
    var dayZhi = fp.day.zhi, dayGan = fp.day.gan;
    var jc = JIANCHU[((dayZhi - monthZhi) % 12 + 12) % 12];
    var lu = C.toLunar(y, m, d);
    var xiuIdx = ((C.jdn(y, m, d) - XIU_REF) % 28 + 28) % 28;
    var x = XIU[xiuIdx];
    var opposite = (dayZhi + 6) % 12;
    return {
      solar: { y: y, m: m, d: d },
      lunar: lu, fp: fp,
      gz: fp.year.gz + '年 ' + (fp.month ? fp.month.gz + '月 ' : '') + fp.day.gz + '日',
      jianchu: jc,
      jcMean: JIANCHU_MEAN[jc],
      chong: { zhi: C.ZHI[opposite], shengxiao: SHENGXIAO[opposite] },
      sha: shaFang(dayZhi),
      xiu: { name: x[0] + '宿', full: x[0] + x[1] + x[2], wuxing: x[1], animal: x[2] },
      dir: { xi: xiShen(dayGan), cai: caiShen(dayGan), fu: fuShen(dayGan) },
      nayin: { day: C.nayin(fp.day.idx !== undefined ? fp.day.idx : C.gzIndexOf(fp.day.gan, fp.day.zhi)) },
      shengxiao: SHENGXIAO[fp.year.zhi]
    };
  }

  // 逐日列表（用于月历）
  function monthDays(y, m) {
    var days = new Date(y, m, 0).getDate(), out = [];
    for (var i = 1; i <= days; i++) out.push(dayInfo(y, m, i));
    return out;
  }

  Y.AL = {
    JIANCHU: JIANCHU, JIANCHU_MEAN: JIANCHU_MEAN, XIU: XIU,
    SHENGXIAO: SHENGXIAO, CHONG: CHONG,
    dayInfo: dayInfo, monthDays: monthDays,
    shaFang: shaFang, xiShen: xiShen, caiShen: caiShen, fuShen: fuShen
  };
})(window.YXJ);
