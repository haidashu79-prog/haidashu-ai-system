#!/usr/bin/env bash
# 打包前必跑：易玄机前端 JS 语法闸门。
# 踩过两次的坑：模块级 var 常量被误插进 ZW 对象字面量，浏览器里整页脚本直接不执行。
# 这里逐个 node --check，任何一个不过就不许打包。
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../../site/cases/yixuan" && pwd)"
n=0
for f in "$DIR"/lib/*.js "$DIR"/assets/ziwei-classics.js "$DIR"/assets/ziwei-tianji.js; do
  [ -f "$f" ] || continue
  if ! node --check "$f" >/dev/null 2>&1; then
    echo "易玄机 JS 语法不通过：$(basename "$f")" >&2
    node --check "$f" >&2
    exit 1
  fi
  n=$((n+1))
done
echo "易玄机 JS 语法闸门通过（$n 个文件）"
