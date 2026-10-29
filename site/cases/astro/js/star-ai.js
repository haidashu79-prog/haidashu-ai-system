/* star-ai.js —— 星语的「AI 问答」与「星座配对」
 * 接站内 /api/expert（Workers AI，免密钥），用占星的专业口径答题，
 * 不再只说"星座性格"这种泛泛的话，能答行星、相位、宫位、合盘、行运。
 */
(function () {
  'use strict';

  var ELEM = {
    '火': { kw: '热情、行动快、直来直去、要面子', like: '被认可、有新鲜感、一起冲', hate: '被拖着、被否定、被管' },
    '土': { kw: '稳、务实、重承诺、慢热', like: '说到做到、有规划、看得见的进展', hate: '临时变卦、画饼、被催' },
    '风': { kw: '靠交流活着、想法多、跳脱', like: '聊得来、有意思、有空间', hate: '沉闷、被管、被情绪绑架' },
    '水': { kw: '情绪深、共情强、直觉准', like: '被照顾、被理解、被稳稳接住', hate: '冷漠、被讲道理、被敷衍' }
  };

  // 元素契合度：4 = 天然合拍，2 = 需要磨合，1 = 最费劲
  function fit(a, b) {
    if (a === b) return 4;
    var k = a + b;
    if (k === '火风' || k === '风火' || k === '土水' || k === '水土') return 4;
    if (k === '火土' || k === '土火' || k === '风水' || k === '水风') return 2;
    return 1; // 火水 / 土风
  }

  var VERDICT = {
    4: { t: '天然合拍', c: '#2F9E6B', s: '你们不用太使劲就能同频。难点不在"合不合"，在于太舒服了容易一起停步。' },
    2: { t: '要磨合，但值得', c: '#D98324', s: '差异是真实存在的，不是谁不爱你。看懂对方的节奏，这段关系会越走越稳。' },
    1: { t: '最费劲的一型', c: '#C0392B', s: '你们表达爱的方式几乎相反。不是不能在一起，是必须两个人都愿意"翻译"对方。' },
    // 对宫：相差六个星座。元素上是相生（火-风、土-水），但看事情的角度正好相反
    0: { t: '对宫 · 既吸引又拉扯', c: '#C2571C', s: '你们是彼此缺失的另一半：他身上的东西你缺，你身上的东西他也缺，所以既被吸引又被拉扯。这段关系最大的风险不是不爱，是谁都不愿意先承认"你那种活法也有道理"。' }
  };

  // zodiac-data.js 用 const 声明，是词法全局，不挂在 window 上，必须按裸名取
  var SRC = (typeof ZODIAC_SIGNS !== 'undefined' && ZODIAC_SIGNS) || window.ZODIAC_SIGNS || [];
  var signs = SRC.map(function (s) {
    return { name: s.name, range: s.dateRange, element: s.element, ruler: s.ruler, traits: s.traits };
  });

  function byName(n) {
    for (var i = 0; i < signs.length; i++) if (signs[i].name === n) return signs[i];
    return null;
  }

  /* ---------------- 配对 ---------------- */
  function initMatch() {
    var a = document.getElementById('mt-a');
    var b = document.getElementById('mt-b');
    if (!a || !b || a.options.length) return;
    var opts = signs.map(function (s) {
      return '<option value="' + s.name + '">' + s.name + '（' + s.range + '）</option>';
    }).join('');
    a.innerHTML = opts;
    b.innerHTML = opts;
    a.value = '白羊座';
    b.value = '天秤座';
  }

  function doMatch() {
    var a = byName(document.getElementById('mt-a').value);
    var b = byName(document.getElementById('mt-b').value);
    var out = document.getElementById('mt-result');
    if (!a || !b) return;

    var f = fit(a.element, b.element);
    var v = VERDICT[f];
    var same = a.name === b.name;
    var opposite = false;
    if (a.name && b.name) {
      var ia = signs.findIndex(function (s) { return s.name === a.name; });
      var ib = signs.findIndex(function (s) { return s.name === b.name; });
      if (ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 6) opposite = true;
    }
    // 对宫单独判定，不再套用"天然合拍"——元素相生但看事角度相反
    if (opposite && !same) { f = 0; v = VERDICT[0]; }

    var head = same
      ? '两个' + a.name + '，是照镜子。你在他身上看到自己最顺手的那部分，也看到自己最不想承认的那部分。'
      : (a.name + '（' + a.element + '象）和 ' + b.name + '（' + b.element + '象）：');

    var rows = [
      ['你们怎么相处最舒服',
        a.element === b.element
          ? '节奏天然一致：' + ELEM[a.element].kw + '。你们的默契不需要解释，一个眼神就懂。'
          : a.name + '要的是「' + ELEM[a.element].like + '」，' + b.name + '要的是「' + ELEM[b.element].like + '」。这两件事可以同时给，但要分先后——先给对方的，再要自己的。'],
      ['最容易吵起来的地方',
        a.name + '最受不了「' + ELEM[a.element].hate + '」，' + b.name + '偏偏最容易在无意中做这件事；反过来，' + b.name + '受不了「' + ELEM[b.element].hate + '」，' + a.name + '也常踩到。吵架的引信基本都在这两句上。'],
      ['一句能给对方的实话',
        a.element === b.element
          ? '你们太像了，所以谁都不愿意先低头。这段关系里，先低头的那个人不是输了，是把关系保住了。'
          : a.element === '水' || b.element === '水'
          ? '水象那个人的情绪不是"作"，是他真的在用感受理解世界；另一个人的理性也不是冷血，是他真的在用逻辑保护你。谁也别要求对方换成自己的语言。'
          : a.element === '土' || b.element === '土'
          ? '土象那个人不是不浪漫，是他的浪漫藏在"这件事我替你做完了"里；另一个人要的浪漫是说出来。两边都没错，只是方式不同。'
          : '风象和火象凑一起，最不缺的是新鲜感，最缺的是收尾。开局都很热，热情退了以后要靠一个具体的事把两个人继续绑在一起——不是靠感觉，是靠一件共同在做的事。']
    ];

    var html =
      '<div class="panel" style="margin-top:14px">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<b style="font-size:17px">' + a.name + ' × ' + b.name + '</b>' +
          '<span style="font-size:11.5px;border-radius:20px;padding:3px 10px;border:1px solid ' + v.c + '33;background:' + v.c + '14;color:' + v.c + '">' + v.t + '</span>' +
          (opposite ? '<span style="font-size:11.5px;border-radius:20px;padding:3px 10px;border:1px solid rgba(140,95,50,.22);background:rgba(140,95,50,.06);color:#7C6A57">相差六个星座</span>' : '') +
        '</div>' +
        '<p style="font-size:13.5px;line-height:1.8;margin-top:10px;color:#2B2119">' + head + v.s + '</p>' +
        rows.map(function (r) {
          return '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed rgba(140,95,50,.18)">' +
            '<div style="font-size:12.5px;color:#C2571C;font-weight:600;margin-bottom:5px">' + r[0] + '</div>' +
            '<div style="font-size:13.2px;line-height:1.78;color:#7C6A57">' + r[1] + '</div></div>';
        }).join('') +
        '<button class="btn small" id="mt-ai" style="margin-top:16px">🤖 让星语把这对讲透（AI 合盘解读）</button>' +
        '<p style="font-size:11.5px;color:#A8998A;margin-top:8px;line-height:1.7">上面是按太阳星座元素给的通用解读。真正要细看，需要双方出生年月日时分和城市——排合盘（比较盘）看的是行星相位，不只是太阳星座。</p>' +
      '</div>';

    out.innerHTML = html;

    document.getElementById('mt-ai').addEventListener('click', function () {
      var q = '帮我看这一对：' + a.name + '（' + a.range + '，' + a.element + '象，守护星' + a.ruler + '）和 ' +
        b.name + '（' + b.range + '，' + b.element + '象，守护星' + b.ruler + '）。' +
        '请按占星的专业逻辑分析：1) 元素与守护星带来的相处模式；2) 最容易冲突的两三个点，以及触发时的具体表现；' +
        '3) 长期能不能走下去，关键看什么；4) 给三条具体可执行的相处建议。说人话，别用星座运势那种套话。';
      showPage('aichat');
      setTimeout(function () {
        var p = window.__starPanel;
        if (p) p.send(q);
      }, 120);
    });

    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- AI 面板 ---------------- */
  function buildSystem() {
    var table = signs.map(function (s) {
      return s.name + '（' + s.range + '）｜' + s.element + '象｜守护星' + s.ruler + '｜特质：' + (s.traits || []).join('、');
    }).join('\n');

    return '你是「星语」，海大叔·星语这个应用里的占星解读师。你不是塔罗牌抽签器，也不是星座运势生成器，' +
      '你懂真正的西洋占星：十大行星、十二宫位、主要相位（合/冲/刑/拱/六合）、星座的三分法与四元素、' +
      '以及比较盘（合盘）看两个人关系的逻辑。\n\n' +
      '【十二星座底表（回答时必须用这套，不要搞错元素和守护星）】\n' + table + '\n\n' +
      '【四元素怎么用】\n' +
      '火象（白羊狮子射手）：行动、热情、要面子，怕被拖着。\n' +
      '土象（金牛处女摩羯）：务实、重承诺、慢热，怕变卦和画饼。\n' +
      '风象（双子天秤水瓶）：交流、观念、要空间，怕沉闷和被管。\n' +
      '水象（巨蟹天蝎双鱼）：情绪、共情、直觉强，怕冷漠和被讲道理。\n' +
      '元素互动：同元素最同频；火配风、土配水互相助长；火配土、风配水需要磨合；火配水、土配风最费劲。相差六个星座是对宫，互相吸引也互相拉扯。\n\n' +
      '【配对怎么答】\n' +
      '先看双方太阳星座的元素与守护星，再看有没有对宫/三分关系；如果用户给了出生年月日时分和城市，' +
      '要说清"这需要排盘才能定月亮、上升和具体相位"，不要假装算出了星盘。' +
      '答配对时给三样：相处模式、冲突触发点（要具体到"什么场景下会吵"）、能落地的相处建议。\n\n' +
      '【说话的规矩】\n' +
      '1. 说人话，短句，不超过 400 字；不要"亲爱的""宝贝"这类腻称，也不要"宇宙会安排"这种空话。\n' +
      '2. 先给判断，再给理由，最后给一句能马上做的事。\n' +
      '3. 不宿命、不恐吓、不说"你们注定不行"。占星讲倾向，不讲判决。\n' +
      '4. 不做医疗、投资、法律、婚姻决策的结论，只给性格与相处层面的参考。\n' +
      '5. 用户问的不是占星（比如问病、问官司、问股票），直接说这不属于我的范围，建议找对应专业的人。';
  }

  var QUICK = [
    '太阳星座和上升星座有什么区别？',
    '为什么我和他星座很配，但在一起总吵？',
    '月亮星座在感情里到底管什么？',
    '水星逆行真的会影响我吗？',
    '天蝎座为什么总被说记仇？',
    '怎么看出一个人的上升星座？'
  ];

  function initAI() {
    if (window.__starPanel || !window.HSDAI) return;
    window.__starPanel = HSDAI.panel('#hsd-ai', {
      title: '🤖 问星语 · 占星专业问答',
      badge: 'AI 在线',
      subtitle: '星座性格、元素关系、行星宫位、合盘配对，都能问。答的是占星逻辑，不是运势套话。',
      system: buildSystem(),
      quick: QUICK,
      placeholder: '例：我是太阳天蝎、月亮巨蟹，为什么会觉得自己又冷又黏？',
      greeting: '我是星语。占星这块你可以随便问——为什么两个星座不合、月亮星座管什么、合盘到底看什么、我和他这段卡在哪。\n\n说清你的星座（最好带上太阳/月亮/上升），我答得更准。',
      hint: '占星是理解自己和他人的一种语言，不是判决书',
      disclaimer: '⚖️ 说明：占星内容仅供娱乐参考与自我觉察，不构成心理诊断、医疗、投资或婚姻决策建议。真正解不开的事，找心理咨询师或当事人好好谈一次，比任何星盘都管用。'
    });
  }

  /* ---------------- 接进页面 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initMatch();
    var mbtn = document.getElementById('mt-go');
    if (mbtn) mbtn.addEventListener('click', doMatch);

    // 首次进入 AI 页才建面板，避免拖慢首屏
    var orig = window.showPage;
    if (typeof orig === 'function') {
      window.showPage = function (p) {
        orig.apply(this, arguments);
        if (p === 'aichat') setTimeout(initAI, 60);
      };
    } else {
      setTimeout(initAI, 300);
    }
  });
})();
