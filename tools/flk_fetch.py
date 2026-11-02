#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从「国家法律法规数据库」(flk.npc.gov.cn) 抓取现行有效法规全文，
解析成「普法工委法律专家团」应用使用的法条数据格式。

数据格式（与原库一致）：
    {"id": "...", "name": "中华人民共和国民法典", "articles": ["## 第一条\n正文……", ...]}

用法：
    python3 flk_fetch.py list            # 只统计各分类数量
    python3 flk_fetch.py fetch           # 全量抓取（可重复运行，自动断点续传）
    python3 flk_fetch.py fetch --cat 110 # 只抓某一分类
"""

import json
import os
import re
import sys
import threading
import time
import urllib.parse
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.adapters import HTTPAdapter

BASE = "https://flk.npc.gov.cn"
LIST_API = BASE + "/law-search/search/list"
DETAIL_API = BASE + "/law-search/search/flfgDetails?bbbs="
DL_API = BASE + "/law-search/download/pc?bbbs={}&format={}"
DL_BATCH = BASE + "/law-search/download/batch"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
HEADERS = {
    "Referer": BASE + "/",
    "Origin": BASE,
    "User-Agent": UA,
    "Accept": "*/*",
}

_session_local = threading.local()


def _session():
    s = getattr(_session_local, "s", None)
    if s is None:
        s = requests.Session()
        s.headers.update(HEADERS)
        ad = HTTPAdapter(pool_connections=8, pool_maxsize=16, max_retries=0)
        s.mount("https://", ad)
        s.mount("http://", ad)
        _session_local.s = s
    return s

ROOT = "/Users/a1234/Desktop/haidashu-ai-system"
OUT_DATA = os.path.join(ROOT, "dist/legal/data")
OUT_STATUTES = os.path.join(OUT_DATA, "statutes_x")
CACHE = os.path.join(ROOT, ".cache/flk")
LOG = os.path.join(ROOT, ".cache/flk_fetch.log")

# 中央层面分类（地方性法规、自治条例体量过大，另行处理）
CATEGORIES = [
    (100, "宪法", "宪法"),
    (110, "宪法相关法", "法律"),
    (120, "民法商法", "法律"),
    (130, "行政法", "法律"),
    (140, "经济法", "法律"),
    (150, "社会法", "法律"),
    (155, "生态环境法", "法律"),
    (160, "刑法", "法律"),
    (170, "诉讼与非诉讼程序法", "法律"),
    (180, "法律解释", "法律解释"),
    (190, "有关法律问题的决定", "法律解释"),
    (195, "宪法修正案", "宪法"),
    (210, "行政法规", "行政法规"),
    (215, "行政法规·修改废止决定", "修改、废止的决定"),
    (220, "监察法规", "监察法规"),
    (311, "司法解释", "司法解释"),
    (320, "高法司法解释", "司法解释"),
    (330, "高检司法解释", "司法解释"),
    (340, "联合发布司法解释", "司法解释"),
]

SXX_VALID = [3, 4]  # 3=有效 4=尚未生效

_lock = threading.Lock()
_done = {"ok": 0, "skip": 0, "fail": 0}


def log(msg):
    line = "[%s] %s" % (time.strftime("%H:%M:%S"), msg)
    with _lock:
        print(line, flush=True)
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def _req(url, data=None, timeout=40, retries=3):
    last = None
    for attempt in range(retries):
        try:
            s = _session()
            if data is not None:
                r = s.post(url, data=data,
                           headers={"Content-Type": "application/json;charset=UTF-8"},
                           timeout=timeout)
            else:
                r = s.get(url, timeout=timeout)
            if r.status_code >= 400:
                raise RuntimeError("HTTP %s" % r.status_code)
            return r.content
        except Exception as e:
            last = e
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise last


_pace_lock = threading.Lock()
_last_req = [0.0]
MIN_INTERVAL = 1.2  # 两次主站请求的最小间隔（秒），太快会被 WAF 拦


def _pace():
    with _pace_lock:
        wait = _last_req[0] + MIN_INTERVAL - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_req[0] = time.time()


def _cool_down(sec=90):
    log("触发站点风控，冷却 %d 秒后重新建立会话" % sec)
    time.sleep(sec)
    _session_local.s = None
    try:
        _session().get(BASE + "/", timeout=25)
    except Exception:
        pass


def _json(url, data=None, timeout=40, retries=5):
    """请求并解析 JSON，遇到限流/非 JSON 响应自动冷却重试。"""
    last = None
    for attempt in range(retries):
        try:
            _pace()
            raw = _req(url, data=data, timeout=timeout)
            txt = raw.decode("utf-8", "ignore").strip()
            if not txt.startswith("{"):
                raise ValueError("非 JSON 响应: " + txt[:120])
            return json.loads(txt)
        except Exception as e:
            last = e
            if attempt == retries - 1:
                raise
            if "非 JSON" in str(e) or "HTTP 4" in str(e) or "HTTP 5" in str(e):
                _cool_down(90)
            else:
                time.sleep(min(20, 2 ** attempt) + 1)
    raise last


def api_list(cat=None, page=1, size=100, sxx=None):
    payload = {
        "searchRange": 1, "sxrq": [], "gbrq": [], "searchType": 2,
        "sxx": SXX_VALID if sxx is None else sxx,
        "gbrqYear": [], "flfgCodeId": [cat] if cat else [],
        "zdjgCodeId": [], "searchContent": "",
        "orderByParam": {"order": "-1", "sort": ""},
        "pageNum": page, "pageSize": size,
    }
    return _json(LIST_API, data=json.dumps(payload).encode("utf-8"))


def api_detail(bbbs):
    d = _json(DETAIL_API + urllib.parse.quote(bbbs))
    return d.get("data") or {}


def api_download_url(bbbs, fmt="docx"):
    d = _json(DL_API.format(urllib.parse.quote(bbbs), fmt))
    return (d.get("data") or {}).get("url")


def batch_urls(bbbs_list, fmt="docx"):
    """一次请求拿一批下载地址。download/pc 和 flfgDetails 会被 WAF 挑战，
    而 download/batch 是 POST，可以正常用。"""
    payload = [{"bbbs": b, "format": fmt} for b in bbbs_list]
    d = _json(DL_BATCH, data=json.dumps(payload).encode("utf-8"))
    out = {}
    for i, item in enumerate(d.get("data") or []):
        if i < len(bbbs_list):
            out[bbbs_list[i]] = (item or {}).get("url")
    return out


def download_docx(bbbs, url=None):
    """下载并缓存 docx；返回本地路径，失败返回 None。"""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, bbbs + ".docx")
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return path
    if not url:
        url = api_download_url(bbbs)
    if not url:
        return None
    blob = _req(url, timeout=120)
    if len(blob) < 2000 or not blob.startswith(b"PK"):
        # 常见于 OSS 返回限流页/错误页
        return None
    with open(path, "wb") as f:
        f.write(blob)
    return path


# ---------------------------------------------------------------- docx 解析

def docx_paragraphs(path):
    try:
        with zipfile.ZipFile(path) as z:
            try:
                xml = z.read("word/document.xml").decode("utf-8", "ignore")
            except KeyError:
                return []
    except (zipfile.BadZipFile, OSError):
        try:
            os.remove(path)
        except OSError:
            pass
        return []
    paras = re.findall(r"<w:p(?:\s[^>]*)?>.*?</w:p>", xml, re.S)
    out = []
    for p in paras:
        ts = re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", p, re.S)
        if not ts:
            continue
        t = "".join(ts)
        t = (t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
              .replace("&quot;", '"').replace("&apos;", "'"))
        t = t.replace("\u00a0", " ").strip()
        if t:
            out.append(t)
    return out


CN_DIGITS = {"零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
             "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
CN_UNITS = {"十": 10, "百": 100, "千": 1000}


def cn2num(s):
    if not s:
        return None
    if s.isdigit():
        return int(s)
    total, section, num = 0, 0, 0
    for ch in s:
        if ch in CN_DIGITS:
            num = CN_DIGITS[ch]
        elif ch in CN_UNITS:
            unit = CN_UNITS[ch]
            if num == 0:
                num = 1
            section += num * unit
            num = 0
        else:
            return None
    return total + section + num


NUM = "一二三四五六七八九十百千零两〇"
ARTICLE_RE = re.compile(r"^第([%s]+)条(之[%s]+)?(?:[\s\u3000]*(.*))?$" % (NUM, NUM), re.S)
DIV_RE = re.compile(r"^第([%s]+)(编|分编|章|节)[\s\u3000]*(.*)$" % NUM)
ITEM_RE = re.compile(r"^([%s]+)、[\s\u3000]*(.*)$" % NUM, re.S)
ALSO_DIV = ("附则", "附　则", "序言", "序　言", "总则", "总　则")
NOTE_RE = re.compile(r"^（.*?(通过|修订|修正|公布).*?）$")

# 只收中央层面（地方性法规、自治条例、经济特区法规体量过大，另行处理）
ALLOWED_FLXZ = {
    "宪法", "法律", "法律解释", "行政法规", "监察法规", "司法解释",
    "有关法律问题和重大问题的决定", "修正案", "修改、废止的决定",
}


def _is_div(p):
    t = p.replace("\u3000", "").strip()
    if t in ("附则", "序言", "总则"):
        return True
    return bool(DIV_RE.match(p))


def _norm(s):
    return re.sub(r"[\s\u3000]", "", s or "")


def body_start(paras):
    """定位正文起点：跳过封面和目录，返回正文第一段的索引。"""
    arts = []
    for i, p in enumerate(paras):
        m = ARTICLE_RE.match(p)
        if m:
            arts.append((i, cn2num(m.group(1))))
    first_art = None
    for k in range(len(arts) - 2):
        if arts[k][1] == 1 and arts[k + 1][1] == 2 and arts[k + 2][1] == 3:
            first_art = arts[k][0]
            break
    if first_art is None:
        # 没有连续条号（决定、修正案等），从目录之后开始
        for i, p in enumerate(paras):
            if _norm(p) in ("目录",):
                return i + 1
        return 0

    heads = [(i, p) for i, p in enumerate(paras[:first_art]) if _is_div(p)]
    if not heads:
        return first_art
    top = _norm(heads[0][1])
    same = [i for i, p in heads if _norm(p) == top]
    if len(same) >= 2:
        return same[-1]          # 目录里出现一次、正文里再出现一次，取后一次
    return heads[0][0]


def build_articles(paras):
    start = body_start(paras)
    body = [p.strip() for p in paras[start:] if p.strip() and not NOTE_RE.match(p.strip())]
    if not body:
        return []

    has_article = any(ARTICLE_RE.match(p) for p in body)
    if not has_article:
        # 决定、修正案、法律解释：按「一、二、三、」分条
        items = [p for p in body if ITEM_RE.match(p)]
        if len(items) >= 2:
            out = []
            for p in body:
                m = ITEM_RE.match(p)
                if m:
                    out.append("## %s、%s" % (m.group(1), m.group(2).strip()))
                elif out:
                    out[-1] = out[-1] + "\n" + p
                else:
                    out.append("## " + p)
            return out
        # 纯散文式（如立法解释），整篇成一段
        head = "## " + body[0].split("\n")[0][:60]
        rest = "\n".join(body[1:]) if len(body) > 1 else ""
        first = body[0]
        return [(head + "\n" + first if rest else head + "\n" + first)] if len(body) == 1 \
            else ["## " + body[0].split("\n")[0][:60] + "\n" + "\n".join(body)]

    entries = []
    for t in body:
        m = ARTICLE_RE.match(t)
        if m:
            no = "第%s条%s" % (m.group(1), m.group(2) or "")
            b = (m.group(3) or "").strip()
            entries.append("## %s\n%s" % (no, b) if b else "## %s" % no)
            continue
        if _is_div(t):
            entries.append("## " + t.replace("\u3000", " "))
            continue
        if entries:
            entries[-1] = entries[-1] + "\n" + t
        else:
            entries.append("## " + t.replace("\u3000", " "))
    return entries


def clean_name(title):
    t = (title or "").strip()
    t = re.sub(r"<[^>]+>", "", t)
    return t


# ---------------------------------------------------------------- 主流程

_index_path = os.path.join(OUT_DATA, "laws_index_ext.json")


def load_index():
    if os.path.exists(_index_path):
        with open(_index_path, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_index(idx):
    tmp = _index_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False)
    os.replace(tmp, _index_path)


def process_one(item, url, idx_by_bbbs, cat_label):
    bbbs = item["bbbs"]
    if bbbs in idx_by_bbbs:
        with _lock:
            _done["skip"] += 1
        return None
    title = clean_name(item.get("title"))
    docx = download_docx(bbbs, url)
    if not docx:
        return ("fail", bbbs, title, "无 docx")
    paras = docx_paragraphs(docx)
    if not paras:
        return ("fail", bbbs, title, "解析为空")
    arts = build_articles(paras)
    if not arts:
        return ("fail", bbbs, title, "无条文")
    return ("ok", bbbs, {
        "bbbs": bbbs,
        "name": title,
        "articles": arts,
        "cat": item.get("flxz") or cat_label,
        "flxz": item.get("flxz") or "",
        "zdjg": item.get("zdjgName") or "",
        "gbrq": item.get("gbrq") or "",
        "sxrq": item.get("sxrq") or "",
        "sxx": item.get("sxx"),
    })


def cmd_fetch(only_cat=None):
    os.makedirs(OUT_STATUTES, exist_ok=True)
    index = load_index()
    idx_by_bbbs = {x["bbbs"]: x for x in index}
    next_num = max([x["num"] for x in index], default=1000) + 1

    cats = [c for c in CATEGORIES if only_cat is None or c[0] == only_cat]
    for code, label, flxz in cats:
        page, total = 1, None
        items = []
        cache_path = os.path.join(CACHE, "list_%s.json" % code)
        os.makedirs(CACHE, exist_ok=True)
        if os.path.exists(cache_path):
            with open(cache_path, encoding="utf-8") as f:
                items = json.load(f)
            log("  复用本地缓存的分类清单（%d 部），不再请求站点" % len(items))
        else:
            while True:
                try:
                    r = api_list(code, page, 200)
                except Exception as e:
                    log("列表失败 cat=%s page=%s: %s" % (code, page, str(e)[:80]))
                    break
                if r.get("code") != 200:
                    log("列表失败 cat=%s page=%s: %s" % (code, page, r.get("msg")))
                    break
                rows = r.get("rows") or []
                items.extend(rows)
                total = r.get("total") or 0
                if len(items) >= total or not rows:
                    break
                page += 1
            if items:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(items, f, ensure_ascii=False)
        log("分类 %s(%s) 共 %d 部待处理" % (label, code, len(items)))
        keep = [it for it in items if (it.get("flxz") or "") in ALLOWED_FLXZ]
        drop = len(items) - len(keep)
        if drop:
            log("  过滤掉非中央层面文档 %d 部（地方性法规/自治条例等）" % drop)
        items = keep

        batch = []
        todo = [it for it in items if it["bbbs"] not in idx_by_bbbs]
        log("  其中已入库 %d 部，本次需要抓 %d 部" % (len(items) - len(todo), len(todo)))
        CHUNK = 40
        for s in range(0, len(todo), CHUNK):
            part = todo[s:s + CHUNK]
            urls = {}
            for attempt in range(3):
                try:
                    urls = batch_urls([it["bbbs"] for it in part])
                    if urls:
                        break
                except Exception as e:
                    log("  批量取下载地址失败（第%d次）：%s" % (attempt + 1, str(e)[:80]))
                if attempt < 2:
                    time.sleep(200)
                    _session_local.s = None
            if not urls:
                with _lock:
                    _done["fail"] += len(part)
                log("  跳过 %d 部（下载地址多次取不到）" % len(part))
                continue
            for it in part:
                try:
                    res = process_one(it, urls.get(it["bbbs"]), idx_by_bbbs, label)
                except Exception as e:
                    with _lock:
                        _done["fail"] += 1
                    log("  异常 %s: %s" % (it.get("bbbs"), str(e)[:120]))
                    continue
                if res is None:
                    continue
                if res[0] == "fail":
                    with _lock:
                        _done["fail"] += 1
                    log("  失败 %s %s —— %s" % (res[1], res[2][:40], res[3]))
                    continue
                _, bbbs, data = res
                with _lock:
                    num = next_num
                    next_num += 1
                    sid = "x%05d" % num
                    fname = sid + ".json"
                    with open(os.path.join(OUT_STATUTES, fname), "w", encoding="utf-8") as f:
                        json.dump({"id": sid, "name": data["name"],
                                   "articles": data["articles"]}, f, ensure_ascii=False)
                    entry = {
                        "bbbs": bbbs, "num": num, "id": sid,
                        "name": data["name"],
                        "file": "data/statutes_x/" + fname,
                        "cat": data["cat"], "flxz": data["flxz"],
                        "zdjg": data["zdjg"], "gbrq": data["gbrq"],
                        "sxrq": data["sxrq"], "sxx": data["sxx"],
                        "nart": sum(1 for a in data["articles"] if a.startswith("## 第") and "条" in a.split("\n")[0]),
                    }
                    index.append(entry)
                    idx_by_bbbs[bbbs] = entry
                    batch.append(entry)
                    _done["ok"] += 1
                if len(batch) >= 10:
                    save_index(index)
                    batch = []
                    log("  进度 ok=%d skip=%d fail=%d 当前《%s》%d条"
                        % (_done["ok"], _done["skip"], _done["fail"], data["name"][:26],
                           sum(1 for a in data["articles"] if a.startswith("## 第"))))
        save_index(index)
        log("分类 %s 处理完毕，累计 ok=%d skip=%d fail=%d"
            % (label, _done["ok"], _done["skip"], _done["fail"]))

    save_index(index)
    log("全部完成 ok=%d skip=%d fail=%d 索引条目=%d"
        % (_done["ok"], _done["skip"], _done["fail"], len(index)))


def cmd_list():
    for code, label, _ in CATEGORIES:
        r = api_list(code, 1, 1)
        print("%-16s code=%4d 现行有效 %5d 部" % (label, code, r.get("total") or 0))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "fetch"
    only = None
    if "--cat" in sys.argv:
        only = int(sys.argv[sys.argv.index("--cat") + 1])
    if cmd == "list":
        cmd_list()
    elif cmd == "fetch":
        cmd_fetch(only)
    elif cmd == "test":
        bbbs = sys.argv[2]
        d = api_detail(bbbs)
        p = download_docx(bbbs)
        paras = docx_paragraphs(p)
        arts = build_articles(paras)
        print("标题:", d.get("title"), "| 段落:", len(paras), "| 条目:", len(arts))
        for a in arts[:6]:
            print("  ", repr(a[:100]))
    else:
        print(__doc__)
