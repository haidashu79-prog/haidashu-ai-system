/* gate.js —— 全站 AI 提问的统一登录闸门
 * ------------------------------------------------------------------
 * 任何页面只要引这一行，用户没登录时点发送就会弹登录框，登录完自动放行。
 * 覆盖两类问答入口：
 *   /api/expert  页面问答（教育、法务、报价、工作台、星座等）
 *   /api/v1      智脑主页、法律应用、案例应用（OpenAI 兼容通道）
 * 例外：/api/v1/models 只是拉模型清单，不拦。
 *
 * 为什么不在每个页面里各写一遍：写 12 遍就会有 12 个地方会漏。
 * 拦在 fetch 这一层，新加页面自动生效。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  if (window.__hsdGate) return;
  window.__hsdGate = true;

  var loading = null;

  function loadAuth() {
    if (window.HSDAuth) return Promise.resolve(window.HSDAuth);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/assets/auth.js';
      s.onload = function () { window.HSDAuth ? resolve(window.HSDAuth) : reject(new Error('auth')); };
      s.onerror = function () { reject(new Error('auth-load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  var rawFetch = window.fetch;

  window.fetch = function (input, init) {
    var url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) { }

    var isAsk = /\/api\/(expert|v1)(\/|$|\?)/.test(url) && url.indexOf('/api/v1/models') < 0;
    if (!isAsk) return rawFetch.apply(this, arguments);

    var self = this, args = arguments;
    return loadAuth()
      .then(function (A) { return A.require('登录后才能提问 · 免费，10 秒'); })
      .catch(function () { return null; })
      .then(function (user) {
        if (!user) {
          return new Response(
            JSON.stringify({ ok: false, needLogin: true, error: '没有登录，先登录再问（免费，10 秒）' }),
            { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
          );
        }
        return rawFetch.apply(self, args);
      });
  };
})();
