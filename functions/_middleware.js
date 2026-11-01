/**
 * 海大叔 · 主域收敛
 * 规则：www.haidashu.com.cn 与 haidashu.pages.dev 一律 301 到 https://haidashu.com.cn
 * 例外：/api/* 不拦（POST 被 301 会变成 GET 丢 body，接口必须直连）
 *       预览域名 xxxx.haidashu.pages.dev 不拦（便于上线前验证）
 */

const CANONICAL = 'https://haidashu.com.cn';

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  if (url.pathname.startsWith('/api/')) return next();

  const isPreview = /^[0-9a-f]{6,}\.haidashu\.pages\.dev$/.test(host);
  const isApexPages = host === 'haidashu.pages.dev';
  const isWww = host === 'www.haidashu.com.cn';

  if ((isApexPages || isWww) && !isPreview) {
    return Response.redirect(CANONICAL + url.pathname + url.search, 301);
  }

  return next();
}
