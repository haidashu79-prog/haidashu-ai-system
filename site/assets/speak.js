/* 海大叔 · 全站通用语音解读模块
 * 用法：在任意页面引入 <script src="/assets/speak.js"></script> 即可自动生效。
 * - 自动在页面右下角挂一个「🔊 听本页」浮动按钮；点击朗读当前正文。
 * - 朗读优先取 .answer/.result/.output 等「答案区」，没有就取 main/article/正文，再没有读整页（自动跳过导航/按钮/脚本）。
 * - 默认「清音」（无混响），可切「仙风道骨」（带回响，桌面端）。
 * - 移动端（iOS 等）在点击手势内先解锁播放限制，解决「点半天没声音」。
 * - 后端不可用时自动退回浏览器自带女声兜底。
 * - 进阶：页面 JS 可调用 window.HD_SPEAK.bind(el) 给指定容器挂按钮；或 window.HD_SPEAK.speakElement(el) 直接读某块。
 */
(function () {
  'use strict';
  var TTS_URL = '/api/tts';            // 通用语音后端
  var SILENT_WAV = 'data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA';
  var RATE = 1.15;                    // 朗读快一点
  var STYLE_KEY = 'hd_speak_style';

  var style = 'clean';
  try { style = localStorage.getItem(STYLE_KEY) || 'clean'; } catch (e) { }
  var __spk = { on: false, btn: null, audio: null, ctx: null, style: style };
  var __unlock = null;

  /* ---------- 工具 ---------- */
  function mdClean(s) {
    return String(s == null ? '' : s)
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/`+/g, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  /* 移动端解锁：在用户手势内先播一段静音，后续清音才出得了声 */
  function unlockMobile() {
    try {
      if (!__unlock) {
        __unlock = new Audio();
        __unlock.preload = 'auto';
        __unlock.src = SILENT_WAV;
        __unlock.volume = 0;
      }
      var p = __unlock.play();
      if (p && p.catch) p.catch(function () { });
    } catch (e) { }
  }

  /* 浏览器自带女声兜底 */
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices() || [];
    if (!vs.length) return null;
    var zh = vs.filter(function (v) { return /^zh|^cmn|中文|Chinese/i.test((v.lang || '') + ' ' + (v.name || '')); });
    if (!zh.length) return null;
    var prefer = [/晓晓|小晓|xiaoxiao/i, /晓伊|xiaoyi/i, /云希/i, /Google.*普通话|Google.*Mandarin/i, /婷婷|ting.?ting/i, /female|女/i];
    for (var i = 0; i < prefer.length; i++)
      for (var j = 0; j < zh.length; j++) if (prefer[i].test(zh[j].name)) return zh[j];
    return zh[0];
  }
  function speakFallback(list) {
    var v = pickVoice();
    list.forEach(function (s) {
      if (!s) return;
      var u = new SpeechSynthesisUtterance(s);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'zh-CN';
      u.rate = 0.95; u.pitch = 1.05; u.volume = 1;
      try { speechSynthesis.speak(u); } catch (e) { }
    });
  }

  /* ---------- 核心朗读 ---------- */
  function speakText(txt, btn) {
    var t = mdClean(txt);
    if (!t) { toast('这段没话可念'); return; }
    if (__spk.on) { stop(); return; }

    var segs = t.replace(/([。！？；])/g, '$1').split('')
      .map(function (s) { return s.trim(); }).filter(Boolean)
      .reduce(function (acc, s) {
        while (s.length > 60) {
          var cut = s.lastIndexOf('，', 60);
          if (cut < 0) cut = 60;
          acc.push(s.slice(0, cut + 1)); s = s.slice(cut + 1);
        }
        if (s) acc.push(s);
        return acc;
      }, []);

    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      if (!__spk.ctx) __spk.ctx = new AC();
      if (__spk.ctx.state === 'suspended') __spk.ctx.resume();
    }
    unlockMobile();
    if (!__unlock) __unlock = new Audio();
    __spk.on = true; __spk.btn = btn;
    if (btn) btn.textContent = '⏸ 停一下';

    var idx = 0;

    function playBuffer(buf) {
      var xian = (__spk.style === 'xian');
      var ac = window.AudioContext || window.webkitAudioContext;
      if (xian && ac && __spk.ctx) {
        // 仙风道骨：WebAudio 回响（桌面端）
        var ctx = __spk.ctx;
        ctx.decodeAudioData(buf.slice(0)).then(function (ab) {
          if (!__spk.on) return;
          var src = ctx.createBufferSource();
          src.buffer = ab; src.playbackRate.value = RATE;
          var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
          var d1 = ctx.createDelay(1); d1.delayTime.value = 0.18;
          var d2 = ctx.createDelay(1); d2.delayTime.value = 0.36;
          var g1 = ctx.createGain(); g1.gain.value = 0.28;
          var g2 = ctx.createGain(); g2.gain.value = 0.15;
          src.connect(lp); lp.connect(ctx.destination);
          lp.connect(d1); d1.connect(g1); g1.connect(ctx.destination);
          lp.connect(d2); d2.connect(g2); g2.connect(ctx.destination);
          src.onended = function () { if (__spk.on) playNext(); };
          src.start(0); __spk.audio = src;
        }).catch(function () { if (__spk.on) playNext(); });
        return;
      }
      // 清音：一律用 <audio> 元素（移动端最稳），复用已解锁的元素
      var a = __unlock;
      if (!a) { a = new Audio(); __unlock = a; }
      try { a.pause(); } catch (e) { }
      try { a.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })); } catch (e) { a.src = ''; }
      a.volume = 1; a.playbackRate = RATE;
      a.onended = function () { if (__spk.on) playNext(); };
      __spk.audio = a;
      var pp = a.play();
      if (pp && pp.catch) pp.catch(function () { if (__spk.on) playNext(); });
    }

    function fetchSeg(seg, done) {
      var url = TTS_URL + '?t=' + encodeURIComponent(seg.slice(0, 200)) + '&lang=zh';
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.arrayBuffer();
      }).then(function (b) { done(b); }).catch(function () { done(null); });
    }

    // 一次性并行取回所有句音频：第一句到就播，句间零停顿
    var proms = segs.map(function (seg) {
      return new Promise(function (res) { fetchSeg(seg.slice(0, 200), res); });
    });

    function playNext() {
      if (!__spk.on) return;
      if (idx >= segs.length) { stop(); return; }
      var p = proms[idx++];
      p.then(function (buf) {
        if (!__spk.on) return;
        if (!buf) {
          __spk.on = false;
          if (btn) btn.textContent = '🔊 听本页';
          try { if (__spk.ctx) __spk.ctx.suspend(); } catch (e) { }
          speakFallback(segs.slice(idx - 1));
          return;
        }
        playBuffer(buf);
      });
    }
    playNext();
  }

  function stop() {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
    try {
      if (__spk.audio) {
        if (typeof __spk.audio.stop === 'function') __spk.audio.stop();
        else if (typeof __spk.audio.pause === 'function') { __spk.audio.pause(); __spk.audio.src = ''; }
      }
    } catch (e) { }
    try { if (__spk.ctx) __spk.ctx.suspend(); } catch (e) { }
    __spk.on = false; __spk.audio = null;
    if (__spk.btn) __spk.btn.textContent = '🔊 听本页';
  }

  function toast(msg) {
    try {
      var el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;z-index:99999;';
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 1600);
    } catch (e) { }
  }

  /* ---------- 自动找可读区域 ---------- */
  function findReadable() {
    var sel = ['.answer', '[data-answer]', '.result', '[data-result]', '.output', '[data-output]',
      'main', 'article', '[role="main"]', '.content', '.main', '#content', '#main'];
    for (var i = 0; i < sel.length; i++) {
      var el = document.querySelector(sel[i]);
      if (el && el.innerText && el.innerText.trim().length > 10) return el;
    }
    return document.body;
  }
  function extractText(el) {
    var clone = el.cloneNode(true);
    var bad = clone.querySelectorAll('script,style,nav,header,footer,button,select,input,textarea,.no-speak,[data-speak-skip]');
    for (var i = 0; i < bad.length; i++) bad[i].remove();
    var txt = (clone.innerText || clone.textContent || '');
    return mdClean(txt);
  }

  /* ---------- 浮动按钮 ---------- */
  function mountFloating() {
    if (document.getElementById('hd-speak-fab')) return;
    if (window.HD_SPEAK_NO_FAB) return; // 页面自带语音的（如易玄机）可设此标记跳过
    var css = '#hd-speak-fab{position:fixed;right:16px;bottom:16px;z-index:99990;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}' +
      '.hd-spk-btn{background:#0ea5a4;color:#fff;border:none;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:600;box-shadow:0 4px 14px rgba(14,165,164,.4);cursor:pointer;}' +
      '.hd-spk-style{display:flex;background:rgba(255,255,255,.95);border:1px solid #e2e8f0;border-radius:999px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);}' +
      '.hd-chip{border:none;background:transparent;padding:5px 12px;font-size:12px;color:#475569;cursor:pointer;}' +
      '.hd-chip.on{background:#0ea5a4;color:#fff;}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var fab = document.createElement('div');
    fab.id = 'hd-speak-fab';
    fab.innerHTML =
      '<span class="hd-spk-style">' +
        '<button class="hd-chip' + (style === 'clean' ? ' on' : '') + '" data-style="clean" type="button">清音</button>' +
        '<button class="hd-chip' + (style === 'xian' ? ' on' : '') + '" data-style="xian" type="button">仙风道骨</button>' +
      '</span>' +
      '<button class="hd-spk-btn" type="button">🔊 听本页</button>';
    document.body.appendChild(fab);

    var btn = fab.querySelector('.hd-spk-btn');
    btn.onclick = function () {
      if (__spk.on) { stop(); return; }
      speakText(extractText(findReadable()), btn);
    };
    fab.querySelectorAll('.hd-chip').forEach(function (c) {
      c.onclick = function () {
        __spk.style = c.getAttribute('data-style');
        try { localStorage.setItem(STYLE_KEY, __spk.style); } catch (e) { }
        fab.querySelectorAll('.hd-chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
      };
    });
  }

  /* ---------- 对外接口 ---------- */
  window.HD_SPEAK = {
    speakText: function (txt, btn) { return speakText(txt, btn); },
    speakElement: function (el, btn) { return speakText(extractText(el), btn || null); },
    stop: stop,
    bind: function (el, opts) {
      // 给指定容器挂一个「听语音」按钮，点它只念这块
      if (!el) return;
      opts = opts || {};
      var row = document.createElement('div');
      row.style.cssText = 'margin-top:10px;';
      row.innerHTML = '<button class="hd-spk-btn" type="button" style="background:#0ea5a4;color:#fff;border:none;border-radius:999px;padding:8px 14px;font-size:13px;cursor:pointer;">🔊 听语音讲解</button>';
      var b = row.querySelector('button');
      b.onclick = function () { if (__spk.on) { stop(); } else { speakText(extractText(el), b); } };
      el.appendChild(row);
    },
    version: '1.0'
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFloating);
  else mountFloating();
})();
