/* =============================================================
   易玄机 · 紫微斗数排盘
   -------------------------------------------------------------
   排盘引擎：iztro v2.6.5（SylarLong/iztro，MIT License）
             https://github.com/SylarLong/iztro
   引擎文件随本站一同打包（assets/iztro.min.js），不连外网也能排。
   相关开源项目 Renhuai123/ziwei-doushu（MIT 代码 + CC BY 4.0 数据集）
   的排盘层同样基于 iztro，此处只取轻量排盘能力，不含其 56.6GB 语料。

   注意：本页只是把传统术数的盘面与通行说法摆出来，
        不替任何人下人生结论，也不构成任何现实决策依据。
   ============================================================= */
(function () {
  'use strict';

  var ENGINE = 'iztro 2.6.5';

  /* 星曜中文名 → iztro 自带 STARS_INFO 的键。只做事实映射，不写解释。
     该元数据收录十四主星与六颗辅星的五行、阴阳及十二宫亮度表。 */
  var STAR_META_KEY = {
    '紫微': 'ziweiMaj', '天机': 'tianjiMaj', '太阳': 'taiyangMaj', '武曲': 'wuquMaj',
    '天同': 'tiantongMaj', '廉贞': 'lianzhenMaj', '天府': 'tianfuMaj', '太阴': 'taiyinMaj',
    '贪狼': 'tanlangMaj', '巨门': 'jumenMaj', '天相': 'tianxiangMaj', '天梁': 'tianliangMaj',
    '七杀': 'qishaMaj', '破军': 'pojunMaj',
    '文昌': 'wenchangMin', '文曲': 'wenquMin', '火星': 'huoxingMin', '铃星': 'lingxingMin',
    '擎羊': 'qingyangMin', '陀罗': 'tuoluoMin'
  };

  /* 术语白话对照：只解释词本身是什么意思，不推断这个人会怎样 */
  var GLOSS = {
    '命宫': '本人底子这一宫，老书拿它看性子',
    '身宫': '三十岁以后往哪儿落脚那一宫',
    '三方四正': '命宫加财帛、官禄、迁移四宫一起看',
    '财帛': '钱从哪儿来、往哪儿去那一宫',
    '官禄': '做事的位置、事业那一宫',
    '迁移': '出门在外、换环境那一宫',
    '夫妻': '婚恋相处那一宫',
    '子女': '子女晚辈、也管作品和带人那一宫',
    '兄弟': '同辈手足、合伙的人那一宫',
    '仆役': '朋友同事下属那一宫',
    '福德': '心里喜好、享不享得了福那一宫',
    '田宅': '住处家业那一宫',
    '父母': '长辈上司、文书出身那一宫',
    '疾厄': '身体要多留意那一宫',
    '庙': '这颗星在这个位置亮堂、使得上劲',
    '旺': '这颗星在这个位置有力气',
    '利': '这颗星在这个位置还算顺手',
    '得': '这颗星在这个位置能使得上',
    '平': '不特别强也不特别弱',
    '陷': '这颗星在这个位置使不上劲',
    '化禄': '老书里说这是顺手、来得容易那一路',
    '化权': '老书里说这一头说了算的分量重',
    '化科': '老书里说这是名声、有人搭把手',
    '化忌': '老书里说这是容易较劲、放不下的那一头',
    '大限': '十年一换的那段运',
    '流年': '今年这一年的落点',
    '空宫': '这一宫没坐十四主星，老书借正对面那宫的星来看',
    '借对宫': '本宫没主星时，看正对面那一宫的星',
    '紫微': '老书里的帝座星，主统筹',
    '天机': '主思虑，脑子转得快',
    '太阴': '主积累，细腻内敛',
    '武曲': '主执行，认数字认结果',
    '贪狼': '主兴趣，才艺和交际都旺',
    '天梁': '主担当，讲原则、爱兜底',
    '七杀': '主开创，独立果断',
    '破军': '主破立，敢推倒重来',
    '天府': '主守成，会攒会管',
    '天同': '主感受，图个安稳',
    '巨门': '主辨析，靠嘴靠脑吃饭',
    '天相': '主辅佐，重体面、会调停',
    '廉贞': '主分寸，讲规矩也讲才情',
    '太阳': '主外放，愿意把光分给别人',
    '六吉': '左辅右弼文昌文曲天魁天钺，老书里算帮衬的星',
    '六煞': '擎羊陀罗火星铃星地空地劫，老书里算磨人的星'
  };

  /* 十二宫在传统书里各管哪一头 */
  var PALACE_MEAN = {
    '命宫': '一个人的性情底子，和这辈子大体往哪儿使劲',
    '命': '一个人的性情底子，和这辈子大体往哪儿使劲',
    '兄弟': '同辈、手足、合伙的人，相处得顺不顺',
    '夫妻': '婚恋关系，以及两个人的相处方式',
    '子女': '子女晚辈，也管作品、带人这些事',
    '财帛': '钱从哪儿来、往哪儿去，挣钱和花钱的路子',
    '疾厄': '身体上要多留意的那些地方',
    '迁移': '出门在外、换环境，和旁人眼里的你',
    '仆役': '朋友、同事、下属，也就是你身边的人缘圈',
    '交友': '朋友、同事、下属，也就是你身边的人缘圈',
    '官禄': '做事的位置、事业上担的那一摊',
    '事业': '做事的位置、事业上担的那一摊',
    '田宅': '住处、家业，和攒下来的不动东西',
    '福德': '心里那点喜好、劲头和享不享得了福',
    '父母': '长辈、上司，也管文书与出身'
  };

  /* 十四主星：只写传统通行的性情描述，不做吉凶断语 */
  var STAR_BRIEF = {
    '紫微': '主统筹。习惯站在安排全局的位置上，老书里也提醒别太孤高。',
    '天机': '主思虑。脑子转得快，爱把来龙去脉琢磨明白。',
    '太阳': '主外放。愿意把光分给别人，看重名声和体面。',
    '武曲': '主执行。认数字认结果，做事讲究硬碰硬。',
    '天同': '主感受。图个舒服安稳，性子偏软和。',
    '廉贞': '主分寸。既讲规矩也讲才情，情感上较真。',
    '天府': '主守成。会攒会管，稳字当头。',
    '太阴': '主积累。细腻内敛，重节奏不重声势。',
    '贪狼': '主兴趣。会玩会交，才艺和欲望都旺。',
    '巨门': '主辨析。靠嘴靠脑吃饭，爱问一句为什么。',
    '天相': '主辅佐。重体面，擅长在中间调停。',
    '天梁': '主担当。讲原则，遇上事愿意兜底。',
    '七杀': '主开创。独立果断，不爱被人管着。',
    '破军': '主破立。敢推倒重来，一生变动大些。'
  };

  var SIHUA = {
    '禄': '化禄', '权': '化权', '科': '化科', '忌': '化忌'
  };
  var SIHUA_MEAN = {
    '禄': '老书把这一路叫「顺手」：这头的事做起来不太费劲，来得也容易些',
    '权': '老书把这一路叫「说了算」：这头你拿主意的分量重，也容易硬碰硬',
    '科': '老书把这一路叫「有名声」：容易有人搭把手，事情摆到台面上好看',
    '忌': '老书把这一路叫「放不下」：这头容易较劲、容易卡住，得多留个心'
  };

  /* 传统盘面是四四方方十二格，中间空出中宫 */
  var POS = [
    [3, 1, 1], [4, 2, 1], [5, 3, 1], [6, 4, 1],
    [2, 1, 2], [7, 4, 2],
    [1, 1, 3], [8, 4, 3],
    [0, 1, 4], [11, 2, 4], [10, 3, 4], [9, 4, 4]
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* 宫名统一带上「宫」字，但「命宫」本身已带，别写成「命宫宫」 */
  function palName(n) {
    var s = String(n || '');
    if (!s) return '';
    return /宫$/.test(s) ? s : s + '宫';
  }

  /** 表格一律套一层横向滚动框：窄屏下列多也不会把整页撑宽。
      注意：这是模块级函数，不能写进下面的 ZW 对象字面量里。 */
  function wrapTables(h) {
    return String(h || '').replace(/<table class="dt">([\s\S]*?)<\/table>/g,
      '<div class="dtwrap"><table class="dt">$1</table></div>');
  }

  /* 公历小时 → iztro 时辰序号：0 早子、1 丑…11 亥、12 晚子 */
  function timeIndex(h) {
    h = Math.max(0, Math.min(23, +h || 0));
    if (h === 23) return 12;
    return Math.floor((h + 1) / 2);
  }

  var ZW = {
    engine: ENGINE,

    ready: function () {
      return !!(window.iztro && window.iztro.astro && window.iztro.astro.bySolar);
    },

    /** 排一张本命盘，返回 iztro 的 astrolabe 对象；失败时抛错 */
    chart: function (o) {
      if (!ZW.ready()) throw new Error('排盘引擎没加载上，刷新一下再试');
      var y = +o.y, m = +o.m, d = +o.d, h = +o.h;
      if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) {
        throw new Error('出生年月日看着不对，再核一下');
      }
      var g = (o.gender === 'female' || o.gender === '女') ? '女' : '男';
      var a = window.iztro.astro.bySolar(
        y + '-' + m + '-' + d, timeIndex(h), g, true, 'zh-CN'
      );
      if (!a || !a.palaces || a.palaces.length !== 12) throw new Error('这张盘没排出来');
      return a;
    },

    /** 给 AI 问答用的盘面要点，纯事实罗列，不加推断 */
    brief: function (a) {
      var ps = a.palaces, soul = null, hua = [];
      ps.forEach(function (p) {
        if (p.earthlyBranch === a.earthlyBranchOfSoulPalace) soul = p;
        (p.majorStars || []).concat(p.minorStars || []).forEach(function (s) {
          if (s.mutagen && SIHUA[s.mutagen]) hua.push(s.name + SIHUA[s.mutagen]);
        });
      });
      return {
        branch: a.earthlyBranchOfSoulPalace,
        gz: soul ? soul.heavenlyStem + soul.earthlyBranch : '',
        cls: a.fiveElementsClass || '',
        stars: soul ? (soul.majorStars || []).map(function (s) { return s.name; }).join('、') : '',
        soulStar: a.soul || '', bodyStar: a.body || '',
        hua: hua.join('、')
      };
    },

  /** 真实数据出口：把 iztro 排出的盘完整结构化，一个字段都不臆造。
      白话解释不在这里写，交给易玄机。 */
  data: function (a, todayStr) {
    var info = (window.iztro && window.iztro.data && window.iztro.data.STARS_INFO) || {};
    function oneStar(s) {
      var k = STAR_META_KEY[s.name], meta = k ? info[k] : null;
      var o = { name: s.name, type: s.type || '', brightness: s.brightness || '', mutagen: s.mutagen || '' };
      if (meta) {
        if (meta.fiveElements) o.fiveElements = meta.fiveElements;
        if (meta.yinYang) o.yinYang = meta.yinYang;
      }
      return o;
    }
    function starList(arr) { return (arr || []).map(oneStar); }
    var palaces = (a.palaces || []).map(function (p) {
      return {
        name: p.name, stem: p.heavenlyStem, branch: p.earthlyBranch,
        isBodyPalace: !!p.isBodyPalace,
        majorStars: starList(p.majorStars), minorStars: starList(p.minorStars),
        adjectiveStars: (p.adjectiveStars || []).map(function (s) { return s.name; }),
        changsheng12: p.changsheng12 || '', boshi12: p.boshi12 || '',
        jiangqian12: p.jiangqian12 || '', suiqian12: p.suiqian12 || '',
        decadal: p.decadal ? { range: p.decadal.range, stem: p.decadal.heavenlyStem, branch: p.decadal.earthlyBranch } : null,
        ages: p.ages || []
      };
    });
    var siHua = [];
    palaces.forEach(function (p) {
      p.majorStars.concat(p.minorStars).forEach(function (s) {
        if (s.mutagen && SIHUA[s.mutagen]) siHua.push({ star: s.name, hua: SIHUA[s.mutagen], palace: p.name });
      });
    });
    /* 三方四正：命宫本身，加上财帛、官禄、迁移三宫。按盘面宫名取，不另推。 */
    var SAN = ['命宫', '命', '财帛', '官禄', '事业', '迁移'];
    var sanFang = palaces.filter(function (p) { return SAN.indexOf(p.name) >= 0; }).map(function (p) {
      return {
        palace: p.name, stemBranch: p.stem + p.branch,
        majorStars: p.majorStars.map(function (s) { return s.name; }),
        minorStars: p.minorStars.map(function (s) { return s.name; })
      };
    });
    var horo = null;
    try {
      var hs = a.horoscope(todayStr);
      if (hs) {
        horo = {
          date: todayStr,
          /* iztro 2.6.x 的 age 是 { nominalAge, index } 对象，页面只取虚岁数字 */
          age: (hs.age && typeof hs.age === 'object') ? (hs.age.nominalAge != null ? hs.age.nominalAge : null)
               : (hs.age != null ? hs.age : null),
          decadal: hs.decadal ? {
            palace: (hs.decadal.palaceNames || [])[0] || '',
            stem: hs.decadal.heavenlyStem || '', branch: hs.decadal.earthlyBranch || '',
            mutagen: hs.decadal.mutagen || []
          } : null,
          yearly: hs.yearly ? {
            palace: (hs.yearly.palaceNames || [])[0] || '',
            stem: hs.yearly.heavenlyStem || '', branch: hs.yearly.earthlyBranch || '',
            mutagen: hs.yearly.mutagen || []
          } : null
        };
      }
    } catch (e) { horo = null; }

    var soulPalace = palaces.filter(function (p) { return p.branch === a.earthlyBranchOfSoulPalace; })[0] || null;
    var bodyPalace = palaces.filter(function (p) { return p.isBodyPalace; })[0] || null;
    var out = {
      engine: { name: 'iztro', version: '2.6.5', license: 'MIT', source: 'https://github.com/SylarLong/iztro' },
      meta: {
        solarDate: a.solarDate, lunarDate: a.lunarDate, chineseDate: a.chineseDate,
        time: a.time, timeRange: a.timeRange, sign: a.sign, zodiac: a.zodiac,
        gender: a.gender, fiveElementsClass: a.fiveElementsClass,
        soulStar: a.soul, bodyStar: a.body,
        soulPalace: soulPalace ? soulPalace.name + '（' + soulPalace.stem + soulPalace.branch + '）' : '',
        bodyPalace: bodyPalace ? bodyPalace.name + '（' + bodyPalace.stem + bodyPalace.branch + '）' : ''
      },
      palaces: palaces, sanFang: sanFang, siHua: siHua, horoscope: horo,
      classics: ZW.classics({ palaces: palaces, siHua: siHua })
    };
    out.tianji = ZW.tianji(out);
    return out;
  },

  /** 古籍原文检索：按盘上真实出现的星名做字面匹配，返回原文与出处。
      只取公有领域古籍，不取非商用的《天纪》原话。 */
  classics: function (d) {
    var C = window.ZW_CLASSICS;
    if (!C || !C.books) return { source: '', hits: [] };
    var keys = [];
    (d.siHua || []).forEach(function (x) { if (keys.indexOf(x.star) < 0) keys.push(x.star); });
    (d.palaces || []).forEach(function (p) {
      if (/^(命宫|命)$/.test(p.name)) p.majorStars.forEach(function (s) { if (keys.indexOf(s.name) < 0) keys.push(s.name); });
    });
    var hits = [];
    C.books.forEach(function (b) {
      (b.paragraphs || []).forEach(function (t) {
        var match = keys.filter(function (k) { return k && t.indexOf(k) >= 0; });
        if (match.length && hits.length < 6) hits.push({ book: b.title, dynasty: b.dynasty || '', match: match, text: t });
      });
    });
    return {
      source: 'https://github.com/Renhuai123/ziwei-doushu （古籍原文，公有领域）',
      keywords: keys, hits: hits
    };
  },


    person: function (a, input) {
      var b = ZW.brief(a);
      var note = '命宫在' + b.branch + '（' + b.gz + '），' + b.cls +
        '，命宫' + (b.stars ? '主星' + b.stars : '没有十四主星，传统上借对宫看') +
        '，命主' + b.soulStar + '、身主' + b.bodyStar +
        (b.hua ? '，生年四化' + b.hua : '');
      var short = '命宫' + (b.stars || '空宫') + ' · ' + b.cls;
      var prompt = [
        '【这个人的紫微斗数本命盘，讲的时候必须照他的盘说，不许讲成谁都适用的场面话】',
        '本命盘：' + note + '。',
        '这张盘由 iztro 排定，属传统术数盘面。不要再另推日主、身强身弱、喜用五行，也不要拿紫微另编一套吉凶加减分。',
        '讲的时候把上面这几点如实带进去，说清他这个盘的性子底子；吉凶仍以上面已排定的卦为准。'
      ].join('\n');
      return { ok: true, note: note, short: short, prompt: prompt, brief: b, chart: a, input: input || null };
    },

    /** 《天纪》依据：按这张盘上真实出现的星名/宫名，去讲义目录与短引里检索。
      体系口径是原创重述，短引保留原文与出处。 */
  tianji: function (d) {
    var T = window.ZW_TIANJI;
    if (!T) return null;
    var keys = [];
    (d.siHua || []).forEach(function (x) { if (keys.indexOf(x.star) < 0) keys.push(x.star); });
    (d.palaces || []).forEach(function (p) {
      if (/^(命宫|命|财帛|官禄|事业|迁移|身宫)$/.test(p.name) || p.isBodyPalace) {
        if (keys.indexOf(p.name) < 0) keys.push(p.name);
        p.majorStars.forEach(function (s) { if (keys.indexOf(s.name) < 0) keys.push(s.name); });
      }
    });
    (d.classics && d.classics.keywords || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    /* 单字词（如「命」）会命中一大片无关内容，检索时只留两字以上的星名与宫名 */
    keys = keys.filter(function (k) { return k && k.length >= 2; });
    var eps = [], quotes = [];
    (T.episodes || []).forEach(function (e) {
      var hay = [e.first, e.second].concat(e.highlights || []).join(' ');
      var hit = keys.filter(function (k) { return hay.indexOf(k) >= 0; });
      if (hit.length && eps.length < 5) eps.push({ dvd: e.dvd, first: e.first, second: e.second, match: hit });
    });
    (T.quotes || []).forEach(function (q) {
      var hit = keys.filter(function (k) { return q.text.indexOf(k) >= 0; });
      quotes.push({ text: q.text, topic: q.topic, match: hit });
    });
    /* 1848 条讲义原话里按盘上星名逐条查，命宫主星优先，附 B 站出处 */
    var corpusHits = [];
    var soulNames = [];
    (d.palaces || []).forEach(function (p) {
      if (/^(命宫|命)$/.test(p.name)) p.majorStars.forEach(function (s) { soulNames.push(s.name); });
    });
    (T.entries || []).forEach(function (e) {
      if (corpusHits.length >= 12) return;
      var hit = keys.filter(function (k) { return (e.quote || '').indexOf(k) >= 0 || (e.h3 || '').indexOf(k) >= 0; });
      if (!hit.length) return;
      var pri = hit.some(function (k) { return soulNames.indexOf(k) >= 0; }) ? 1 : 0;
      corpusHits.push({
        quote: e.quote, book: e.book, h2: e.h2, h3: e.h3, t: e.t_hms,
        bvid: e.bvid, part: e.part, match: hit, pri: pri,
        url: 'https://www.bilibili.com/video/' + e.bvid + '?p=' + e.part + '&t=' + ZW.hmsToSec(e.t_hms)
      });
    });
    corpusHits.sort(function (x, y) { return y.pri - x.pri; });
    return {
      school: T.school, source: T.source, corpus: T.corpus,
      license: T.license, attribution: T.attribution,
      total: (T.entries || []).length,
      keywords: keys, episodes: eps, quotes: quotes, corpusHits: corpusHits
    };
  },

  hmsToSec: function (s) {
    var p = String(s || '0:0:0').split(':').map(function (x) { return +x || 0; });
    return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
  },

  /** 把一段原文里出现的行话逐条翻成白话 */
  plainOf: function (text) {
    var s = String(text || ''), hit = [];
    Object.keys(GLOSS).forEach(function (k) {
      if (s.indexOf(k) >= 0 && hit.length < 6) hit.push(k + '＝' + GLOSS[k]);
    });
    return hit;
  },

  /** 整张盘一句话说人话：只串盘面事实，不串吉凶 */
  summary: function (d) {
    var m = d.meta, soul = null;
    d.palaces.forEach(function (p) { if (p.name === '命宫' || p.name === '命') soul = p; });
    var names = soul ? soul.majorStars.map(function (s) { return s.name; }) : [];
    var hua = d.siHua.map(function (x) { return x.star + x.hua + '在' + palName(x.palace); });
    var horo = d.horoscope;
    var L = [];
    L.push('这张盘把你本人的底子放在「' + (names.length ? names.join('、') : '空宫，借对宫看') +
      '」这几颗星上，落在' + m.soulPalace + '，五行局是' + m.fiveElementsClass + '。');
    L.push('老书里管这叫命宫，就是看你性子底子那一宫；另外还要搭着财帛、官禄、迁移三宫一块看，才知道这股劲往哪儿使。');
    if (hua.length) L.push('生年四化是' + hua.join('、') +
      '。化禄化权化科化忌是老书给这四颗星标的四种劲儿，说的是传统归类，不是说你一定会碰上什么事。');
    if (horo && horo.decadal) L.push('眼下这十年走的是' + horo.decadal.palace + '宫这一步大限' +
      (horo.yearly ? '，今年落在' + horo.yearly.palace + '宫' : '') + '；大限就是十年一换的那段方向，流年就是今年这一年的落点。');
    L.push('这一整段只讲盘上有什么、老书怎么说，不替你断发财、断婚姻、断病灾。');
    return L.join('');
  },

  /** 紫微规则直读：不靠模型，每一句都指得回盘面数据、古籍原文或《天纪》讲义。
      不做吉凶推断、不混宫位、不替古籍补话。来源标签让用户自己分得清哪句是数据、哪句是原文、哪句是白话直译。 */
  reading: function (d) {
    if (!d) return '';
    var m = d.meta, ps = d.palaces;
    function tag(t) {
      var cls = { '盘面': 'data', '古籍': 'classic', '讲义': 'tianji', '白话': 'plain' }[t] || 'plain';
      return '<span class="zwtag ' + cls + '">' + t + '</span>';
    }
    function sf(s) {
      return s.name + (s.brightness ? '（' + s.brightness + '）' : '') +
        (s.fiveElements ? ' · ' + s.fiveElements + (s.yinYang ? s.yinYang : '') : '');
    }
    function byName(n) { return ps.filter(function (p) { return p.name === n || p.name === (n === '命' ? '命宫' : ''); })[0] || null; }
    /* 某颗星命中的古籍原文，只取确实含这颗星名的段落 */
    function classicFor(name) {
      return (d.classics && d.classics.hits || []).filter(function (h) {
        return h.match.indexOf(name) >= 0;
      }).slice(0, 2);
    }
    function quoteBox(label, text, src, link) {
      var terms = ZW.plainOf(text);
      return '<div class="wen" data-lb="' + esc(label) + '">' + esc(text) +
        '<div style="font-size:11px;color:var(--ink3);margin-top:5px">' + esc(src) +
        (link ? '　<a href="' + esc(link) + '" target="_blank" rel="noopener" style="color:var(--qing)">看原视频这一秒 ↗</a>' : '') +
        '</div></div>' +
        (terms.length ? '<div class="bai" style="font-size:12.5px;padding:7px 11px">' + tag('白话') +
          '这段里的行话：' + esc(terms.join('；')) + '。</div>' : '');
    }

    var soul = byName('命宫');
    var bodyPal = ps.filter(function (p) { return p.isBodyPalace; })[0] || null;

    /* 零、先把整张盘说成人话，不摆术语 */
    var sec0 = '<div class="rsec zw-rsec" id="zwPlain"><h3><span class="dot"></span>先说人话：这张盘到底在讲啥</h3>' +
      '<div class="bai" style="font-size:14.5px">' + tag('白话') + esc(ZW.summary(d)) + '</div></div>';

    /* 一、口径 */
    var sanQuote = (d.tianji && d.tianji.corpusHits || []).filter(function (h) {
      return h.quote.indexOf('兼看另外三个宫') >= 0 || h.quote.indexOf('三方') >= 0;
    })[0];
    var sec1 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>一、这张盘按什么口径读</h3>' +
      '<div class="bai">' + tag('白话') + '命宫看的是本人底子，财帛、官禄、迁移三宫看这股劲往哪儿使。这套读法叫三合派，来自倪海厦《天纪》讲义：' +
      esc(d.tianji ? d.tianji.school.core : '') + '</div>' +
      (sanQuote ? quoteBox('讲义', sanQuote.quote, sanQuote.book + '　' + sanQuote.t, sanQuote.url) : '') +
      '<div class="tip" style="font-size:12px;color:var(--ink3)">' + tag('白话') +
      '下面每一段都标了出处：' + tag('盘面') + '是 iztro 排出的数据，' + tag('古籍') + '是明代刊本原文，' + tag('讲义') + '是《天纪》原话，' + tag('白话') + '是本站对上面的直译。本站不另加吉凶判断。</div></div>';

    /* 二、命宫 */
    var soulLines = soul ? soul.majorStars.map(function (s) {
      var cs = classicFor(s.name);
      return '<div style="margin-top:8px">' + tag('盘面') + '<b>' + esc(sf(s)) + '</b>　' + tag('白话') +
        esc(STAR_BRIEF[s.name] || '（这颗星的传统说法本站还没收，不硬编）') +
        cs.map(function (h) { return quoteBox('古籍', h.text, h.dynasty + '《' + h.book + '》'); }).join('') +
        '</div>';
    }).join('') : '<div class="tip">命宫没有十四主星，传统上借对宫看，本站不替它硬填。</div>';
    var sec2 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>二、命宫：本人底子</h3>' +
      '<div class="bai">' + tag('盘面') + '命宫落在 <b>' +
      esc(soul ? soul.branch + '宫（' + soul.stem + soul.branch + '）' : m.soulPalace) + '</b>，' + esc(m.fiveElementsClass) +
      '，命主 <b>' + esc(m.soulStar) + '</b>、身主 <b>' + esc(m.bodyStar) + '</b>' +
      (bodyPal ? '，身宫落在 <b>' + esc(palName(bodyPal.name) + '（' + bodyPal.stem + bodyPal.branch + '）') + '</b>' : '') + '。</div>' +
      soulLines + '</div>';

    /* 三、三方四正 */
    var sanRows = d.sanFang.map(function (p) {
      return '<tr><td class="k">' + esc(p.palace) + '</td><td class="gz">' + esc(p.stemBranch) + '</td>' +
        '<td style="text-align:left">' + esc(p.majorStars.join('、') || '—') + '</td>' +
        '<td style="text-align:left;font-size:12px">' + esc(PALACE_MEAN[p.palace] || '—') + '</td></tr>';
    }).join('');
    function san(name) {
      var p = null;
      d.sanFang.forEach(function (x) { if (x.palace === name || (name === '命宫' && x.palace === '命')) p = x; });
      return p && p.majorStars && p.majorStars.length ? p.majorStars.join('、') : '空宫';
    }
    var sec3 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>三、三方四正：劲往哪儿使</h3>' +
      '<div class="bai">' + tag('白话') + '说白了，命宫是你的底子，另外三宫是这底子往哪儿用：财帛看钱怎么进出，官禄看你在哪儿做事，迁移看出门在外和换环境。' +
      '这张盘里，命宫是' + esc(san('命宫')) + '，财帛是' + esc(san('财帛')) +
      '，官禄是' + esc(san('官禄')) + '，迁移是' + esc(san('迁移')) +
      '。空宫就是这一宫没坐主星，老书看正对面那宫的星。</div>' +
      '<div class="bai">' + tag('盘面') + '下面四宫是三合派看盘的主框，表里只列引擎排出的数据。</div>' +
      '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星</th><th>这一宫传统上管什么</th></tr>' + sanRows + '</table></div>';

    /* 四、生年四化：只说传统归类，不翻成具体事件 */
    var huaRows = d.siHua.map(function (x) {
      var pm = PALACE_MEAN[x.palace] || '';
      var k = ({ '化禄': '禄', '化权': '权', '化科': '科', '化忌': '忌' })[x.hua] || '';
      return '<div style="margin-top:7px">' + tag('盘面') + '<b>' + esc(x.star + x.hua) + '</b> 在 <b>' + esc(palName(x.palace)) + '</b>　' +
        tag('白话') + esc(SIHUA_MEAN[k] || '') + '；这一宫传统上管' + esc(pm) + '。' +
        '<div style="font-size:11.5px;color:var(--ink3);margin-top:3px">这里说的是传统对四化的归类，不是对这个人会发生什么的判断。</div></div>';
    }).join('');
    var sec4 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>四、生年四化</h3>' +
      '<div class="bai">' + tag('白话') + '四化说白了，就是老书给四颗星标的四种劲儿：化禄是顺手、化权是这头你说了算、化科是有名声有人帮、化忌是容易较劲放不下。' +
      '哪颗星带上哪种劲儿，就说它落的那宫那摊事偏哪种劲。这是传统归类，不是说你一定会碰上什么事，更不是好坏评分。</div>' +
      (huaRows || '<div class="tip">盘上未取到生年四化。</div>') + '</div>';

    /* 五、十二宫逐宫 */
    /* 古籍书名塞在「主星」格里做小字，不单列一列——单列一列窄屏下会把整张表挤成一团 */
    var pRows = ps.map(function (p) {
      var ms = p.majorStars.map(function (s) { return s.name + (s.brightness ? '（' + s.brightness + '）' : ''); }).join('、');
      var hitBooks = (d.classics && d.classics.hits || []).filter(function (h) {
        return h.match.some(function (n) { return p.majorStars.some(function (s) { return s.name === n; }); });
      }).map(function (h) { return h.book; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
      return '<tr><td class="k">' + esc(p.name) + (p.isBodyPalace ? '<sup>身</sup>' : '') + '</td>' +
        '<td class="gz">' + esc(p.stem + p.branch) + '</td>' +
        '<td style="text-align:left">' + esc(ms || '—') +
        (hitBooks.length ? '<div style="font-size:10.5px;color:var(--ink3)">古籍：' + esc(hitBooks.join('、')) + '</div>' : '') +
        '</td>' +
        '<td style="text-align:left;font-size:12px">' + esc(PALACE_MEAN[p.name] || '—') + '</td></tr>';
    }).join('');
    var sec5 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>五、十二宫逐宫</h3>' +
      '<div class="bai">' + tag('白话') + '十二宫就是把一辈子的事分成十二摊：性情、手足、婚恋、子女、钱、身体、出外、朋友、事业、住处、心气、长辈，一宫管一摊。' +
      '表里写的是每宫坐了哪颗主星、这宫管什么；主星下面小字是这颗星在古籍里查到了哪本书。</div>' +
      '<div class="bai">' + tag('盘面') + '点开下面的「命盘数据」可看古籍原文全句与全部辅星。</div>' +
      '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星</th><th>传统上管什么</th></tr>' + pRows + '</table></div>';

    /* 六、讲义原话 */
    var corpus = (d.tianji && d.tianji.corpusHits || []).slice(0, 6);
    var sec6 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>六、《天纪》讲义怎么讲这几宫</h3>' +
      '<div class="bai">' + tag('讲义') + '下面原话按这张盘上的星名与宫名从 ' + esc((d.tianji && d.tianji.total) || 0) +
      ' 条里检索，只作口径参照，不是对这个人下的结论。</div>' +
      (corpus.length ? corpus.map(function (h) {
        return quoteBox(h.book, h.quote, h.h3 + '　' + h.t + '　命中：' + h.match.join('、'), h.url);
      }).join('') : '<div class="tip">没检索到对应段落，本站不硬凑。</div>') + '</div>';

    /* 七、运限：只列数据 */
    var horo = d.horoscope;
    var sec7 = horo ? '<div class="rsec zw-rsec"><h3><span class="dot"></span>七、大限与流年</h3>' +
      '<div class="bai">' + tag('盘面') + esc(horo.date) +
      (horo.decadal ? '　大限：<b>' + esc(palName(horo.decadal.palace) + '（' + horo.decadal.stem + horo.decadal.branch + '）') + '</b>' : '') +
      (horo.yearly ? '　流年：<b>' + esc(palName(horo.yearly.palace) + '（' + horo.yearly.stem + horo.yearly.branch + '）') + '</b>' : '') +
      '。</div><div class="tip" style="font-size:12px;color:var(--ink3)">' + tag('白话') +
      '这里只报宫位与干支。传统上大限管十年一段的方向、流年管一年的落脚处；本站不据此断哪年发财、哪年有灾。</div></div>' : '';

    var sec8 = '<div class="rsec zw-rsec"><h3><span class="dot"></span>八、这一段的边界</h3>' +
      '<div class="bai">上面这一整段由规则按数据直读，不经过模型，所以断网也能出、每一句都查得到出处。古籍与讲义是传统说法的整理，不具科学预测效力，不构成投资、医疗、法律、婚恋等任何现实决策依据。</div></div>';

    return '<div class="card" style="margin-top:16px">' +
      '<div class="sec-h"><span class="bar"></span><h2>紫微解读（规则直读）</h2><span class="hint">不靠模型 · 每句标得出来源</span></div>' +
      sec0 + sec1 + sec2 + sec3 + sec4 + sec5 + sec6 + sec7 + sec8 + '</div>';
  },

  /** 给大模型用的精简快照：页面展示全量，问答只递必要字段，省 token */
  compact: function (d) {
    if (!d) return {};
    return {
      engine: d.engine.name + ' ' + d.engine.version,
      meta: {
        solarDate: d.meta.solarDate, lunarDate: d.meta.lunarDate, chineseDate: d.meta.chineseDate,
        time: d.meta.time, fiveElementsClass: d.meta.fiveElementsClass,
        soulStar: d.meta.soulStar, bodyStar: d.meta.bodyStar,
        soulPalace: d.meta.soulPalace, bodyPalace: d.meta.bodyPalace
      },
      palaces: d.palaces.map(function (p) {
        return {
          name: p.name, gz: p.stem + p.branch, isBody: p.isBodyPalace,
          major: p.majorStars.map(function (s) {
            return s.name + (s.brightness ? '(' + s.brightness + ')' : '') +
              (s.mutagen && SIHUA[s.mutagen] ? SIHUA[s.mutagen] : '') +
              (s.fiveElements ? '[' + s.fiveElements + ']' : '');
          }),
          minor: p.minorStars.map(function (s) { return s.name; })
        };
      }),
      sanFang: d.sanFang, siHua: d.siHua, horoscope: d.horoscope,
      classics: (d.classics && d.classics.hits || []).map(function (h) {
        return { book: h.book, text: h.text };
      }),
      tianji: d.tianji ? {
        school: d.tianji.school.core + ' ' + d.tianji.school.method,
        total: d.tianji.total,
        hits: (d.tianji.corpusHits || []).map(function (h) {
          return { quote: h.quote, src: h.book + '／' + h.h3 + ' ' + h.t };
        })
      } : null
    };
  },

  /** 讲义全文检索：原话、小标题、讲次都查，返回带 B 站出处的结果 */
  search: function (q, limit) {
    var T = window.ZW_TIANJI;
    if (!T || !T.entries) return { total: 0, hits: [] };
    var kw = String(q || '').trim(), lim = limit || 60, hits = [];
    if (!kw) {
      T.entries.slice(0, lim).forEach(function (e) { hits.push({ e: e, match: [] }); });
      return { total: T.entries.length, hits: hits };
    }
    for (var i = 0; i < T.entries.length; i++) {
      var e = T.entries[i];
      var hay = [e.quote, e.h2, e.h3, e.book].join(' ');
      if (hay.indexOf(kw) >= 0) hits.push({ e: e, match: [kw] });
      if (hits.length >= lim) break;
    }
    return { total: T.entries.length, hits: hits };
  },

  /** 一条讲义的 HTML：原话 + 出处 + 原视频时间码链接 */
  hitHtml: function (h) {
    var e = h.e;
    var url = 'https://www.bilibili.com/video/' + e.bvid + '?p=' + e.part + '&t=' + ZW.hmsToSec(e.t_hms);
    return '<div class="rsec zw-rsec"><div class="wen" data-lb="' + esc(e.book) + '">' + esc(e.quote) + '</div>' +
      '<div class="tip" style="font-size:11.5px;color:var(--ink3);margin-top:4px">' +
      esc(e.h2) + ' › ' + esc(e.h3) + '　·　' + esc(e.t_hms) +
      '　<a href="' + esc(url) + '" target="_blank" rel="noopener" style="color:var(--qing)">看原视频这一秒 ↗</a></div></div>';
  },

  /** 「天纪讲义」资料库页 */
  libraryHtml: function () {
    var T = window.ZW_TIANJI || {};
    var books = [];
    (T.entries || []).forEach(function (e) { if (books.indexOf(e.book) < 0) books.push(e.book); });
    var chips = books.map(function (b) {
      return '<button class="chip" data-book="' + esc(b) + '" type="button">' + esc(b) + '</button>';
    }).join('');
    return '<div class="sec-h"><span class="bar"></span><h2>天纪讲义</h2><span class="hint">倪海厦《天纪·紫微斗数》· 全量检索</span></div>' +
      '<div class="tip" style="font-size:13px;line-height:1.9">这里收了 <b>' + esc((T.entries || []).length) +
      '</b> 条讲义原话与 <b>' + esc((T.episodes || []).length) +
      '</b> 集课程索引，全部按讲次标注时间码。输入星名、宫名或任意词就能查，点时间码回原视频核对。</div>' +
      '<div class="frow"><div class="fld" style="flex:1"><label>查讲义</label>' +
      '<input id="tjQ" type="text" placeholder="例：命宫、化忌、紫微在子、七杀"></div>' +
      '<div class="fld" style="flex:0 0 auto"><label>&nbsp;</label><button class="btn" id="tjGo">查</button></div></div>' +
      '<div class="tip" style="font-size:12px;color:var(--ink3)">按讲次筛：' + chips + '</div>' +
      '<div class="rsec zw-rsec"><h3><span class="dot"></span>体系口径</h3>' +
      '<div class="wen" data-lb="三合派">' + esc(T.school ? T.school.core + ' ' + T.school.method : '') + '</div>' +
      '<div class="bai">' + esc(T.school ? T.school.cases : '') + '</div></div>' +
      '<div id="tjCount" class="tip" style="font-size:12px;color:var(--ink3)"></div>' +
      '<div id="tjOut"></div>' +
      '<div class="rsec zw-rsec"><h3><span class="dot"></span>来源与许可</h3>' +
      '<div class="wen" data-lb="署名">' + esc(T.attribution || '') + '</div>' +
      '<div class="bai">' + esc(T.license || '') + '　来源：' + esc(T.source || '') +
      '　语料库：' + esc(T.corpus || '') + '。本站保留完整署名与每条原话的出处链接，供研习检索。</div></div>';
  },

  /** 资料库页的事件绑定，由 ui.js 在渲染后调用 */
  bindLibrary: function () {
    var T = window.ZW_TIANJI;
    if (!T || !T.entries) return;
    function show(q) {
      var r = ZW.search(q, 60), out = document.getElementById('tjOut'), cnt = document.getElementById('tjCount');
      if (!out) return;
      if (cnt) cnt.textContent = (q ? '查「' + q + '」：' : '共 ') + r.hits.length + ' 条' +
        (q ? '（全库 ' + r.total + ' 条，最多列 60 条）' : '（全库 ' + r.total + ' 条，输入关键词可查全部）');
      out.innerHTML = r.hits.length ? r.hits.map(ZW.hitHtml).join('')
        : '<div class="tip">没查到「' + esc(q) + '」，换个词试试。</div>';
    }
    var go = document.getElementById('tjGo'), q = document.getElementById('tjQ');
    if (go) go.onclick = function () { show(q ? q.value.trim() : ''); };
    if (q) q.onkeydown = function (ev) { if (ev.key === 'Enter') show(q.value.trim()); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-book]'), function (b) {
      b.onclick = function () { if (q) q.value = ''; show(b.getAttribute('data-book')); };
    });
    show('');
  },

  /** 「命盘数据」区：把引擎真实排出的数据逐项摆出来，可展开原始 JSON */
    dataHtml: function (d) {
      if (!d) return '';
      var m = d.meta;
      var basics = [
        ['引擎', d.engine.name + ' ' + d.engine.version + '（' + d.engine.license + '）'],
        ['公历', m.solarDate], ['农历', m.lunarDate], ['干支', m.chineseDate],
        ['时辰', m.time + '　' + m.timeRange], ['生肖／星座', m.zodiac + '　' + m.sign],
        ['五行局', m.fiveElementsClass], ['命主／身主', m.soulStar + '　' + m.bodyStar],
        ['命宫', m.soulPalace], ['身宫', m.bodyPalace]
      ].map(function (r) {
        return '<tr><td class="k">' + esc(r[0]) + '</td><td style="text-align:left">' + esc(r[1]) + '</td></tr>';
      }).join('');

      function stars(arr) {
        if (!arr || !arr.length) return '—';
        return arr.map(function (s) {
          var bits = [s.name];
          if (s.brightness) bits.push(s.brightness);
          if (s.mutagen && SIHUA[s.mutagen]) bits.push(SIHUA[s.mutagen]);
          if (s.fiveElements) bits.push(s.fiveElements + (s.yinYang ? '·' + s.yinYang : ''));
          return bits.join('·');
        }).join('、');
      }
      /* 辅星不单列一列：窄屏下五列会把表撑到 680px，只能靠横向滚动，看着像被截断。
         改成「主星」格里第二行小字列辅星，四列就装得下。 */
      var prows = d.palaces.map(function (p) {
        var minor = stars(p.minorStars);
        return '<tr><td class="k">' + esc(p.name) + (p.isBodyPalace ? '<sup>身</sup>' : '') + '</td>' +
          '<td class="gz">' + esc(p.stem + p.branch) + '</td>' +
          '<td style="text-align:left">' + esc(stars(p.majorStars)) +
          (minor ? '<div style="font-size:10.5px;color:var(--ink3)">辅：' + esc(minor) + '</div>' : '') +
          '</td>' +
          '<td style="font-size:12px">' + esc(p.decadal && p.decadal.range ? p.decadal.range.join('-') + '岁' : '') + '</td></tr>';
      }).join('');

      var san = d.sanFang.map(function (p) {
        return '<tr><td class="k">' + esc(p.palace) + '</td><td class="gz">' + esc(p.stemBranch) + '</td>' +
          '<td style="text-align:left">' + esc(p.majorStars.join('、') || '—') + '</td></tr>';
      }).join('');
      var hua = d.siHua.length ? d.siHua.map(function (x) {
        return '<tr><td class="k">' + esc(x.star + x.hua) + '</td><td>' + esc(x.palace) + '</td></tr>';
      }).join('') : '<tr><td colspan="2">盘上未取到生年四化</td></tr>';
      var horo = d.horoscope
        ? '<div class="tip" style="font-size:13px">' + esc(d.horoscope.date) +
          (d.horoscope.decadal ? '　大限：<b>' + esc(palName(d.horoscope.decadal.palace) + '（' + d.horoscope.decadal.stem + d.horoscope.decadal.branch + '）') + '</b>' : '') +
          (d.horoscope.yearly ? '　流年：<b>' + esc(palName(d.horoscope.yearly.palace) + '（' + d.horoscope.yearly.stem + d.horoscope.yearly.branch + '）') + '</b>' : '') +
          (d.horoscope.age != null ? '　虚岁 ' + esc(d.horoscope.age) : '') + '</div>'
        : '';

      var cl = d.classics || { hits: [] };
      var clHtml = cl.hits.length
        ? cl.hits.map(function (h) {
            return '<div class="wen" data-lb="' + esc(h.book) + '">' + esc(h.text) +
              '<div style="font-size:11px;color:var(--ink3);margin-top:5px">命中星名：' + esc(h.match.join('、')) +
              '　出处：' + esc(h.dynasty + '《' + h.book + '》') + '</div></div>';
          }).join('')
        : '<div class="tip">这张盘上的星名在已收古籍原文里没检索到对应段落，本站不硬凑。</div>';

      var tj = d.tianji;
      var tianjiHtml = '';
      if (tj) {
        var trow = [
          ['体系', tj.school.name], ['讲义', tj.school.recorded + '　' + tj.school.books.join('／')],
          ['总纲', tj.school.core], ['取法', tj.school.method], ['案例', tj.school.cases],
          ['检索词', tj.keywords.join('、')]
        ].map(function (r) {
          return '<tr><td class="k">' + esc(r[0]) + '</td><td style="text-align:left">' + esc(r[1]) + '</td></tr>';
        }).join('');
        var erows = tj.episodes.length ? tj.episodes.map(function (e) {
          return '<tr><td class="k">第 ' + e.dvd + ' 集</td><td style="text-align:left">' + esc(e.first + '／' + e.second) +
            '<div style="font-size:11px;color:var(--ink3)">对上：' + esc(e.match.join('、')) + '</div></td></tr>';
        }).join('') : '<tr><td colspan="2">这张盘没检索到对应集数</td></tr>';
        var qrows = tj.quotes.map(function (q) {
          return '<div class="wen" data-lb="' + (q.match.length ? '对上了' : '讲义') + '">' + esc(q.text) +
            '<div style="font-size:11px;color:var(--ink3);margin-top:5px">' +
            (q.match.length ? '这张盘里的 ' + esc(q.match.join('、')) + ' 对得上这句' : '本盘未直接出现，供参照') + '</div></div>';
        }).join('');
        var crows = (tj.corpusHits || []).length ? tj.corpusHits.map(function (h) {
          return '<div class="wen" data-lb="' + esc(h.book) + '">' + esc(h.quote) +
            '<div style="font-size:11px;color:var(--ink3);margin-top:5px">' + esc(h.h3) + '　' + esc(h.t) +
            '　<a href="' + esc(h.url) + '" target="_blank" rel="noopener" style="color:var(--qing)">看原视频这一秒 ↗</a>' +
            '　命中：' + esc(h.match.join('、')) + '</div></div>';
        }).join('') : '<div class="tip">这张盘上的星名在讲义原话里没检索到对应段落，本站不硬凑。</div>';
        tianjiHtml = '<div class="tip" style="font-size:12.5px">讲义语料共 <b>' + esc(tj.total) +
          '</b> 条原话，按这张盘上的星名检索到 <b>' + (tj.corpusHits || []).length + '</b> 条，下面按相关度列前几条。</div>' +
          '<table class="dt"><tr><th>项</th><th>内容</th></tr>' + trow + '</table>' +
          '<div class="sec-h" style="margin-top:14px"><span class="bar"></span><h3 style="font-size:14px">讲义集数索引命中</h3></div>' +
          '<table class="dt"><tr><th>集</th><th>讲的是什么</th></tr>' + erows + '</table>' +
          '<div class="sec-h" style="margin-top:14px"><span class="bar"></span><h3 style="font-size:14px">本盘命中的讲义原话</h3></div>' + crows +
          '<div class="sec-h" style="margin-top:14px"><span class="bar"></span><h3 style="font-size:14px">讲义短引</h3></div>' + qrows;
      }

      return '<div class="rsec zw-rsec"><h3><span class="dot"></span>命盘数据（引擎实排）</h3>' +
        '<div class="bai">下面每一项都由 iztro 排出或取自它的星曜元数据，本站不另加推断。数据是全的，白话解释交给易玄机。</div>' +
        '<table class="dt"><tr><th>项</th><th>值</th></tr>' + basics + '</table>' +
        '<div class="sec-h" style="margin-top:16px"><span class="bar"></span><h3 style="font-size:15px">十二宫逐宫数据</h3><span class="hint">星名后依次是亮度、四化、五行·阴阳</span></div>' +
        '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星／辅星</th><th>大限</th></tr>' + prows + '</table>' +
        '<div class="sec-h" style="margin-top:16px"><span class="bar"></span><h3 style="font-size:15px">三方四正</h3></div>' +
        '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星</th></tr>' + san + '</table>' +
        '<div class="sec-h" style="margin-top:16px"><span class="bar"></span><h3 style="font-size:15px">生年四化</h3></div>' +
        '<table class="dt"><tr><th>四化</th><th>落宫</th></tr>' + hua + '</table>' + horo +
        '<div class="sec-h" style="margin-top:16px"><span class="bar"></span><h3 style="font-size:15px">古籍原文检索</h3><span class="hint">公有领域 · 按盘上星名字面匹配</span></div>' +
        clHtml +
        '<div class="sec-h" style="margin-top:16px"><span class="bar"></span><h3 style="font-size:15px">《天纪》体系依据</h3><span class="hint">倪海厦 · 三合派 · 按盘检索</span></div>' +
        tianjiHtml +
        '<div class="tip" style="font-size:11.5px;color:var(--ink3);margin-top:8px">古籍原文来源：' + esc(cl.source || '') +
        '。《天纪》讲义索引与短引来源：' + esc((d.tianji && d.tianji.source) || '') +
        '。原课程内容为 CC BY-NC-SA 4.0（非商业性使用），著作权归倪海厦先生及权利继承人；本站只收讲义目录、体系口径的原创重述与少量紫微主题短引，并保留署名。</div>' +
        '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;color:var(--qing)">展开原始 JSON（可复制）</summary>' +
        '<pre id="zwJson" style="white-space:pre-wrap;word-break:break-all;font-size:11px;line-height:1.6;max-height:340px;overflow:auto;background:rgba(47,107,92,.05);padding:10px;border-radius:8px">' +
        esc(JSON.stringify(d, null, 2)) + '</pre></details>' +
        '</div>';
    },

    /** 交给易玄机的提示词：只给数据与原文，白话全由它生成；铁规矩是不许编数据 */
    explainPrompt: function (d) {
      var L = [];
      L.push('【任务】把下面这张紫微斗数命盘的**真实数据**讲成大白话。数据由 iztro 实排，古籍原文按星名检索所得，你只负责翻译，不负责新增内容。');
      L.push('');
      L.push('【规则直读的结论，你只能照这个讲，不许扩写】');
      L.push(ZW.summary(d));
      L.push('');
      L.push('【铁规矩，一条都不许破】');
      L.push('1. 只能解释下面已有的星名、宫位、干支、亮度、四化、五行、大限、流年和古籍原文。盘上没有的，一句都不许添。');
      L.push('2. 不许另推八字、日主、喜用、十神、属相冲合；不许编格局名、不许编吉凶分数、不许断「一定发财／一定有灾」。');
      L.push('3. 古籍原文只能译成白话，不许当成对这个人下的结论，也不许替古籍补充它没写的话。');
      L.push('4. 每个术语后面紧跟一句「就是……」，用街坊话把它说破。');
      L.push('5. 讲的时候按倪海厦《天纪》三合派口径：命宫为本、三方为用，重点看命宫与财帛、官禄、迁移三宫会照；不取飞星派的宫干自化、来因宫那套，也别替讲义补它没写的东西。');
      L.push('6. 讲义短引只译成白话，不许当成对这个人下的结论；短引里没提到的吉凶，一句都不许添。');
      L.push('7. 说人话，像老师傅面对面唠。第一句先把这张盘最显眼的地方点出来，再分几段讲：命宫是什么星、这颗星老书里怎么说、四化落在哪几宫、眼下这步大限走到哪、古籍与《天纪》讲义里哪句话跟这张盘对得上。');
      L.push('8. 结尾给一件今天就能做的小事，别拽文言、别排比、别「首先其次」。');
      L.push('9. 【实测过的错，一律不许再犯】不许编古籍里没有的句子（比如凭空说「太阴在申宫主富贵」）；不许把不同宫的星混着讲（比如贪狼在父母宫，却拿命宫的地空去配）；' +
        '不许把四化翻成具体事件（比如「跟孩子容易有财运」「感情方面得特别注意」「跟朋友容易有误会」）；不许说「要特别注意」「一定有灾」「必然发财」这类断言。');
      L.push('');
      L.push('【盘面数据（精简快照，供核对，不要照抄进答话）】');
      L.push(JSON.stringify(ZW.compact(d)));
      L.push('');
      L.push('【检索到的古籍原文】');
      (d.classics && d.classics.hits || []).forEach(function (h) {
        L.push('《' + h.book + '》：「' + h.text + '」（命中星名：' + h.match.join('、') + '）');
      });
      if (!(d.classics && d.classics.hits && d.classics.hits.length)) L.push('（这次没检索到对应段落，不要硬引。）');
      L.push('');
      L.push('【《天纪》体系口径与讲义短引】');
      if (d.tianji) {
        L.push('体系：' + d.tianji.school.name + '。' + d.tianji.school.core + ' ' + d.tianji.school.method);
        (d.tianji.episodes || []).forEach(function (e) {
          L.push('第 ' + e.dvd + ' 集《' + e.first + '／' + e.second + '》讲到：' + e.match.join('、'));
        });
        (d.tianji.quotes || []).forEach(function (q) {
          L.push('讲义短引：「' + q.text + '」' + (q.match.length ? '（本盘对上：' + q.match.join('、') + '）' : '（本盘未直接出现，只作参照）'));
        });
        L.push('以下原话按本盘星名从 ' + d.tianji.total + ' 条讲义里检索所得，每条带讲次与时间码：');
        (d.tianji.corpusHits || []).forEach(function (h) {
          L.push('「' + h.quote + '」（' + h.book + '／' + h.h3 + '，' + h.t + '，对上：' + h.match.join('、') + '）');
        });
      }
      return L.join('\n');
    },

    /** 「秒懂你这盘」用的紫微摘要，跟站内卡片同一套样式 */
    factsHtml: function (a) {
      var b = ZW.brief(a);
      var ps = a.palaces || [];
      var rows = ps.map(function (p) {
        var major = (p.majorStars || []).map(function (s) {
          return s.name + (s.brightness ? '（' + s.brightness + '）' : '') +
            (s.mutagen && SIHUA[s.mutagen] ? ' ' + SIHUA[s.mutagen] : '');
        }).join('、') || '—';
        return '<tr><td class="k">' + esc(p.name) + '</td><td>' + esc(p.heavenlyStem + p.earthlyBranch) +
          '</td><td>' + esc(major) + '</td><td>' + esc(PALACE_MEAN[p.name] || '—') + '</td></tr>';
      }).join('');
      return wrapTables('<div class="sec-h" style="margin-top:4px"><span class="bar"></span><h2>你的紫微盘</h2><span class="hint">本机排定 · 不靠模型</span></div>' +
        '<div class="tip" style="font-size:13.5px;line-height:1.9">' + esc(ZW.person(a).note) + '。</div>' +
        '<div class="bai"><b>说人话：</b>命宫那几颗星，老书拿来性子底子；十二宫是把一辈子的事分成十二摊，一宫管一摊。' +
        '表里「主星与四化」写的是每宫坐了什么星、「传统上管什么」写的是这一摊事。星名后面的庙旺得利平陷，说的是这颗星在这个位置使得上劲还是使不上劲。</div>' +
        '<div class="bai">这块只摆盘面，不替你下结论。想看一句一句的大白话（带古籍原文和《天纪》讲义出处），' +
        '<a class="btn ghost" href="#/ziwei" style="display:inline-block;padding:2px 10px;text-decoration:none">看紫微规则解读 →</a></div>' +
        '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星与四化</th><th>传统上管什么</th></tr>' + rows + '</table>' +
        '<div class="bai" style="margin-top:10px">这一块是引擎排出来的盘面，不是模型猜的。紫微斗数没有「喜用五行」这套说法，所以本站不拿它给吉凶加减分，只把盘面摆清楚。</div>');
    },

    /** 生成整页结果 HTML */
    html: function (a, o, todayStr, d) {
      var ps = a.palaces;
      var chartData = d || ZW.data(a, todayStr);
      var soulIdx = -1;
      for (var i = 0; i < 12; i++) {
        if (ps[i].earthlyBranch === a.earthlyBranchOfSoulPalace) { soulIdx = i; break; }
      }
      var soul = soulIdx >= 0 ? ps[soulIdx] : null;
      var majors = soul ? soul.majorStars : [];
      var mainNames = majors.map(function (s) { return s.name; }).filter(function (n) { return STAR_BRIEF[n]; });

      /* 一句话总览 */
      var lead = '命宫落在<b>' + esc(a.earthlyBranchOfSoulPalace) + '</b>宫（' +
        esc(soul ? soul.heavenlyStem + soul.earthlyBranch : '') + '），' +
        (a.fiveElementsClass ? '<b>' + esc(a.fiveElementsClass) + '</b>，' : '') +
        (mainNames.length
          ? '宫里坐的是' + '<b>' + mainNames.map(esc).join('、') + '</b>。'
          : '宫里没有十四主星，传统上要借对宫来看。');

      /* 星曜白话 */
      var starHtml = '';
      if (mainNames.length) {
        starHtml = '<div class="rsec zw-rsec"><h3><span class="dot"></span>命宫这几颗星，老书里怎么说</h3>' +
          '<div class="wen" data-lb="老书">' + mainNames.map(function (n) {
            return '<div class="zw-line"><b>' + esc(n) + '</b>：' + esc(STAR_BRIEF[n]) + '</div>';
          }).join('') + '</div>' +
          '<div class="bai">这些说的是传统书里对性情的归类，不是好坏评定。同一颗星落在不同的宫、配上不同的亮度，讲法也就不一样。</div></div>';
      }

      /* 生年四化落在哪几宫 */
      var hua = [];
      ps.forEach(function (p) {
        (p.majorStars || []).concat(p.minorStars || []).forEach(function (s) {
          if (s.mutagen && SIHUA[s.mutagen]) {
            hua.push({ star: s.name, hua: s.mutagen, palace: p.name });
          }
        });
      });
      var huaHtml = hua.length ? '<div class="rsec zw-rsec"><h3><span class="dot"></span>生年四化落宫</h3>' +
        '<div class="wen" data-lb="四化">' + hua.map(function (x) {
          var pn = /宫$/.test(x.palace) ? x.palace : x.palace + '宫';
          return '<b>' + esc(x.star) + esc(SIHUA[x.hua]) + '</b> 在' + esc(pn) + '——' + esc(SIHUA_MEAN[x.hua]) + '。';
        }).join('<br>') + '</div>' +
        '<div class="bai">四化由出生那年的天干带出来，传统上拿它看力往哪儿使、哪儿容易卡住。</div></div>' : '';

      /* 当前大限与流年 */
      var yunHtml = '';
      try {
        var hs = a.horoscope(todayStr);
        if (hs && hs.decadal) {
          var dNames = hs.decadal.palaceNames || [];
          var dPalace = dNames[0] ? dNames[0] : '';
          var yPalace = (hs.yearly && hs.yearly.palaceNames && hs.yearly.palaceNames[0]) || '';
          var dTxt = /宫$/.test(dPalace) ? dPalace : dPalace + '宫';
          var yTxt = /宫$/.test(yPalace) ? yPalace : yPalace + '宫';
          yunHtml = '<div class="rsec zw-rsec"><h3><span class="dot"></span>眼下走到哪一步</h3>' +
            '<div class="wen" data-lb="眼下">' + esc(todayStr) + '：大限在<b>' + esc(dTxt) + '</b>' +
            (hs.decadal.heavenlyStem ? '（' + esc(hs.decadal.heavenlyStem + hs.decadal.earthlyBranch) + '）' : '') +
            (yPalace ? '，流年落在<b>' + esc(yTxt) + '</b>。' : '。') +
            '</div><div class="bai">大限管十年一段的大方向，流年管这一年的落脚处。盘面上都能点开细看，别拿它替自己做决定。</div></div>';
        }
      } catch (e) { yunHtml = ''; }

      /* 十二宫逐宫白话 */
      var listHtml = '<div class="rsec zw-rsec"><h3><span class="dot"></span>十二宫各管哪一头</h3>' +
        '<table class="dt"><tr><th>宫</th><th>主星</th><th>传统上管什么</th></tr>' +
        ps.map(function (p) {
          var ms = (p.majorStars || []).map(function (s) { return s.name; }).join('、') || '—';
          return '<tr><td class="k">' + esc(p.name) + '</td><td>' + esc(ms) + '</td><td>' + esc(PALACE_MEAN[p.name] || '—') + '</td></tr>';
        }).join('') + '</table></div>';

      /* 十二宫格 */
      var cells = POS.map(function (q) {
        var p = ps[q[0]];
        if (!p) return '';
        var isSoul = p.earthlyBranch === a.earthlyBranchOfSoulPalace;
        var isBody = !!p.isBodyPalace;
        var stars = (p.majorStars || []).map(function (s) {
          var m = s.mutagen && SIHUA[s.mutagen] ? '<sup>' + esc(SIHUA[s.mutagen]) + '</sup>' : '';
          return '<span class="zs">' + esc(s.name) + (s.brightness ? '<i>' + esc(s.brightness) + '</i>' : '') + m + '</span>';
        }).join('');
        var minorAll = (p.minorStars || []).map(function (s) { return s.name; })
          .concat((p.adjectiveStars || []).map(function (s) { return s.name; }));
        var minor = minorAll.slice(0, 3).join(' ') + (minorAll.length > 3 ? ' +' + (minorAll.length - 3) : '');
        var dec = p.decadal && p.decadal.range ? p.decadal.range.join('-') + '岁' : '';
        return '<div class="zc' + (isSoul ? ' soul' : '') + '" style="grid-column:' + q[1] + ';grid-row:' + q[2] + '">' +
          '<div class="zh"><b>' + esc(p.name) + '</b>' + (isBody ? '<em>身</em>' : '') + '<span>' + esc(p.heavenlyStem + p.earthlyBranch) + '</span></div>' +
          '<div class="zb">' + (stars || '<span class="zs none">空宫</span>') + '</div>' +
          '<div class="zf">' + esc(minor.trim()) + '</div>' +
          '<div class="zd">' + esc(dec) + '</div></div>';
      }).join('');
      var mid = '<div class="zm" style="grid-column:2/4;grid-row:2/4">' +
        '<div class="zmt">紫微斗数 · 本命盘</div>' +
        '<div class="zmi">' + esc(o.y + '.' + o.m + '.' + o.d + ' ' + pad(+o.h) + ':' + pad(o.mi == null ? 0 : +o.mi)) + '　' + esc(o.gender === 'female' ? '坤造' : '乾造') + '</div>' +
        '<div class="zmi">农历 ' + esc(a.lunarDate) + '</div>' +
        '<div class="zmi">命主 <b>' + esc(a.soul) + '</b>　身主 <b>' + esc(a.body) + '</b></div>' +
        '<div class="zmtip">' + esc(a.time || '') + '　' + esc(a.sign || '') + '　' + esc(a.zodiac || '') + '年生</div>' +
        '</div>';

      return '<div class="card" style="margin-top:16px">' +
        '<div class="sec-h"><span class="bar"></span><h2>本命盘</h2><span class="hint">十二宫 · 十四主星 · 四化 · 大限</span></div>' +
        '<div class="tip" style="font-size:13.5px;line-height:1.9">' + lead + '</div>' +
        '<div class="zw-grid">' + cells + mid + '</div>' +
        '<div class="tip" style="font-size:12.5px;color:var(--ink3);margin-top:10px">格子里的小字是亮度（庙旺得利平陷），右上角是生年四化；带<b>身</b>字的是身宫，命宫用深色边标出。空格子叫「空宫」，传统上借对宫星看。' +
        '　<a href="javascript:void 0" onclick="var e=document.getElementById(\'zwPlain\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});" style="color:var(--qing)">懒得看盘？直接跳到「先说人话」↓</a></div>' +
        wrapTables(starHtml + huaHtml + yunHtml + listHtml +
          ZW.reading(chartData) +
          ZW.dataHtml(chartData)) +
        '<div class="tools"><button class="btn ghost" id="zwExplain">让易玄机再讲一遍（仅供参考）</button>' +
        '<button class="btn ghost" id="zwCopyData">复制命盘数据</button></div>' +
        '<div class="tip" style="font-size:12px;color:var(--ink3)">上面「紫微解读（规则直读）」不靠模型，每句标得出出处，断网也有。' +
        '易玄机这一遍只是把同一份内容讲得顺口些，模型可能说错，一切以规则解读和数据为准。</div>' +
        '<div class="qa-out" id="zwAi"></div>' +
        '<div class="rsec zw-rsec"><h3><span class="dot"></span>这一页的来路</h3>' +
        '<div class="wen" data-lb="来路">排盘用的是开源库 <b>iztro 2.6.5</b>（SylarLong/iztro，MIT 许可），文件就装在本站里，不连外网也能排。易玄机自己加的是白话解释和页面排版。</div>' +
        '<div class="bai">内容属中华传统术数文化的整理与研习，不具科学预测效力，不构成投资、医疗、法律、婚恋等任何现实决策依据。当个了解传统文化的入口就好。</div></div>' +
        '</div>';
    }
  };

  window.ZW = ZW;
  var YXJ = window.YXJ = window.YXJ || {};
  YXJ.ZW = ZW;   // 全站统一从 YXJ 命名空间取，跟 ME / VD / NEED 一致

  /* 十二宫格样式：跟站内宣纸底色走，手机上也不挤 */
  var css = '' +
    /* 沿用站内 .wen/.bai 的框，只把「原文」小标签换成按内容走 */
    '.zw-rsec .wen::before{content:attr(data-lb)}' +
    '.zwtag{display:inline-block;font-size:10px;line-height:1.6;padding:0 5px;border-radius:3px;margin-right:5px;vertical-align:1px;border:1px solid var(--line2);color:var(--ink3);background:rgba(255,253,247,.9);white-space:nowrap}' +
    '.zwtag.data{color:var(--qing);border-color:var(--line2)}' +
    '.zwtag.classic{color:var(--jin);border-color:var(--jin2)}' +
    '.zwtag.tianji{color:var(--zhu);border-color:var(--zhu2)}' +
    '.zwtag.plain{color:var(--ink2)}' +
    /* 宫名、干支是短词，别让列宽把「官禄」「己卯」拆成两行；
       列多的时候（十二宫逐宫五列）整张表在滚动框里横向走，不把页面撑宽 */
    '.dtwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;margin-top:10px}' +
    '.dtwrap>.dt{margin-top:0;min-width:100%}' +
    '.zw-rsec .dt,#zwOut .dt{font-size:12.5px}' +
    '.zw-rsec .dt th,.zw-rsec .dt td{padding:6px 7px}' +
    '.zw-rsec .dt td.k,.zw-rsec .dt td.gz{white-space:nowrap}' +
    '.zw-line+.zw-line{margin-top:6px}' +
    '.zw-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(4,auto);gap:4px;margin:14px 0;width:100%;box-sizing:border-box}' +
    '.zc,.zm{border:1px solid var(--line2);border-radius:9px;background:rgba(255,253,247,.72);padding:4px 4px;min-width:0;min-height:104px;overflow:hidden;box-sizing:border-box;word-break:break-word}' +
    '.zc.soul{border:2px solid var(--qing);background:rgba(47,107,92,.08)}' +
    '.zh{display:flex;align-items:center;gap:2px;font-size:9px;color:var(--ink3);flex-wrap:wrap;border-bottom:1px dotted var(--line2);padding-bottom:2px;line-height:1.3}' +
    '.zh b{font-size:10.5px;color:var(--qing)}.zh em{font-style:normal;background:var(--zhu);color:#fff;border-radius:2px;font-size:8px;padding:0 2px}' +
    '.zh span{margin-left:auto;font-size:9px;white-space:nowrap}' +
    '.zb{margin-top:3px;display:block;min-height:18px;line-height:1.5}' +
    '.zs{display:block;font-size:11.5px;color:var(--ink);font-weight:600;white-space:nowrap}' +
    '.zs i{font-style:normal;font-size:8.5px;color:var(--jin);font-weight:400;margin-left:2px}' +
    '.zs sup{font-size:8px;color:var(--zhu);margin-left:2px}' +
    '.zs.none{color:var(--ink3);font-weight:400;font-size:10px}' +
    '.zf{font-size:8.5px;color:var(--ink3);line-height:1.35;margin-top:2px;min-height:11px}' +
    '.zd{font-size:8.5px;color:var(--jin);margin-top:2px}' +
    '.zm{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:rgba(47,107,92,.06);border-style:dashed;padding:6px 4px}' +
    '.zmt{font-size:12px;color:var(--qing);font-weight:600;margin-bottom:6px;letter-spacing:.5px}' +
    '.zmi{font-size:9.5px;color:var(--ink2);line-height:1.75}.zmi b{color:var(--zhu)}' +
    '.zmtip{font-size:8.5px;color:var(--ink3);margin-top:6px;line-height:1.5}' +
    '@media(max-width:480px){.zw-grid{gap:3px}.zc,.zm{padding:3px 2px;min-height:96px}.zs{font-size:10.5px}.zf{font-size:8px}.zd{font-size:8px}.zmt{font-size:11px}.zmi{font-size:9px}}';
  var st = document.createElement('style');
  st.id = 'zw-style';
  if (!document.getElementById('zw-style')) {
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }
})();
