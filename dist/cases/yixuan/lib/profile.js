/* =============================================================
   易玄机 · 会话档案
   —— 填过的整套信息（生辰、起卦的问事/方向/方式、问事的原话、
      生辰八字默认值）一次存下，下次进来自动带出来。
      只改想改的那一项，不想改的不用重填。
   跟 me.js 一个路子：localStorage 写不进时落内存兜底，
      存不住就明说，不装成存好了。
   ============================================================= */
(function () {
  'use strict';
  var Y = window.YXJ = window.YXJ || {};

  var KEY = 'yxj_profile_v1';
  /* 写不进去时的内存兜底：同一页内反复进不丢 */
  var MEMO = null;

  function load() {
    var v;
    try { v = localStorage.getItem(KEY); } catch (e) { v = null; }
    if (v == null) v = MEMO ? JSON.stringify(MEMO) : null;
    try { return JSON.parse(v || 'null'); } catch (e) { return null; }
  }
  /* 合并存：patch 只带要改的字段，未带的字段保留旧的 */
  function save(patch) {
    var cur = load() || {};
    for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) cur[k] = patch[k]; }
    var ok = false;
    try { localStorage.setItem(KEY, JSON.stringify(cur)); ok = true; } catch (e) { }
    if (!ok) MEMO = cur;
    return { o: cur, ok: ok };
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { }
    MEMO = null;
  }
  /* 把起卦页三件套（问事/方式/方向）存回去 */
  function gua(input) {
    var p = {};
    if (input.guaQ != null) p.guaQ = String(input.guaQ).trim();
    if (input.guaWay) p.guaWay = input.guaWay;
    if (input.guaCat) p.guaCat = input.guaCat;
    return save(p);
  }
  /* 问易玄机的原话存回去 */
  function ask(input) {
    var p = {};
    if (input.askInput != null) p.askInput = String(input.askInput).trim();
    return save(p);
  }
  /* 生辰八字页默认值存回去 */
  function bazi(input) {
    var p = {};
    if (input.bzY != null) p.bzY = input.bzY;
    if (input.bzM != null) p.bzM = input.bzM;
    if (input.bzD != null) p.bzD = input.bzD;
    if (input.bzH != null) p.bzH = input.bzH;
    if (input.bzMi != null) p.bzMi = input.bzMi;
    if (input.bzS != null) p.bzS = input.bzS;
    return save(p);
  }
  /* 起卦页回填：返回 {guaQ, guaWay, guaCat}，没有就返回 {} */
  function forGua() {
    var p = load();
    if (!p) return {};
    var o = {};
    if (p.guaQ) o.guaQ = p.guaQ;
    if (p.guaWay) o.guaWay = p.guaWay;
    if (p.guaCat) o.guaCat = p.guaCat;
    return o;
  }
  /* 问易玄机回填 */
  function forAsk() {
    var p = load();
    return p && p.askInput ? { askInput: p.askInput } : {};
  }
  /* 生辰八字回填 */
  function forBazi() {
    var p = load();
    if (!p) return {};
    var o = {};
    if (p.bzY != null) o.bzY = p.bzY;
    if (p.bzM != null) o.bzM = p.bzM;
    if (p.bzD != null) o.bzD = p.bzD;
    if (p.bzH != null) o.bzH = p.bzH;
    if (p.bzMi != null) o.bzMi = p.bzMi;
    if (p.bzS != null) o.bzS = p.bzS;
    return o;
  }

  Y.PROF = {
    KEY: KEY,
    load: load, save: save, clear: clear,
    gua: gua, ask: ask, bazi: bazi,
    forGua: forGua, forAsk: forAsk, forBazi: forBazi
  };
})();
