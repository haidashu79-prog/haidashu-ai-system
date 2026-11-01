/* 手机端 App 外壳：顶部标题栏 + 底部 Tab 栏（任何页面都能单独引用） */
(function () {
  var CFG = window.P3D || {};
  var path = location.pathname.replace(/\/index\.html$/, '/');
  var TABS = [
    { h: '/', t: '首页', ic: '<path d="M3.4 10.6 12 3.4l8.6 7.2"/><path d="M5.8 9.6V20h12.4V9.6"/>' },
    { h: '/zhinao/', t: '智脑', ic: '<path d="M4 5.2h16v10.6H9.2L4 19.6z"/>' },
    { h: '/products/', t: '产品', ic: '<rect x="3.6" y="3.6" width="7" height="7" rx="1.8"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.8"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.8"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.8"/>' },
    { h: '/cases/', t: '案例', ic: '<path d="M3.4 7.4h5.8l2 2.2h9.4v9.4H3.4z"/>' },
    { h: '/experts/', t: '专家', ic: '<circle cx="12" cy="8" r="3.4"/><path d="M5.2 20c.9-3.9 3.6-5.9 6.8-5.9s5.9 2 6.8 5.9"/>' }
  ];
  /* 只有恰好落在某个 Tab 上才高亮；像 素材库 / 模板库 这种没进 Tab 的页面，
     一个都不高亮，别硬指到「首页」上去。 */
  var cur = TABS.filter(function (x) { return x.h === path; })[0] ||
    TABS.filter(function (x) { return x.h !== '/' && path.indexOf(x.h) === 0; })[0] || null;

  var bar = document.createElement('div');
  bar.className = 'p3appbar';
  bar.innerHTML =
    '<a class="ic" href="/" aria-label="回首页">⌂</a>' +
    '<div class="t">' + (CFG.appTitle || document.title.split(/[·|｜]/)[0] || '海大叔') + '</div>' +
    '<a class="ic" href="/zhinao/" aria-label="问智脑">问</a>';
  document.body.insertBefore(bar, document.body.firstElementChild);

  var tab = document.createElement('div');
  tab.className = 'p3tab';
  tab.innerHTML = TABS.map(function (x) {
    return '<a href="' + x.h + '"' + (x === cur ? ' class="on"' : '') + '>' +
      '<svg viewBox="0 0 24 24">' + x.ic + '</svg><span>' + x.t + '</span></a>';
  }).join('');
  document.body.appendChild(tab);
  document.body.classList.add('p3app');

  /* 站点右下角那个「问」悬浮球（影子 DOM）会压住 Tab 栏，打个标记后隐藏 */
  function tagAssist() {
    for (var i = 0; i < document.body.children.length; i++) {
      var k = document.body.children[i];
      if (k.shadowRoot && !k.hasAttribute('data-hds-assist')) {
        k.setAttribute('data-hds-assist', '1');
        return true;
      }
    }
    return false;
  }
  if (!tagAssist()) {
    var tick = 0, iv = setInterval(function () {
      if (tagAssist() || ++tick > 50) clearInterval(iv);
    }, 50);
  }
})();
