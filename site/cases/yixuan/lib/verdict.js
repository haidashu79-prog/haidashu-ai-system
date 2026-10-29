/* =============================================================
   易玄机 · 问事判决引擎 verdict.js
   作用：把「用户问的那句话」和「排出来的卦」对上，先给一句明确结论，
        再说清楚凭什么这么说，最后给今天能做的几件事。
   断法：六爻取用神 → 看用神旺衰 → 论世应用神生克 → 看动爻变卦 → 参流年。
   规则均为传统六爻通用断法，属民俗文化参考。
   ============================================================= */
window.YXJ = window.YXJ || {};
(function (Y) {
  'use strict';
  var C = Y.C, ZHI = C.ZHI;

  /* ---------- 一、认题：用户在问哪一头 ---------- */
  // 顺序即优先级，前面的先命中
  var TOPIC_WORDS = [
    { k: 'wealth', w: ['赚', '钱', '财', '挣', '收入', '进项', '回款', '利润', '本钱', '亏', '涨', '发财', '买卖', '生意', '投资', '债', '欠', '卖', '资金', '营收', '红包', '工资', '奖金', '暴富'] },
    { k: 'career', w: ['工作', '事业', '升职', '升迁', '职位', '换工作', '跳槽', '创业', '项目', '考试', '考', '面试', '公司', '老板', '同事', '前途', '前程', '调岗', '转行', '接不接', '合伙', '升'] },
    { k: 'love', w: ['感情', '对象', '结婚', '婚', '恋爱', '分手', '复合', '桃花', '相亲', '老公', '老婆', '女朋友', '男朋友', '喜欢', '追求', '告白', '合不合', '姻缘'] },
    { k: 'health', w: ['身体', '健康', '病', '睡', '失眠', '疼', '累', '医院', '调理', '怀孕', '血压', '胃', '腰', '精神', '体力'] },
    { k: 'home', w: ['房子', '买房', '搬家', '装修', '风水', '宅', '卧室', '床位', '店铺', '办公', '门面', '租'] }
  ];
  var TOPIC_NAME = { wealth: '财运', career: '事业', love: '感情', health: '身体', home: '家宅', general: '运程' };
  var TOPIC_READ = {
    wealth: '按传统规矩，问钱的事看「财爻」',
    career: '按传统规矩，问事业看「官鬼」和「父母」',
    love: '按传统规矩，问感情看「官鬼」和「妻财」',
    health: '按传统规矩，问身体看「世爻」和「官鬼」',
    home: '按传统规矩，问家宅看「父母」',
    general: '按传统规矩，通盘运程看「世爻」和「应爻」'
  };

  // 起卦页「占断侧重」下拉 → 内部键。选了这个就以它为准，不再猜用户问了哪一头。
  var CAT_MAP = {
    '综合': 'general', '事业': 'career', '感情': 'love', '求财': 'wealth',
    '出行': 'general', '健康': 'health', '诉讼': 'general'
  };
  /* 问的是哪一段时间。不做这一步，问「明天」就会被当成问「今年」，
     答出来驴唇不对马嘴 —— 实测踩过这个坑。返回的不只是档位，还有他嘴里那个
     时间词，后面所有话都拿这个时间词开头，保证「有问有答」。 */
  function horizonOf(s) {
    var m;
    if ((m = s.match(/明天|明日|后天|今天|今日|今晚|当晚|当天|这一天/))) {
      return { horizon: 'day', word: /后天/.test(m[0]) ? '后天' : (/明日|明天/.test(m[0]) ? '明天' : (/晚/.test(m[0]) ? '今晚' : '今天')) };
    }
    if ((m = s.match(/明年|后年|今年|本年|年内|这一年|这年|未来一年|一年/))) {
      return { horizon: 'year', word: /明年/.test(m[0]) ? '明年' : (/后年/.test(m[0]) ? '后年' : '今年') };
    }
    if ((m = s.match(/下个月|下月|这个月|本月|这月|近一个月|一个月|月底/))) {
      return { horizon: 'month', word: /下个月|下月/.test(m[0]) ? '下个月' : '这个月' };
    }
    if (/什么时候|何时|几时|多久|还要多久/.test(s)) return { horizon: 'when', word: '这一阵' };
    if (/这几天|最近|眼下|现在|如今|这段|这一阵|这阵子/.test(s)) return { horizon: 'now', word: '眼下' };
    return { horizon: 'now', word: '眼下' };
  }
  function classify(q, cat) {
    var s = String(q || '');
    var topic = (cat && CAT_MAP[cat]) ? CAT_MAP[cat] : 'general';
    for (var i = 0; i < TOPIC_WORDS.length && topic === 'general'; i++) {
      var t = TOPIC_WORDS[i];
      for (var j = 0; j < t.w.length; j++) {
        if (s.indexOf(t.w[j]) >= 0) { topic = t.k; break; }
      }
    }
    // 侧重下拉明确指定了的，不再被原话里的词覆盖
    if (cat && CAT_MAP[cat]) topic = CAT_MAP[cat];
    var hz = horizonOf(s);
    var horizon = hz.horizon, timeWord = hz.word;
    /* 问「什么时候」的，先认成问时候。他嘴上带着「能赚」「能成」也不改——
       他问的是哪个月，不是能不能。 */
    var kind = 'plain';
    if (/什么时候|何时|几时|多久|还要多久/.test(s)) kind = 'when';
    else if (/该不该|要不要|是否该/.test(s)) kind = 'should';
    else if (/能不能|可以吗|行不行|是否可以|够不够|会不会|能赚|能成/.test(s)) kind = 'can';
    else if (/好不好|吉不吉|怎么样|如何/.test(s)) kind = 'how';
    return { topic: topic, horizon: horizon, timeWord: timeWord, kind: kind };
  }

  /* ---------- 二、五行生克与地支关系 ---------- */
  function rel(a, b) {                       // a 对 b 的关系
    var S = C.SHENG, K = C.KE;
    if (!a || !b) return 'none';
    if (a === b) return 'same';
    if (S[a] === b) return 'sheng';          // a 生 b
    if (K[a] === b) return 'ke';             // a 克 b
    if (S[b] === a) return 'shengBy';        // a 被 b 生（a 去泄 b）
    if (K[b] === a) return 'keBy';           // a 被 b 克
    return 'none';
  }
  function zhiIdx(z) { return ZHI.indexOf(z); }
  function isChong(a, b) { var x = zhiIdx(a), y = zhiIdx(b); return x >= 0 && y >= 0 && (x + 6) % 12 === y; }
  var HE = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];   // 子丑 寅亥 卯戌 辰酉 巳申 午未
  function isHe(a, b) {
    var x = zhiIdx(a), y = zhiIdx(b);
    for (var i = 0; i < HE.length; i++) if ((HE[i][0] === x && HE[i][1] === y) || (HE[i][0] === y && HE[i][1] === x)) return true;
    return false;
  }

  /* ---------- 三、取用神 ---------- */
  var YONG_QIN = {
    wealth: ['妻财'], career: ['官鬼', '父母'], love: ['官鬼', '妻财'],
    health: ['官鬼'], home: ['父母'], general: ['妻财', '官鬼']
  };
  // 取用神：动爻优先 → 持世 → 紧邻世爻 → 第一个
  function pickYong(yao, qins, moves, shiPos) {
    var cand = [];
    yao.forEach(function (y) { if (qins.indexOf(y.qin) >= 0) cand.push(y); });
    if (!cand.length) return { yao: null, two: false };
    var two = cand.length > 1;
    var m = cand.filter(function (y) { return moves.indexOf(y.pos - 1) >= 0; })[0];
    if (m) return { yao: m, two: two };
    var s = cand.filter(function (y) { return y.shi; })[0];
    if (s) return { yao: s, two: two };
    cand.sort(function (a, b) { return Math.abs(a.pos - shiPos) - Math.abs(b.pos - shiPos); });
    return { yao: cand[0], two: two };
  }

  /* ---------- 四、判旺衰 ---------- */
  function vitality(yongYao, yueZhi, riZhi, kong, isMove) {
    var w = yongYao.wx, sc = 0, note = [];
    var mr = rel(C.zhiWx(zhiIdx(yueZhi)), w);     // 月建对用神
    if (mr === 'sheng') { sc += 2; note.push('月建生着它'); }
    else if (mr === 'same') { sc += 1; note.push('月建跟它同气'); }
    else if (mr === 'ke') { sc -= 2; note.push('月建压着它'); }
    else if (mr === 'shengBy') { sc -= 1; note.push('它得反过来去养月建，力气被抽走'); }
    else if (mr === 'keBy') { sc -= 1; note.push('它得反过来去克月建，费劲'); }
    var dr = rel(C.zhiWx(zhiIdx(riZhi)), w);      // 日辰对用神
    if (dr === 'sheng') { sc += 3; note.push('日辰生它，当天就有一股力气托着它'); }
    else if (dr === 'same') { sc += 2; note.push('日辰跟它同气，它得了底气'); }
    else if (dr === 'ke') { sc -= 3; note.push('日辰克它，当天就被压着'); }
    else if (dr === 'shengBy') { sc -= 1; note.push('它得去养日辰，泄了力'); }
    else if (dr === 'keBy') { sc -= 1; note.push('它得去克日辰，费力不讨好'); }
    var empty = kong.indexOf(yongYao.zhi) >= 0;
    if (empty) { sc -= 1; note.push('它落在空亡上。空亡不是没有，是眼下还没到位、还没落袋，等出了这一旬才算实'); }
    if (isMove) { sc = Math.round(sc * 1.5); note.push('它正在动，好事坏事都会加倍'); }
    var level = sc >= 3 ? '旺' : (sc >= 1 ? '偏旺' : (sc >= -1 ? '平' : (sc >= -3 ? '偏弱' : '弱')));
    return { score: sc, level: level, note: note, empty: empty };
  }

  /* ---------- 五、世应关系 ---------- */
  function shiYingRead(z, yongYao) {
    var shi = z.yao[z.shi - 1], ying = z.yao[z.ying - 1];
    var out = { shi: shi, ying: ying, toShi: 'none', word: '', qinWord: '' };
    if (yongYao) out.toShi = rel(yongYao.wx, shi.wx);   // 用神对世爻
    out.word = {
      sheng: '这件事本身是来帮你的，劲头往你这边走',
      same: '这件事跟你是一路的，不别扭',
      ke: '这件事压着你，越使劲越沉',
      keBy: '你得费力气去够它，够得着，但是累',
      shengBy: '你得先往里搭东西，先付出才有回头',
      none: '这两头不直接相碍'
    }[out.toShi] || '';
    // 持世六亲：求财看这个最灵
    out.qinWord = {
      '妻财': '钱自己就在你手上。这一爻持世，说明财是够得着的，就看你守不守得住。',
      '兄弟': '这是兄弟持世，主分夺。钱不是没有，是容易被人分走、被花掉、被同行抢。要格外看紧。',
      '官鬼': '这是官鬼持世，压力都压在你身上。事情推得动，但人是累的，也容易招惹是非。',
      '子孙': '这是子孙持世，子孙专门生财、专门解压。这一爻持世，说明路子是活的，财有源头。',
      '父母': '这是父母持世，靠的是辛苦和底子。钱来得慢，但来得稳，属于熬出来的那一类。'
    }[shi.qin] || '';
    return out;
  }

  /* ---------- 六、流年 ---------- */
  function yearRead(yf, yongYao, shi) {
    var yz = ZHI[yf.year.zhi], ywx = C.zhiWx(yf.year.zhi);
    var out = { gz: yf.year.gz, zhi: yz, wx: ywx, note: [], short: '', bonus: 0 };
    if (yongYao) {
      var r = rel(ywx, yongYao.wx);
      var head = '今年的年气是「' + ywx + '」，你所问的这件事属「' + yongYao.wx + '」，';
      var sh = '今年是' + yf.year.gz + '年，';
      if (r === 'sheng') {
        out.bonus += 2; out.note.push(head + '今年这口气生着它，大势是帮你的');
        out.short = sh + '这一年的大势是帮你的，顺风。';
      } else if (r === 'same') {
        out.bonus += 1; out.note.push(head + '今年这口气跟它同路，大势不挡你');
        out.short = sh + '这一年的大势不挡你，能走。';
      } else if (r === 'ke') {
        out.bonus -= 2; out.note.push(head + '今年这口气压着它，大势是往下按的');
        out.short = sh + '这一年的大势往下按，别硬顶。';
      } else if (r === 'shengBy') {
        out.bonus -= 1; out.note.push(head + '它得去养今年这口气，力气被分走一部分');
        out.short = sh + '这一年你要往外搭力气，先付出。';
      } else if (r === 'keBy') {
        out.bonus -= 1; out.note.push(head + '它得去克今年这口气，是逆着年势使劲，费劲');
        out.short = sh + '这一年是逆着大势使劲，费劲。';
      } else {
        out.short = sh + '这一年的大势跟你这件事不直接相干。';
      }
    }
    if (shi && isChong(yz, shi.zhi)) {
      out.bonus -= 1; out.note.push('今年的太岁跟你这一爻相冲，这一年容易有来回折腾');
      out.short = (out.short || '') + '太岁冲你这一爻，今年来回折腾多。';
    }
    if (shi && isHe(yz, shi.zhi)) {
      out.bonus += 1; out.note.push('今年的太岁跟你这一爻相合，这一年容易有人拉你一把');
      out.short = (out.short || '') + '太岁合你这一爻，今年有人拉你。';
    }
    return out;
  }

  /* ---------- 六·二、应期：这事什么时候应 ----------
     问「什么时候能成」不能只回一句「有戏，等它自己动」，得推个大致月份。
     取法是传统六爻那几样，挑最近、最说得清的：
       · 用神落空亡  → 逢值（填空）或逢冲（冲空则实）的月
       · 用神不动不空 → 逢值（同地支）或逢合（地支六合）的月
       · 用神在动    → 变出的那一爻逢值 / 逢合的月
     月建按节气定，从起卦那个月起逐月往后推，最多推 14 个月，取最近两个。 */
  function yingShort(h, baseY) {
    return (h.y === baseY ? h.m + '月' : '明年' + h.m + '月');
  }
  function yingQi(refYao, moves, zhuangChg, kong, fpNow) {
    if (!refYao || !fpNow || !fpNow.solar) return null;
    var zhi = refYao.zhi;
    var isKong = kong.indexOf(zhi) >= 0;
    var moveIdx = moves.indexOf(refYao.pos - 1);
    var chgYao = (moveIdx >= 0 && zhuangChg && zhuangChg.yao) ? zhuangChg.yao[moveIdx] : null;
    var y0 = fpNow.solar.y, m0 = fpNow.solar.m;
    var hits = [];
    for (var i = 1; i <= 14 && hits.length < 2; i++) {
      var yy = y0, mm = m0 + i;
      while (mm > 12) { mm -= 12; yy += 1; }
      var mp = C.fourPillars(yy, mm, 15, 12, 0).month;   // 取月中，避开节气边界
      if (!mp) continue;
      var mz = ZHI[mp.zhi];
      if (isKong) {
        if (mz === zhi) hits.push({ i: i, y: yy, m: mm, why: '填空' });
        else if (isChong(mz, zhi)) hits.push({ i: i, y: yy, m: mm, why: '冲空则实' });
      } else {
        if (mz === zhi) hits.push({ i: i, y: yy, m: mm, why: '逢值' });
        else if (isHe(mz, zhi)) hits.push({ i: i, y: yy, m: mm, why: '逢合' });
      }
      if (chgYao) {
        if (mz === chgYao.zhi) hits.push({ i: i, y: yy, m: mm, why: '变爻逢值' });
        else if (isHe(mz, chgYao.zhi)) hits.push({ i: i, y: yy, m: mm, why: '变爻逢合' });
      }
    }
    return { zhi: zhi, kong: isKong, chgZhi: chgYao ? chgYao.zhi : null, hits: hits };
  }

  /* ---------- 七、卦意底色 ---------- */
  var POS = ['吉', '亨', '顺', '进', '成', '旺', '利', '得', '通', '安', '和', '宜', '佳', '兴', '胜', '增', '丰', '喜', '升', '获', '健', '泰', '益'];
  var NEG = ['凶', '阻', '滞', '破', '败', '难', '损', '险', '失', '退', '散', '空', '忧', '忌', '防', '衰', '厄', '咎', '困', '蹇', '剥', '否'];
  function tone(text) {
    var s = String(text || ''), p = 0, n = 0;
    POS.forEach(function (w) { if (s.indexOf(w) >= 0) p++; });
    NEG.forEach(function (w) { if (s.indexOf(w) >= 0) n++; });
    return Math.max(-3, Math.min(3, p - n));
  }
  var ZHAN_KEY = { wealth: '求财', career: '事业', love: '感情', health: '健康', home: '运势', general: '运势' };

  /* ---------- 八、结论话术 ---------- */
  var HZ = { day: '这天', year: '今年', month: '这个月', now: '眼下', when: '这一阵' };
  var CORE = {
    wealth: {
      high: '钱赚得到，该动的地方可以动了。',
      good: '钱赚得到，就是来得慢，靠稳不靠快。',
      mid: '钱赚得到，但还没到时候，急着上量容易白忙一场。',
      low: '钱赚得到，但留不住，重点在守不在攻。',
      bad: '这条赚钱路走得不顺，与其硬顶，不如换个走法。'
    },
    career: {
      high: '事业是往上走的，该出手就出手。',
      good: '事业往上走，节奏慢一些，稳着推能成。',
      mid: '有转机，但你得先把手上那件事收尾，才腾得出位置。',
      low: '推得动，但很磨人，先守住现在的位置再谈往上。',
      bad: '当下这条路的走法不对，与其硬顶，不如换个做法试。'
    },
    love: {
      high: '感情顺，该定下来的事可以定。',
      good: '有进展，慢慢处，别急着要结果。',
      mid: '有变化，成不成看你愿不愿意先迈那一步。',
      low: '能往好处走，但眼下拧巴，先把自己的日子过顺再说。',
      bad: '这段关系推不动，早点看清比拖着强。'
    },
    health: {
      high: '身体底子好，现在开始调养见效最快。',
      good: '问题不大，把作息拉回正轨就能缓过来。',
      mid: '时好时坏，别拖，早查早调。',
      low: '要留神，累出来的毛病别硬扛，先把作息和力气补回来。',
      bad: '身体是本钱，该查的查、该歇的歇，别再往后推。'
    },
    home: {
      high: '家宅安顺，想动的地方可以动。',
      good: '没什么大碍，小调理就够。',
      mid: '有些小别扭，调一调方位、清一清杂物就好。',
      low: '有妨碍但不大，先别大动土木，理一理就顺。',
      bad: '不太顺，搬家、大装修这类事往后放一放。'
    },
    general: {
      high: '这一头顺，放心去做。',
      good: '顺当，稳步走就好。',
      mid: '不好不坏，成不成看你接下来怎么做。',
      low: '有阻力，先收着点，别摊得太开。',
      bad: '当下走得不顺，换个走法比硬顶强。'
    }
  };
  // 「该不该做」这类问法，直接给一句能不能动手的话
  var SHOULD = {
    high: '可以做，趁早动手比拖着强。',
    good: '可以做，稳住节奏推，别求快。',
    mid: '可以做，但先把手上的事收尾，再腾手做它。',
    low: '先别急着拍板，把条件再凑一凑。',
    bad: '先放一放，换个做法比硬上强。'
  };
  var SHOULD_NOUN = { love: '这段感情', health: '这副身子', home: '这个宅子', wealth: '这笔进项' };
  function gradeOf(score) {
    if (score >= 76) return { k: 'high', badge: '顺', cls: 'ok', yes: true };
    if (score >= 62) return { k: 'good', badge: '稳', cls: 'ok', yes: true };
    if (score >= 47) return { k: 'mid', badge: '等时机', cls: 'mid', yes: true };
    if (score >= 33) return { k: 'low', badge: '有得有失', cls: 'warn', yes: true };
    return { k: 'bad', badge: '缓一缓', cls: 'bad', yes: false };
  }

  /* ---------- 九、可执行动作（都是今天就能上手的） ---------- */
  var TOPIC_ACT = {
    wealth: [
      '把这半年的进出账列一遍，分清哪笔是买面子、哪笔是真投入。',
      '手上同时开的赚钱口子，砍到两个以内。',
      '给自己定条月度上限，到线就停手，别临时加码。'
    ],
    career: [
      '把这份差事里最耗人又最不出成绩的那块写出来，先想怎么甩掉。',
      '找个近半年做成过同类事的人，直接问他当初怎么过坎的。',
      '手上悬着的决定定个日子，到点就拍，别再拖。'
    ],
    love: [
      '把你在意的三件事写下来，哪件是底线、哪件能让，先说清再谈。',
      '这段关系里你能改的只有自己的做法，今天先挑一件改。',
      '别在情绪最差的时候谈事，睡够一觉再开口。'
    ],
    health: [
      '今晚提前一小时躺下，手机放到够不着的地方。',
      '每天走够四十分钟，不求快，只求别断。',
      '身上哪里不舒服超过两周，去做个检查，别自己猜。'
    ],
    home: [
      '把堆了半年没动过的东西清出去，先清门口和床边。',
      '睡觉头别对门、脚别对窗，先挪一下试试。',
      '白天把帘子拉开让光进来，潮的地方想办法通风。'
    ],
    general: [
      '把这件事拆成三步，今天只做第一步。',
      '找个真懂这件事的人，把判断讲给他听，看他从哪反驳你。',
      '给自己定个期限，到点不管成没成，先复盘一次。'
    ]
  };

  /* ---------- 十、主入口 ---------- */

  /* 用神五行落在命主的哪一门十神上。
     同样都是「补」，补法不一样：印是慢慢垫底子，比劫靠同辈搭手，食伤靠本事往外使。 */
  function shiShenOf(dayWx, wx) {
    if (!dayWx || !wx) return null;
    if (wx === dayWx) return { k: 'bi', n: '比劫', add: 3 };
    if (C.SHENG[dayWx] === wx) return { k: 'shi', n: '食伤', add: 4 };
    if (C.KE[dayWx] === wx) return { k: 'cai', n: '财星', add: 3 };
    if (C.SHENG[wx] === dayWx) return { k: 'yin', n: '印星', add: 5 };
    if (C.KE[wx] === dayWx) return { k: 'guan', n: '官杀', add: 2 };
    return null;
  }
  function judge(opt) {
    var q = String((opt && opt.q) || '').trim();
    var dv = opt && opt.dv;
    var fpNow = (opt && opt.fpNow) || C.fourPillars(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(), new Date().getHours(), new Date().getMinutes());
    if (!dv || !dv.prim || !dv.zhuang) return null;

    var cls = classify(q, opt && opt.cat);
    var topic = cls.topic;
    var z = dv.zhuang, yao = z.yao, moves = dv.moves || [];
    var yueZhi = fpNow.month ? C.ZHI[fpNow.month.zhi] : '子';
    var riZhi = C.ZHI[fpNow.day.zhi];
    var kong = C.kongWang(C.gzIndexOf(fpNow.day.gan, fpNow.day.zhi));

    var py = pickYong(yao, YONG_QIN[topic] || YONG_QIN.general, moves, z.shi);
    var yongYao = py.yao;
    var isMove = yongYao ? moves.indexOf(yongYao.pos - 1) >= 0 : false;
    var vit = yongYao ? vitality(yongYao, yueZhi, riZhi, kong, isMove) : null;
    var sy = shiYingRead(z, yongYao);

    /* 流年只对「问一年」的题才算数。问明天、问这个月的题，扯上「今年的太岁」就是答非所问。 */
    var yearFp = opt && opt.yearFp ? opt.yearFp : null;
    var yr = (yearFp && cls.horizon === 'year') ? yearRead(yearFp, yongYao, sy.shi) : null;

    /* 应期：问「什么时候」的题，得从用神 / 动爻 / 空亡里推出个大致月份 */
    var refYq = yongYao || (z.yao && z.shi ? z.yao[z.shi - 1] : null);
    var yq = yingQi(refYq, moves, dv.zhuangChg, kong, fpNow);
    var baseY = (fpNow.solar && fpNow.solar.y) || new Date().getFullYear();
    var yqFactor = null;

    var zk = ZHAN_KEY[topic] || '运势';
    var tnChg = (dv.chg && dv.chg.zhan) ? tone(dv.chg.zhan[zk]) : 0;

    /* ---- 打分 ---- */
    var sc = 50, factors = [];
    if (vit) {
      var w = { '旺': 18, '偏旺': 10, '平': 0, '偏弱': -10, '弱': -18 }[vit.level];
      sc += w;
      var vitShort = { '旺': '旺得很，帮它的力气足', '偏旺': '算有力，帮得上忙', '平': '力气一般，看你怎么使', '偏弱': '偏弱，主要靠你自己撑', '弱': '很弱，硬撑撑不住' }[vit.level];
      factors.push({
        n: Math.abs(w) + 6,
        s: '卦里管这件事的那一爻是「' + yongYao.qin + '」，' + vitShort + '。',
        t: '你所问的这件事，在卦里对着的那一爻叫「' + yongYao.qin + '」，它落在第 ' + yongYao.pos + ' 爻，是' + yongYao.gz + '，五行属' + yongYao.wx + '。' + vit.note.join('；') + '。合起来看，这一爻的力气算「' + vit.level + '」。'
      });
    } else {
      sc -= 12;
      factors.push({
        n: 18,
        s: '卦里没有直接管这件事的那一爻，说明事还没成形，得等。',
        t: '你所问的这件事，在卦里找不到直接对应的那一爻。这种情况多半说明事情还没成形，或者你问的方向跟卦对不上，要等。'
      });
    }
    if (sy.qinWord) {
      var qw = { '子孙': 12, '妻财': 10, '父母': -2, '官鬼': -6, '兄弟': -8 }[sy.shi.qin] || 0;
      // 求财时才把持世六亲当主要依据，别的方向只作参考
      sc += (topic === 'wealth' || topic === 'general') ? qw : Math.round(qw / 3);
      var qShort = {
        '子孙': '代表你的那一爻是子孙持世，财有源头，路子是活的。',
        '妻财': '代表你的那一爻是财爻持世，钱在你手上，关键看守不守得住。',
        '父母': '代表你的那一爻是父母持世，靠辛苦和底子，来得慢但稳。',
        '官鬼': '代表你的那一爻是官鬼持世，压力全在你身上，人累也容易惹是非。',
        '兄弟': '代表你的那一爻是兄弟持世，钱容易被分走被花掉，得看紧。'
      }[sy.shi.qin] || '';
      factors.push({
        n: Math.abs(qw) + 6, s: qShort,
        t: '卦里代表你的那爻（世爻）在第 ' + z.shi + ' 爻，是' + sy.shi.gz + '，六亲属' + sy.shi.qin + '。' + sy.qinWord
      });
    }
    if (sy.word) {
      var rw = { sheng: 12, same: 6, ke: -12, keBy: -4, shengBy: -6, none: 0 }[sy.toShi] || 0;
      sc += rw;
      var rShort = {
        sheng: '这件事本身是来帮你的，劲头往你这边走。',
        same: '这件事跟你是一路的，不别扭。',
        ke: '这件事压着你，越使劲越沉。',
        keBy: '你得费力气去够它，够得着，但累。',
        shengBy: '你得先往里搭东西，先付出才有回头。',
        none: ''
      }[sy.toShi] || '';
      if (rShort) factors.push({ n: Math.abs(rw) + 4, s: rShort, t: '把所问这件事的那一爻，和代表你的那一爻摆在一起：' + sy.word + '。' });
    }
    if (dv.chg) {
      var cw = tnChg * 3;
      sc += cw;
      var cShort = tnChg > 0 ? '卦正在往好里走，事情在往上挪。' : (tnChg < 0 ? '卦正在往下走，趁早拦一拦。' : '卦势平平，大体维持现在这样。');
      factors.push({
        n: Math.abs(cw) + 3, s: cShort,
        t: '卦会变，这一卦正在从《' + dv.prim.name + '》往《' + dv.chg.name + '》走。' + (tnChg > 0 ? '走向是往上的，说明事情在往好里挪。' : tnChg < 0 ? '走向是往下的，容易往下滑，早点拦。' : '走向平平，大体维持现在这个样子。')
      });
    } else {
      // 六爻皆静：不动也是一种信息，说明事情眼下是定的
      factors.push({
        n: 6,
        s: '这一卦六个爻全静，没有动爻，事情眼下是稳的。',
        t: '这一卦六爻皆静，没有动爻。事情眼下还比较稳定，没有大的变动，就以本卦的意思为准，不必多想。'
      });
    }
    if (yr && yr.note.length) {
      sc += yr.bonus * 2;
      factors.push({ n: Math.abs(yr.bonus) * 2 + 2, s: yr.short || '', t: yr.note.join('；') + '。' });
    }
    /* 应期只答「问时候」的题。问明天、问这个月、问身体的题，冒出一句「应期约在X月」
       就是另一回事的跑题，所以这里按问法卡死。 */
    if (yq && yq.hits.length && cls.kind === 'when') {
      var yh0 = yq.hits[0];
      yqFactor = {
        n: 8,
        s: '应期约在' + yingShort(yh0, baseY) + '（' + yh0.why + '）。',
        t: '算应期看' + (yongYao ? '用神' : '世爻') + '这一爻（' + yq.zhi + '）' +
          (yq.kong ? '，它落在空亡上，要等填空或冲空才实' : '') +
          (yq.chgZhi ? '，它又在动、变出' + yq.chgZhi : '') +
          '。往后按月建逐月推，' + yingShort(yh0, baseY) + '的月建正' + yh0.why + '它，这是最近的一个应期。'
      };
      factors.push(yqFactor);
    }

    /* ---- 命主这一层：同一卦，落在不同人的命里，轻重不一样 ----
       卦是当场摇的，改不了；但同一个卦对不同的人是补是耗，得按各人的喜用来看。
       这里没有命主信息时整段跳过，老路子照旧。 */
    var me = opt && opt.me;
    var meRead = null, meNote = '', meFactor = null;
    /* 取不到用神时，退一步看代表求测人自己的那一爻，别让「因人而异」这层空着 */
    var refYao = yongYao || (z.yao && z.shi ? z.yao[z.shi - 1] : null);
    if (me && me.ys && refYao) {
      var wxm = refYao.wx;
      var refWord = yongYao ? '这件事在卦里' : '卦里代表你的那一爻';
      var useM = me.ys.use || [], avoidM = me.ys.avoid || [];
      var inUse = useM.indexOf(wxm) >= 0, inAvoid = avoidM.indexOf(wxm) >= 0;
      var stM = me.ys.strength || {};
      meNote = '日主' + me.dayGan + '，属' + me.dayWx + '，' + (stM.strong ? '身偏强' : '身偏弱') +
        '，喜用是' + useM.join('、');
      /* 落到哪一门十神：都是补，补法也不同，轻重再分一缕 */
      var ssM = shiShenOf(me.dayWx, wxm);
      var sAdd = ssM ? ssM.add : 3;
      var sName = ssM ? ssM.n : '闲神';
      meRead = {
        wx: wxm, use: useM, avoid: avoidM, shi: ssM ? ssM.k : null, shiName: sName,
        onYong: !!yongYao, hit: inUse ? 'use' : (inAvoid ? 'avoid' : 'flat')
      };
      var meHead = '你的日主是' + me.dayGan + '（' + me.dayWx + '），' + me.ys.note;
      if (inUse) {
        sc += 9 + sAdd;
        meFactor = {
          n: 22,
          s: refWord + '属' + wxm + '，落在你的喜用上，对你是「' + sName + '」，是来帮你的。',
          t: meHead + refWord + '属' + wxm + '，落在你的喜用上，对你是「' + sName + '」这一路。同样这一卦，换个人来问未必是好事，落到你身上就顺。'
        };
      } else if (inAvoid) {
        sc -= 7 + sAdd;
        meFactor = {
          n: 20,
          s: refWord + '属' + wxm + '，对你是「' + sName + '」，正撞在你命里要避的那一口上。',
          t: meHead + refWord + '属' + wxm + '，对你是「' + sName + '」这一路，正撞在你命里要避的那一口上。同一卦，换个人来问断出来就不一样：别人办兴许顺手，你办得先把这个坎绕开。'
        };
      } else {
        sc += sAdd - 3;
        meFactor = {
          n: 10,
          s: refWord + '属' + wxm + '，对你是「' + sName + '」，跟喜忌不沾边，看你使多大劲。',
          t: meHead + refWord + '属' + wxm + '，对你是「' + sName + '」这一路，既不补你也不耗你。所以它对你不好不坏，全看你自己肯使多大劲。'
        };
      }
      factors.push(meFactor);
    }
    sc = Math.max(6, Math.min(96, Math.round(sc)));
    var g = gradeOf(sc);

    /* ---- 一句话结论：拿他问的那个时间词开头，保证答的就是他问的那段时间 ---- */
    var hzw = cls.timeWord || HZ[cls.horizon] || '眼下';
    var head = hzw + '，' + CORE[topic][g.k];
    if (cls.kind === 'should') head = hzw + '，' + (SHOULD_NOUN[topic] || '这件事') + SHOULD[g.k];
    if (cls.kind === 'when') {
      // 问「什么时候」的题：把应期直接写进结论，不许只回一句「等它自己动」
      var wtxt = g.yes ? '有戏' : '时机还没到';
      if (yq && yq.hits.length) wtxt += '，应期约在' + yingShort(yq.hits[0], baseY);
      head = hzw + '，' + wtxt + (g.yes ? '，别催。' : '，急着动反而坏事。');
    }

    /* ---- 取前三条依据，按影响大小排 ---- */
    factors.sort(function (a, b) { return b.n - a.n; });
    /* 有两条必须留在依据里，不许被挤掉：
       命主那一条 ——「因人而异」就落在它身上；
       问「什么时候」时的应期那一条 —— 他问的是哪个月，答里就得出现月份。 */
    var pinned = [];
    if (meFactor) pinned.push(meFactor);
    if (yqFactor && cls.kind === 'when') pinned.push(yqFactor);
    var top;
    if (pinned.length) {
      var rest = factors.filter(function (f) { return pinned.indexOf(f) < 0; });
      top = pinned.concat(rest.slice(0, 3 - pinned.length));
      top.sort(function (a, b) { return b.n - a.n; });
    } else {
      top = factors.slice(0, 3);
    }
    var why = top.map(function (f) { return f.t; }).filter(Boolean);
    var whyShort = top.map(function (f) { return f.s; }).filter(Boolean);

    /* ---- 今天能做的事 ---- */
    var acts = [];
    if (yongYao) {
      var fx = (Y.RD && Y.RD.WX_FIX && Y.RD.WX_FIX[yongYao.wx]) || null;
      if (fx) acts.push('补' + yongYao.wx + '：多往' + fx.dir + '去，穿戴用' + fx.color + '，数字上留意 ' + fx.num + '。' + fx.note);
    }
    // 择日：从明天起往后七天，挑第一个吉日
    try {
      var d0 = new Date(), found = null;
      for (var i = 1; i <= 7; i++) {
        var dd = new Date(d0); dd.setDate(dd.getDate() + i);
        var inf = Y.AL.dayInfo(dd.getFullYear(), dd.getMonth() + 1, dd.getDate());
        if (inf && String(inf.jcMean.lucky).indexOf('吉') >= 0) {
          found = { d: (dd.getMonth() + 1) + '月' + dd.getDate() + '日', jc: inf.jianchu, yi: inf.jcMean.yi, chong: inf.chong.shengxiao };
          break;
        }
      }
      if (found) acts.push('往后七天里，' + found.d + '是「' + found.jc + '」日，相对顺一点。要办要紧的事，挑这天，避开属' + found.chong + '的人。');
    } catch (e) { }
    var need = 3 - acts.length;
    TOPIC_ACT[topic].slice(0, need).forEach(function (t) { acts.push(t); });
    acts = acts.slice(0, 3);

    /* ---- 串成一段人话，供 AI 照着讲（不让它自由发挥） ---- */
    var plain = [
      hzw,
      '问的是' + TOPIC_NAME[topic] + '上的事。',
      '排出来是本卦《' + dv.prim.name + '》' + (dv.chg ? '，走到《' + dv.chg.name + '》' : '，六爻皆静'),
      '。',
      '看这件事的是「' + (yongYao ? yongYao.qin + '」这一爻，' + vit.level : '（未取到用神）'),
      '，代表你的世爻是' + sy.shi.gz + '（' + sy.shi.qin + '）',
      '。',
      meRead ? ('底下再说一层：' + meNote + '。' +
        (meRead.onYong ? '这件事在卦里属' : '卦里代表他的那一爻属') + meRead.wx + '，' +
        (meRead.hit === 'use' ? '正补在他的喜用上，落到他身上是顺水。'
          : meRead.hit === 'avoid' ? '撞在他要避的那一口上，别人办兴许顺手，他办得先绕开这个坎。'
            : '跟他的喜用不搭界，好与坏全看他自己使多大劲。')) : '',
      '合到一块儿，' + head
    ].join('');

    return {
      question: q,
      topic: topic, topicName: TOPIC_NAME[topic], topicRead: TOPIC_READ[topic],
      horizon: cls.horizon, horizonName: hzw, timeWord: hzw, kind: cls.kind,
      score: sc, grade: g.k, badge: g.badge, badgeCls: g.cls, yes: g.yes,
      headline: head, why: why, whyShort: whyShort, acts: acts, plain: plain,
      year: yr, vitality: vit, yong: yongYao, yongTwo: py.two,
      yingQi: yq,
      shi: sy.shi, ying: sy.ying, shiWord: sy.word,
      me: meRead, meNote: meNote,
      gua: { prim: dv.prim.name, chg: dv.chg ? dv.chg.name : null, glyph: dv.prim.glyph },
      when: fpNow.year.gz + '年 ' + (fpNow.month ? fpNow.month.gz + '月 ' : '') + fpNow.day.gz + '日 ' + fpNow.hour.gz + '时'
    };
  }

  Y.VD = { judge: judge, classify: classify, rel: rel, tone: tone, TOPIC_NAME: TOPIC_NAME, CAT_MAP: CAT_MAP };
})(window.YXJ);
