#!/usr/bin/env bash
# ============================================================
# haidashu.com.cn 单向构建脚本
#
#   site/  是唯一真源（只改这里）
#   dist/  是发布目录（由本脚本生成，不手改）
#
# 用法：
#   ./build.sh              构建（site → dist，并重算 sitemap）
#   ./build.sh --dry-run    只看会变动哪些文件，不写入
#   ./build.sh --backup     构建前把 dist 打包到 _bak/
#   ./build.sh --check      只做自检，不构建
#
# 说明：
#   dist 里有 13 项产物不在 site 中（3D 页、PWA 图标、法条原始索引等），
#   由 PROTECTED 清单保护，同步时不会被删、也不会被覆盖。
#   sitemap.xml 由 tools/gen_sitemap.py 生成，不参与同步。
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

SITE="site"
DIST="dist"
PY=python3

# ---- dist 独有产物：site 里没有，必须保留 ----
PROTECTED=(
  "assets/app-icon-192.png"
  "assets/app-icon-512.png"
  "assets/app-icon.svg"
  "assets/p3app.css"
  "assets/p3d-shell.js"
  "assets/p3d.css"
  "assets/p3d.js"
  "assets/tool3d.css"
  "legal/data/laws_index.origin39.json"
  "manifest.webmanifest"
  "products-v1/"
  "products3d/"
  "sitemap.xml"
)

MODE="build"
DO_BACKUP=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) MODE="dry" ;;
    --backup)  DO_BACKUP=1 ;;
    --check)   MODE="check" ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)
      echo "未知参数: $arg（用 --help 看用法）" >&2
      exit 2 ;;
  esac
done

if [ ! -f "$SITE/index.html" ]; then
  echo "错误：$SITE/index.html 不存在，真源目录不对" >&2
  exit 1
fi
if [ ! -d "$DIST" ]; then
  mkdir -p "$DIST"
fi

# ---------- 1. 备份 ----------
if [ "$DO_BACKUP" = "1" ] && [ "$MODE" != "dry" ]; then
  mkdir -p _bak
  BAK="_bak/dist-$(date +%Y%m%d-%H%M%S).tgz"
  tar czf "$BAK" "$DIST" 2>/dev/null
  echo "已备份: $BAK ($(du -h "$BAK" | cut -f1))"
fi

# ---------- 2. 同步 site → dist ----------
if [ "$MODE" != "check" ]; then
  RSYNC_ARGS=(-a --itemize-changes)
  for p in "${PROTECTED[@]}"; do
    RSYNC_ARGS+=(--exclude="$p")
  done
  [ "$MODE" = "dry" ] && RSYNC_ARGS+=(--dry-run)

  echo "──── 同步 $SITE/ → $DIST/ ────"
  # 不用 tee /dev/stderr（某些沙箱环境禁止写 /dev/stderr，会让 rsync 直接 EPIPE）
  CHANGELOG=$(mktemp)
  rsync "${RSYNC_ARGS[@]}" "$SITE/" "$DIST/" > "$CHANGELOG"
  cat "$CHANGELOG"
  CHANGED=$(wc -l < "$CHANGELOG" | tr -d ' ')
  rm -f "$CHANGELOG"
  echo "变动条目: $CHANGED"
fi

# ---------- 3. 生成 sitemap ----------
if [ "$MODE" != "check" ]; then
  echo "──── 生成 sitemap ────"
  if [ "$MODE" = "dry" ]; then
    $PY tools/gen_sitemap.py "$DIST" --dry-run
  else
    $PY tools/gen_sitemap.py "$DIST"
  fi
fi

# ---------- 4. 自检 ----------
echo "──── 自检 ────"
FAIL=0

# 4.1 保护文件是否还在
MISSING=0
for p in "${PROTECTED[@]}"; do
  if [ ! -e "$DIST/$p" ]; then
    echo "  ✗ 缺失受保护产物: $p"
    MISSING=$((MISSING+1))
  fi
done
[ "$MISSING" = "0" ] && echo "  ✓ 13 项 dist 独有产物齐全" || FAIL=1

# 4.2 真源文件是否都进了 dist
SITE_N=$(cd "$SITE" && find . -type f | wc -l | tr -d ' ')
SYNCED=0
while IFS= read -r f; do
  [ -f "$DIST/$f" ] && SYNCED=$((SYNCED+1))
done < <(cd "$SITE" && find . -type f | sed 's|^\./||')
if [ "$SITE_N" = "$SYNCED" ]; then
  echo "  ✓ $SITE_N 个真源文件全部在 dist 中"
else
  echo "  ✗ 真源 $SITE_N 个，dist 中只找到 $SYNCED 个"
  FAIL=1
fi

# 4.3 关键文件
for f in index.html llms.txt robots.txt sitemap.xml _headers; do
  if [ ! -f "$DIST/$f" ]; then
    echo "  ✗ 关键文件缺失: $f"
    FAIL=1
  fi
done
echo "  ✓ 关键文件（index/llms/robots/sitemap/_headers）检查完成"

# 4.4 JS 语法
if command -v node >/dev/null 2>&1; then
  BADJS=0
  while IFS= read -r f; do
    node --check "$f" 2>/dev/null || { echo "  ✗ 语法错误: $f"; BADJS=$((BADJS+1)); }
  done < <(find "$DIST" -name "*.js" -type f)
  if [ "$BADJS" = "0" ]; then
    echo "  ✓ 全部 JS 语法通过"
  else
    FAIL=1
  fi
else
  echo "  ! 未安装 node，跳过 JS 语法检查"
fi

echo "──── 完成 ────"
if [ "$FAIL" != "0" ]; then
  echo "自检未通过，先修问题再部署。" >&2
  exit 1
fi
if [ "$MODE" = "dry" ]; then
  echo "dry-run 结束，未改动任何文件。"
else
  echo "dist 已就绪，可执行：npx wrangler pages deploy dist --project-name=haidashu --branch=main --commit-dirty=true"
fi
