#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""中文法律智库 · 全库检索命令行（供智脑调用）

数据来自「普法工委法律专家团」应用内置的中国法律法规全库
（国家法律法规数据库现行有效的宪法、法律、行政法规、监察法规、司法解释）。

用法：
    python3 lawq.py stats                          # 全库规模
    python3 lawq.py cat 行政法规                    # 按分类列法律
    python3 lawq.py find 劳动合同                   # 按名称找法律
    python3 lawq.py art 民法典 577                  # 取指定条文原文
    python3 lawq.py search 违约金 押金 --top 8      # 全库关键词检索条文
    python3 lawq.py search 竞业限制 --law 劳动合同法  # 只在某部法律里检索

输出为纯文本，直接可读，便于引用与核对。
"""

import argparse
import json
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA = os.path.join(os.path.dirname(_HERE), "data")
DATA = os.environ.get("LAWQ_DATA") or DEFAULT_DATA
IDX = os.path.join(DATA, "laws_index.json")

_cache = {}


def norm(s):
    return re.sub(r"[\s\u3000]", "", s or "").replace("中华人民共和国", "")


def load_index():
    if "idx" not in _cache:
        with open(IDX, encoding="utf-8") as f:
            _cache["idx"] = json.load(f)
    return _cache["idx"]


def load_law(entry):
    key = entry["id"]
    if key not in _cache:
        path = os.path.join(DATA, (entry.get("file") or ("data/statutes/" + key + ".json")).replace("data/", ""))
        with open(path, encoding="utf-8") as f:
            _cache[key] = json.load(f)
    return _cache[key]


CN = "零一二三四五六七八九十百千"


def cn2num(s):
    d = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    u = {"十": 10, "百": 100, "千": 1000}
    total = sec = num = 0
    for ch in s:
        if ch in d:
            num = d[ch]
        elif ch in u:
            if num == 0:
                num = 1
            sec += num * u[ch]
            num = 0
        else:
            return None
    return total + sec + num


def split_art(a):
    lines = a.split("\n")
    head = (lines[0] or "").replace("## ", "")
    return head, "\n".join(lines[1:])


def cmd_stats(_):
    idx = load_index()
    cats = {}
    for x in idx:
        cats[x.get("cat") or "其他"] = cats.get(x.get("cat") or "其他", 0) + 1
    arts = 0
    for x in idx:
        arts += int(x.get("nart") or 0)
    print("全库：%d 部法律，约 %d 条" % (len(idx), arts))
    for c, n in sorted(cats.items(), key=lambda kv: -kv[1]):
        print("  %-24s %4d 部" % (c, n))
    print("数据目录：%s" % DATA)
    return 0


def cmd_cat(args):
    idx = load_index()
    hit = [x for x in idx if args.cat in (x.get("cat") or "")]
    if not hit:
        print("没有这个分类。可用分类：")
        print("  ".join(sorted({x.get("cat") or "其他" for x in idx})))
        return 1
    for x in hit:
        print("%-40s %s条  %s" % (x["name"], x.get("nart") or "?", x.get("sxrq") or ""))
    print("共 %d 部" % len(hit))
    return 0


def cmd_find(args):
    idx = load_index()
    q = norm(args.name)
    exact = [x for x in idx if norm(x["name"]) == q]
    part = [x for x in idx if q in norm(x["name"]) and x not in exact]
    for x in exact + part[:40]:
        mark = "★" if x in exact else " "
        print("%s %-44s %s条  %s  %s" % (mark, x["name"], x.get("nart") or "?", x.get("cat") or "", x.get("sxrq") or ""))
    if not exact and not part:
        print("没找到《%s》。换个简称试试，或用 search 直接检索条文。" % args.name)
        return 1
    return 0


def cmd_art(args):
    idx = load_index()
    q = norm(args.law)
    cands = [x for x in idx if norm(x["name"]) == q] or [x for x in idx if q in norm(x["name"])]
    if not cands:
        print("没找到《%s》" % args.law)
        return 1
    entry = cands[0]
    data = load_law(entry)
    raw = args.article.strip()
    raw = re.sub(r"^第|条$", "", raw)
    if raw.isdigit():
        want = int(raw)
        suffix = ""
    else:
        m = re.match(r"^([%s]+)(之[%s]+)?$" % (CN, CN), raw)
        if not m:
            print("条文号看不懂：%s（示例：577 或 五百七十七）" % args.article)
            return 1
        want = cn2num(m.group(1))
        suffix = m.group(2) or ""
    for a in data["articles"]:
        head, body = split_art(a)
        m = re.match(r"^第([%s]+)条(之[%s]+)?" % (CN, CN), head)
        if not m:
            continue
        if cn2num(m.group(1)) == want and (m.group(2) or "") == suffix:
            print("《%s》%s" % (entry["name"], head))
            print("-" * 46)
            print(body.strip())
            print("-" * 46)
            print("公布：%s ｜ 施行：%s ｜ 分类：%s" % (entry.get("gbrq") or "-", entry.get("sxrq") or "-", entry.get("cat") or "-"))
            return 0
    print("《%s》里没找到第%s条。可用条文号大致范围 1—%s。" % (entry["name"], raw, entry.get("nart") or "?"))
    return 1


def cmd_search(args):
    idx = load_index()
    kw = args.keyword
    pool = idx
    if args.law:
        q = norm(args.law)
        pool = [x for x in idx if q in norm(x["name"])]
        if not pool:
            print("没找到《%s》" % args.law)
            return 1
    results = []
    for entry in pool:
        try:
            data = load_law(entry)
        except Exception:
            continue
        for a in data["articles"]:
            if kw in a:
                n = a.count(kw)
                results.append((n, entry, a))
    results.sort(key=lambda r: -r[0])
    if not results:
        print("全库里没检索到「%s」。" % kw)
        return 1
    for n, entry, a in results[: args.top]:
        head, body = split_art(a)
        body = body.strip()
        if len(body) > 320:
            body = body[:320] + "……"
        print("《%s》%s" % (entry["name"], head))
        print(body)
        print("  — %s ｜ 施行 %s" % (entry.get("cat") or "-", entry.get("sxrq") or "-"))
        print()
    print("共命中 %d 处，显示前 %d 处。" % (len(results), min(args.top, len(results))))
    return 0


def main():
    ap = argparse.ArgumentParser(add_help=True)
    sub = ap.add_subparsers(dest="cmd")

    sub.add_parser("stats")

    p = sub.add_parser("cat")
    p.add_argument("cat")

    p = sub.add_parser("find")
    p.add_argument("name")

    p = sub.add_parser("art")
    p.add_argument("law")
    p.add_argument("article")

    p = sub.add_parser("search")
    p.add_argument("keyword")
    p.add_argument("--law", default="")
    p.add_argument("--top", type=int, default=8)

    args = ap.parse_args()
    if not args.cmd:
        print(__doc__)
        return 0
    if not os.path.exists(IDX):
        print("找不到法条库：%s" % IDX)
        return 2
    return {"stats": cmd_stats, "cat": cmd_cat, "find": cmd_find,
            "art": cmd_art, "search": cmd_search}[args.cmd](args) or 0


if __name__ == "__main__":
    sys.exit(main())
