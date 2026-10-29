/* ai.js —— 案例库通用「专家问答」组件
 * ------------------------------------------------------------------
 * 全站共用一套：所有案例页面引入这一个文件，就能得到一个真在跑的 AI 问答。
 * 后端是站内 /api/expert（Workers AI 绑定，免密钥、不用用户自己填 Key）。
 *
 * 用法：
 *   HSDAI.panel('#ai', {
 *     system: '你是……（领域人设 + 本地知识）',
 *     quick: ['问题1', '问题2'],
 *     placeholder: '用大白话问…',
 *     disclaimer: '……'
 *   });
 *   // 或直接拿到文字：
 *   HSDAI.ask('问题', system).then(t => …)
 * ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var ENDPOINT = '/api/expert';

  /* ---------- 基础调用 ---------- */
  function ask(messages, system, opts) {
    opts = opts || {};
    if (typeof messages === 'string') messages = [{ role: 'user', content: messages }];
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: system || '',
        messages: messages,
        temperature: opts.temperature == null ? 0.6 : opts.temperature,
        max_tokens: opts.maxTokens || 1200
      })
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: '服务返回了无法解析的内容' }; });
    }).then(function (j) {
      if (!j || j.ok !== true) throw new Error((j && j.error) || '问答服务暂时不可用');
      return j.reply || '';
    });
  }

  /* ---------- 转义 & 轻排版 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(text) {
    var s = esc(text);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

    var lines = s.split('\n');
    var out = [];
    var i = 0;

    function isRow(l) { return /^\s*\|.*\|\s*$/.test(l); }
    function isSep(l) { return /^\s*\|[\s:|-]+\|\s*$/.test(l); }
    function cells(l) {
      return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
    }

    while (i < lines.length) {
      var l = lines[i];

      // markdown 表格：首行是表头，第二行是分隔线
      if (isRow(l) && i + 1 < lines.length && isSep(lines[i + 1])) {
        var head = cells(l);
        i += 2;
        var body = [];
        while (i < lines.length && isRow(lines[i])) { body.push(cells(lines[i])); i++; }
        var t = '<div class="hsdai-tw"><table class="hsdai-t"><thead><tr>' +
          head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
        out.push(t);
        continue;
      }

      // 列表：连续的 - * · 归成一组；1. 2. 归另一组，两者不混
      if (/^\s*(?:[-*·]|\d+[.、)])\s+/.test(l)) {
        var items = [];
        var ordered = /^\s*\d+[.、)]\s+/.test(l);
        var sameType = function (x) { return (/^\s*\d+[.、)]\s+/.test(x)) === ordered; };
        while (i < lines.length && /^\s*(?:[-*·]|\d+[.、)])\s+/.test(lines[i]) && sameType(lines[i])) {
          items.push(lines[i].replace(/^\s*(?:[-*·]|\d+[.、)])\s+/, ''));
          i++;
        }
        out.push('<' + (ordered ? 'ol' : 'ul') + ' class="hsdai-l">' +
          items.map(function (x) { return '<li>' + x + '</li>'; }).join('') +
          '</' + (ordered ? 'ol' : 'ul') + '>');
        continue;
      }

      // 普通段落：连续非空行合并，空行断段
      if (!l.trim()) { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() && !isRow(lines[i]) &&
             !/^\s*(?:[-*·]|\d+[.、)])\s+/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + para.join('<br>') + '</p>');
    }

    return out.join('');
  }

  /* ---------- 样式（自动注入一次） ---------- */
  function injectStyle() {
    if (document.getElementById('hsdai-style')) return;
    var css = ''
      + '.hsdai{background:#fff;border:1px solid var(--line,rgba(140,95,50,.16));border-radius:16px;padding:18px;'
      + 'box-shadow:0 1px 2px rgba(120,70,30,.05),0 10px 26px rgba(120,70,30,.06);margin-top:14px}'
      + '.hsdai-h{display:flex;align-items:center;gap:9px;flex-wrap:wrap}'
      + '.hsdai-h h2{font-size:16px;margin:0;color:var(--ink,#2B2119)}'
      + '.hsdai-h .pill{font-size:11px;color:#1F7A50;background:rgba(47,158,107,.10);border:1px solid rgba(47,158,107,.25);border-radius:20px;padding:2px 8px}'
      + '.hsdai-sub{font-size:12.5px;color:var(--dim2,#A8998A);margin:5px 0 12px;line-height:1.7}'
      + '.hsdai-log{display:flex;flex-direction:column;gap:10px;max-height:520px;overflow-y:auto;padding:2px 2px 4px}'
      + '.hsdai-msg{max-width:92%;font-size:13.5px;line-height:1.75;border-radius:13px;padding:11px 13px}'
      + '.hsdai-msg.u{align-self:flex-end;background:var(--brand,#C2571C);color:#fff;border-bottom-right-radius:5px}'
      + '.hsdai-msg.a{align-self:flex-start;background:#FBF6EE;border:1px solid rgba(140,95,50,.14);border-bottom-left-radius:5px;color:var(--ink,#2B2119)}'
      + '.hsdai-msg.a p{margin:0 0 7px}.hsdai-msg.a p:last-child{margin-bottom:0}'
      + '.hsdai-msg.a b{color:var(--brand2,#A34A15)}'
      + '.hsdai-msg.a ul,.hsdai-msg.a ol{margin:6px 0 8px;padding-left:20px}'
      + '.hsdai-msg.a li{margin:3px 0}'
      + '.hsdai-tw{overflow-x:auto;margin:8px 0 10px}'
      + '.hsdai-t{border-collapse:collapse;width:100%;font-size:12.5px;min-width:340px}'
      + '.hsdai-t th{background:rgba(194,87,28,.08);color:#A34A15;font-weight:700;text-align:left;'
      + 'padding:7px 9px;border:1px solid rgba(140,95,50,.16);white-space:nowrap}'
      + '.hsdai-t td{padding:7px 9px;border:1px solid rgba(140,95,50,.14);vertical-align:top;color:#2B2119}'
      + '.hsdai-t tbody tr:nth-child(even){background:rgba(245,233,216,.35)}'
      + '.hsdai-msg.e{align-self:flex-start;background:#FFF1EF;border:1px solid rgba(192,57,43,.25);color:#C0392B;font-size:12.5px}'
      + '.hsdai-quick{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}'
      + '.hsdai-quick button{border:1.5px solid rgba(194,87,28,.25);background:#fff;color:var(--brand,#C2571C);'
      + 'border-radius:20px;padding:7px 13px;font-size:12.5px;font-family:inherit;cursor:pointer;text-align:left}'
      + '.hsdai-quick button:hover{background:rgba(194,87,28,.06)}'
      + '.hsdai-in{display:flex;gap:8px;margin-top:12px;align-items:flex-end}'
      + '.hsdai-in textarea{flex:1;min-height:56px;max-height:160px;resize:vertical;padding:11px 12px;font-size:14px;'
      + 'border:1.5px solid rgba(140,95,50,.18);border-radius:12px;font-family:inherit;color:var(--ink,#2B2119);background:#fff;outline:none}'
      + '.hsdai-in textarea:focus{border-color:var(--brand,#C2571C)}'
      + '.hsdai-in button{flex:0 0 auto;border:0;border-radius:12px;padding:14px 18px;background:var(--brand,#C2571C);'
      + 'color:#fff;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer}'
      + '.hsdai-in button:disabled{opacity:.55;cursor:default}'
      + '.hsdai-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:9px;font-size:11.5px;color:var(--dim2,#A8998A)}'
      + '.hsdai-foot a{color:var(--dim2,#A8998A);cursor:pointer;text-decoration:underline}'
      + '.hsdai-tip{font-size:12px;color:var(--dim,#7C6A57);line-height:1.8;background:#FFF8F0;'
      + 'border:1px solid rgba(194,87,28,.18);border-radius:11px;padding:11px 13px;margin-top:12px}'
      + '.hsdai-dots:after{content:"…";animation:hsdaiDot 1.1s steps(4,end) infinite}'
      + '@keyframes hsdaiDot{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}';
    var st = document.createElement('style');
    st.id = 'hsdai-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 面板 ---------- */
  function panel(target, cfg) {
    injectStyle();
    var box = typeof target === 'string' ? document.querySelector(target) : target;
    if (!box) return null;
    cfg = cfg || {};
    var system = cfg.system || '';
    var history = [];

    box.className = 'hsdai' + (cfg.className ? ' ' + cfg.className : '');
    box.innerHTML =
      '<div class="hsdai-h"><h2>' + esc(cfg.title || 'AI 专家问答') + '</h2>' +
        '<span class="pill">' + esc(cfg.badge || 'AI 在线') + '</span></div>' +
      '<div class="hsdai-sub">' + esc(cfg.subtitle || '') + '</div>' +
      '<div class="hsdai-log"></div>' +
      (cfg.quick && cfg.quick.length
        ? '<div class="hsdai-quick">' + cfg.quick.map(function (q, i) {
            return '<button data-q="' + i + '">' + esc(q) + '</button>';
          }).join('') + '</div>'
        : '') +
      '<div class="hsdai-in"><textarea rows="2" placeholder="' + esc(cfg.placeholder || '把问题写清楚一点，回答会更准') + '"></textarea>' +
        '<button>发送</button></div>' +
      '<div class="hsdai-foot"><span>' + esc(cfg.hint || '回答由 AI 生成，重要决定请找真人复核') + '</span><a data-clear>清空</a></div>' +
      (cfg.disclaimer ? '<div class="hsdai-tip">' + esc(cfg.disclaimer) + '</div>' : '');

    var log = box.querySelector('.hsdai-log');
    var ta = box.querySelector('textarea');
    var btn = box.querySelector('.hsdai-in button');

    function scroll() { log.scrollTop = log.scrollHeight; }

    function push(role, text) {
      var d = document.createElement('div');
      d.className = 'hsdai-msg ' + role;
      if (role === 'a') d.innerHTML = fmt(text);
      else d.textContent = text;
      log.appendChild(d);
      scroll();
      return d;
    }

    function send(text) {
      text = (text || ta.value || '').trim();
      if (!text || btn.disabled) return;
      ta.value = '';
      push('u', text);
      history.push({ role: 'user', content: text });
      btn.disabled = true;
      var held = push('a', '正在想');
      held.classList.add('hsdai-dots');

      ask(history.slice(-8), system, cfg)
        .then(function (reply) {
          held.remove();
          push('a', reply);
          history.push({ role: 'assistant', content: reply });
        })
        .catch(function (e) {
          held.remove();
          var d = document.createElement('div');
          d.className = 'hsdai-msg e';
          d.textContent = '没答上来：' + (e && e.message ? e.message : '网络异常') + '。可以再点一次发送试试。';
          log.appendChild(d);
          scroll();
        })
        .then(function () { btn.disabled = false; ta.focus(); });
    }

    btn.addEventListener('click', function () { send(); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    box.querySelectorAll('.hsdai-quick button').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.dataset.q, 10);
        send(cfg.quick[i]);
      });
    });
    box.querySelector('[data-clear]').addEventListener('click', function () {
      history = [];
      log.innerHTML = '';
      if (cfg.greeting) push('a', cfg.greeting);
    });

    if (cfg.greeting) push('a', cfg.greeting);

    return { send: send, push: push, history: history };
  }

  global.HSDAI = { ask: ask, panel: panel, fmt: fmt };
})(window);
