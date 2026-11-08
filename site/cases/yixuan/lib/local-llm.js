/* =============================================================
   易玄机 · 浏览器本地推理（兜底算力）
   -------------------------------------------------------------
   不花一分钱、不占云端每日额度：当免费档 Workers AI 的每日 Neurons
   额度用尽（或请求失败）时，自动在你自己的设备（手机/电脑）上跑一个小
   模型把卦断出来。首次需下载模型（0.5B 约 0.5G、1.5B 约 1.2G），之后
   本机缓存，再问秒开。WebGPU 优先，不支持就退回 WASM，都无需联网再问。

   暴露：window.YXJ_LOCAL
     - supported()        当前浏览器是否跑得动（几乎都行，WASM 兜底）
     - status             'idle' | 'loading' | 'ready' | 'error'
     - progress           0~100 下载进度
     - device             'webgpu' | 'wasm'
     - setModel(id)       切换模型（0.5B 轻 / 1.5B 准）
     - load()             加载模型（返回 Promise，重复调用安全）
     - chat(askReq)       兼容 LC.chat 的流式生成器，yield {choices:[{delta:{content}}]}
     - onStatus(fn)       状态/进度变化回调（UI 用）
   ============================================================= */
(function () {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2/dist/transformers.js';

  var M = {
    lib: null,
    pipe: null,
    loading: null,
    status: 'idle',
    progress: 0,
    device: null,
    modelId: 'onnx-community/Qwen2.5-1.5B-Instruct',
    // 选项：手机/老电脑没 WebGPU 的，默认用小一点、下载快的
    modelOpts: [
      { id: 'onnx-community/Qwen2.5-0.5B-Instruct', label: '轻量 0.5B（首次约 0.5G，较快）' },
      { id: 'onnx-community/Qwen2.5-1.5B-Instruct', label: '标准 1.5B（首次约 1.2G，更准）' }
    ],
    _files: null,
    _cb: null,

    supported: function () {
      if (typeof window === 'undefined') return false;
      // WASM 兜底，现代浏览器都支持；此处只挡住没有 Web 环境的极端情况
      return typeof WebAssembly === 'object';
    },

    modelLabel: function () {
      for (var i = 0; i < this.modelOpts.length; i++) {
        if (this.modelOpts[i].id === this.modelId) return this.modelOpts[i].label;
      }
      return this.modelId;
    },

    setModel: function (id) {
      for (var i = 0; i < this.modelOpts.length; i++) {
        if (this.modelOpts[i].id === id) {
          if (this.pipe && this.modelId !== id) this.unload(); // 已加载别的，先卸了换
          this.modelId = id;
          return true;
        }
      }
      return false;
    },

    onStatus: function (fn) { this._cb = fn; if (fn) fn(this.status, this.progress, this.modelLabel()); },

    emit: function () { if (this._cb) { try { this._cb(this.status, this.progress, this.modelLabel()); } catch (e) { } } },

    _prog: function (p) {
      if (!p) return;
      if (p.status === 'progress' && p.file) {
        this._files = this._files || {};
        this._files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
        var lo = 0, to = 0, k;
        for (k in this._files) { lo += this._files[k].loaded; to += this._files[k].total; }
        if (to > 0) { this.progress = Math.min(99, Math.round((lo / to) * 100)); this.emit(); }
      }
    },

    ensureLib: function () {
      var self = this;
      if (self.lib) return Promise.resolve(self.lib);
      // 动态 import ESM（普通脚本里也能用），从 CDN 取 transformers.js
      return import(CDN).then(function (mod) {
        self.lib = mod;
        try { mod.env.allowLocalModels = false; } catch (e) { }   // 永远从 HF Hub 取，不碰本地路径
        try { mod.env.backends.onnx.wasm.proxy = false; } catch (e) { }
        return mod;
      });
    },

    load: function () {
      var self = this;
      if (self.pipe) return Promise.resolve(self.pipe);
      if (self.loading) return self.loading;
      self.status = 'loading'; self.progress = 0; self._files = {}; self.emit();

      self.loading = self.ensureLib().then(function (mod) {
        var Mk = function (device) {
          return mod.pipeline('text-generation', self.modelId, {
            device: device,
            dtype: 'q4',
            progress_callback: function (p) { self._prog(p); }
          }).then(function (pipe) { self.device = device; return pipe; });
        };
        // 有 WebGPU 先试 GPU；失败退回 WASM（手机/老浏览器）
        var p = (navigator.gpu ? Mk('webgpu') : Promise.reject(new Error('no-webgpu')));
        return p.catch(function () { return Mk('wasm'); });
      }).then(function (pipe) {
        self.pipe = pipe; self.status = 'ready'; self.progress = 100; self.loading = null; self.emit();
        return pipe;
      }).catch(function (e) {
        self.status = 'error'; self.progress = 0; self.loading = null; self.emit();
        throw e;
      });
      return self.loading;
    },

    /* 兼容 LC.chat(askReq) 的异步生成器：逐字吐 token，UI 不用改 */
    chat: async function* (askReq) {
      var self = this;
      if (!self.supported()) throw new Error('本地推理不可用');
      var pipe = await self.load();
      var messages = (askReq && askReq.messages || []).map(function (m) {
        return { role: m.role, content: String(m.content == null ? '' : m.content) };
      });
      var maxNew = Math.min(Math.max(parseInt((askReq && askReq.max_tokens) || 600, 10) || 600, 80), 768);
      var temp = (askReq && askReq.temperature != null) ? askReq.temperature : 0.75;
      var signal = askReq && askReq.signal;
      var queue = [], done = false, err = null;

      var TextStreamer = self.lib.TextStreamer;
      var streamer = new TextStreamer(pipe.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: function (t) { if (t) queue.push(t); }
      });

      var gen = pipe(messages, {
        max_new_tokens: maxNew,
        do_sample: true,
        temperature: temp,
        top_p: 0.9,
        repetition_penalty: 1.12,
        streamer: streamer
      }).then(function () { done = true; }).catch(function (e) { err = e; done = true; });

      while (!done || queue.length) {
        if (signal && signal.aborted) break;
        if (queue.length) {
          var t = queue.shift();
          yield { choices: [{ delta: { content: t } }] };
        } else {
          await new Promise(function (r) { setTimeout(r, 25); });
        }
      }
      if (err) throw err;
    },

    unload: function () {
      try { if (this.pipe && this.pipe.dispose) this.pipe.dispose(); } catch (e) { }
      this.pipe = null; this.loading = null; this.status = 'idle'; this.progress = 0; this._files = null; this.emit();
    }
  };

  // 没 WebGPU（多半是手机/老浏览器）→ 默认用更轻的 0.5B，省下载、跑得动
  try { if (!navigator.gpu) M.modelId = 'onnx-community/Qwen2.5-0.5B-Instruct'; } catch (e) { }

  window.YXJ_LOCAL = M;
})();
