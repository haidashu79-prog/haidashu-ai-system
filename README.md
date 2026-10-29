# haidashu-ai-system

海大叔 AI 新媒体 IP 智慧生态 · 全站源码与素材主仓库。

站点线上地址：<https://haidashu.pages.dev>

---

## 这个仓库里有什么

```
haidashu-ai-system/
├── site/                  ← 全站可部署源码（Cloudflare Pages 的发布目录）
│   ├── index.html         首页
│   ├── products/          产品体系（九模块）
│   ├── cases/             案例库（13 个能真跑的应用）
│   ├── materials/         素材库
│   ├── zhinao/            商业智脑
│   ├── learn/ factory/ legal/ templates/ experts/ future/ aixinshou/
│   ├── assets/            全站样式 site.css + 通用 AI 组件 ai.js
│   └── img/mt/            素材库真实图片（20 张，600×375 webp）
├── functions/             ← Cloudflare Pages Functions（后端）
│   └── api/
│       ├── expert.js      通用专家问答接口（案例库共用，走 Workers AI）
│       ├── ask.js         商业智脑问答（流式）
│       └── v1/            OpenAI 兼容接口（给外部应用接）
├── materials/             ← 独立素材库（可单独分发/授权）
│   ├── img/               原始素材文件
│   └── data/manifest.json 素材清单（含 sha256、分类、体积）
├── wrangler.toml          部署配置（含 Workers AI 绑定）
└── README.md
```

## 案例库 · 13 个能打开就用的应用（11 个已接站内 AI）

| 应用 | 路径 | AI | 说明 |
|---|---|---|---|
| 法律智库 | `site/cases/legal` | ✅ 普法顾问 | 39 部法律 5,325 条法条 + 1,044 个案例 + 29 套文书；AI 答三段：这算什么 / 手上有什么牌 / 接下来怎么走 |
| 金策贵金属 | `site/cases/jince/` | ✅ 研判顾问 | 真实行情、200 根日 K、双品种研判、命中率留档；AI 只讲框架不给点位 |
| 体检报告解读 | `site/cases/health/` | ✅ 检验科口径 | 30+ 指标判定（按性别取参考值），不诊断、不开药 |
| 商业决策避险 | `site/cases/bizrisk/` | ✅ 风险顾问 | 三笔账（资金占比/现金跑道/回本周期）+ 七维风险扫描 |
| 一人公司陪跑 | `site/cases/solo/` | ✅ 陪跑顾问 | 体检/定价倒推/跑道/30 天清单/主体选择 |
| 自媒体小白陪跑 | `site/cases/media/` | ✅ 陪跑教练 | 定位 5 问/30 条选题/四段脚本/10 个标题/数据复盘 |
| 海大叔·星语 | `site/cases/astro/` | ✅ 占星师 | 塔罗 + 12 星座档案 + **星座配对（元素关系 + 对宫判定）** + AI 占星问答 |
| 易玄机 | `site/cases/yixuan/` | ✅ 术数顾问 | 生辰八字真排盘、六爻、奇门、风水、黄历 |
| 小店报价与回访 | `site/cases/quote/` | ✅ 报价顾问 | 算价、回访名单、客户话术、违禁词检查 |
| 内容创作工作台 | `site/cases/workbench/` | ✅ 创作教练 | 热点、选题、模板、评论、复盘 |
| 小初高知识地图 | `site/cases/edu/` | ✅ 学习规划 | 23 门学科知识节点；AI 只归因、排顺序、给练法，不给答案抄 |
| 提词器 | `site/cases/teleprompter` | — 纯工具 | 网页提词器（滚动/字号/节奏） |
| 安卓下载器 | 外链 APK | — 纯工具 | 安卓安装包 |

## AI 问答怎么工作的

全站共用一个前端组件 `site/assets/ai.js`，后端是 `functions/api/expert.js`：

```
页面 → HSDAI.panel({ system: '领域人设' }) → POST /api/expert → Workers AI → 回答
```

- **不需要任何 API Key**：走 Cloudflare Workers AI 绑定（`wrangler.toml` 里的 `[ai]`）。
- **每个领域一套人设**：体检是检验科口径（不诊断不开药）、决策是风险顾问口径、星语是占星师口径。
- **模型降级链**：gpt-oss-120b → qwen3-30b → llama-3.3-70b，前一个挂了自动换下一个。

## 本地跑起来

```bash
# 只预览静态页面（AI 接口不会生效，需要用 wrangler）
npx serve site

# 完整本地环境（含 Functions 与 AI 绑定）
npx wrangler pages dev site
```

## 部署

```bash
npx wrangler pages deploy site --project-name=haidashu
```

## 素材库

- `materials/img/` 和 `site/img/mt/` 是同一批文件，站内直接引用仓库内的图片，不挂外部图床。
- 清单见 `materials/data/manifest.json`（20 条，含 sha256 与前缀分类）。
- 四类：新媒体拍摄/剪辑、官网页线框、小程序手机端、应用仪表盘/门店，各 5 张。

## 授权

站内源码与素材归海大叔 AI 新媒体工作室所有。第三方图片（Unsplash 来源）遵循其原始许可，商用前请自行复核。
