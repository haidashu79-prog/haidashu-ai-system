/* api-shim.js — 静态演示外壳
 * ------------------------------------------------------------------
 * 金策终端的原始版本跑在自己的 Node 后端上（server.js），接口是 /api/*。
 * 放到纯静态站点上以后没有后端，所以这里把每个 /api/* 请求映射到
 * static/*.json —— 那些 JSON 是从原后端真实抓下来的快照（真实行情、
 * 真实预判留档、真实自学习权重），不是编的假数据。
 *
 * 目的：让完整版在静态站点上「打开就能用」，不阉割任何模块。
 * 必须在 app.js 之前引入（app.js 在解析阶段就会读 localStorage 里的 token）。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';

  // —— ① 预置登录态：原版首次打开会要求注册/登录，这里直接给一个已开通账号 ——
  //    bk_token 只用于跳过锁屏；真正的账号资料由 /api/auth/me 的快照提供。
  try {
    if (!localStorage.getItem('bk_token')) localStorage.setItem('bk_token', 'demo-static-snapshot');
    if (localStorage.getItem('bk_key')) localStorage.removeItem('bk_key'); // 清掉可能残留的管理口令
  } catch (_) {}

  var BASE = './static/';

  function json(data, status) {
    // 返回一个和 fetch Response 同形的最小对象：app.js 只用 status / ok / json()
    var code = status || 200;
    return Promise.resolve({
      ok: code >= 200 && code < 300,
      status: code,
      statusText: code === 200 ? 'OK' : 'ERR',
      json: function () { return Promise.resolve(data); },
      text: function () { return Promise.resolve(JSON.stringify(data)); }
    });
  }

  // 先扣住原生 fetch，后面替换 window.fetch 之后还要靠它读本地快照
  var _native = window.fetch.bind(window);

  function load(file) {
    return _native(BASE + file, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(file + ' ' + r.status);
      return r.json();
    });
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = ((init && init.method) || 'GET').toUpperCase();

    // 非 /api/ 的请求（ECharts 之类）原样放行
    if (url.indexOf('/api/') === -1) return _native(input, init);

    var path = url.split('/api/')[1] || '';
    var qs = '';
    var qi = path.indexOf('?');
    if (qi >= 0) { qs = path.slice(qi + 1); path = path.slice(0, qi); }
    path = path.replace(/\/+$/, '');

    var params = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });

    // —— ② 只读数据接口：一律回本地快照 ——
    if (path === 'analyze') {
      var asset = (params.asset || 'gold').toLowerCase();
      var file = (asset === 'silver' || asset === 'xag') ? 'analyze_silver.json' : 'analyze_gold.json';
      return load(file).then(function (d) { return json(d); });
    }
    if (path === 'auth/me') return load('me.json').then(function (d) { return json(d); });
    if (path === 'learning') return load('learning.json').then(function (d) { return json(d); });
    if (path === 'alerts' && method === 'GET') return load('alerts.json').then(function (d) { return json(d); });
    if (path === 'auto-pilot') return load('auto-pilot.json').then(function (d) { return json(d); });
    if (path === 'forecast-review') return load('forecast-review.json').then(function (d) { return json(d); });

    // —— ③ 写操作 / 后台接口：静态站点没有后端，回一个语义正确的最小响应，
    //      让页面不报错、不弹「网络异常」。页面本身的图表和研判卡全部来自上面的快照。——
    if (path === 'auth/login' || path === 'auth/register') {
      return json({ ok: true, token: 'demo-static-snapshot', user: { username: 'haidashu_demo' }, trial: { state: 'paid', isPaid: true, daysLeft: 9999 } });
    }
    if (path === 'auth/logout') return json({ ok: true });
    if (path === 'access') return json({ ok: true });
    if (path === 'redeem') return json({ ok: true, status: { state: 'paid', isPaid: true, daysLeft: 9999 } });
    if (path === 'alerts') return json({ ok: true, alerts: [] });          // POST 新增 / DELETE 删除
    if (path === 'learn') {                                                 // 手动学习：回当前权重状态
      return load('learning.json').then(function (d) { return json({ ok: true, state: d.state }); });
    }
    if (path === 'bootstrap') return json({ ok: true, samples: 120, overallAcc: 0.5 });
    if (path === 'audit') {
      return json({
        total: 1, devices: 1, ips: 1, alert: false, alertMsg: '',
        recent: [{ ts: new Date().toISOString(), ip: '127.0.0.1', ua: navigator.userAgent, deviceId: 'demo', isCurrent: true }]
      });
    }

    // 未映射的接口：返回空对象而不是 404，避免整页中断
    return json({ ok: false });
  };
})();
