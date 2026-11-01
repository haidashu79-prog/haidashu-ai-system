/* =============================================================
   易玄机 · 断语引擎 reading.js
   把各引擎的排盘结果转成「文言断语 + 白话注解」双栏文本，
   并给出破解之法与改运建议。
   规则：文言为体例化表达（传统术语），白话为口语讲解（说人话）。
        所有断语为传统术数体系说法，不构成现实决策依据。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';
  var C = Y.C, YJ = Y.YJ;

  /* ---------- 爻名（依古法：初/二/三/四/五/上 配 九、六） ----------
     初爻与上爻，位名在前（初九、上六）；二至五爻，阴阳在前（九二、六五）。 */
  var YAO_POS = ['初', '二', '三', '四', '五', '上'];
  function yaoName(i, yang) {
    var yy = yang ? '九' : '六';
    if (i === 0 || i === 5) return YAO_POS[i] + yy;
    return yy + YAO_POS[i];
  }

  /* ---------- 五行调补方案（实打实可落地） ---------- */
  var WX_FIX = {
    木: { dir: '东方、东南', color: '青、绿', num: '3、8', season: '春',
      trade: '教育、文化、出版、林木、园艺、医药、纺织、设计',
      food: '青蔬、酸味、绿豆、芹菜、菠菜', item: '绿檀、翡翠、绿幽灵、富贵竹',
      note: '宜早起多走动，多亲近草木；忌久坐、忌居所无绿意。' },
    火: { dir: '南方', color: '红、紫、橙', num: '2、7', season: '夏',
      trade: '能源、餐饮、电子、传媒、演艺、美容、照明、电商',
      food: '辛辣、温热之食、红枣、桂圆；忌寒凉过度', item: '红玛瑙、紫水晶、朱砂（慎）、暖色灯',
      note: '宜多见阳光、多社交；忌阴湿久处、忌熬夜耗神。' },
    土: { dir: '中央、西南、东北', color: '黄、咖、米', num: '5、10', season: '四季之末',
      trade: '地产、建筑、农业、仓储、陶瓷、保险、人力、中介',
      food: '甘味、五谷、南瓜、山药、小米', item: '黄玉、黄水晶、玉石、陶器',
      note: '宜踏实积累、深耕一事；忌朝令夕改、忌居所潮湿无根基。' },
    金: { dir: '西方、西北', color: '白、金、银', num: '4、9', season: '秋',
      trade: '金融、五金、机械、汽车、法律、军警、珠宝、精密制造',
      food: '辛味、白色食物、白萝卜、梨、杏仁', item: '金银饰、白水晶、铜器、白玉',
      note: '宜果断决策、清理旧物；忌优柔、忌杂物堆积。' },
    水: { dir: '北方', color: '黑、蓝、灰', num: '1、6', season: '冬',
      trade: '物流、贸易、水产、旅游、流动服务、资讯、饮品',
      food: '咸味、黑色食物、黑豆、海带、鱼；忌过咸', item: '黑曜石、蓝晶、鱼缸、水景',
      note: '宜灵活变通、多走动；忌一成不变、忌久居不动。' }
  };

  /* ---------- 日主强弱与用神（扶抑法） ---------- */
  function strength(dayWx, stat) {
    var SHENG = C.SHENG;
    // 生我者
    var mother = null;
    for (var k in SHENG) if (SHENG[k] === dayWx) mother = k;
    var same = stat.count[dayWx] + (mother ? stat.count[mother] : 0);
    var ratio = same / (stat.total || 1);
    return { same: Math.round(same * 100) / 100, ratio: Math.round(ratio * 100) / 100, strong: ratio >= 0.5 };
  }

  function yongShen(dayWx, stat) {
    var st = strength(dayWx, stat);
    var KE = C.KE, SHENG = C.SHENG;
    // 我生者（泄）、我克者（耗）、克我者（克）
    var xie = SHENG[dayWx];
    var cai = KE[dayWx];
    var guan = null; for (var k in KE) if (KE[k] === dayWx) guan = k;
    var mother = null; for (var k2 in SHENG) if (SHENG[k2] === dayWx) mother = k2;
    return {
      strength: st,
      use: st.strong ? [xie, cai, guan] : [mother, dayWx],
      avoid: st.strong ? [mother, dayWx] : [xie, cai, guan],
      note: st.strong
        ? '身强宜泄宜克，取「' + xie + '（食伤泄秀）、' + cai + '（财星耗身）、' + guan + '（官杀制身）」为喜用。'
        : '身弱宜生宜扶，取「' + mother + '（印星生身）、' + dayWx + '（比劫帮身）」为喜用。'
    };
  }

  /* ---------- 八字断语 ---------- */
  function bazi(fp, stat, dy, gender) {
    if (!fp) return null;
    var GAN = C.GAN, ZHI = C.ZHI;
    var dayWx = C.ganWx(fp.day.gan);
    var ys = yongShen(dayWx, stat);
    var out = { title: '命局', sections: [], fix: [], tag: [] };

    // 1. 四柱与格局
    var pillarWen = (gender === 'female' ? '坤造' : '乾造') +
      ' ' + fp.year.gz + ' ' + (fp.month ? fp.month.gz : '--') + ' ' + fp.day.gz + ' ' + fp.hour.gz;
    out.sections.push({
      h: '四柱排盘',
      wen: pillarWen + '，日主' + GAN[fp.day.gan] + '（' + dayWx + '），生于' +
        (fp.month ? ZHI[fp.month.zhi] + '月' : '--') + '，' + (fp.month ? '月令' + C.zhiWx(fp.month.zhi) : '') + '当权。',
      bai: '你的生辰八字是「' + fp.year.gz + '年 ' + (fp.month ? fp.month.gz + '月 ' : '') + fp.day.gz + '日 ' + fp.hour.gz + '时」。' +
        '八字里排在最中间那个字（日柱的天干）叫「日主」，也就是「你自己」。你是' + GAN[fp.day.gan] + dayWx + '命。' +
        '你出生的月份在' + (fp.month ? ZHI[fp.month.zhi] + '月，这个月的五行属' + C.zhiWx(fp.month.zhi) : '──') + '，这股力量对你影响最大。'
    });

    // 2. 五行分布
    var dist = stat.list.map(function (x) { return x.wx + ' ' + x.v; }).join('、');
    out.sections.push({
      h: '五行盈虚',
      wen: '五行之数：' + dist + '。' + (stat.missing.length ? '命中缺' + stat.missing.join('、') + '，宜以方位、颜色、行业补之。' : '五行俱全，气机流通。'),
      bai: '把你的八字拆开数一数，五行是这样分布的：' + dist + '。' +
        (stat.missing.length
          ? '你命里最缺的是' + stat.missing.join('、') + '，这个缺口可以靠方位、颜色、穿的用的、从事的行业慢慢补回来，后面有具体做法。'
          : '五行都齐，没有特别缺的，这算底子比较匀。') +
        '最多的那股力量是' + stat.strongest.wx + '，最少的（不算缺的）是' + stat.weakest.wx + '。'
    });

    // 3. 身强身弱与用神
    out.sections.push({
      h: '强弱喜忌',
      wen: '日主' + dayWx + '，同类（比劫' + dayWx + '与印星）得气' + ys.strength.same + '，占全局' +
        Math.round(ys.strength.ratio * 100) + '%，故日主' + (ys.strength.strong ? '偏强' : '偏弱') + '。' + ys.note,
      bai: '简单说，帮你的力量（同五行＋生你的五行）加起来占了大约' + Math.round(ys.strength.ratio * 100) + '%，' +
        '所以你的命局算' + (ys.strength.strong ? '「身强」' : '「身弱」') + '。' +
        (ys.strength.strong
          ? '身强的人底气足、扛得住事，但也容易一根筋、听不进劝。这种命要「泄」和「克」，多用' + ys.use.join('、') + '这些力量，' +
            '意思是多做事、多付出、多承担责任，把力气使出去。反而是' + ys.avoid.join('、') + '再多，会更拧。'
          : '身弱的人往往心细、敏感、想得多，但容易累、扛不住压力。这种命要「生」和「扶」，多用' + ys.use.join('、') + '，' +
            '意思是多依靠贵人、多学习充电、找同类抱团。')
    });

    // 4. 十神概览
    var shishenList = [];
    ['year', 'month', 'hour'].forEach(function (k2) {
      if (fp[k2]) shishenList.push({ pos: { year: '年干', month: '月干', hour: '时干' }[k2], gz: GAN[fp[k2].gan], ss: C.shiShen(fp.day.gan, fp[k2].gan) });
    });
    var ssText = shishenList.map(function (x) { return x.pos + x.gz + '为' + x.ss; }).join('，');
    out.sections.push({
      h: '十神格局',
      wen: ssText + '，以日主为我，观其生克而见六亲与事象。',
      bai: '「十神」是八字看人事的密码，以你自己（日主）为中心，看别的干支跟你的关系：' +
        shishenList.map(function (x) { return x.pos + '是' + x.gz + '，对你来说是「' + x.ss + '」'; }).join('；') + '。' +
        '比劫是兄弟朋友和竞争者，食伤是才华表达和子女，财是钱和妻子，官杀是事业压力和约束，印是长辈贵人和学问。哪个多、哪个少，人生侧重就不同。'
    });

    // 5. 大运
    if (dy) {
      var dyText = dy.list.slice(0, 6).map(function (x) { return x.startAge + '岁' + x.gz; }).join('、');
      out.sections.push({
        h: '大运流转',
        wen: (gender === 'female' ? '坤造' : '乾造') + '大运' + (dy.forward ? '顺行' : '逆行') +
          '，' + dy.startAge + '岁起运，' + dy.startMonth + '个月上运。运程依次：' + dyText + '。',
        bai: '大运就是人生的「十年一换的运势班车」，每十年换一班。你的大运是' + (dy.forward ? '顺着排' : '倒着排') +
          '的，大约' + dy.startAge + '岁开始上运（也就是' + dy.startAge + '岁后运势正式跟着大运走）。' +
          '接下来几班车是：' + dyText + '。每一班的好坏，看它对你的五行是帮忙还是添乱。'
      });
    }

    // 6. 调补与破解
    var use = ys.use.filter(Boolean);
    var fixItems = [];
    use.forEach(function (wx) {
      var f = WX_FIX[wx];
      if (f) fixItems.push({
        wx: wx,
        text: '补【' + wx + '】：方位宜' + f.dir + '；颜色宜' + f.color + '；数字宜' + f.num +
          '；行业可考虑' + f.trade + '；饮食宜' + f.food + '；可佩' + f.item + '。' + f.note
      });
    });
    out.fix = fixItems;
    out.tag = { dayWx: dayWx, strong: ys.strength.strong, use: use };
    return out;
  }

  /* ---------- 六爻断语 ---------- */
  function liuyao(dv) {
    if (!dv || !dv.prim) return null;
    var p = dv.prim, z = dv.zhuang;
    var out = { title: '卦象', sections: [], fix: [] };
    out.sections.push({
      h: '本卦',
      wen: '占得《' + p.name + '》' + p.glyph + '（' + p.lower + '下' + p.upper + '上），第' + p.index + '卦。卦辞：「' + p.guaci + '」',
      bai: '你摇出来的这一卦是「' + p.name + '」卦（' + p.glyph + '）。' + p.baihua
    });
    // 动爻
    if (dv.moves.length) {
      var moveTexts = dv.moves.map(function (i) {
        var lab = yaoName(i, dv.cast.lines[i] === 9);
        var t = p.yaoci[i] || '';
        return { i: i, lab: lab, text: t };
      });
      out.sections.push({
        h: '动爻',
        wen: '动爻在' + dv.moves.map(function (i) { return YAO_POS[i] + '爻'; }).join('、') + '。' +
          moveTexts.map(function (m) { return '「' + m.text + '」'; }).join(''),
        bai: '这一卦有' + dv.moves.length + '个「动爻」（也就是老阴或老阳，会变的爻），它落在' +
          dv.moves.map(function (i) { return YAO_POS[i] + '爻'; }).join('、') + '。' +
          '动爻就是「事情变动的关键点」，爻辞说的正是这个节骨眼上该注意什么。'
      });
      if (dv.chg) {
        out.sections.push({
          h: '变卦',
          wen: '由《' + p.name + '》变为《' + dv.chg.name + '》' + dv.chg.glyph + '，主事情变化之趋向：' + dv.chg.baihua,
          bai: '事情的走向会变成「' + dv.chg.name + '」卦的格局。' + dv.chg.baihua +
            '（本卦看现在，变卦看以后。现在这一点，往那边走。）'
        });
      }
    } else {
      out.sections.push({
        h: '静卦',
        wen: '六爻皆静，无动无变，事体守常，以本卦卦辞断之。',
        bai: '这一卦六个爻全是「静」的，没有动爻。这说明事情眼下还比较稳定，没有大变动，就以本卦的意思为准，不必多想。'
      });
    }
    // 装卦
    if (z) {
      var shiYao = z.yao[z.shi - 1];
      out.sections.push({
        h: '装卦',
        wen: '卦属' + z.gong + '宫（' + z.gongWx + '），世爻在' + z.shi + '爻，应爻在' + z.ying + '爻。世爻' + shiYao.gz + '，六亲为' + shiYao.qin + '。',
        bai: '这一卦归「' + z.gong + '宫」，属' + z.gongWx + '。六爻卦里有「世爻」和「应爻」：世爻代表你自己（' + z.shi + '爻，' + shiYao.gz + '，' + shiYao.qin + '），应爻代表对方或所问之事（' + z.ying + '爻）。' +
          '看事情，先看世应两个的关系。'
      });
    }
    // 分项占断
    if (p.zhan) {
      var keys = ['运势', '事业', '感情', '求财', '出行', '健康', '诉讼', '建议'];
      var hasAny = keys.filter(function (k) { return p.zhan[k]; });
      if (hasAny.length) {
        out.sections.push({
          h: '分项占断',
          wen: '以本卦为主，分项断之：' + hasAny.map(function (k) { return k + '──' + p.zhan[k]; }).join('；'),
          bai: '照老规矩，一卦分项看：' + hasAny.map(function (k) { return '【' + k + '】' + p.zhan[k]; }).join('')
        });
      }
      if (p.zhan['建议']) out.fix.push({ text: '行事之法：' + p.zhan['建议'] });
    }
    out.fix.push({ text: '用卦之要：宜顺势而动。若卦示阻滞，则先守后进、先固本再图远，不必强求一朝之速。' });
    return out;
  }

  /* ---------- 奇门断语 ---------- */
  function qimen(r) {
    if (!r) return null;
    var P = r.pan, G = r.gongs;
    var out = { title: '局盘', sections: [], fix: [] };
    out.sections.push({
      h: '定局',
      wen: r.pillars + '，' + r.ding.yinYang + '遁' + r.ding.ju + '局，节气' + r.ding.termName + '，' + r.ding.yuan + '，符头' + r.ding.fuTou.gz + '。',
      bai: '排盘时间是' + r.pillars + '。这个时辰属于「' + r.ding.termName + '」节气、' + r.ding.yuan +
        '，走' + r.ding.yinYang + '遁第' + r.ding.ju + '局。奇门的原理是：一个时辰一张盘，同一个时辰只有一张，' +
        '所以古人说奇门「一时一局」，讲究的是「择时」。'
    });
    var zf = G[P.zhiFuGong];
    out.sections.push({
      h: '值符值使',
      wen: '值符' + P.zhiFuStar + '落' + P.zhiFuGong + '宫（' + zf.name + '·' + zf.dir + '），值使' + P.zhiShiDoor + '门现于' + P.zhiShiGong + '宫。',
      bai: '这张盘的「值符」（主帅）是' + P.zhiFuStar + '，落在' + P.zhiFuGong + '宫（' + zf.name + '，' + zf.dir + '方）。它就是这个时辰的「话事人」。' +
        '「值使」（执行官）是' + P.zhiShiDoor + '门。看事情，先看这两个的位置和状态。'
    });
    if (r.yongShen && r.yongShen.length) {
      var catName = r.categoryLabel || r.category;
      var items = r.yongShen.map(function (y) {
        if (y.missing) return '用神「' + y.yong + '」未在盘中直接落宫';
        return '「' + y.yong + '」落' + y.gong + '宫(' + y.name + '·' + y.dir + ')，星' + y.star + '、门' + y.door + '、神' + y.shen + '、仪' + y.yi;
      });
      out.sections.push({
        h: '用神落宫',
        wen: '以「' + catName + '」为问，取用神观其落宫：' + items.join('；') + '。',
        bai: '问「' + catName + '」这件事，奇门取对应的「用神」来看它落在哪个宫、旁边站着什么星和门：' +
          items.join('；') + '。用神落「吉门吉星」的宫位，事情顺；落「凶门」的宫位，事情多阻。'
      });
    }
    // 八门吉凶概览
    var doorLuck = (window.QIMEN_DATA.doors || []).reduce(function (a, d) { a[d.name] = d.luck; return a; }, {});
    var goodDoors = [], badDoors = [];
    for (var g in G) {
      var dr = G[g].door ? G[g].door.replace('门', '') : '';
      if (!dr) continue;
      if (doorLuck[dr] === '吉') goodDoors.push(G[g].name + G[g].dir + '·' + G[g].door);
      else if (doorLuck[dr] === '凶') badDoors.push(G[g].name + G[g].dir + '·' + G[g].door);
    }
    out.sections.push({
      h: '门星吉凶',
      wen: '吉门所在：' + (goodDoors.join('、') || '无') + '。凶门所在：' + (badDoors.join('、') || '无') + '。',
      bai: '这张盘上，好门（开门、休门、生门）落在：' + (goodDoors.join('、') || '无') +
        '；凶门（死门、惊门、伤门）落在：' + (badDoors.join('、') || '无') + '。' +
        '办事先奔好门那个方位去，避开凶门那个方位。'
    });
    out.fix.push({ text: '择时之要：奇门重在「趋吉方、避凶方」。出行、谈判、签约、动土这类事，宜择吉门所临之方行事；凶门所临之方，宜静不宜动。' });
    return out;
  }

  /* ---------- 风水断语 ---------- */
  function fengshui(mg, house, yearStarVal) {
    if (!mg) return null;
    var out = { title: '宅命', sections: [], fix: [] };
    out.sections.push({
      h: '命卦',
      wen: '命卦为' + mg.gua + '（' + mg.num + '），五行属' + mg.wx + '，本位在' + mg.dir + '，属' + mg.group + '。',
      bai: '按三元命卦算，你是「' + mg.gua + '命」，五行属' + mg.wx + '，本命方位在' + mg.dir + '，属于' +
        mg.group + '。' + (mg.group === '东四命' ? '东四命的人，适合住坐北朝南、坐东朝西一类「东四宅」，睡向、坐向也宜朝东、东南、南、北。' : '西四命的人，适合住坐西朝东、坐西北朝东南一类「西四宅」，睡向、坐向宜朝西、西北、西南、东北。')
    });
    if (house) {
      var good = house.filter(function (x) { return ['生气', '延年', '天医', '伏位'].indexOf(x.star) >= 0; });
      var bad = house.filter(function (x) { return ['绝命', '五鬼', '六煞', '祸害'].indexOf(x.star) >= 0; });
      out.sections.push({
        h: '八方吉凶',
        wen: '八宅游年所定：吉方四──' + good.map(function (x) { return x.dir + '为' + x.star; }).join('、') +
          '；凶方四──' + bad.map(function (x) { return x.dir + '为' + x.star; }).join('、') + '。',
        bai: '按八宅「大游年」的规矩，你的方位吉凶是这样：' +
          good.map(function (x) { return '【' + x.dir + '·' + x.star + '】' + x.mean; }).join('') +
          bad.map(function (x) { return '【' + x.dir + '·' + x.star + '】' + x.mean; }).join('')
      });
      good.forEach(function (x) {
        if (x.star === '生气') out.fix.push({ text: '催财：' + x.dir + '方为生气财位，宜设大门、收银、主卧或财位摆件（黄水晶、聚宝盆）。' });
        if (x.star === '天医') out.fix.push({ text: '养生：' + x.dir + '方为天医位，家中长辈或身体弱者宜在此方安床静养。' });
      });
      bad.forEach(function (x) {
        if (x.star === '绝命' || x.star === '五鬼')
          out.fix.push({ text: '化煞：' + x.dir + '方为' + x.star + '凶位，忌作大门与主卧；宜设厕所、储物间「以浊压凶」，并置铜葫芦、六帝钱以金属泄土气。' });
      });
    }
    if (yearStarVal) {
      var FS = Y.FS, pan = FS.flyPan(yearStarVal), g5 = null, g8 = null;
      for (var g in pan) { if (pan[g].star === 5) g5 = g; if (pan[g].star === 8) g8 = g; }
      out.sections.push({
        h: '流年飞星',
        wen: '岁星' + FS.STAR9[yearStarVal].n + '入中，五黄落' + FS.PALACE_DIR[g5] + '，八白落' + FS.PALACE_DIR[g8] + '。',
        bai: '看今年的流年飞星：' + FS.STAR9[yearStarVal].n + '飞进中宫。今年最要避开的是「五黄」（最凶的煞星），它落在' +
          FS.PALACE_DIR[g5] + '方。那个方位今年尽量别动土、别装修、别摆红色东西，保持干净安静就好，可以放个铜制物件（铜葫芦、六帝钱）来化解。' +
          '今年的财星「八白」落在' + FS.PALACE_DIR[g8] + '方，想催财可以在那里摆黄水晶或聚宝盆。'
      });
    }
    return out;
  }

  /* ---------- 日课断语 ---------- */
  function almanac(info) {
    if (!info) return null;
    var out = { title: '日课', sections: [], fix: [] };
    out.sections.push({
      h: '当日',
      wen: '公历' + info.solar.y + '年' + info.solar.m + '月' + info.solar.d + '日，岁次' + info.gz +
        '，' + (info.lunar ? info.lunar.cn : '') + '，建除十二神值「' + info.jianchu + '」，' + info.xiu.full + '当值。',
      bai: '今天是' + info.solar.y + '年' + info.solar.m + '月' + info.solar.d + '日，农历' +
        (info.lunar ? info.lunar.cn : '') + '，干支是' + info.gz + '。按老黄历的规矩，今天轮到「' + info.jianchu +
        '日」，值日的星宿是「' + info.xiu.full + '」。'
    });
    out.sections.push({
      h: '宜忌',
      wen: '「' + info.jianchu + '」日：宜' + info.jcMean.yi + '；忌' + info.jcMean.ji + '。',
      bai: '按「十二建除」的规矩，今天适合做的事是：' + info.jcMean.yi + '；不太适合做的是：' + info.jcMean.ji +
        '。（这是老黄历的通例，具体到你自己，还要看你的八字合不合。）'
    });
    out.sections.push({
      h: '冲煞方位',
      wen: '冲' + info.chong.shengxiao + '（' + info.chong.zhi + '），煞' + info.sha +
        '。喜神' + info.dir.xi + '，财神' + info.dir.cai + '，福神' + info.dir.fu + '。',
      bai: '今天冲属' + info.chong.shengxiao + '的人，属' + info.chong.shengxiao + '的朋友今天尽量别办大事、别去' +
        info.sha + '方。今天想求人缘往' + info.dir.xi + '方走，想求财往' + info.dir.cai + '方走，想求平安顺遂往' + info.dir.fu + '方走。'
    });
    out.fix.push({ text: '择日之要：办大事（结婚、开业、签约、动土）宜另择与本人八字相合的吉日，并避开本人属相相冲之日。' });
    return out;
  }

  Y.RD = {
    WX_FIX: WX_FIX,
    yaoName: yaoName,
    strength: strength, yongShen: yongShen,
    bazi: bazi, liuyao: liuyao, qimen: qimen, fengshui: fengshui, almanac: almanac
  };
})(window.YXJ);
