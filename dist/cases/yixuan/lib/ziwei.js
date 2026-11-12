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
    '禄': '传统说主顺、主得，这事容易顺手',
    '权': '传统说主掌、主强，这一头你说了算的分量重',
    '科': '传统说主名、主助，容易有人搭把手',
    '忌': '传统说主执、主碍，这一头容易较劲、放不下'
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
          age: hs.age || null,
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
      var prows = d.palaces.map(function (p) {
        return '<tr><td class="k">' + esc(p.name) + (p.isBodyPalace ? '<sup>身</sup>' : '') + '</td>' +
          '<td>' + esc(p.stem + p.branch) + '</td>' +
          '<td style="text-align:left">' + esc(stars(p.majorStars)) + '</td>' +
          '<td style="text-align:left;font-size:12px">' + esc(stars(p.minorStars)) + '</td>' +
          '<td style="font-size:12px">' + esc(p.decadal && p.decadal.range ? p.decadal.range.join('-') + '岁' : '') + '</td></tr>';
      }).join('');

      var san = d.sanFang.map(function (p) {
        return '<tr><td class="k">' + esc(p.palace) + '</td><td>' + esc(p.stemBranch) + '</td>' +
          '<td style="text-align:left">' + esc(p.majorStars.join('、') || '—') + '</td></tr>';
      }).join('');
      var hua = d.siHua.length ? d.siHua.map(function (x) {
        return '<tr><td class="k">' + esc(x.star + x.hua) + '</td><td>' + esc(x.palace) + '</td></tr>';
      }).join('') : '<tr><td colspan="2">盘上未取到生年四化</td></tr>';
      var horo = d.horoscope
        ? '<div class="tip" style="font-size:13px">' + esc(d.horoscope.date) +
          (d.horoscope.decadal ? '　大限：<b>' + esc(d.horoscope.decadal.palace + '（' + d.horoscope.decadal.stem + d.horoscope.decadal.branch + '）') + '</b>' : '') +
          (d.horoscope.yearly ? '　流年：<b>' + esc(d.horoscope.yearly.palace + '（' + d.horoscope.yearly.stem + d.horoscope.yearly.branch + '）') + '</b>' : '') +
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
        '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星</th><th>辅星</th><th>大限</th></tr>' + prows + '</table>' +
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
      L.push('【铁规矩，一条都不许破】');
      L.push('1. 只能解释下面已有的星名、宫位、干支、亮度、四化、五行、大限、流年和古籍原文。盘上没有的，一句都不许添。');
      L.push('2. 不许另推八字、日主、喜用、十神、属相冲合；不许编格局名、不许编吉凶分数、不许断「一定发财／一定有灾」。');
      L.push('3. 古籍原文只能译成白话，不许当成对这个人下的结论，也不许替古籍补充它没写的话。');
      L.push('4. 每个术语后面紧跟一句「就是……」，用街坊话把它说破。');
      L.push('5. 讲的时候按倪海厦《天纪》三合派口径：命宫为本、三方为用，重点看命宫与财帛、官禄、迁移三宫会照；不取飞星派的宫干自化、来因宫那套，也别替讲义补它没写的东西。');
      L.push('6. 讲义短引只译成白话，不许当成对这个人下的结论；短引里没提到的吉凶，一句都不许添。');
      L.push('7. 说人话，像老师傅面对面唠。第一句先把这张盘最显眼的地方点出来，再分几段讲：命宫是什么星、这颗星老书里怎么说、四化落在哪几宫、眼下这步大限走到哪、古籍与《天纪》讲义里哪句话跟这张盘对得上。');
      L.push('8. 结尾给一件今天就能做的小事，别拽文言、别排比、别「首先其次」。');
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
      return '<div class="sec-h" style="margin-top:4px"><span class="bar"></span><h2>你的紫微盘</h2><span class="hint">本机排定 · 不靠模型</span></div>' +
        '<div class="tip" style="font-size:13.5px;line-height:1.9">' + esc(ZW.person(a).note) + '。</div>' +
        '<table class="dt"><tr><th>宫</th><th>干支</th><th>主星与四化</th><th>传统上管什么</th></tr>' + rows + '</table>' +
        '<div class="bai" style="margin-top:10px">这一块是引擎排出来的盘面，不是模型猜的。紫微斗数没有「喜用五行」这套说法，所以本站不拿它给吉凶加减分，只把盘面摆清楚。</div>';
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
        '<div class="tip" style="font-size:12.5px;color:var(--ink3);margin-top:10px">格子里的小字是亮度（庙旺得利平陷），右上角是生年四化；带<b>身</b>字的是身宫，命宫用深色边标出。空格子叫「空宫」，传统上借对宫星看。</div>' +
        starHtml + huaHtml + yunHtml + listHtml +
        ZW.dataHtml(chartData) +
        '<div class="tools"><button class="btn ghost" id="zwExplain">让易玄机讲给我听</button>' +
        '<button class="btn ghost" id="zwCopyData">复制命盘数据</button></div>' +
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
