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

    /** 全站统一的「这个人的紫微盘」读数：只陈述盘面事实，不含吉凶推断 */
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
    html: function (a, o, todayStr) {
      var ps = a.palaces;
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
