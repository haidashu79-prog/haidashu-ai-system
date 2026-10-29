/**
 * 智脑 · 网页嵌入组件
 * 用法：
 *   <script src="https://haidashu.pages.dev/zhinao/embed.js"
 *           data-label="问问海大叔"
 *           data-api="https://haidashu.pages.dev/api/v1/chat/completions"></script>
 * 可选：data-side="right|left"  data-accent="#c9a961"
 * 样式用 Shadow DOM 隔离，不影响宿主页面。
 */
(function () {
  var self = document.currentScript;
  if (!self || window.__zhinaoEmbed) return;
  window.__zhinaoEmbed = true;

  var LABEL = self.getAttribute('data-label') || '问问海大叔';
  var API = self.getAttribute('data-api') || 'https://haidashu.pages.dev/api/v1/chat/completions';
  var SIDE = self.getAttribute('data-side') === 'left' ? 'left' : 'right';
  var ACCENT = self.getAttribute('data-accent') || '#c9a961';

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483000;bottom:0;' + SIDE + ':0;width:0;height:0;';
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var css = ''
    + ':host{all:initial}'
    + '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}'
    + '.fab{position:fixed;bottom:24px;' + SIDE + ':24px;display:flex;align-items:center;gap:8px;'
    + 'padding:12px 18px;border-radius:999px;background:#0b0b0d;color:#f0ede6;border:1px solid rgba(255,255,255,.14);'
    + 'font-size:13.5px;letter-spacing:.02em;cursor:pointer;box-shadow:0 8px 30px rgba(0,0,0,.28);'
    + 'transition:transform .2s,border-color .2s}'
    + '.fab:hover{transform:translateY(-2px);border-color:' + ACCENT + '}'
    + '.fab i{width:7px;height:7px;border-radius:50%;background:' + ACCENT + '}'
    + '.win{position:fixed;bottom:24px;' + SIDE + ':24px;width:380px;max-width:calc(100vw - 32px);height:560px;'
    + 'max-height:calc(100vh - 48px);background:#0b0b0d;border:1px solid rgba(255,255,255,.12);border-radius:6px;'
    + 'display:none;flex-direction:column;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.5);color:#f0ede6}'
    + '.win.on{display:flex}'
    + '.hd{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.09)}'
    + '.hd b{font-size:14px;font-weight:600;letter-spacing:.08em}'
    + '.hd span{font-size:10px;color:#6a6a73;letter-spacing:.2em}'
    + '.hd .x{margin-left:auto;cursor:pointer;color:#6a6a73;font-size:18px;line-height:1;padding:0 4px}'
    + '.hd .x:hover{color:#f0ede6}'
    + '.bd{flex:1;overflow-y:auto;padding:16px;font-size:14px;line-height:1.85}'
    + '.msg{margin-bottom:14px;white-space:pre-wrap;word-break:break-word}'
    + '.msg.u{text-align:right}'
    + '.msg.u span{display:inline-block;background:rgba(255,255,255,.07);padding:9px 13px;border-radius:4px;text-align:left;max-width:86%}'
    + '.msg.a{color:#e8e5de}'
    + '.msg.a .tag{display:block;font-size:10.5px;color:' + ACCENT + ';letter-spacing:.1em;margin-bottom:6px}'
    + '.ft{border-top:1px solid rgba(255,255,255,.09);padding:12px;display:flex;gap:8px}'
    + 'textarea{flex:1;resize:none;height:44px;padding:11px 12px;background:#111116;color:#f0ede6;'
    + 'border:1px solid rgba(255,255,255,.12);border-radius:3px;font-size:13.5px;line-height:1.5;outline:none;font-family:inherit}'
    + 'textarea:focus{border-color:' + ACCENT + '}'
    + 'button{border:0;background:#f0ede6;color:#0b0b0d;font-size:13px;font-weight:600;padding:0 16px;'
    + 'border-radius:3px;cursor:pointer;font-family:inherit}'
    + 'button:disabled{opacity:.45;cursor:default}'
    + '.ftr{font-size:10px;color:#5a5a63;text-align:center;padding:0 0 10px}';

  root.innerHTML = ''
    + '<style>' + css + '</style>'
    + '<div class="fab"><i></i>' + LABEL + '</div>'
    + '<div class="win">'
    + '  <div class="hd"><b>智脑</b><span>HAI DASHU · BRAIN</span><div class="x">×</div></div>'
    + '  <div class="bd"><div class="msg a"><span class="tag">智脑</span>问点具体的。中年重起步、账号没流量、一条稿怎么起头，都能问。</div></div>'
    + '  <div class="ft"><textarea placeholder="想问什么？"></textarea><button>问</button></div>'
    + '  <div class="ftr">由 海大叔 AI 新媒体工作室 提供</div>'
    + '</div>';

  var fab = root.querySelector('.fab');
  var win = root.querySelector('.win');
  var bd = root.querySelector('.bd');
  var ta = root.querySelector('textarea');
  var btn = root.querySelector('button');
  var x = root.querySelector('.x');

  fab.addEventListener('click', function () {
    win.classList.toggle('on');
    fab.style.display = win.classList.contains('on') ? 'none' : 'flex';
    if (win.classList.contains('on')) ta.focus();
  });
  x.addEventListener('click', function () {
    win.classList.remove('on');
    fab.style.display = 'flex';
  });

  var busy = false;

  function bubble(role, text) {
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    if (role === 'u') {
      var s = document.createElement('span');
      s.textContent = text;
      d.appendChild(s);
    } else {
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '智脑';
      d.appendChild(tag);
      d.appendChild(document.createTextNode(text));
    }
    bd.appendChild(d);
    bd.scrollTop = bd.scrollHeight;
    return d;
  }

  function send() {
    var q = (ta.value || '').trim();
    if (!q || busy) return;
    busy = true;
    btn.disabled = true;
    ta.value = '';
    bubble('u', q);
    var box = bubble('a', '');
    var body = box;
    var acc = '';

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'zhinao', stream: true, messages: [{ role: 'user', content: q }] })
    }).then(function (res) {
      if (!res.body) throw new Error('不支持流式输出');
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buf += dec.decode(r.value, { stream: true });
          var frames = buf.split('\n\n');
          buf = frames.pop() || '';
          frames.forEach(function (fr) {
            fr.split('\n').forEach(function (line) {
              line = line.trim();
              if (!line || line.charAt(0) === ':') return;
              if (line.indexOf('data:') !== 0) return;
              var p = line.slice(5).trim();
              if (!p || p === '[DONE]') return;
              try {
                var j = JSON.parse(p);
                var piece = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
                if (piece) {
                  acc += piece;
                  body.lastChild && body.lastChild.nodeType === 3
                    ? (body.lastChild.textContent = acc)
                    : body.appendChild(document.createTextNode(acc));
                  bd.scrollTop = bd.scrollHeight;
                }
              } catch (e) {}
            });
          });
          return pump();
        });
      }
      return pump();
    }).catch(function (e) {
      acc += '（没接上：' + (e && e.message ? e.message : '网络问题') + '）';
    }).then(function () {
      if (!acc) body.appendChild(document.createTextNode('（没答上来，稍后再试）'));
      busy = false;
      btn.disabled = false;
    });
  }

  btn.addEventListener('click', send);
  ta.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
})();
