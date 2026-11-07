#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 dist/sitemap.xml —— 只收录白名单目录下的 index.html。

规则：
  1. 白名单目录（INCLUDE_DIRS）内递归找 index.html，生成 https://haidashu.com.cn/<path>/
  2. priority 按层级：站点根 1.0；一级 0.8；二级及以下 0.6
  3. lastmod 取该 index.html 的 mtime 日期；不早于旧 sitemap 中的值，
     这样只有内容真改了，lastmod 才会动，避免每次构建产生无意义 diff
  4. 已有条目的 changefreq 沿用旧值，新条目默认 weekly

用法：
  python3 tools/gen_sitemap.py dist            # 写入 dist/sitemap.xml
  python3 tools/gen_sitemap.py dist --dry-run  # 只打印差异
"""

import hashlib
import json
import os
import re
import sys
from datetime import date, datetime

BASE_URL = "https://haidashu.com.cn"
# 只有这些一级目录下的页面进 sitemap；me/downloads/l3/model/aixinshou/future 等不收录
INCLUDE_DIRS = ["", "cases", "experts", "factory", "learn", "legal",
                "materials", "products", "products3d", "promo", "start",
                "templates", "zhinao"]

DEFAULT_CHANGEFREQ = "weekly"


def file_hash(path):
    """按内容算 hash，用于判断页面是否真的改过"""
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def state_path_for(dist_dir):
    """状态文件放在 dist 同级，不进发布目录"""
    parent = os.path.dirname(os.path.abspath(dist_dir))
    return os.path.join(parent, ".sitemap-state.json")


def read_state(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def priority_for(path):
    depth = len([p for p in path.strip("/").split("/") if p])
    if depth == 0:
        return "1.0"
    if depth == 1:
        return "0.8"
    return "0.6"


def read_old(sitemap_path):
    """返回 {path: {'lastmod':..., 'changefreq':...}}"""
    old = {}
    if not os.path.exists(sitemap_path):
        return old
    with open(sitemap_path, "r", encoding="utf-8") as f:
        content = f.read()
    for block in re.findall(r"<url>.*?</url>", content, re.S):
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        if not loc:
            continue
        url = loc.group(1).strip()
        path = url.replace(BASE_URL, "") or "/"
        lastmod = re.search(r"<lastmod>([^<]+)</lastmod>", block)
        changefreq = re.search(r"<changefreq>([^<]+)</changefreq>", block)
        old[path] = {
            "lastmod": lastmod.group(1) if lastmod else None,
            "changefreq": changefreq.group(1) if changefreq else DEFAULT_CHANGEFREQ,
        }
    return old


def collect(dist_dir):
    """扫描白名单目录，返回 {path: index_html_abs}"""
    found = {}
    # 站点根：只取根目录这一个 index.html，不递归
    root_idx = os.path.join(dist_dir, "index.html")
    if os.path.isfile(root_idx):
        found["/"] = root_idx

    for d in INCLUDE_DIRS:
        if not d:
            continue
        root = os.path.join(dist_dir, d)
        if not os.path.isdir(root):
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [x for x in dirnames if not x.startswith(".") and x != "assets"]
            if "index.html" not in filenames:
                continue
            rel = os.path.relpath(dirpath, dist_dir)
            if rel == ".":
                continue
            path = "/" + rel.replace(os.sep, "/") + "/"
            found[path] = os.path.join(dirpath, "index.html")
    return found


def main():
    if len(sys.argv) < 2:
        print("用法: gen_sitemap.py <dist目录> [--dry-run]")
        return 2
    dist_dir = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    sitemap_path = os.path.join(dist_dir, "sitemap.xml")
    if not os.path.isdir(dist_dir):
        print("目录不存在: %s" % dist_dir)
        return 1

    old = read_old(sitemap_path)
    pages = collect(dist_dir)
    state_file = state_path_for(dist_dir)
    state = read_state(state_file)
    new_state = {}
    today = date.today().isoformat()

    entries = []
    for path in sorted(pages, key=lambda p: (p.count("/"), p)):
        idx = pages[path]
        cur_hash = file_hash(idx)
        prev = state.get(path) or {}
        old_last = old.get(path, {}).get("lastmod")

        # 内容没变就沿用旧日期；变了才用今天。这样 lastmod 只在页面真的改过时动
        if prev.get("hash") == cur_hash and prev.get("lastmod"):
            lastmod = prev["lastmod"]
        elif old_last:
            lastmod = max(old_last, prev.get("lastmod") or old_last)
        else:
            lastmod = today

        new_state[path] = {"hash": cur_hash, "lastmod": lastmod}
        changefreq = old.get(path, {}).get("changefreq", DEFAULT_CHANGEFREQ)
        entries.append({
            "path": path,
            "loc": BASE_URL + path,
            "lastmod": lastmod,
            "changefreq": changefreq,
            "priority": priority_for(path),
        })

    new_paths = [e["path"] for e in entries]
    added = [p for p in new_paths if p not in old]
    removed = [p for p in old if p not in new_paths]

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for e in entries:
        lines.append(
            "  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq><priority>%s</priority></url>"
            % (e["loc"], e["lastmod"], e["changefreq"], e["priority"])
        )
    lines.append("</urlset>")
    xml = "\n".join(lines) + "\n"

    print("sitemap: %d 条" % len(entries))
    if added:
        print("  新增: %s" % ", ".join(added))
    if removed:
        print("  移除: %s" % ", ".join(removed))

    if dry_run:
        print("  [dry-run] 未写入 %s" % sitemap_path)
        return 0

    old_xml = ""
    if os.path.exists(sitemap_path):
        with open(sitemap_path, "r", encoding="utf-8") as f:
            old_xml = f.read()
    with open(state_file, "w", encoding="utf-8") as f:
        json.dump(new_state, f, ensure_ascii=False, indent=1, sort_keys=True)
    if old_xml == xml:
        print("  无变化")
        return 0
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(xml)
    print("  已写入 %s" % sitemap_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
