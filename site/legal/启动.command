#!/bin/bash
# 双击这个文件就能打开「中文法律智库」
# 它会在你电脑本地开一个小服务，然后用浏览器打开应用。
# 想关掉：在这个终端窗口里按 Control + C

cd "$(dirname "$0")" || exit 1

PORT=8899
while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT+1))
  if [ $PORT -gt 8999 ]; then
    echo "找不到空闲端口，请重启电脑后再试。"
    read -n 1 -s -r -p "按任意键关闭…"
    exit 1
  fi
done

echo "正在启动本地服务（端口 $PORT）…"
python3 -m http.server $PORT >/dev/null 2>&1 &
SRV=$!
sleep 1.5

URL="http://127.0.0.1:$PORT/app.html"
open "$URL"

echo ""
echo "================================================"
echo "  已打开：$URL"
echo ""
echo "  这个窗口别关，关了应用就用不了了。"
echo "  用完了想退出 → 按 Control + C，或直接关掉这个窗口。"
echo "================================================"
echo ""

wait $SRV
