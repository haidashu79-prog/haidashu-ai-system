/* auth.js —— 海大叔账号体系前端（简单版）
 * ------------------------------------------------------------------
 * 手机号 + 密码，不发短信不发验证码，注册即登录，保持 30 天。
 * 用法：
 *   HSDAuth.me()          → Promise<user|null>，拿当前登录状态
 *   HSDAuth.require()     → 未登录就弹框，登录成功后 resolve(user)
 *   HSDAuth.open()        → 主动打开登录框
 *   HSDAuth.logout()      → 退出
 *   HSDAuth.gate(el)      → 在元素里渲染"登录/已登录 xxx"
 * ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var API = '/api/auth';
  var cache = null;          // undefined=未查, null=未登录, object=已登录
  var inflight = null;
  var pending = [];          // 等待登录成功的回调
  var listeners = [];        // 登录状态变化监听（面板、页面都能挂）

  /* ---------- 样式 ---------- */
  function injectStyle() {
    if (document.getElementById('hsdauth-style')) return;
    var css = ''
      + '.hsda-mask{position:fixed;inset:0;background:rgba(43,33,25,.5);backdrop-filter:blur(3px);'
      + 'z-index:9998;display:flex;align-items:center;justify-content:center;padding:18px}'
      + '.hsda-box{background:#FBF6EE;border:1px solid rgba(140,95,50,.2);border-radius:20px;width:100%;max-width:380px;'
      + 'padding:24px 22px 20px;box-shadow:0 24px 60px rgba(43,33,25,.28);font-family:inherit;position:relative}'
      + '.hsda-box h3{margin:0 0 4px;font-size:19px;color:#2B2119;letter-spacing:-.2px}'
      + '.hsda-box .sub{font-size:12.5px;color:#7C6A57;line-height:1.7;margin:0 0 16px}'
      + '.hsda-box label{display:block;font-size:12px;color:#7C6A57;margin:12px 0 5px;font-weight:600}'
      + '.hsda-box input{width:100%;box-sizing:border-box;padding:11px 12px;font-size:15px;font-family:inherit;'
      + 'border:1.5px solid rgba(140,95,50,.2);border-radius:11px;background:#fff;color:#2B2119;outline:none}'
      + '.hsda-box input:focus{border-color:#C2571C;box-shadow:0 0 0 3px rgba(194,87,28,.1)}'
      + '.hsda-box .go{width:100%;margin-top:18px;padding:12px;font-size:15px;font-weight:700;font-family:inherit;'
      + 'background:#C2571C;color:#fff;border:0;border-radius:11px;cursor:pointer}'
      + '.hsda-box .go:disabled{opacity:.6;cursor:default}'
      + '.hsda-box .swap{margin-top:13px;text-align:center;font-size:12.5px;color:#7C6A57}'
      + '.hsda-box .swap b{color:#C2571C;cursor:pointer;font-weight:600}'
      + '.hsda-box .err{margin-top:11px;font-size:12.5px;color:#C0392B;background:#FFF1EF;border:1px solid rgba(192,57,43,.22);'
      + 'border-radius:9px;padding:8px 10px;display:none;line-height:1.6}'
      + '.hsda-box .fine{margin-top:14px;font-size:11.5px;color:#A8998A;line-height:1.65;text-align:center}'
      + '.hsda-x{position:absolute;top:12px;right:14px;border:0;background:none;font-size:20px;color:#A8998A;cursor:pointer;line-height:1}'
      + '.hsda-who{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#7C6A57}'
      + '.hsda-who b{color:#C2571C}'
      + '.hsda-who button{border:1px solid rgba(140,95,50,.25);background:#fff;color:#7C6A57;border-radius:20px;'
      + 'padding:3px 10px;font-size:11.5px;font-family:inherit;cursor:pointer}';
    var st = document.createElement('style');
    st.id = 'hsdauth-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 请求 ---------- */
  function post(path, data) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data || {}),
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: '服务返回异常' }; });
    });
  }

  function me(force) {
    if (!force && cache !== null && cache !== undefined) return Promise.resolve(cache);
    if (inflight) return inflight;
    inflight = fetch(API + '/me', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) { cache = (j && j.ok && j.user) || null; return cache; })
      .catch(function () { cache = null; return null; })
      .then(function (u) { inflight = null; return u; });
    return inflight;
  }

  /* ---------- 登录框 ---------- */
  var mode = 'login'; // login | register

  function build() {
    injectStyle();
    if (document.getElementById('hsda-mask')) return document.getElementById('hsda-mask');

    var mask = document.createElement('div');
    mask.id = 'hsda-mask';
    mask.className = 'hsda-mask';
    mask.style.display = 'none';
    mask.innerHTML = ''
      + '<div class="hsda-box" role="dialog" aria-modal="true">'
      + '  <button class="hsda-x" data-close aria-label="关闭">×</button>'
      + '  <h3 data-title>登录一下，再开始问</h3>'
      + '  <p class="sub" data-sub>不收费，也不用等验证码。手机号当账号，密码自己设，30 天内不用再登。</p>'
      + '  <label>手机号</label>'
      + '  <input type="tel" inputmode="numeric" maxlength="11" placeholder="11 位手机号" data-phone autocomplete="username">'
      + '  <label>密码</label>'
      + '  <input type="password" maxlength="64" placeholder="至少 6 位" data-pass autocomplete="current-password">'
      + '  <div class="err" data-err></div>'
      + '  <button class="go" data-go>登录</button>'
      + '  <div class="swap" data-swap></div>'
      + '  <div class="fine">只用来记录你问过什么，不发给任何人，也不做营销推送。</div>'
      + '</div>';
    document.body.appendChild(mask);

    var phone = mask.querySelector('[data-phone]');
    var pass = mask.querySelector('[data-pass]');
    var err = mask.querySelector('[data-err]');
    var go = mask.querySelector('[data-go]');
    var title = mask.querySelector('[data-title]');
    var sub = mask.querySelector('[data-sub]');
    var swap = mask.querySelector('[data-swap]');

    function paint() {
      var reg = mode === 'register';
      title.textContent = reg ? '注册一个，10 秒' : '登录一下，再开始问';
      sub.textContent = reg
        ? '手机号只当账号用，不发短信、不要验证码，也不会给你打电话。'
        : '不收费，也不用等验证码。登录后 30 天内不用再输密码。';
      go.textContent = reg ? '注册并开始' : '登录';
      swap.innerHTML = reg
        ? '已经有账号了？<b data-to="login">直接登录</b>'
        : '第一次来？<b data-to="register">注册一个</b>';
      pass.setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
      err.style.display = 'none';
    }
    paint();

    swap.addEventListener('click', function (e) {
      var t = e.target.getAttribute && e.target.getAttribute('data-to');
      if (t) { mode = t; paint(); phone.focus(); }
    });
    mask.querySelector('[data-close]').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    function submit() {
      var p = phone.value.replace(/\s|-/g, '');
      var pw = pass.value;
      if (!/^1[3-9]\d{9}$/.test(p)) { showErr('手机号填完整，11 位'); phone.focus(); return; }
      if (pw.length < 6) { showErr('密码至少 6 位'); pass.focus(); return; }
      go.disabled = true;
      go.textContent = mode === 'register' ? '正在注册…' : '正在登录…';
      post(mode === 'register' ? '/register' : '/login', { phone: p, pass: pw }).then(function (j) {
        go.disabled = false;
        paint();
        if (j && j.ok && j.user) {
          cache = j.user;
          close(true);
          flush(j.user);
          fire(j.user);
        } else {
          showErr((j && j.error) || '没成功，再试一次');
        }
      }).catch(function () {
        go.disabled = false;
        paint();
        showErr('网络不太行，再试一次');
      });
    }
    function showErr(t) { err.textContent = t; err.style.display = 'block'; }

    go.addEventListener('click', submit);
    [phone, pass].forEach(function (el) {
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    });

    return mask;
  }

  function open(why) {
    var mask = build();
    var sub = mask.querySelector('[data-sub]');
    if (why) { sub.textContent = why; }
    mask.style.display = 'flex';
    setTimeout(function () { var p = mask.querySelector('[data-phone]'); if (p && !p.value) p.focus(); }, 60);
  }

  function close(keepPending) {
    var mask = document.getElementById('hsda-mask');
    if (mask) mask.style.display = 'none';
    // keepPending：登录成功后的正常收起，不能把等待中的回调当成"放弃"
    if (keepPending) return;
    // 用户自己关掉 = 放弃，回调以 null 结算，避免 UI 卡在"等登录"
    var ps = pending; pending = [];
    ps.forEach(function (cb) { cb(null); });
  }

  function flush(user) {
    var ps = pending; pending = [];
    ps.forEach(function (cb) { cb(user); });
  }

  function fire(user) {
    listeners.forEach(function (f) { try { f(user); } catch (e) {} });
  }

  /* ---------- 对外 ---------- */
  var HSDAuth = {
    me: me,
    open: open,
    close: close,
    /** 注册登录状态变化回调，立刻返回当前状态 */
    onChange: function (fn) {
      if (typeof fn === 'function') { listeners.push(fn); me().then(fn); }
    },

    require: function (why) {
      return me().then(function (u) {
        if (u) return u;
        return new Promise(function (resolve) {
          pending.push(resolve);
          open(why);
        });
      });
    },

    logout: function () {
      return post('/logout').then(function () {
        cache = null;
        fire(null);
        return null;
      });
    },

    /** 往元素里渲染"登录 / 已登录 xxx"，返回更新函数 */
    gate: function (el) {
      if (!el) return function () {};
      function render(u) {
        if (u) {
          el.innerHTML = '<span class="hsda-who">已登录 <b>' + (u.nickname || u.phone) + '</b>'
            + '<a href="/me/" style="color:#C2571C;text-decoration:none;border-bottom:1px dashed rgba(194,87,28,.5)">我的记录</a>'
            + '<button data-logout>退出</button></span>';
          var b = el.querySelector('[data-logout]');
          if (b) b.addEventListener('click', function () { HSDAuth.logout().then(function () { render(null); }); });
        } else {
          el.innerHTML = '<span class="hsda-who">还没登录<button data-login>登录 / 注册</button></span>';
          var b2 = el.querySelector('[data-login]');
          if (b2) b2.addEventListener('click', function () { HSDAuth.require(); });
        }
      }
      me().then(render);
      listeners.push(render);
      return render;
    },
  };

  global.HSDAuth = HSDAuth;
})(window);
