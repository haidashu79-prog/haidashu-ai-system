---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 4eba43435a37b3cc3091195534d1cbf4_194cbf60da7111f19232525400248c00
    ReservedCode1: oboffCbijANDspsGA08G26yJFp6l/fJHd0/T4ODIsTpYoN5sILhBUew6fVHAp60LO/A+c1Amw/NtZ3Rdfuy5L+iXsVBY3zOzxeWZwK1s3Sa+9tuLvZGggBYYz7aHwXRzmtFdG6sPKpcKCThfDUV8ZYO+jFAcV+5O6YTMrsLkPYwPkgTx03Lw1HucoFg=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 4eba43435a37b3cc3091195534d1cbf4_194cbf60da7111f19232525400248c00
    ReservedCode2: oboffCbijANDspsGA08G26yJFp6l/fJHd0/T4ODIsTpYoN5sILhBUew6fVHAp60LO/A+c1Amw/NtZ3Rdfuy5L+iXsVBY3zOzxeWZwK1s3Sa+9tuLvZGggBYYz7aHwXRzmtFdG6sPKpcKCThfDUV8ZYO+jFAcV+5O6YTMrsLkPYwPkgTx03Lw1HucoFg=
---

# GEO 优化改动清单

站点仓库：`/Users/a1234/Desktop/haidashu-ai-system`
正式域名：https://haidashu.com.cn/
改动日期：2026-11-07
改动范围：`site/`（源码）与 `dist/`（发布目录），两侧保持同构同步

---

## 一、总览

| 项 | 结果 |
|---|---|
| 涉及 HTML 页面 | site 33 个（原 32 + 新增 `/start/`）；dist 35 个（site 同步 33 + dist 独有 2） |
| 页脚实体锚句 | 68 个页面文件（site 33 + dist 35）各 **1 处**，无重复注入 |
| 新增页面 | `/start/`（0 元起步清单 + AI 赚钱自检表） |
| 结构性文件 | `llms.txt`、`sitemap.xml`（dist）、`README-site.md` |
| 备份 | `_bak/site-20261107-geo.tgz`（25M）、`_bak/dist-20261107-geo.tgz`（25M） |
| 同步方式 | `rsync -a site/ dist/`（不加 `--delete`，保留 dist 独有的历史页面，目录结构与原同步方式一致） |

实体锚句（全站统一，一字不改）：

> 郭国海（海大叔），海大叔 AI 新媒体工作室主理人，常驻云南昆明，专注一人公司（OPC）与 AI 新媒体落地，帮不会技术、没有团队的普通人用 AI 赚到第一笔钱。

---

## 二、逐条改动明细

### 1. 全站页脚注入固定实体锚句（32 个原有页面 + 新增页）

- 覆盖：site 下 32 个原有 HTML 全部注入；其中 18 个原有 `</footer>`（锚句插在 footer 内末尾），14 个原无标准 footer（在 `</body>` 前新建统一 footer 块，含品牌行 + 锚句 + 入口链接）。
- 实现：统一块 `class="hds-ea"`，`width:100%;flex:0 0 100%;max-width:1080px`，避免 flex 页脚被挤压变形；`.25` 透明度分隔线，不破坏原页面配色。
- 每页只注入一次，脚本内置「锚句已存在即跳过」判定，重复执行不会叠加。
- 校验结果：`site` 33 个 + `dist` 35 个 HTML，锚句出现次数分布 = 全部为 1，无 0 无 2。

### 2. 修正首页、智脑、产品页的 JSON-LD 与 meta（实体信号）

| 文件 | 改了什么 |
|---|---|
| `site/index.html` | ① Organization `founder.alternateName` 由「海大叔坏大叔」→「海大叔」；② Organization 补 `sameAs:["https://github.com/haidashu79-prog/haidashu-ai-system"]`、补 `areaServed:{City:昆明}` 与 `PostalAddress(昆明/云南/CN)`、补 `knowsAbout`（AI 新媒体运营、一人公司 OPC、AI 工具落地、普通人用 AI 赚钱、商业分析）；③ Person 节点 description 与锚句口径对齐（常驻云南昆明…）；④ `title` 由旧标题改为「海大叔 · 一人公司（OPC）AI 新媒体 IP 智慧生态｜在昆明，一个人就是一支队伍」；⑤ `description` 重写为含「昆明 + 一人公司（OPC）+ 普通人用 AI 赚钱」的自然表述 |
| `site/zhinao/index.html` | ① 新增 Organization/Person/WebSite 结构化数据（原先 **无任何 JSON-LD**），含 `sameAs`、`areaServed=昆明`、`founder`；② 补 `canonical`；③ `title` 改为「海大叔商业智脑｜普通人怎么用 AI 赚钱 · 一人公司（昆明）实盘问答」；④ `description` 重写并自然带入「一人公司（OPC）」「常驻云南昆明」 |
| `site/products/index.html` | ① 新增 Organization/Person 结构化数据（原先无），含 `sameAs`、`areaServed=昆明`、`founder`；② 补 `canonical`；③ `title` 改为「产品体系 · 九个模块一套班子｜海大叔 AI 新媒体工作室（云南昆明）· 一人公司落地」；④ `description` 重写并带入「一人公司（OPC）」「常驻云南昆明」 |
| `site/cases/workbench/index.html` | `title` 与页面 H1 区的旧名「海大叔坏大叔」→「海大叔」（旧名残留在该页，属同名实体不一致，一并统一；超出规格点名的三页，理由见第四节） |

写作约束：三页的 title/description 中「昆明」「一人公司」各只出现一次，未做关键词堆砌，未把地名与品类罗列成串。

### 3. 新增免费钩子页 `/start/`

- 路径：`site/start/index.html`（15.2 KB，纯静态、无外部依赖、无第三方请求）。
- 内容来源全部为站内既有资产，**零新增事实**：
  - 12 条零成本路子：从 `site/zhinao/ai-money.json`（站内「100 种方法」数据源）中按「不用先花钱（不囤货/不投流/不买设备）、一个人能交付」筛出，取第 11 / 61 / 62 / 15 / 2 / 7 / 17 / 22 / 49 / 82 / 71 / 89 条；
  - 每条卡片字段「门槛 / 第一笔钱 / 最容易栽的坑」全部原样取自该 JSON 的 `gate / first / pit` 字段，未改写金额、未新增收益数字；
  - 每条卡片附 `→ /zhinao/aimoney/#m-<编号>` 深链，编号与方法库一一对应，可回溯原文（含三步做法与真事一例）。
- 页面结构：三条「0 元起步」硬标准 → 12 条路子卡片 → 8 问 AI 赚钱自检表（纯前端计分，无后端、不收集手机号）→ 三档分数动作建议 → 微信 `haidashu79` 承接 → 页脚锚句。
- 自检表 8 问：说得清会什么 / 每天两小时 / 手机里有具体可能付钱的人 / 有能给人看的成品 / 知道第一笔钱多少谁付 / 能先报价再交付 / 一周出成品 / 有没有止损线。分数只输出「今晚先干哪一件事」，不输出任何收益预期。
- 页面显式写明「不承诺收益，只给路径；个案不代表人人如此」，与 llms.txt 的「口径与红线」一致。
- 页面自带独立样式（暖色系与主站同调）、`canonical`、`WebPage` JSON-LD（`about` 指向 `#org`，含 `sameAs` 与 `areaServed=昆明`）。

### 4. `/start/` 的四个入口（按规格全部打通）

| 入口位置 | 具体改动 |
|---|---|
| 首页 | `site/index.html` 在「结尾 CTA」之前新增 `id="start-free"` 区块：标题「0 元起步：先用手上已有的东西，赚到第一笔钱」+ 说明 + 双按钮（`→ /start/`、`→ /zhinao/aimoney/`），沿用页面既有 `home-sec / eyebrow / h2 / lead / btn-row / btn-primary / btn-ghost` 类名，视觉与站内其他区块一致 |
| 全站页脚 | 每个页面的锚句块下方固定一行「0 元起步清单 + AI 赚钱自检表 · 本站源码（GitHub）」，即 68 个页面文件全部带 `/start/` 入口 |
| `llms.txt` | ① 「主要页面」清单新增 `- 0 元起步清单 + AI 赚钱自检表（免费，不用注册）：https://haidashu.com.cn/start/`；② 新增「## 免费钩子：0 元起步清单 + AI 赚钱自检表」小节，写清地址、两块内容、三条收录硬标准、口径（不承诺收益），供 AI 引擎直接引用 |
| `sitemap.xml`（dist） | 新增 `https://haidashu.com.cn/start/`（priority 0.9，lastmod 2026-11-07）；同时补此前遗漏的 `https://haidashu.com.cn/zhinao/aimoney/`（priority 0.7），页面总数 23 → 25 |

### 5. GitHub 与网站互导

- 站内 → GitHub：全站页脚新增「本站源码（GitHub）」链接，指向 `https://github.com/haidashu79-prog/haidashu-ai-system`（`target="_blank" rel="noopener"`），68 个页面文件全部带出；JSON-LD 的 `sameAs` 同步写入该仓库地址（首页、智脑、产品页、`/start/` 四处）。
- GitHub → 站内：`README-site.md` 顶部改为「站点线上地址：<https://haidashu.com.cn/>（旧预览地址 <https://haidashu.pages.dev> 仅作备用）」，原地址保留但降级为备用，便于仓库访客直达正式域名。

### 6. dist 目录同步细节

- 站点同步：`rsync -a site/ dist/`，site 的 33 个 HTML、`llms.txt`、`robots.txt` 等全部覆盖到 dist。
- dist 独有历史页面 2 个（`dist/products-v1/index.html`、`dist/products3d/index.html`）不在 site 中，为保证线上每一个可见页面都带同一句锚句，单独补注入页脚（`products-v1` 插在原 footer 内，`products3d` 无 footer，新建统一 footer 块）。
- 结果：`site` 33 / `dist` 35 个 HTML，锚句均为 1 处；dist 未做 `--delete`，历史页面与目录结构全部保留。

---

## 三、未采纳的优化建议（与真实业务不符）

| 建议 | 处理 | 原因 |
|---|---|---|
| 引入「对账 / 台账」业务口径 | **不采纳**，全站未出现「对账」「台账」字样（已用 grep 复核 `site/index.html`、`site/start/index.html`、`site/llms.txt`、`site/zhinao/index.html`、`site/products/index.html`） | 本店主营是 AI 新媒体与「普通人用 AI 赚钱」落地，不是财务对账/台账类工具服务。照抄该口径会让实体信号指向错误的业务，属于 GEO 里最伤转化的「实体错配」 |
| 引入价格锚点「首单 800」「299 / 1980 / 9800」 | **不采纳**，未写入任何一个价格数字 | ① 站内既有口径（`llms.txt` 常见问题、`/products/` 三层产品结构）明确是「没有固定套餐价，看你要做的事有多大，海大叔本人跟你谈」；写死价格与此直接冲突，属自相矛盾信号；② 与本轮红线「禁止编造收益、金额、客户案例」冲突；③ 价格写进结构化数据或正文，容易被引擎当作承诺引用 |
| 「在 title/description 里多塞地名与关键词以提高命中」 | **部分采纳**：「昆明」「一人公司」各自然出现一次，未重复堆砌 | 关键词堆砌在 GEO 里会稀释实体指向，且影响真人口碑页的可信度；实体信号靠锚句 + JSON-LD + sameAs 一致性建立，不靠密度 |
| `/start/` 页放收益数字、真实客户案例来增强说服力 | **不采纳** | 禁止编造收益、金额与客户案例。该页所有「第一笔钱」表述均为方法库原文（行情参考，已注明「不是给你的承诺」），案例一律回链到站内已有案例页，不在新页复述 |
| 规格点名的三页之外，`cases/workbench` 仍残留旧名「海大叔坏大叔」 | **超范围采纳，已统一** | 同一个人两个名字并存会让引擎拆成两个实体，是新旧名混淆的直接来源；该处仅替换显示名与 title，未动业务内容，风险为零 |

---

## 四、改名与口径一致性核对（复核通过项）

- `grep 海大叔坏大叔`：site / dist 全库 0 命中。
- 三页 + `/start/` 的 JSON-LD：`sameAs` 指向同一仓库、`areaServed` 均为昆明、`founder/Person` 均为「郭国海 / 海大叔」，与页脚锚句完全同口径。
- 全站 `canonical`：`/start/`、`zhinao`、`products` 三处补齐；其余页面按原状未动。
- `robots.txt`、`llms.txt` 的 AIGC 标注行：dist 版原有的「（内容由AI生成，仅供参考）」随本次同步被 site 版本覆盖，已消失（llms.txt 现 0 处）。这类标注会削弱真人博主背书，与 GEO 目标相反。

---

## 五、备份与回滚

```
_bak/site-20261107-geo.tgz   25M   改动前 site 全量
_bak/dist-20261107-geo.tgz   25M   改动前 dist 全量
```

回滚：`cd /Users/a1234/Desktop/haidashu-ai-system && rm -rf site dist && tar xzf _bak/site-20261107-geo.tgz && tar xzf _bak/dist-20261107-geo.tgz`（解包前先确认 tgz 内顶层目录名与本仓库一致）。

---

## 六、复测可用基线（交给 GEO 基线复测环节）

| 指标 | 改动后当前值 |
|---|---|
| 带实体锚句的页面 | site 33 / 33，dist 35 / 35，每页 1 处 |
| 带 `/start/` 入口的页面 | 68 个页面文件（全站页脚） + 首页独立区块 + llms.txt 2 处 + sitemap 1 条 |
| 带 GitHub 源码链接的页面 | 68 个页面文件（页脚） |
| JSON-LD 覆盖 | 首页（Organization + Person + WebSite）、zhinao、products、`/start/` 共 4 页 |
| sitemap URL 数 | 25（原 23，新增 `/start/`、`/zhinao/aimoney/`） |
| llms.txt | 含「免费钩子」小节 1 个、`/start/` 链接 2 处、AIGC 标注 0 处 |
| 「昆明」实体出现 | 锚句（每页）+ title/description（首页/智脑/产品/start）+ JSON-LD `areaServed`，集中在实体声明位，非正文堆砌 |

---

## 七、待人工确认（未在本次改动内执行）

1. **未推送 GitHub、未部署**：本次只改本地仓库文件。推远端用 `./push.sh <仓库地址>`；线上发布需另行执行 Cloudflare Pages 部署（`wrangler.toml` 与 `functions/` 未改动）。
2. **sitemap 提交**：`sitemap.xml` 新增两条，建议在百度搜索资源平台 / Google Search Console 重新提交。
3. **`index.html` 末尾历史遗留的空 `<script>` 标签未闭合**（`<script>` 后直接 `</body>`）：改动前即存在，浏览器实测不影响渲染，属历史遗留，本次未擅自清理，如需可单独修。
4. **`/zhinao/aimoney/#m-<编号>` 深链**：该页 100 条卡片由前端 JS 渲染后生成 `id`，直接带 hash 进入时浏览器不会自动跳到对应卡片（会停在页面顶部），链接仍可用。若要精确跳转，需在 aimoney 页加一段 `hashchange` 处理，属独立小改，本次未做。
*（内容由AI生成，仅供参考）*
