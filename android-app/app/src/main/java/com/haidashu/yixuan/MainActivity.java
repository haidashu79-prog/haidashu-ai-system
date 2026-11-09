package com.haidashu.yixuan;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
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

import java.util.Locale;

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

    /** 自检广播：adb 发一条就能把全部页面走一遍并打点（正式使用不受影响） */
    private static final String ACTION_SELFCHECK = "com.haidashu.yixuan.SELFCHECK";
    private BroadcastReceiver selfcheck;

    /** 系统语音引擎：网页里的 speechSynthesis 在 WebView 里不存在，这里补上 */
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile boolean ttsZh = false;

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

        initTts();
        web.addJavascriptInterface(new Bridge(), "YXJNative");
        // 保留 WebView 调试通道：只有本机 adb 能连，用于排查页面问题
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        selfcheck = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) { runSelfCheck(); }
        };
        IntentFilter f = new IntentFilter(ACTION_SELFCHECK);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(selfcheck, f, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(selfcheck, f);
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
                    "var n=window.YXJNative;" +
                    "return JSON.stringify({viewLen:v?v.innerHTML.length:-9,viewKids:v?v.children.length:-4," +
                    "modalLen:m?m.innerHTML.length:-8,hash:location.hash,ready:document.readyState," +
                    "bridge:typeof n,info:(n&&n.info?n.info():'-')," +
                    "speech:typeof window.speechSynthesis,wasm:typeof WebAssembly,gpu:!!navigator.gpu});})()",
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

    /** 依次打开每个页面，把渲染结果打进 logcat：[self] {"p":"#/bazi","len":1234,"txt":"..."} */
    private void runSelfCheck() {
        final String[] pages = {"#/home", "#/gua", "#/bazi", "#/qimen", "#/almanac",
                "#/fengshui", "#/wuxing", "#/classics", "#/learn", "#/memory", "#/ask", "#/admin"};
        final Handler h = new Handler(Looper.getMainLooper());
        android.util.Log.i("YXJ", "[self] BEGIN pages=" + pages.length);
        for (int i = 0; i < pages.length; i++) {
            final String p = pages[i];
            h.postDelayed(new Runnable() {
                @Override public void run() {
                    web.evaluateJavascript("location.hash='" + p + "'", null);
                }
            }, i * 900L);
            h.postDelayed(new Runnable() {
                @Override public void run() {
                    web.evaluateJavascript(
                        "(function(){var v=document.getElementById('view');" +
                        "var t=v?v.innerText.replace(/\\s+/g,' ').slice(0,44):'';" +
                        "return JSON.stringify({p:location.hash,len:v?v.innerHTML.length:-1,kids:v?v.children.length:-1,txt:t});})()",
                        val -> android.util.Log.i("YXJ", "[self] " + val));
                }
            }, i * 900L + 650L);
        }
        h.postDelayed(new Runnable() {
            @Override public void run() {
                android.util.Log.i("YXJ", "[self] DONE");
                web.evaluateJavascript("location.hash='#/home'", null);
            }
        }, pages.length * 900L + 600L);
    }

    /** 初始化系统 TTS：中文可用就报 tts=1，没装中文语音包就报 tts=0（网页据此决定提示语） */
    private void initTts() {
        tts = new TextToSpeech(getApplicationContext(), new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status != TextToSpeech.SUCCESS) {
                    android.util.Log.i("YXJ", "[tts] init failed status=" + status);
                    return;
                }
                ttsReady = true;
                int r = tts.setLanguage(Locale.SIMPLIFIED_CHINESE);
                ttsZh = !(r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED);
                tts.setSpeechRate(1.0f);
                tts.setPitch(1.0f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) {}
                    @Override public void onDone(final String id) { notifyJsDone(id); }
                    @Override public void onError(String id) { notifyJsDone(id); }
                });
                android.util.Log.i("YXJ", "[tts] ready zh=" + ttsZh);
            }
        });
    }

    private void notifyJsDone(final String id) {
        if (web == null || id == null) return;
        runOnUiThread(new Runnable() {
            @Override public void run() {
                web.evaluateJavascript("window.__yxjTtsDone&&window.__yxjTtsDone('" + id + "')", null);
            }
        });
    }

    /**
     * 给网页用的原生能力桥（window.YXJNative）。
     * 补 WebView 缺的三样：语音合成、剪贴板、系统提示。其余全走网页自己的实现。
     */
    public class Bridge {
        @JavascriptInterface
        public String info() {
            return "{\"app\":true,\"ver\":\"1.0\",\"tts\":" + (ttsReady && ttsZh ? 1 : 0)
                    + ",\"platform\":\"android\"}";
        }

        @JavascriptInterface
        public boolean ttsSpeak(String text, float rate, String id) {
            if (tts == null || !ttsReady || text == null) return false;
            try {
                tts.setSpeechRate(rate <= 0f ? 1.0f : rate);
                // 单条过长会被系统截断，按 800 字切段依次排队
                int step = 800;
                for (int i = 0; i < text.length(); i += step) {
                    String seg = text.substring(i, Math.min(text.length(), i + step));
                    String uid = (id == null ? "yxj" : id) + "_" + i;
                    int mode = (i == 0) ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
                    tts.speak(seg, mode, null, uid);
                }
                return true;
            } catch (Throwable e) {
                android.util.Log.i("YXJ", "[tts] speak fail " + e);
                return false;
            }
        }

        @JavascriptInterface
        public void ttsStop() {
            try { if (tts != null) tts.stop(); } catch (Throwable ignored) {}
        }

        @JavascriptInterface
        public void copy(String text) {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("易玄机", text == null ? "" : text));
            } catch (Throwable ignored) {}
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Toast.makeText(MainActivity.this, msg == null ? "" : msg, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void open(String url) {
            final String u = url == null ? "" : url;
            runOnUiThread(new Runnable() {
                @Override public void run() { openExternal(u); }
            });
        }
    }

    @Override
    protected void onDestroy() {
        try { if (selfcheck != null) unregisterReceiver(selfcheck); } catch (Throwable ignored) {}
        try {
            if (tts != null) { tts.stop(); tts.shutdown(); }
        } catch (Throwable ignored) {}
        if (web != null) {
            try {
                web.removeJavascriptInterface("YXJNative");
                web.destroy();
            } catch (Throwable ignored) {}
        }
        super.onDestroy();
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
