/* =============================================================
   易玄机 · 因人答法 need.js
   卦断的是事，命定的是轻重，人问的是需求。
   同一个卦、同一句话，落在两个人身上，答法得不一样：
     · 身强气足   → 劲头是「推一把」：别两头掂量，先挑一头压上去
     · 身弱气不够 → 劲头是「先接住」：别一上来定大的，把步子拆到不可能失败
     · 落在喜用上 → 底气是「放胆说」：这事对他顺水
     · 撞在要避上 → 底气是「说清代价」：别人顺手，他得多绕一层
     · 跟喜忌不沾 → 底气是「归因自己」：好坏全看他肯使多大劲
   再叠上他这一问真正卡在哪（人性八类），定开头怎么接、怎么收、今天做一件。
   纯函数，不碰 DOM，不连网。
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ = window.YXJ || {};

  /* ---------- 一、命主强弱 → 答法的劲头 ---------- */
  var BY_STRENGTH = {
    strong: {
      k: '气足',
      tone: 'push',
      open: '你这事我答得直一点：你手里有劲，缺的不是胆子，是别两头都占。',
      stress: '先挑一头把力气压上去，比来回掂量强。',
      act: '今天把想做的两件事各写一条最坏结果，挑那个你认得的往下走，另一件写下来收好。'
    },
    weak: {
      k: '气弱',
      tone: 'gentle',
      open: '这话我慢慢说：你现在缺的不是主意，是一口顺过来的气。',
      stress: '别一上来就定大的，先挑一件小的、今天就能做完的动起来。',
      act: '今天只做第一步，小到不可能失败那一步，做完再回头看，不许顺手加码。'
    }
  };

  /* ---------- 二、用神落在命主哪一门 → 答法的底气 ---------- */
  var BY_HIT = {
    use: '这件事在卦里正落在你的喜用上，对你是顺水，可以放胆说。',
    avoid: '这件事撞在你命里要避的那一口上，别人办兴许顺手，你办得多绕一层。',
    flat: '这件事跟你的喜用不沾边，好与坏全看你自己肯使多大劲。'
  };

  /* ---------- 三、他真正卡在哪 → 开头怎么接、怎么收 ---------- */
  var BY_DRIVE = {
    '求个准话': {
      open: '先把准话给你，别让你悬着。',
      close: '准话只能给到七分，剩下那三分得你自己点头才算数。'
    },
    '想让人替你拍板': {
      open: '主意我替不了你拿，但我能把两条路各通向哪儿摆清楚。',
      close: '选哪条你定，我只负责让你看清。'
    },
    '急着要个时候': {
      open: '时候我给你，别让你干熬。',
      close: '日子定下来，悬着的心就落地一半。'
    },
    '其实是舍不得': {
      open: '你其实早有答案，只差一个人说一句「可以了」。',
      close: '花出去的收不回来，往后的账你自己单独算。'
    },
    '心里发虚': {
      open: '先给你一句：这不怪你。',
      close: '已经过去的改不了，往后怎么走还能改。'
    },
    '眼睛盯着别人': {
      open: '别人的日子你只看得见一两面，剩下的全是你自己猜的。',
      close: '把视线收回来，只看你自己这一步。'
    },
    '没人可说': {
      open: '我先把你这句听完，不急着判对错。',
      close: '说不出口就写在纸上，写给自己看也算。'
    },
    '两头都想要': {
      open: '你想要的两头，我先都摆出来。',
      close: '两条路都占，往往等于两条都没走。'
    }
  };

  /* ---------- 四、读数 ---------- */
  function read(opt) {
    opt = opt || {};
    var me = opt.me || null;               // ME.compute() 的读数
    var hm = opt.hm || null;               // HM.read() 的读数
    var vd = opt.vd || null;               // VD.judge() 的结果

    var strong = !!(me && me.ys && me.ys.strength && me.ys.strength.strong);
    var S = strong ? BY_STRENGTH.strong : BY_STRENGTH.weak;
    var hit = (vd && vd.me && vd.me.hit) ? vd.me.hit : null;
    var driveKey = hm && hm.main ? hm.main : null;
    var D = driveKey ? BY_DRIVE[driveKey] : null;

    var who = me
      ? '日主' + me.dayGan + '（' + me.dayWx + '），' + (strong ? '身偏强' : '身偏弱') +
        (me.ys && me.ys.use && me.ys.use.length ? '，喜用' + me.ys.use.join('、') : '')
      : '（没给生辰，按通用口径讲）';

    var open = S.open;
    if (D) open = open + ' ' + D.open;
    var close = D ? D.close : S.stress;
    var act = S.act;

    var out = {
      who: who,
      strength: strong ? 'strong' : 'weak',
      strengthName: S.k,
      tone: S.tone,
      hit: hit,
      hitLine: hit ? BY_HIT[hit] : '',
      drive: driveKey || '',
      open: open,
      stress: S.stress,
      close: close,
      act: act,
      // 给页面用的一句话：这个人 + 这事对他意味着 + 怎么答
      // —— 同一个人问两件不同的事，底气那句不同，这一句就得跟着不同
      line: who + '。' + (hit ? BY_HIT[hit] : '') + open
    };
    out.prompt = promptOf(out);
    return out;
  }

  /* ---------- 五、给智脑的那一段 ---------- */
  function promptOf(n) {
    if (!n) return '';
    var L = [];
    L.push('【照着这个人的命和需求讲，别讲成谁都适用的一套】');
    L.push('这个人：' + n.who + '。');
    L.push('答法的劲头：' + n.strengthName + '。开头这么接他：' + n.open);
    if (n.hitLine) L.push('这件事对他意味着：' + n.hitLine);
    L.push('重点往这儿压：' + n.stress);
    L.push('收尾这么收：' + n.close);
    L.push('今天让他做一件：' + n.act);
    L.push('身强的人别替他下决心，把他不敢挑的那一头点出来就行；身弱的人别给他加压，先把步子拆小。');
    L.push('同一句话换个人来问，答法就该不一样——别把上面这套话说成通用台词。');
    return L.join('\n');
  }

  Y.NEED = { read: read, BY_STRENGTH: BY_STRENGTH, BY_HIT: BY_HIT, BY_DRIVE: BY_DRIVE };
})();
