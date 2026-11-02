#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把每天搜到的真实裁判案例写进案例库（data/cases.json）。

用法：
    python3 case_add.py cases.json           # 追加（自动去重）
    python3 case_add.py cases.json --dry     # 只看会不会重复，不落盘

输入格式（JSON 数组）：
    [{
      "title": "一句话概括的案由，如：外卖骑手工伤认定案",
      "meta":  "分类：劳动 ｜ 来源：最高人民法院 2026 年第 X 批典型案例 ｜ 依据：工伤保险条例第14条",
      "gist":  "案情：…… 裁判：…… 提示：……",
      "src":   "https://www.court.gov.cn/....（原文链接，务必真实可打开）"
    }, ...]

纪律：只写能核实的真实案例；裁判结果、适用法条必须来自原文，不许编。
"""

import json
import os
import re
import sys
import time

DATA = "/Users/a1234/Desktop/haidashu-ai-system/dist/legal/data"
CASES = os.path.join(DATA, "cases.json")
LOG = "/Users/a1234/Desktop/haidashu-ai-system/.cache/case_updates.jsonl"


def key(t):
    return re.sub(r"[\s\u3000，。、（）()：:；;！!？?\"]", "", t or "")[:28]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    dry = "--dry" in sys.argv
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        new = json.load(f)
    if isinstance(new, dict):
        new = [new]

    with open(CASES, encoding="utf-8") as f:
        cases = json.load(f)

    exist = {key(c.get("title")) for c in cases}
    added, skipped = [], []
    for c in new:
        t = (c.get("title") or "").strip()
        g = (c.get("gist") or "").strip()
        if not t or len(g) < 40:
            skipped.append((t or "(无标题)", "内容太短或没标题"))
            continue
        k = key(t)
        if k in exist:
            skipped.append((t, "案例库里已有"))
            continue
        row = {
            "title": t[:80],
            "meta": (c.get("meta") or "").strip()[:200],
            "gist": g[:800],
        }
        if c.get("src"):
            row["src"] = c["src"].strip()
        row["_added"] = time.strftime("%Y-%m-%d")
        cases.append(row)
        exist.add(k)
        added.append(row)

    print("新增 %d 条，跳过 %d 条" % (len(added), len(skipped)))
    for t, why in skipped:
        print("  跳过：%s —— %s" % (t[:30], why))
    if dry:
        print("（--dry 模式，未写入）")
        return 0
    if not added:
        return 0

    tmp = CASES + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False)
    os.replace(tmp, CASES)

    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        for r in added:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("案例库现有 %d 条 -> %s" % (len(cases), CASES))
    return 0


if __name__ == "__main__":
    sys.exit(main())
