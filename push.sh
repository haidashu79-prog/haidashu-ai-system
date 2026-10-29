#!/usr/bin/env bash
# 把本仓库推到自己的远端。用法：
#   ./push.sh git@github.com:你的账号/haidashu-ai-system.git
# 或
#   ./push.sh https://github.com/你的账号/haidashu-ai-system.git
set -e
REMOTE="$1"
if [ -z "$REMOTE" ]; then
  echo "用法: ./push.sh <仓库地址>"
  echo "例:   ./push.sh git@github.com:haidashu/haidashu-ai-system.git"
  exit 1
fi
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi
git branch -M main 2>/dev/null || true
git push -u origin main
echo "✅ 已推送：$REMOTE"
