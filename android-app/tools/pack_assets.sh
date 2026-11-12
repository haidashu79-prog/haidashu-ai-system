#!/usr/bin/env bash
# 把线上站点（dist/cases/yixuan）打包进 APK 资源，并注入 API 引导脚本。
# 每次网站更新后跑一遍 + 重编 APK，App 内容就跟着新。
set -euo pipefail
cd "$(dirname "$0")/.."

# 打包前先过语法闸门，别把跑不起来的页面装进 APK
bash tools/check_yixuan.sh

SRC="../dist/cases/yixuan"
DST="app/src/main/assets/www/cases/yixuan"

if [ ! -f "$SRC/index.html" ]; then
  echo "找不到 $SRC/index.html，先在仓库根目录跑 ./build.sh 生成 dist" >&2
  exit 1
fi

rm -rf app/src/main/assets/www
mkdir -p "$DST"
cp -R "$SRC/." "$DST/"

python3 tools/inject_bootstrap.py

echo "=== 打包完成，体积 ==="
du -sh app/src/main/assets/www
find app/src/main/assets/www -type f | wc -l | xargs echo "文件数:"
