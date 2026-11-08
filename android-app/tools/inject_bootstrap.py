#!/usr/bin/env python3
# 往打包进 APK 的 index.html 注入引导脚本：
# 把站内相对路径的 /api/... 重写到线上服务器（https://haidashu.com.cn）。
# 只改 APK 内的副本，不动 site/ 源码；重复执行幂等。
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
TARGET = os.path.join(ROOT, "app", "src", "main", "assets", "www", "cases", "yixuan", "index.html")
MARK = "YIXJ_APP_BOOTSTRAP"

BOOTSTRAP = """<script id="YIXJ_APP_BOOTSTRAP">
/* App 壳引导：本页打包在 APK 里，站内相对 API 指到线上服务器 */
(function () {
  var BASE = 'https://haidashu.com.cn';
  var _fetch = window.fetch;
  if (_fetch) {
    window.fetch = function (input, init) {
      try {
        if (typeof input === 'string' && input.charAt(0) === '/') input = BASE + input;
        else if (input && typeof input.url === 'string' && input.url.charAt(0) === '/' && typeof Request === 'function') {
          input = new Request(BASE + input.url, { method: input.method, headers: input.headers, body: input.body, mode: 'cors', credentials: 'omit' });
        }
      } catch (e) {}
      return _fetch.call(window, input, init);
    };
  }
  try {
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try { if (typeof url === 'string' && url.charAt(0) === '/') url = BASE + url; } catch (e) {}
      return _open.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
    };
  } catch (e) {}
})();
</script>"""


def main():
    if not os.path.exists(TARGET):
        print("未找到 " + TARGET + "，请先跑 pack_assets.sh")
        sys.exit(1)
    html = open(TARGET, encoding="utf-8").read()
    if MARK in html:
        print("bootstrap 已注入，跳过")
        return
    low = html.lower()
    idx = low.find("<head>")
    if idx < 0:
        print("找不到 <head>，注入失败")
        sys.exit(1)
    pos = idx + len("<head>")
    html = html[:pos] + "\n" + BOOTSTRAP + html[pos:]
    open(TARGET, "w", encoding="utf-8").write(html)
    print("bootstrap 注入完成 ->", TARGET)


if __name__ == "__main__":
    main()
