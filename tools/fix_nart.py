#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重算全库每部法律的真实条数（只数「第 X 条」条目，不算编/章/节标题）。"""

import json
import os
import re

DATA = "/Users/a1234/Desktop/haidashu-ai-system/dist/legal/data"
IDX = os.path.join(DATA, "laws_index.json")
ART = re.compile(r"^## 第[一二三四五六七八九十百千零两〇]+条")


def main():
    with open(IDX, encoding="utf-8") as f:
        idx = json.load(f)
    total = 0
    fixed = 0
    for x in idx:
        path = os.path.join(DATA, (x.get("file") or ("data/statutes/" + x["id"] + ".json")).replace("data/", ""))
        try:
            with open(path, encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            x["nart"] = x.get("nart") or 0
            continue
        n = sum(1 for a in d.get("articles", []) if ART.match(a))
        if n != x.get("nart"):
            fixed += 1
        x["nart"] = n
        total += n
    with open(IDX, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False)
    print("校正 %d 部法律的条数；全库合计 %d 条" % (fixed, total))


if __name__ == "__main__":
    main()
