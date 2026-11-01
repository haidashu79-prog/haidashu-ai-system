/* ══════════════════════════════════════════════════════════
   3D 立体陈列 · 公用内核
   用法：
     <link rel="stylesheet" href="/assets/p3d.css">
     <div id="p3"></div>
     <script>window.P3D = { head:{...}, tiers:[...], items:[...] };</script>
     <script src="/assets/p3d.js"></script>

   数据结构：
   tiers: [{k:'层名', s:'一句话副标'}]
   items: [{
     no:'01', g:'钱',            // 编号 / 卡片右上角那个大字
     n:'账房参谋', r:'商业模式大脑',
     t:0, col:0,                 // 第几层（0起） / 第几列（0..2）
     short:'卡片上那行小字',
     lead:'详情里的大段说明',
     bullets:['能给你什么 1','2'],          // 可选
     links:[{q:'示例问题', href:'/...', tip:'悬停提示'}],  // 可选
     facts:[['你问它','...'],['它给你','...']],            // 可选
     badge:'可以交出去'|null, note:'说明',                  // 可选
     url:'/...', txt:'主按钮文字',
     sub:{href:'/...', txt:'次按钮文字'}                     // 可选，默认用全局 cta
   }]
   ══════════════════════════════════════════════════════════ */
(function () {
  var CFG = window.P3D || {};
  var T = CFG.tiers || [];
  var M = CFG.items || [];
  var mount = document.getElementById('p3');
  if (!mount || !M.length) { if (mount) mount.textContent = '（没有内容）'; return; }

  /* ── 骨架 ── */
  var headHtml = '';
  if (CFG.head) {
    var h = CFG.head;
    headHtml = '<div class="p3hd wrap">' +
      (h.eyebrow ? '<span class="eyebrow">' + h.eyebrow + '</span>' : '') +
      (h.h1 ? '<h1>' + h.h1 + '</h1>' : '') +
      (h.p ? '<p>' + h.p + '</p>' : '') + '</div>';
  }
  var statsHtml = '';
  if (CFG.stats && CFG.stats.length) {
    statsHtml = '<div class="strip"><div class="strip-in wrap">';
    CFG.stats.forEach(function (s) {
      statsHtml += '<div class="stat"><b>' + s.n + '</b>' + s.t + '</div>';
    });
    (CFG.links || []).forEach(function (l) {
      statsHtml += '<a class="lnk" data-sheet="' + l.sheet + '">' + l.t + '</a>';
    });
    statsHtml += '</div></div>';
  }

  mount.className = 'p3';
  mount.id = CFG.anchor || 'p3stage-top';
  mount.innerHTML =
    headHtml +
    '<div class="p3stage">' +
      '<div class="scene" id="scene">' +
        '<div class="glow"></div>' +
        '<div class="shift" id="shift">' +
          '<div class="world" id="world"><div class="floor"></div></div>' +
        '</div>' +
        '<div class="hint" id="hint"><span class="h-d">拖一下画面能转 · </span>' +
          (CFG.hint || '点任意一块看详情') + '</div>' +
      '</div>' +
      '<aside class="panel" id="panel" aria-live="polite">' +
        '<button class="x" id="px" aria-label="关闭">✕</button>' +
        '<div class="pp" id="pp"></div>' +
      '</aside>' +
    '</div>' +
    statsHtml;

  var scene = document.getElementById('scene');
  var world = document.getElementById('world');
  var shift = document.getElementById('shift');
  var panel = document.getElementById('panel');
  var pp = document.getElementById('pp');
  var hint = document.getElementById('hint');

  /* ── 布景 ──
     列数不再写死 3 列：每层按自己的条目数居中排开。
     3 条的层与原来的 XS=[-300,0,300] 完全一致，所以老页面视觉零变化；
     4 条的层会自动排成 4 列并整体外扩。 */
  var GAPX = 300, CW = 230;
  var tierN = [];
  M.forEach(function (m) { tierN[m.t] = (tierN[m.t] || 0) + 1; });
  var NT = 0, maxN = 1;
  tierN.forEach(function (n, k) { NT = Math.max(NT, k + 1); maxN = Math.max(maxN, n); });
  /* 层距：层数越多，舞台高度越不够用（fitShift 是按高度缩的），
     所以 4 层以上自动收紧层距，宁可挨近一点，也别把整组缩成看不清。 */
  var GAPY = (NT >= 4 ? 130 : 160);
  function yOf(t) { return ((NT - 1) / 2 - t) * GAPY; }
  function zOf(t) { return Math.min(t, 2) * 66; }
  function xOf(t, i) { var n = tierN[t] || 1; return (i - (n - 1) / 2) * GAPX; }
  var halfW = ((maxN - 1) / 2) * GAPX + CW / 2;
  var labX = -(halfW + 209);
  var axDeg = 9, azDeg = -3;
  var cards = [], labels = [], cur = -1;

  function billboard() { return 'rotateZ(' + (-azDeg) + 'deg) rotateX(' + (-axDeg) + 'deg)'; }
  function paintWorld() { world.style.transform = 'rotateX(' + axDeg + 'deg) rotateZ(' + azDeg + 'deg)'; }
  function isFlat() { return window.matchMedia('(max-width:900px)').matches; }
  function billboards() {
    if (isFlat()) {
      for (var k = 0; k < cards.length; k++) cards[k].inner.style.transform = '';
      for (var m = 0; m < labels.length; m++) labels[m].inner.style.transform = '';
      return;
    }
    var t = billboard();
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], ry = 0;
      if (c.n > 1) ry = (1 - 2 * c.col / (c.n - 1)) * 9;
      cards[i].inner.style.transform = 'rotateY(' + ry + 'deg) ' + t;
    }
    for (var j = 0; j < labels.length; j++) labels[j].inner.style.transform = t;
  }
  function tf(c, z) {
    return 'translate3d(' + c.base.x + 'px,' + c.base.y + 'px,' +
      ((z === undefined) ? c.base.z : z) + 'px)';
  }

  /* ── 建卡 ── */
  var _cnt = [];
  M.forEach(function (m, i) {
    var ci = _cnt[m.t] || 0; _cnt[m.t] = ci + 1;
    var bx = xOf(m.t, ci), by = yOf(m.t), bz = zOf(m.t);
    var el = document.createElement('div');
    el.className = 'm3';
    el.dataset.i = i;
    el.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,' + (bz - 620) + 'px)';
    var inn = document.createElement('div');
    inn.className = 'm3in';
    inn.innerHTML =
      '<div class="no">' + (m.no || '') + '</div>' +
      '<div class="g">' + (m.g || '') + '</div>' +
      '<div class="n">' + m.n + '</div>' +
      (m.r ? '<div class="r">' + m.r + '</div>' : '') +
      '<div class="d">' + (m.short || '') + '</div>';
    el.appendChild(inn);
    world.appendChild(el);
    el.dataset.t = m.t; el.dataset.c = ci;
    el.style.order = (m.t * 10 + ci);
    cards.push({ el: el, inner: inn, m: m, col: ci, n: tierN[m.t], base: { x: bx, y: by, z: bz } });
  });

  /* 手机端的层名分隔条 */
  T.forEach(function (t, k) {
    var sep = document.createElement('div');
    sep.className = 'tsep';
    sep.textContent = '第 ' + (k + 1) + ' 层 · ' + t.k;
    sep.style.order = (k * 10 - 1);
    world.appendChild(sep);
  });

  /* 桌面端层标签 */
  T.forEach(function (t, k) {
    var el = document.createElement('div');
    el.className = 'tlab';
    el.style.transform = 'translate3d(' + labX + 'px,' + yOf(k) + 'px,' + zOf(k) + 'px)';
    var inn = document.createElement('div');
    inn.className = 'in';
    inn.innerHTML = '<span class="t">第 ' + (k + 1) + ' 层</span>' +
      '<span class="n">' + t.k + '</span>' +
      (t.s ? '<span class="s">' + t.s + '</span>' : '');
    el.appendChild(inn);
    world.appendChild(el);
    labels.push({ el: el, inner: inn });
  });

  paintWorld(); billboards();

  /* ── 入场 ── */
  if (location.search.indexOf('nofly') >= 0) {
    document.documentElement.className = 'nofly';
    cards.forEach(function (c) { c.el.style.transition = 'none'; c.el.style.transform = tf(c); });
  } else {
    setTimeout(function () {
      cards.forEach(function (c, i) {
        setTimeout(function () { c.el.style.transform = tf(c); }, i * 55);
      });
    }, 60);
    setTimeout(function () { fitShift(); }, 60 + cards.length * 55 + 700);
  }

  /* ── 详情面板 ── */
  function esc(s) { return String(s == null ? '' : s); }

  function openCard(i) {
    cur = i;
    var m = M[i];
    cards.forEach(function (c, k) {
      var on = (k === i);
      c.el.style.transform = tf(c, c.base.z + (on ? 78 : 0)) + ' scale(' + (on ? 1.05 : 1) + ')';
      c.el.classList.toggle('on', on);
      c.el.classList.toggle('dim', !on);
    });

    var out = '<div class="pp-hd"><span class="pp-no">' + esc(m.no) + '</span>' +
      '<span class="pp-nm">' + esc(m.n) + '</span>' +
      (m.r ? '<span class="pp-rl">' + esc(m.r) + '</span>' : '') + '</div>';

    if (T[m.t]) {
      out += '<div class="pp-tier">第 ' + (m.t + 1) + ' 层 · <b>' + T[m.t].k + '</b>' +
        (T[m.t].s ? ' · ' + T[m.t].s : '') + '</div>';
    }
    if (m.lead) out += '<p class="pp-lead">' + m.lead + '</p>';

    /* 可直接复制的整段文案（素材库用）：展示 + 一键复制 */
    if (m.copy) {
      out += '<div class="pp-h">' + (m.copyTitle || '全文，可直接复制') + '</div>' +
        '<pre class="pppre">' + esc(m.copy) + '</pre>' +
        '<button class="ppcopy" type="button">复制这段文案</button>';
    }

    if (m.links && m.links.length) {
      out += '<div class="pp-h">' + (m.linksTitle || '这几句最常被问') + '</div><ul class="pp-ul pp-ul-a">';
      m.links.forEach(function (l) {
        out += '<li><a href="' + l.href + '"' + (l.tip ? ' title="' + l.tip + '"' : '') + '>' +
          esc(l.q) + ' <i>→</i></a></li>';
      });
      out += '</ul>';
    }
    if (m.bullets && m.bullets.length) {
      out += '<div class="pp-h">' + (m.bulletsTitle || '能给你什么') + '</div><ul class="pp-ul">';
      m.bullets.forEach(function (b) { out += '<li>' + b + '</li>'; });
      out += '</ul>';
    }
    if (m.facts && m.facts.length) {
      out += '<div class="pp-h">' + (m.factsTitle || '交付') + '</div><dl class="pp-dl">';
      m.facts.forEach(function (f) { out += '<dt>' + f[0] + '</dt><dd>' + f[1] + '</dd>'; });
      out += '</dl>';
    }
    if (m.badge || m.note) {
      out += '<div class="pp-hand">' +
        (m.badge ? '<span class="pp-bd ' + (m.hand === 0 ? 'no' : 'ok') + '">' + m.badge + '</span>' : '') +
        (m.note ? '<p>' + m.note + '</p>' : '') + '</div>';
    }
    var sub = m.sub || CFG.cta;
    if (m.url || sub) {
      out += '<div class="pp-act">' +
        (m.url ? '<a class="p" href="' + m.url + '"' +
          (m.blank ? ' target="_blank" rel="noopener"' : '') + '>' +
          (m.txt || '去看看') + ' →</a>' : '') +
        (sub ? '<a class="g" href="' + sub.href + '">' + sub.txt + '</a>' : '') + '</div>';
    }
    pp.innerHTML = out;
    pp.scrollTop = 0;

    var cbtn = pp.querySelector('.ppcopy');
    if (cbtn) {
      cbtn.addEventListener('click', function () {
        var old = cbtn.textContent;
        try {
          var ta = document.createElement('textarea');
          ta.value = m.copy;
          ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          cbtn.textContent = '已复制 ✓';
          cbtn.classList.add('done');
        } catch (e) {
          cbtn.textContent = '复制失败，手动选中吧';
        }
        setTimeout(function () { cbtn.textContent = old; cbtn.classList.remove('done'); }, 1600);
      });
    }

    panel.classList.add('open');
    hint.style.opacity = '0';
    document.body.classList.add('p3open');
    if (isFlat()) document.body.style.overflow = 'hidden';
    fitShift();
  }

  function closeCard() {
    cur = -1;
    panel.classList.remove('open');
    panel.style.transform = '';
    hint.style.opacity = '';
    document.body.classList.remove('p3open');
    document.body.style.overflow = '';
    cards.forEach(function (c) {
      c.el.style.transform = tf(c);
      c.el.classList.remove('on', 'dim');
    });
    fitShift();
  }
  document.getElementById('px').addEventListener('click', closeCard);

  /* ── 点卡 ── */
  var moved = 0;
  scene.addEventListener('click', function (e) {
    if (moved > 6) return;
    var el = e.target;
    while (el && el !== scene && !(el.classList && el.classList.contains('m3'))) el = el.parentNode;
    if (el && el.classList && el.classList.contains('m3')) openCard(+el.dataset.i);
  });

  /* ── 拖动转向 ── */
  var drag = false, lx = 0, ly = 0;
  scene.addEventListener('pointerdown', function (e) {
    drag = true; lx = e.clientX; ly = e.clientY; moved = 0;
  });
  scene.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    azDeg = Math.max(-9, Math.min(3, azDeg + dx * 0.018));
    axDeg = Math.max(2, Math.min(17, axDeg - dy * 0.03));
    paintWorld(); billboards();
  });
  scene.addEventListener('pointerup', function () { drag = false; });
  scene.addEventListener('pointercancel', function () { drag = false; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });

  /* ── 自适应：整组等比缩进可用区域 ── */
  function stageBox() {
    var els = [].slice.call(document.querySelectorAll('.m3'))
      .concat([].slice.call(document.querySelectorAll('.tlab')));
    var l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    els.forEach(function (e) {
      var q = e.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) return;
      l = Math.min(l, q.left); t = Math.min(t, q.top);
      r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    });
    if (r < l) return null;
    return { l: l, t: t, w: r - l, h: b - t };
  }
  function fitShift() {
    var w = window.innerWidth, h = window.innerHeight;
    if (isFlat()) {
      shift.style.setProperty('--sx', '0px');
      shift.style.setProperty('--sy', '0px');
      shift.style.setProperty('--ws', '1');
      return;
    }
    var tr = shift.style.transition;
    shift.style.transition = 'none';
    shift.style.setProperty('--sx', '0px');
    shift.style.setProperty('--sy', '0px');
    shift.style.setProperty('--ws', '1');
    void shift.offsetWidth;
    var box = stageBox();
    shift.style.transition = tr;
    if (!box) return;
    var open = (cur >= 0);
    var sc = scene.getBoundingClientRect();
    var scCx = sc.left + sc.width / 2, scCy = sc.top + sc.height / 2;
    var pad = 44;
    var availL = pad, availR = w - pad;
    if (open) {
      /* 让位给详情面板：以面板真实左缘为准，各页布局不同也不会压住 */
      var pr = panel.getBoundingClientRect();
      if (pr.left > 100) availR = Math.min(availR, pr.left - 18);
      else availR = Math.min(availR, w - 448);
    }
    var s = Math.min(CFG.maxScale || 1, (availR - availL) / box.w, (sc.height - 28) / box.h);
    var cx = box.l + box.w / 2, cy = box.t + box.h / 2;
    var sx = (availL + availR) / 2 - scCx - (cx - scCx) * s;
    var sy = -(cy - scCy) * s - 16;
    shift.style.setProperty('--sx', sx.toFixed(1) + 'px');
    shift.style.setProperty('--sy', sy.toFixed(1) + 'px');
    shift.style.setProperty('--ws', s.toFixed(3));
    if (location.search.indexOf('dbg') >= 0) {
      var hd = document.querySelector('.p3hd'), st = document.querySelector('.strip');
      document.documentElement.setAttribute('data-fit', JSON.stringify({
        s: +s.toFixed(3), bw: Math.round(box.w), bh: Math.round(box.h),
        sw: Math.round(sc.width), sh: Math.round(sc.height),
        l: Math.round(box.l), t: Math.round(box.t), lab: labX, maxN: maxN,
        hd: hd ? Math.round(hd.getBoundingClientRect().height) : -1,
        st: st ? Math.round(st.getBoundingClientRect().height) : -1,
        p3: Math.round(mount.getBoundingClientRect().height)
      }));
    }
  }
  fitShift();
  window.addEventListener('resize', function () { fitShift(); billboards(); });

  /* ── 抽屉：抓手 + 下拉关闭 + 打开时锁滚动 ── */
  (function sheet() {
    var grab = document.createElement('div');
    grab.className = 'ppgrab';
    panel.insertBefore(grab, panel.firstChild);

    var dragY = 0, startY = 0, dragging = false;
    panel.addEventListener('pointerdown', function (e) {
      if (!isFlat() || !panel.classList.contains('open')) return;
      if (e.target.closest('a,button')) return;
      if (e.clientY - panel.getBoundingClientRect().top > 64) return;
      dragging = true; startY = e.clientY; dragY = 0;
      panel.style.transition = 'none';
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dragY = Math.max(0, e.clientY - startY);
      panel.style.transform = 'translateY(' + dragY + 'px)';
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      panel.style.transform = '';
      if (dragY > 70) closeCard();
    });
  })();

  /* ── 底部浮层按钮 ── */
  [].forEach.call(document.querySelectorAll('[data-sheet]'), function (a) {
    a.addEventListener('click', function () {
      var s = document.getElementById(a.getAttribute('data-sheet'));
      if (s) s.classList.add('open');
    });
  });
  [].forEach.call(document.querySelectorAll('.sheet'), function (s) {
    s.addEventListener('click', function (e) {
      if (e.target === s || (e.target.hasAttribute && e.target.hasAttribute('data-close')))
        s.classList.remove('open');
    });
  });

  /* ── 直链：?open=编号 ── */
  var op = new URLSearchParams(location.search).get('open');
  if (op !== null) {
    setTimeout(function () {
      var k = -1, i = parseInt(op, 10);
      for (var q = 0; q < M.length; q++) if (M[q].no === op) k = q;
      if (k < 0 && i >= 0 && i < M.length) k = i;
      if (k >= 0) openCard(k);
    }, 400);
  }

  window.P3D_API = { open: openCard, close: closeCard, fit: fitShift };

  /* ── 锚点复跳 ──
     舞台内容是本脚本注入的，浏览器在解析到 #hash 时页面还是空的，
     所以原生跳转一定跳歪（会停在半路）。渲染完再跳一次。 */
  function jumpHash() {
    var h = location.hash;
    if (!h || h.length < 2) return;
    var el = null;
    try { el = document.querySelector(h); } catch (e) { return; }
    if (!el) return;
    /* 固定/吸顶导航会盖住目标，得把它的高度让出来 */
    var navH = 0;
    var nv = document.querySelector('header.nav, nav#nav, .p3appbar');
    if (nv) {
      var cs = getComputedStyle(nv);
      if (cs.position === 'sticky' || cs.position === 'fixed') navH = nv.getBoundingClientRect().height;
    }
    var y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 8);
    try { window.scrollTo({ top: y, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  }
  setTimeout(jumpHash, 460);
  window.addEventListener('load', function () { setTimeout(jumpHash, 80); });
})();
