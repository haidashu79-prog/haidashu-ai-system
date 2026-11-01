/* 智脑随行小助手 v2 — 极简版
 * 用法：任意页面引入 <script src="/assist.js" defer></script>
 * 小白版：打开只有四个大按钮 + 一个输入框，点一下就有答案，不选专家、不看术语。
 */
(function () {
  if (window.__zhinaoAssistLoaded) return;
  window.__zhinaoAssistLoaded = 1;

  var ROLE = {
    '': '',
    money: '你现在是「账房参谋」，只回答钱的事：谁付钱、怎么定价、成本怎么压、现金流怎么排、第一笔钱从哪来。给能算的数和动作，不讲空话，不承诺收益。',
    opc: '你现在是「一人公司总管」，只管一个人怎么把公司跑起来：注册什么主体、公私账怎么分、合同怎么写、交付边界在哪。给步骤，涉及法律财税只说方向。',
    ip: '你现在是「IP 操盘手」，管定位一句话、选题、内容配比、涨粉和私域承接。账号不是发作品，是攒信任。别一上来只谈写稿。',
    judge: '你现在是「决策参谋」，管接不接单、降不降价、客户留不留、什么时候停。先给判断，再给理由和代价，最后给一个能退的动作。'
  };

  var history = [];
  var busy = false;
  var opened = false;
  var firstAsk = true;

  var host = document.createElement('div');
  host.setAttribute('id', 'zhinao-assist');
  host.style.cssText = 'position:fixed;z-index:2147483000;inset:auto 0 0 auto;width:0;height:0;';
  (document.body || document.documentElement).appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var CSS = [
    ':host{all:initial}',
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
    '.wrap{position:fixed;right:22px;bottom:22px;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;color:#f4f3f0;line-height:1.7;-webkit-font-smoothing:antialiased}',

    '.launch{position:relative;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:linear-gradient(145deg,#e0543f,#b23a29);box-shadow:0 10px 30px rgba(224,84,63,.36),0 2px 8px rgba(0,0,0,.35);transition:transform .22s ease,box-shadow .22s ease}',
    '.launch:hover{transform:translateY(-2px) scale(1.03)}',
    '.launch .zi{font-size:18px;font-weight:700;color:#fff;line-height:1.1}',
    '.launch .zi2{font-size:9.5px;color:rgba(255,255,255,.86);letter-spacing:.06em;line-height:1}',
    '.launch .ring{position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(224,84,63,.55);animation:pulse 2.6s ease-out infinite}',
    '@keyframes pulse{0%{transform:scale(.96);opacity:.9}70%{transform:scale(1.22);opacity:0}100%{opacity:0}}',
    '.wrap.open .launch{transform:scale(.86);opacity:0;pointer-events:none}',

    '.tip{position:absolute;right:70px;bottom:12px;background:#14161c;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 14px;font-size:13px;white-space:nowrap;box-shadow:0 12px 30px rgba(0,0,0,.4);opacity:0;transform:translateX(6px);transition:.3s;pointer-events:none}',
    '.tip.show{opacity:1;transform:none;pointer-events:auto;cursor:pointer}',
    '.tip:after{content:"";position:absolute;right:-5px;top:50%;width:9px;height:9px;background:#14161c;border-right:1px solid rgba(255,255,255,.14);border-top:1px solid rgba(255,255,255,.14);transform:translateY(-50%) rotate(45deg)}',

    '.panel{position:fixed;right:22px;bottom:22px;width:392px;height:min(588px,80vh);background:#0b0c10;border:1px solid rgba(255,255,255,.11);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 28px 70px rgba(0,0,0,.62);opacity:0;transform:translateY(14px) scale(.98);transform-origin:100% 100%;transition:opacity .24s ease,transform .24s ease,visibility .24s ease;visibility:hidden;pointer-events:none}',
    '.wrap.open .panel{opacity:1;transform:none;visibility:visible;pointer-events:auto}',

    '.hd{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.085);background:linear-gradient(180deg,rgba(224,84,63,.1),transparent)}',
    '.hd .dot{width:7px;height:7px;border-radius:50%;background:#e0543f;box-shadow:0 0 10px rgba(224,84,63,.9);flex:none}',
    '.hd .t{font-size:14px;font-weight:600;letter-spacing:-.01em}',
    '.hd .sub{font-size:11.5px;color:#8c8c98;margin-top:1px}',
    '.x{margin-left:auto;width:30px;height:30px;border-radius:8px;border:0;background:transparent;color:#8c8c98;font-size:19px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}',
    '.x:hover{background:rgba(255,255,255,.07);color:#f4f3f0}',

    '.log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin}',
    '.log::-webkit-scrollbar{width:5px}',
    '.log::-webkit-scrollbar-thumb{background:rgba(255,255,255,.13);border-radius:4px}',
    '.msg{display:flex;gap:8px}',
    '.msg.u{justify-content:flex-end}',
    '.av{width:24px;height:24px;border-radius:7px;flex:none;font-size:11px;display:flex;align-items:center;justify-content:center;background:rgba(224,84,63,.16);color:#f0a08e;border:1px solid rgba(224,84,63,.3)}',
    '.bub{font-size:13.5px;line-height:1.8;padding:10px 12px;border-radius:11px;max-width:calc(100% - 34px);word-break:break-word}',
    '.msg.a .bub{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075);border-top-left-radius:4px}',
    '.msg.u .bub{background:rgba(224,84,63,.16);border:1px solid rgba(224,84,63,.3);border-top-right-radius:4px}',
    '.bub b{color:#fff;font-weight:600}',
    '.trace{margin-top:8px;padding-top:7px;border-top:1px dashed rgba(255,255,255,.09);font-size:10px;color:#63636f}',
    '.cursor{display:inline-block;width:6px;height:13px;background:#e0543f;vertical-align:-2px;animation:blink 1s steps(2) infinite}',
    '@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}',

    /* 四张起步卡：小白点一下就出答案 */
    '.starters{padding:0 14px 4px;display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.st{text-align:left;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.032);border-radius:11px;padding:11px 12px;cursor:pointer;font-family:inherit;color:#f4f3f0;transition:.2s}',
    '.st:hover{border-color:rgba(224,84,63,.55);background:rgba(224,84,63,.09);transform:translateY(-1px)}',
    '.st b{display:block;font-size:13px;font-weight:600;line-height:1.4}',
    '.st span{display:block;font-size:10.5px;color:#8c8c98;margin-top:3px}',
    '.hint{font-size:11.5px;color:#63636f;padding:2px 2px 10px;text-align:center}',

    '.in{display:flex;align-items:flex-end;gap:8px;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.085)}',
    '.in textarea{flex:1;resize:none;max-height:84px;min-height:40px;padding:10px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035);color:#f4f3f0;font-size:13.5px;line-height:1.5;font-family:inherit;outline:none;transition:.2s}',
    '.in textarea:focus{border-color:rgba(224,84,63,.55);background:rgba(255,255,255,.055)}',
    '.in textarea::placeholder{color:#6b6b77}',
    '.send{flex:none;height:40px;padding:0 16px;border-radius:10px;border:0;background:#e0543f;color:#fff;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer}',
    '.send:hover{background:#b23a29}',
    '.send:disabled{opacity:.45}',

    '@media(max-width:640px){',
    ' .wrap{right:14px;bottom:14px}',
    ' .panel{right:0;left:0;bottom:0;width:auto;height:86vh;border-radius:18px 18px 0 0;border-bottom:0}',
    ' .launch{width:54px;height:54px}',
    ' .tip{right:66px}',
    ' .in{padding-bottom:calc(12px + env(safe-area-inset-bottom))}',
    '}'
  ].join('');

  root.innerHTML =
    '<style>' + CSS + '</style>' +
    '<div class="wrap">' +
      '<div class="tip" id="tip">卡住了？点我，一句话就行</div>' +
      '<button class="launch" id="launch" aria-label="打开智能咨询小助手"><span class="ring"></span><span class="zi">问</span><span class="zi2">智脑</span></button>' +
      '<section class="panel" id="panel" aria-label="智能咨询小助手">' +
        '<div class="hd">' +
          '<span class="dot"></span>' +
          '<div><div class="t">海大叔智脑</div><div class="sub">想说啥就说啥，不用懂术语</div></div>' +
          '<button class="x" id="fold" aria-label="收起">×</button>' +
        '</div>' +
        '<div class="log" id="log"></div>' +
        '<div class="starters" id="starters">' +
          '<button class="st" data-ex="money" data-q="我一个人，现在最该从哪赚到第一笔钱？"><b>我该从哪赚钱</b><span>第一笔钱从哪来</span></button>' +
          '<button class="st" data-ex="opc" data-q="我想一个人开公司，第一步该做什么？"><b>公司怎么开</b><span>一个人也能开</span></button>' +
          '<button class="st" data-ex="ip" data-q="我发的作品没人看，先改哪一步？"><b>账号怎么做</b><span>没人看先改哪</span></button>' +
          '<button class="st" data-ex="judge" data-q="有个客户一直压价，这单我该不该接？"><b>这单接不接</b><span>该不该接、该不该降</span></button>' +
        '</div>' +
        '<div class="hint" id="hint">点一个，或者直接在下面打字</div>' +
        '<div class="in">' +
          '<textarea id="q" rows="1" placeholder="比如：我40岁，想在网上接活，从哪开始"></textarea>' +
          '<button class="send" id="send">发送</button>' +
        '</div>' +
      '</section>' +
    '</div>';

  var $ = function (id) { return root.getElementById(id); };
  var wrap = root.querySelector('.wrap');
  // 底部有 tabbar 的页面（如 /aixinshou/），把悬浮球抬到 tabbar 之上，避免挡住「我的」tab
  (function () {
    var tb = document.getElementById('tabbar');
    if (!tb) return;
    var fit = function () {
      var h = tb.getBoundingClientRect().height || 0;
      if (h > 0) wrap.style.bottom = (h + 14) + 'px';
    };
    fit();
    setTimeout(fit, 400);
    setTimeout(fit, 1200);
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
  })();
  var log = $('log'), qEl = $('q'), sendBtn = $('send'), starters = $('starters'), hint = $('hint');

  function esc(s) { return s.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }
  function md(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }

  function addMsg(role, text) {
    var m = document.createElement('div');
    m.className = 'msg ' + (role === 'user' ? 'u' : 'a');
    if (role === 'user') m.innerHTML = '<div class="bub">' + md(text) + '</div>';
    else m.innerHTML = '<div class="av">智</div><div class="bub"></div>';
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m.querySelector('.bub');
  }

  function hideStarters() {
    starters.style.display = 'none';
    hint.style.display = 'none';
  }

  function open() {
    if (opened) return;
    opened = true;
    wrap.classList.add('open');
    $('tip').classList.remove('show');
    if (!log.children.length) {
      addMsg('assistant', '我是海大叔智脑。\n不用讲究怎么问，大白话说你现在卡在哪就行。\n实在不知道问什么，先在下面点一个。');
    }
    setTimeout(function () { qEl.focus(); }, 260);
  }
  function close() {
    opened = false;
    wrap.classList.remove('open');
  }

  $('launch').addEventListener('click', open);
  $('fold').addEventListener('click', close);
  $('tip').addEventListener('click', open);
  root.querySelectorAll('.st').forEach(function (btn) {
    btn.addEventListener('click', function () {
      hideStarters();
      ask(btn.getAttribute('data-q'), btn.getAttribute('data-ex') || '');
    });
  });

  function autoGrow() {
    qEl.style.height = 'auto';
    qEl.style.height = Math.min(qEl.scrollHeight, 84) + 'px';
  }
  qEl.addEventListener('input', autoGrow);
  qEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault(); submit();
    }
  });
  sendBtn.addEventListener('click', submit);
  function submit() {
    var v = qEl.value.trim();
    if (!v) return;
    qEl.value = ''; autoGrow();
    hideStarters();
    ask(v, '');
  }

  function ask(q, ex) {
    if (busy || !q.trim()) return;
    busy = true; sendBtn.disabled = true;

    addMsg('user', q);
    var bub = addMsg('assistant', '');
    bub.innerHTML = '<span class="cursor"></span>';
    var text = '', traceEl = null;

    var sys = [];
    if (ex && ROLE[ex]) sys.push(ROLE[ex]);
    sys.push('来问的人大多不懂行话。用大白话回答：先给一句结论，再给三步以内的做法，能用例子就用例子。不要用专业术语，不要长段落，不要罗列十几条。');

    var msgs = [{ role: 'system', content: sys.join('\n') }]
      .concat(history.slice(-6))
      .concat([{ role: 'user', content: q }]);

    fetch('/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'zhinao', stream: true, messages: msgs })
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error('接口返回 ' + res.status);
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return finish();
          buf += dec.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var t = lines[i].trim();
            if (!t) continue;
            if (t.charAt(0) === ':') {
              var p = t.slice(1).trim();
              if (p.indexOf('zhinao') === 0) {
                try {
                  var meta = JSON.parse(p.slice(6).trim());
                  var titles = (meta.cards || []).map(function (c) { return c.title; }).filter(Boolean);
                  if (titles.length) {
                    traceEl = document.createElement('div');
                    traceEl.className = 'trace';
                    traceEl.innerHTML = '参考：' + titles.join(' · ');
                  }
                } catch (e) {}
              }
              continue;
            }
            if (t.indexOf('data:') !== 0) continue;
            var payload = t.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              var j = JSON.parse(payload);
              var piece = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
              if (piece) {
                text += piece;
                bub.innerHTML = md(text) + '<span class="cursor"></span>';
                log.scrollTop = log.scrollHeight;
              }
            } catch (e) {}
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (e) {
      text = text || '这回没连上，等一会儿再问一次。';
      finish();
    });

    function finish() {
      if (!text.trim()) text = '这次没生成出内容，换个说法再问一次。';
      bub.innerHTML = md(text);
      if (traceEl) bub.appendChild(traceEl);
      history.push({ role: 'user', content: q });
      history.push({ role: 'assistant', content: text.slice(0, 1200) });
      if (history.length > 12) history = history.slice(-12);
      busy = false; sendBtn.disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && opened) close();
  });

  try {
    if (!localStorage.getItem('zhinao.assist.tip2')) {
      setTimeout(function () {
        if (!opened) $('tip').classList.add('show');
        localStorage.setItem('zhinao.assist.tip2', '1');
        setTimeout(function () { $('tip').classList.remove('show'); }, 9000);
      }, 5000);
    }
  } catch (e) {}
})();
