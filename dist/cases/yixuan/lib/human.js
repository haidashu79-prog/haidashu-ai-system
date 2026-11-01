/* =============================================================
   易玄机 · 人性判断
   卦断的是事，人问的是心。
   同样一句「今年还能不能赚到钱」，有人是缺安全感，有人是想让人替自己
   拍板，有人是心里已经有答案只差个台阶。断卦断不出这一层，问事的人就
   会觉得「你说的对，可你没说到我」。

   这个模块只做一件事：从原话里读出他嘴上问的和心里搁着的，
   给智脑一个准头，再给一张「话外音」卡摆在他眼前。
   纯函数，不碰 DOM，不连网。
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ = window.YXJ || {};

  /* ---------- 问的是哪一头、哪一段时间，就换成那一头、那一段的话 ----------
     实测踩过这个坑：「明天有没有钱赚」被答成「这一年的进项」。
     所以这里先认出他问的是哪一段时间，再按「时间词 + 那一头」把名词组出来。 */
  var NOUN = {
    wealth: { thing: '这趟进项' },
    career: { thing: '这一步' },
    love: { thing: '这段关系' },
    health: { thing: '这副身子' },
    home: { thing: '这个家' },
    general: { thing: '这件事' }
  };
  function timeOf(q) {
    var s = String(q || ''), m;
    if ((m = s.match(/明天|明日|后天|今天|今日|今晚|当晚|当天|这一天/))) {
      return { h: 'day', w: /后天/.test(m[0]) ? '后天' : (/明日|明天/.test(m[0]) ? '明天' : (/晚/.test(m[0]) ? '今晚' : '今天')) };
    }
    if ((m = s.match(/明年|后年|今年|本年|年内|这一年|这年|未来一年|一年/))) {
      return { h: 'year', w: /明年/.test(m[0]) ? '明年' : (/后年/.test(m[0]) ? '后年' : '今年') };
    }
    if ((m = s.match(/下个月|下月|这个月|本月|这月|近一个月|一个月|月底/))) {
      return { h: 'month', w: /下个月|下月/.test(m[0]) ? '下个月' : '这个月' };
    }
    if (/什么时候|何时|几时|多久|还要多久/.test(s)) return { h: 'when', w: '这一阵' };
    if (/这几天|最近|眼下|现在|如今|这段|这一阵|这阵子/.test(s)) return { h: 'now', w: '眼下' };
    return { h: 'now', w: '眼下' };
  }
  function nounOf(t, hz) {
    if (t === 'wealth') {
      var w = (hz && hz.w) || '眼下', k = hz && hz.h;
      if (k === 'day') return { thing: w + '这一票' };
      if (k === 'month') return { thing: w + '的进项' };
      if (k === 'year') return { thing: '这一年的进项' };
      if (k === 'when') return { thing: '这笔进项的时机' };
      return { thing: '眼下这趟进项' };
    }
    return NOUN[t] || NOUN.general;
  }
  function fill(s, n) {
    return String(s).replace(/〔事〕/g, n.thing);
  }

  /* ---------- 八类人性障碍 ----------
     问事的人卡住，卡的多半不是事，是这八样里的一两样。
     每条给四样东西：他要什么、他怕什么、一句转念的话、一件今天能做的事。 */
  var DRIVES = [
    {
      k: '求个准话',
      hint: '怕自己看走眼，想借个外头的说法给自己撑一下',
      kw: ['能不能', '还能不能', '会不会', '是不是', '有没有', '行不行', '可不可以',
        '到底', '究竟', '是否', '准不准', '真的吗', '有用吗'],
      want: '一句准话：〔事〕到底成不成。',
      fear: '不是不成，是你怕自己没看准，事后回头怪自己。',
      turn: '准话只能给到七分，剩下那三分，得你自己点头才算数。',
      act: '今天就写两行字：成了你怎么走，不成你怎么退。写完，这事就有一半在你手上了。'
    },
    {
      k: '想让人替你拍板',
      hint: '怕担责任，希望有个外人替自己说一句「就这么办」',
      kw: ['该不该', '要不要', '值不值', '选哪个', '怎么选', '怎么办', '怎么做',
        '合适吗', '好吗', '有必要吗', '继续吗'],
      want: '有人给你一句「就这么办」，好把〔事〕的主意交出去。',
      fear: '万一〔事〕走岔了，得你一个人认。',
      turn: '主意我替不了你拿，但我能帮你把两条路各通向哪儿摆清楚。',
      act: '今天把两个选项各写三条：得到什么、舍掉什么、最坏是什么。写完你会发现有一个自己塌了。'
    },
    {
      k: '急着要个时候',
      hint: '熬不住了，想立刻看见分晓',
      kw: ['什么时候', '多久', '几时', '还要等', '这个月', '下个月', '什么时候能', '几月份', '快了吗'],
      want: '知道〔事〕还有多久，好决定还熬不熬。',
      fear: '一直这么悬着，你怕悬得没边。',
      turn: '时候这东西问不出来，能问出来的是「到那时候我怎么过」。',
      act: '今天给自己定一个日子，到那天不管成没成，都停下来重新看一次。日子定下来，悬着的心就落地一半。'
    },
    {
      k: '其实是舍不得',
      hint: '心里早有答案了，只差一个人说「可以了」',
      kw: ['还值得', '还有必要', '要不要继续', '该不该放手', '要不要等', '还来得及吗',
        '还有希望吗', '放不下', '舍不得'],
      want: '一个允许：〔事〕还值不值得，其实是在问允不允许自己算了。',
      fear: '不是白费，是要你承认当初看错了人、走错了路。',
      turn: '花出去的那部分收不回来了。〔事〕接下来的账，得你自己单独算。',
      act: '今天只问自己一句：如果是今天才认识这个人、才碰上这件事，我还接不接？答案就是你的答案。',
      boost: { love: 3, career: 1 }
    },
    {
      k: '心里发虚',
      hint: '已经做过了、吃过亏了，想确认还有没有救',
      kw: ['是不是错了', '做错了', '怪我', '后悔', '还有救', '能补', '还不晚',
        '都怪我', '当初要是', '如果当初'],
      want: '一句「不怪你」，或者「〔事〕还来得及」。',
      fear: '怕已经烂在手里，你再怎么弄都白弄。',
      turn: '已经过去的改不了，往后怎么走还能改。这不叫认命，叫把力气挪到有用的地方。',
      act: '今天把「已经收不回的」和「还能动的」分成两栏写下来，只看第二栏。'
    },
    {
      k: '眼睛盯着别人',
      hint: '拿别人的进度量自己，越量越慌',
      kw: ['别人', '人家', '同龄', '朋友都', '人家都', '比不上', '赶不上', '落后', '比得上', '他们都'],
      want: '知道在〔事〕上自己有没有掉队。',
      fear: '人家都在往前走，你怕只有自己停在原地。',
      turn: '别人的日子你只看得见一两面，剩下的你得自己猜，猜出来的全是自己吓自己。',
      act: '今天取关一个让你心里发紧的号，或者把一个总让你犯嘀咕的人静音。就这一个动作。'
    },
    {
      k: '没人可说',
      hint: '不是要答案，是想有个人听听',
      kw: ['没人', '不知道跟谁说', '一个人', '家里人不', '朋友都', '没人懂', '说不出口',
        '憋着', '自己扛'],
      want: '有人听你把〔事〕说完，不急着判对错。',
      fear: '一说出去，你怕反倒被人说想太多。',
      turn: '没人可商量的日子，最难的不是没主意，是没人接着你这句话。',
      act: '今天把这件事原原本本说给一个人听，不求他给主意。说不出口就写在纸上，写给自己看也算。'
    },
    {
      k: '两头都想要',
      hint: '既想稳又想赚，既想走又想留',
      kw: ['又想', '还要', '同时', '两个都', '全都要', '兼顾', '一边', '既想', '都想要'],
      want: '在〔事〕上两头都不损失。',
      fear: '选了这头，你怕再也回不去那头。',
      turn: '两条路都占，往往等于两条都没走。先挑一条,把力气压上去。',
      act: '今天挑一条先走一个月。另外那条写下来收好，不是丢了，是排队。'
    }
  ];

  /* ---------- 兜底：一句都没认出来时 ---------- */
  var FALLBACK = {
    k: '想把这件事看明白',
    hint: '问得干净，就是想有个头绪',
    want: '把〔事〕看明白，好知道劲儿往哪儿使。',
    fear: '不是怕结果，是你现在手里没个头绪。',
    turn: '把事拆成三块看：眼下是什么、卡在哪、下一步动哪。拆开就没那么吓人了。',
    act: '今天用三行字把这件事写清楚：现状、卡点、下一步。写完再摇一卦，比空着想准得多。'
  };

  /* ---------- 语气里的急与累 ---------- */
  var TENSE_KW = ['唉', '烦', '累', '难受', '焦虑', '睡不着', '撑不住', '慌', '急',
    '压力', '扛不住', '煎熬', '怕', '愁', '心慌'];
  var LEVEL_LABEL = ['', '还算稳', '心里有点紧', '这阵子绷得紧'];

  /* ---------- 工具 ---------- */
  function hanstr(s) {
    s = String(s == null ? '' : s);
    var out = '', i;
    for (i = 0; i < s.length; i++) { if (/[\u4e00-\u9fa5]/.test(s.charAt(i))) out += s.charAt(i); }
    return out;
  }

  /* ---------- 反复问同一件事：本机记一把 ---------- */
  var HKEY = 'yxj_askhist_v1';
  function hist() {
    try { return JSON.parse(localStorage.getItem(HKEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function times(q) {
    var k = hanstr(q).slice(0, 24);
    if (!k) return 0;
    return +((hist()[k]) || 0);
  }
  function note(q) {
    var k = hanstr(q).slice(0, 24);
    if (!k) return 0;
    var h = hist();
    h[k] = (+h[k] || 0) + 1;
    // 只留最近一百条，别把本机存储撑爆
    var ks = Object.keys(h);
    if (ks.length > 100) { for (var i = 0; i < ks.length - 100; i++) delete h[ks[i]]; }
    try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch (e) { }
    return h[k];
  }
  function forget() { try { localStorage.removeItem(HKEY); } catch (e) { } }

  /* ---------- 读数 ---------- */
  // me：命主读数（ME.read() 的结果，含 dayGan / dayWx / ys.strength）。
  // 同一个人在同一件事上卡住，卡的法子不一样：
  //   身强气足的人，容易「两头都想要」「想让人替自己拍板」；
  //   身弱气不够的人，容易「心里发虚」「想求一句准话壮胆」。
  // 把这一层加进权重，人性判断就不再是孤立猜话，而是跟他的八字合着看。
  function scoreDrives(q, topic, forced, me) {
    var s = String(q || '');
    var meStrong = !!(me && me.ys && me.ys.strength && me.ys.strength.strong);
    var meWeak = !!(me && me.ys && me.ys.strength && !me.ys.strength.strong);
    var res = [];
    for (var i = 0; i < DRIVES.length; i++) {
      var d = DRIVES[i], sc = 0, j, hits = [];
      for (j = 0; j < d.kw.length; j++) {
        if (s.indexOf(d.kw[j]) >= 0) { sc += 3 + Math.min(d.kw[j].length, 4) * 0.5; hits.push(d.kw[j]); }
      }
      if (d.boost && topic && d.boost[topic]) sc += d.boost[topic];
      if (forced && forced === d.k) sc += 10;                       // 答题卡里他亲口选的那一头，最重
      if (meStrong && (d.k === '两头都想要' || d.k === '想让人替你拍板')) sc += 2;   // 身强：偏要占两头、要人替拍板
      if (meWeak && (d.k === '心里发虚' || d.k === '求个准话')) sc += 2;             // 身弱：易虚、要准话壮胆
      if (sc > 0) res.push({ d: d, s: sc, hits: hits });
    }
    res.sort(function (a, b) { return b.s - a.s; });
    return res;
  }

  /* ---------- 八字 → 人性：把命和心合着说 ---------- */
  function meHumanNote(me, topic, mainK) {
    if (!me || !me.ys) return '';
    var strong = !!(me.ys.strength && me.ys.strength.strong);
    var base = '你日主' + me.dayGan + '（' + me.dayWx + '），' + (strong ? '身偏强、气是足的' : '身偏弱、气还不够足') + '。';
    var link = strong
      ? '问起' + ((Y.MEM && Y.MEM.topicCN) ? Y.MEM.topicCN(topic) : '这件事') + '这路，你最容易卡在「' + mainK + '」：两头都想占、或者想找个人替你拍板。其实你兜得住，先挑一头压上去，比来回掂量强。'
      : '问起' + ((Y.MEM && Y.MEM.topicCN) ? Y.MEM.topicCN(topic) : '这件事') + '这路，你最容易卡在「' + mainK + '」：心里发虚、想求一句准话给自己壮胆。别慌，你比你想的要稳，先动一小步就踏实了。';
    return base + link;
  }

  function read(opt) {
    opt = opt || {};
    var q = String(opt.q || '').trim();
    var topic = opt.topic || 'general';
    var hz = timeOf(q);
    if (opt.timeWord) hz = { h: opt.horizon || hz.h, w: opt.timeWord };
    var n = nounOf(topic, hz);
    var me = opt.me || null;
    var hits = scoreDrives(q, topic, opt.pick, me);
    var picked = hits.slice(0, 3).map(function (x) { return x.d; });
    if (!picked.length) picked = [FALLBACK];

    var main = picked[0];
    var tense = 0, i;
    for (i = 0; i < TENSE_KW.length; i++) if (q.indexOf(TENSE_KW[i]) >= 0) tense++;
    var rep = opt.times == null ? times(q) : +opt.times;
    var lv = 1;
    if (tense > 0) lv += 1;
    if (rep >= 2) lv += 1;
    if (picked.length >= 3 && tense > 1) lv += 1;
    if (lv > 3) lv = 3;

    var mask = q
      ? '你嘴上问的是「' + q + '」。'
      : '你没写具体问什么。可一个人肯坐下来问这一卦，心里多半搁着事。';

    var out = {
      q: q,
      topic: topic,
      topicName: (Y.MEM && Y.MEM.topicCN) ? Y.MEM.topicCN(topic) : topic,
      horizon: hz.h,
      timeWord: hz.w,
      drives: picked.map(function (d) { return { k: d.k, hint: d.hint }; }),
      main: main.k,
      level: lv,
      levelName: LEVEL_LABEL[lv],
      tense: tense,
      times: rep,
      mask: mask,
      want: fill(main.want, n),
      fear: fill(main.fear, n),
      truth: fill(main.turn, n),
      act: fill(main.act, n),
      others: picked.slice(1).map(function (d) { return d.k; })
    };
    out.plain = plainOf(out);
    out.meHumanNote = me ? meHumanNote(me, topic, main.k) : '';   // 八字 + 问事 的人性提示段
    return out;
  }

  function plainOf(h) {
    var L = [];
    L.push('来问的人嘴上问的是：' + (h.q || '（没写明）'));
    L.push('这一问背后多半是：' + h.main + '。');
    L.push('他想要的是：' + h.want);
    L.push('他真正怕的是：' + h.fear);
    L.push('他心里的紧：' + h.levelName + (h.times >= 2 ? '（同一件事已经问过 ' + h.times + ' 回了）' : ''));
    if (h.others.length) L.push('还夹着：' + h.others.join('、') + '。');
    return L.join('\n');
  }

  /* ---------- 给智脑的那一段 ---------- */
  function promptBlock(h) {
    if (!h) return '';
    var L = [];
    L.push('【这一问背后的人性，讲的时候要照顾到】');
    L.push('表面上：' + h.want);
    L.push('底下真正压着他的：' + h.fear);
    if (h.others.length) L.push('另外还夹着这几样：' + h.others.join('、') + '。');
    L.push('他现在的紧法：' + h.levelName + (h.times >= 2 ? '，而且同一件事已经问过好几回了——这回是憋不住了又来的，答话要先认下这一点，别装作头回听。' : '。'));
    if (h.meHumanNote) L.push('对着他的八字看（这是因人而异的一层）：' + h.meHumanNote);
    L.push('讲的时候这么走：');
    L.push('一、开口第一句，先递一句体己话。他绷得紧，你递的那句就要稳、要暖，让他肩膀松下来；他不算紧，你递的那句就要有热乎气，像街坊串门时随口一句。递完再落事，不许不递人就开讲。');
    L.push('二、递完体己话，头一句就把准话给他。他问的能不能、该不该、什么时候，你直接答。答完再往他那件事上掰开讲，讲到具体的、他能用上的。不许绕、不许铺垫太长。');
    L.push('三、讲的时候往他心里那个结上轻轻点一句，只点一层，说透了就伤人。他问得苦，你的话就要软；他问得急，你的话就要稳；他问得虚，你的话就要托底。');
    L.push('四、收尾给一件他今天就能做的小事，不要让他去求人、去花钱、去等一个外人。事说完，再回头嘱咐一句，像长辈送出门时那半句：去吧，有事再来。');
    L.push('话术红线，一条都不能破：不许说「依赖型人格」「原生家庭」「内耗」「emo」「精神状态」这类词；不许贴标签；不许说他贪心、想太多、不争气；不许说「作为一个 AI」「作为一位老先生」这种自我指称；不许「首先」「其次」「最后」「综上」；不许「希望对你有帮助」。');
    L.push('你可以说：他舍不得、他心里有数、他其实早有主意——这是把人往明白处推，不是往下按。');
    L.push('整套话像在茶馆里跟一个晚辈说话，不是在产出一篇回答。你的每句话都得是「只跟他说」的，放别人身上就不成立的那种。');
    return L.join('\n');
  }

  /* ---------- 给结论卡内嵌的紧凑话外音 ---------- */
  function inline(h) {
    if (!h) return null;
    return {
      main: h.main,
      level: h.level,
      levelName: h.levelName,
      truth: h.truth,
      meHumanNote: h.meHumanNote || ''
    };
  }

  Y.HM = {
    read: read,
    promptBlock: promptBlock,
    inline: inline,
    meHumanNote: meHumanNote,
    timeOf: timeOf,
    DRIVES: DRIVES,
    TENSE_KW: TENSE_KW,
    LEVEL_LABEL: LEVEL_LABEL,
    note: note,
    times: times,
    forget: forget,
    NOUN: NOUN
  };
})();
