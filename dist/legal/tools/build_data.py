#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把法律库转成前端应用数据：statutes JSON / 场景包 / 判例 / 范本"""
import os, re, json, shutil, glob

LIB = "/Users/a1234/WorkBuddy/2026-09-28-19-16-33/法律库"
OUT = "/Users/a1234/WorkBuddy/2026-09-28-19-16-33/pufa-app"
DATA = os.path.join(OUT, "data")
STAT = os.path.join(DATA, "statutes")
TPL = os.path.join(OUT, "templates")
os.makedirs(STAT, exist_ok=True)
os.makedirs(TPL, exist_ok=True)

# ---------- 1. 法条全文 → statutes/*.json ----------
LAW_KEYWORDS = {
    "01": ("民法典", "借钱 合同 违约 房产 离婚 继承 遗嘱 侵权 赔偿 租房 租赁 物业 相邻 保证 定金 担保 诉讼时效 个人信息 隐私 名誉 赠送 彩礼 收养 抵押 质押 留置 保管 仓储 委托 行纪 中介 合伙".split()),
    "02": ("刑法", "报案 诈骗 判刑 犯罪 偷 盗窃 抢 抢劫 打架 故意伤害 敲诈 非法集资 拒不支付 妨害 信用卡 伪造 造假 侵占 挪用 传销".split()),
    "03": ("公司法", "公司 股东 法定代表人 法人代表 注册 营业执照 加盟 分红 注销 一人公司 人格否认 出资 董事 监事 清算".split()),
    "04": ("税法", "税 发票 偷税 漏税 逃税 个税 增值税 虚开 所得税 税务稽查 欠税".split()),
    "05": ("劳动合同法", "裁员 辞退 开除 工资 欠薪 劳动合同 试用期 竞业限制 社保 加班 赔偿金 N+1 经济补偿 派遣 非全日制 离职".split()),
    "06": ("劳动争议调解仲裁法", "劳动仲裁 仲裁时效 劳动争议 调解 仲裁申请".split()),
    "07": ("民事诉讼法", "起诉 立案 法院 管辖 证据 判决 执行 上诉 小额诉讼 财产保全 开庭 送达 调解书 支付令".split()),
    "08": ("刑事诉讼法", "取保候审 侦查 审查起诉 辩护人 刑事立案 逮捕 讯问 自首 立功 缓刑".split()),
    "09": ("仲裁法", "仲裁协议 仲裁条款 商事仲裁 仲裁委 一裁终局".split()),
    "10": ("消费者权益保护法", "退货 换货 三倍赔偿 欺诈 预付卡 储值卡 网购 七天无理由 三包 假货 虚假宣传 12315".split()),
    "11": ("食品安全法", "食品 过期 十倍赔偿 食物中毒 外卖 食品安全 标签 添加剂".split()),
    "12": ("保险法", "保险 理赔 拒赔 免责条款 保费 保单 人身保险 财产保险 如实告知".split()),
    "13": ("个人信息保护法", "骚扰电话 信息泄露 人脸识别 大数据杀熟 精准推销 同意 撤回 删除权".split()),
    "14": ("土地管理法", "征地 拆迁 宅基地 集体土地 补偿安置 耕地 土地承包".split()),
    "15": ("道路交通安全法", "交通事故 车祸 酒驾 醉驾 扣分 交强险 碰撞 肇事逃逸 电动车".split()),
}
law_index = []
ART = re.compile(r"^## (第[\u4e00-\u9fff0-9]+条)", re.M)
for did in sorted(LAW_KEYWORDS):
    d = os.path.join(LIB, "法条全文")
    sub = [x for x in os.listdir(d) if x.startswith(did)][0]
    fp = None
    for f in glob.glob(os.path.join(d, sub, "*.md")):
        if "全文" in os.path.basename(f):
            fp = f
    text = open(fp, encoding="utf-8").read()
    matches = list(ART.finditer(text))
    arts = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.start():end].strip()
        body = re.sub(r"\n{2,}", "\n", body)
        arts.append(body)
    name = LAW_KEYWORDS[did][0]
    with open(os.path.join(STAT, f"{did}.json"), "w", encoding="utf-8") as f:
        json.dump({"id": did, "name": name, "articles": arts}, f, ensure_ascii=False)
    law_index.append({"id": did, "name": name, "file": f"data/statutes/{did}.json", "keywords": LAW_KEYWORDS[did][1]})
    print(f"{did} {name}: {len(arts)} 条")

# ---------- 2. 场景包 → scenarios.json ----------
SCEN_KW = {
    "被裁员_违法辞退": "裁员 辞退 开除 N+1 赔偿 2n 劳动仲裁",
    "被套路加盟_投资诈骗": "加盟 加盟费 招商 退款 商业特许 备案",
    "借钱不还_民间借贷": "借钱 借条 欠钱 起诉 利息 转账记录",
    "交通事故_赔偿": "车祸 交通事故 保险理赔 伤残鉴定 责任认定",
    "工伤_职业病": "工伤 工伤认定 赔偿 停工留薪 伤残等级",
    "预付卡储值卡跑路": "健身房 理发店 跑路 预付卡 退钱 闭店",
    "离婚分房产_财产分割": "离婚 房子 分割 婚前 共同财产",
    "老人赡养_子女拒养": "赡养 赡养费 老人 不养 诉讼",
    "房屋买卖_二手房违约": "二手房 违约 定金 过户 房价上涨",
    "遗产继承分配_遗嘱效力": "遗产 继承 遗嘱 分家 法定继承",
    "网络消费欺诈_网购维权": "网购 假货 退货 平台 三倍 12315",
}
scen = []
for f in sorted(glob.glob(os.path.join(LIB, "场景包", "*.md"))):
    base = os.path.splitext(os.path.basename(f))[0]
    content = open(f, encoding="utf-8").read()
    content = re.sub(r"\n{3,}", "\n\n", content)
    if len(content) > 3800:
        content = content[:3800] + "\n……（场景包全文较长，已节选）"
    scen.append({"id": base, "title": base.replace("_", " · "), "keywords": SCEN_KW.get(base, base.replace("_", " ")), "content": content})
with open(os.path.join(DATA, "scenarios.json"), "w", encoding="utf-8") as f:
    json.dump(scen, f, ensure_ascii=False)
print(f"场景包: {len(scen)}")

# ---------- 3. 判例库 → cases.json ----------
cases = []
for f in sorted(glob.glob(os.path.join(LIB, "判例库", "**", "*.md"), recursive=True)):
    if "README" in f:
        continue
    text = open(f, encoding="utf-8").read()
    blocks = re.split(r"\n(?=# 判例：)", text)
    for b in blocks:
        m = re.match(r"# 判例：(.+)", b)
        if not m:
            continue
        title = m.group(1).strip()
        meta = ""
        mm = re.search(r"^> (.+)$", b, re.M)
        if mm:
            meta = mm.group(1).strip()
        gist = ""
        gm = re.search(r"## 裁判要旨\n\n(.+?)(?=\n## )", b, re.S)
        if gm:
            gist = re.sub(r"\*\*|\n+", " ", gm.group(1)).strip()[:400]
        cases.append({"title": title, "meta": meta, "gist": gist})
with open(os.path.join(DATA, "cases.json"), "w", encoding="utf-8") as f:
    json.dump(cases, f, ensure_ascii=False)
print(f"判例: {len(cases)}")

# ---------- 4. 范本 → templates/ ----------
n = 0
for f in sorted(glob.glob(os.path.join(LIB, "范本包", "*.md"))):
    shutil.copy(f, os.path.join(TPL, os.path.basename(f)))
    n += 1
print(f"范本: {n}")

with open(os.path.join(DATA, "laws_index.json"), "w", encoding="utf-8") as f:
    json.dump(law_index, f, ensure_ascii=False)
print("laws_index OK")
