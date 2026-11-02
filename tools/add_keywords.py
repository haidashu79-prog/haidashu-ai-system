#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给全库里没有检索关键词的法律自动补关键词。

应用问答时的召回逻辑是「法律名称 + 关键词」跟用户问题做匹配，
原有 39 部常用法律的关键词是人工调的；新抓进来的 1400 多部需要用名称自动派生，
否则用户在提问里说「竞业限制」这种不吃法名的词就召回不到对应法律。
"""

import json
import os
import re

DATA = "/Users/a1234/Desktop/haidashu-ai-system/dist/legal/data"
IDX = os.path.join(DATA, "laws_index.json")

STOP = {"关于", "的", "问题", "若干", "适用", "法律", "规定", "解释", "决定", "办法",
        "审理", "案件", "第一条", "有关", "部分", "最高", "人民法院", "人民检察院",
        "最高人民法院", "最高人民检察院", "联合", "发布", "修改", "废止", "通知",
        "中华人民共和国", "实施", "条例", "细则", "通例"}


def tokens(name):
    t = name
    t = re.sub(r"《([^》]+)》", r"|\1|", t)
    t = re.sub(r"[（）()【】\[\]“”\"]", "|", t)
    parts = re.split(r"[|、，,；;：:\s]+", t)
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        p = p.replace("中华人民共和国", "")
        if not p:
            continue
        out.append(p)
        # 去掉后缀再补一个
        core = re.sub(r"(法|条例|规定|办法|解释|决定|细则|通则|意见|批复|答复|通知)$", "", p)
        if core and core != p and len(core) >= 2:
            out.append(core)
    return out


def main():
    with open(IDX, encoding="utf-8") as f:
        idx = json.load(f)
    filled = 0
    for x in idx:
        if x.get("keywords"):
            continue
        kws = []
        for t in tokens(x["name"]):
            if t in STOP or len(t) < 2:
                continue
            if t not in kws:
                kws.append(t)
        cat = x.get("cat") or ""
        if cat and cat not in kws:
            kws.append(cat)
        x["keywords"] = kws[:24]
        filled += 1
    with open(IDX, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False)
    print("给 %d 部法律补了关键词，索引共 %d 部" % (filled, len(idx)))
    for x in idx[-3:]:
        print("  示例：", x["name"][:34], "->", x["keywords"][:6])


if __name__ == "__main__":
    main()
