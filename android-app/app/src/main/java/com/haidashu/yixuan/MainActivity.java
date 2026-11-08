package com.haidashu.yixuan;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

/**
 * 易玄机 · 安卓 App
 * 页面整套打包在 APK 里（assets/www/cases/yixuan），断网也能排盘、看八字、查黄历；
 * AI 问答和语音走线上接口（fetch 引导脚本把 /api 指到 haidashu.com.cn）。
 * 页面用 WebViewAssetLoader 挂在正式 https 源上，localStorage/WASM/CORS 都稳。
 */
public class MainActivity extends android.app.Activity {

    private static final String START_URL =
            "https://appassets.androidplatform.net/assets/www/cases/yixuan/index.html";
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String SITE_BASE = "https://haidashu.com.cn";
    private static final String PAPER = "#f7f3e9";

    private WebView web;
    private ProgressBar bar;
    private long lastBack = 0L;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor(PAPER));

        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setVisibility(View.GONE);
        root.addView(bar, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));

        web = new WebView(this);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setBackgroundColor(Color.parseColor(PAPER));
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // 让语音能播
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(s.getUserAgentString() + " YixuanApp/1.0");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try { s.setForceDark(WebSettings.FORCE_DARK_OFF); } catch (Throwable ignored) {}
        }

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                bar.setProgress(p);
                bar.setVisibility(p >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                android.util.Log.i("YXJ", "[console] " + m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                return true;
            }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                WebResourceResponse r = assetLoader.shouldInterceptRequest(req.getUrl());
                if (r == null) android.util.Log.i("YXJ", "[pass] " + req.getUrl());
                return r;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                android.util.Log.i("YXJ", "[start] " + url);
                // 尽早装上错误钩子：任何未捕获异常 / promise 拒绝都打到 console -> logcat
                view.evaluateJavascript(
                    "window.onerror=function(m,s,l){console.error('ONERR:'+m+' @'+s+':'+l);return false;};" +
                    "window.addEventListener('unhandledrejection',function(ev){" +
                    "console.error('UNREJ:'+((ev&&ev.reason&&(ev.reason.message||ev.reason))||'unknown'));});",
                    null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                android.util.Log.i("YXJ", "[done] " + url);
                view.evaluateJavascript(
                    "(function(){var v=document.getElementById('view'),m=document.getElementById('modal');" +
                    "return JSON.stringify({viewLen:v?v.innerHTML.length:-9,viewKids:v?v.children.length:-4," +
                    "modalLen:m?m.innerHTML.length:-8,hash:location.hash,ready:document.readyState});})()",
                    v -> android.util.Log.i("YXJ", "[dom] " + v));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    return handleUrl(req.getUrl().toString());
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                android.util.Log.i("YXJ", "[err] " + req.getUrl() + " code=" + (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? err.getErrorCode() : 0) + " desc=" + (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? err.getDescription() : ""));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && req.isForMainFrame()) {
                    showOffline();
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int code, String desc, String failingUrl) {
                android.util.Log.i("YXJ", "[err-old] " + failingUrl + " code=" + code + " desc=" + desc);
                showOffline();
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
    }

    /**
     * 站内页（App 源 / 海大叔域名）留在 App 里；
     * App 源上的「/start/」这类站根路径映射到线上站外开；
     * 其余外链交给系统。
     */
    private boolean handleUrl(String url) {
        if (url == null) return false;
        Uri u = Uri.parse(url);
        String host = u.getHost() == null ? "" : u.getHost();

        if (APP_HOST.equals(host)) {
            String path = u.getPath() == null ? "" : u.getPath();
            if (path.startsWith("/start/")) {
                openExternal(SITE_BASE + "/start/");
                return true;
            }
            return false; // 其余都在 App 里
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            if (host.endsWith("haidashu.com.cn") || host.endsWith("haidashu.pages.dev")) {
                return false; // 自己的域名，留在 App 里
            }
            openExternal(url);
            return true;
        }
        return false;
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "打不开这个链接", Toast.LENGTH_SHORT).show();
        }
    }

    private void showOffline() {
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>body{background:#f7f3e9;color:#232a2b;font-family:sans-serif;margin:0;height:100vh;"
                + "display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}"
                + "h2{color:#2f6b5c;font-weight:600}p{color:#4b5456;line-height:1.8;font-size:15px}</style></head><body><div>"
                + "<h2>页面没打开</h2><p>请退出重进一次试试。</p></div></body></html>";
        web.loadDataWithBaseURL(START_URL, html, "text/html", "utf-8", null);
    }

    private int dp(int v) {
        return Math.round(getResources().getDisplayMetrics().density * v);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
            return;
        }
        long now = System.currentTimeMillis();
        if (now - lastBack < 2000) {
            super.onBackPressed();
        } else {
            lastBack = now;
            Toast.makeText(this, "再按一次退出", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }
}
