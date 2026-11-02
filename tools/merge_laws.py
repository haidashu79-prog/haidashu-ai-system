#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把官方抓取到的全量法条索引与原有 39 部常用法律合并成一份 laws_index.json。

合并规则：
  1. 原有 39 部排在最前，分类标记为「常用」，检索关键词保留（人工调过的）；
  2. 若官方库里有同名法律，用官方条文替换原有条文（官方文本更权威、更新），
     但保留原有的 id / 名称 / 关键词，原条目位置不动；
  3. 其余官方法律按分类排序追加在后。
"""

import json
import os
import re
import shutil
import sys

DATA = "/Users/a1234/Desktop/haidashu-ai-system/dist/legal/data"
IDX = os.path.join(DATA, "laws_index.json")
IDX_EXT = os.path.join(DATA, "laws_index_ext.json")
BAK = os.path.join(DATA, "laws_index.origin39.json")

CAT_ORDER = ["常用", "宪法", "法律", "法律解释", "行政法规", "监察法规", "司法解释",
             "有关法律问题和重大问题的决定", "修正案", "修改、废止的决定"]


def norm(s):
    return re.sub(r"[\s\u3000]", "", s or "").replace("中华人民共和国", "")


def main():
    with open(IDX, encoding="utf-8") as f:
        origin = json.load(f)
    if not os.path.exists(BAK):
        shutil.copy(IDX, BAK)
        print("已备份原索引 ->", BAK)

    ext = []
    if os.path.exists(IDX_EXT):
        with open(IDX_EXT, encoding="utf-8") as f:
            ext = json.load(f)

    for o in origin:
        o.setdefault("file", "data/statutes/" + o["id"] + ".json")
        o["cat"] = "常用"

    by_norm = {}
    for e in ext:
        by_norm.setdefault(norm(e["name"]), []).append(e)

    consumed = set()
    out = []
    replaced = 0
    for o in origin:
        cand = [e for e in by_norm.get(norm(o["name"]), []) if e["bbbs"] not in consumed]
        if cand:
            cand.sort(key=lambda x: -(x.get("nart") or 0))
            p = cand[0]
            try:
                with open(os.path.join(DATA, p["file"].replace("data/", "")), encoding="utf-8") as f:
                    art = json.load(f)
                with open(os.path.join(DATA, o["file"].replace("data/", "")), "w", encoding="utf-8") as f:
                    json.dump({"id": o["id"], "name": o["name"], "articles": art["articles"]},
                              f, ensure_ascii=False)
                o["nart"] = p.get("nart")
                for k in ("gbrq", "sxrq", "zdjg"):
                    if p.get(k):
                        o[k] = p[k]
                o["bbbs"] = p["bbbs"]
                consumed.add(p["bbbs"])
                os.remove(os.path.join(DATA, p["file"].replace("data/", "")))
                replaced += 1
            except Exception as e:
                print("  替换失败", o["name"], e)
        out.append(o)

    rest = [e for e in ext if e["bbbs"] not in consumed]

    def cat_rank(e):
        c = e.get("cat") or ""
        return CAT_ORDER.index(c) if c in CAT_ORDER else 99

    rest.sort(key=lambda e: (cat_rank(e), e["name"]))
    out.extend(rest)

    with open(IDX, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    total_art = sum(int(x.get("nart") or 0) for x in out)
    cats = {}
    for x in out:
        cats[x.get("cat") or "其他"] = cats.get(x.get("cat") or "其他", 0) + 1
    print("合并完成：%d 部法律，约 %d 条" % (len(out), total_art))
    print("其中用官方文本替换原有条文 %d 部" % replaced)
    for c in CAT_ORDER:
        if cats.get(c):
            print("  %-22s %d 部" % (c, cats[c]))
    for c, n in cats.items():
        if c not in CAT_ORDER:
            print("  %-22s %d 部" % (c, n))


if __name__ == "__main__":
    main()
