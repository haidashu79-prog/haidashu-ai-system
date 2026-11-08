#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""git push 走不通时的备胎：把本地提交经 GitHub REST API 传上去。

GitHub 的坑（实测得出）：
  1) 造提交时它会把「消息末尾的换行」去掉，所以远端提交号和本地 git 造的不一样——
     这不是错，是 GitHub 的存储格式。为了本地和远端完全一致，本地也照它的格式
     重建同样的提交对象（hash-object 写入），两边 sha 就一模一样了。
  2) 时区它原样保留（+0800 存的就是 +0800），API 回显才转成 UTC。
用法：python3 tools/push_via_api.py [owner/repo] [branch]
"""
import base64
import subprocess
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

REPO = sys.argv[1] if len(sys.argv) > 1 else 'haidashu79-prog/haidashu-ai-system'
BRANCH = sys.argv[2] if len(sys.argv) > 2 else 'main'
API = 'https://api.github.com/repos/%s' % REPO


def sh(*args, inp=None):
    return subprocess.run(args, input=inp, capture_output=True, text=True).stdout.strip()


def git(*args):
    return sh('git', *args)


cred = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n',
                      capture_output=True, text=True).stdout
token = ''
for line in cred.splitlines():
    if line.startswith('password='):
        token = line[len('password='):]
if not token:
    sys.exit('钥匙串里没找到 GitHub 凭据')


def api(method, path, payload=None, timeout=60):
    data = None
    headers = {'Authorization': 'Bearer ' + token,
               'Accept': 'application/vnd.github+json', 'User-Agent': 'push-via-api'}
    if payload is not None:
        import json
        data = json.dumps(payload, ensure_ascii=False).encode()
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(API + path, data=data, method=method, headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read().decode()
                return r.status, (json_loads(body) if body else {})
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 * (attempt + 1)); continue
            return e.code, {'message': body[:300]}
        except Exception as e:
            if attempt < 3:
                time.sleep(2 * (attempt + 1)); continue
            return 0, {'message': str(e)}
    return 0, {'message': 'unreachable'}


def json_loads(s):
    import json
    return json.loads(s)


st, ref = api('GET', '/git/ref/heads/%s' % BRANCH)
if st != 200:
    sys.exit('读远端分支失败：%s %s' % (st, ref.get('message', '')))
remote_sha = ref['object']['sha']
print('远端 %s = %s' % (BRANCH, remote_sha[:7]))

local_commits = git('rev-list', '--reverse', remote_sha + '..HEAD').split()
if not local_commits:
    print('没有要推的新提交，齐了。')
    sys.exit(0)
print('待推 %d 个：%s' % (len(local_commits), ' '.join(c[:7] for c in local_commits)))

# ── tree / blob ──
objs = {}
for line in sh('git', 'rev-list', '--objects', remote_sha + '..HEAD').splitlines():
    if not line:
        continue
    sha = line.split()[0]
    t = git('cat-file', '-t', sha)
    if t in ('tree', 'blob'):
        objs[sha] = t
print('对象 %d 个（tree %d / blob %d）' % (len(objs),
      sum(1 for v in objs.values() if v == 'tree'),
      sum(1 for v in objs.values() if v == 'blob')))

for sha, t in objs.items():
    if t != 'blob':
        continue
    raw = subprocess.check_output(['git', 'cat-file', 'blob', sha])
    st, r = api('POST', '/git/blobs', {'content': base64.b64encode(raw).decode(), 'encoding': 'base64'})
    if st != 201 or r.get('sha') != sha:
        sys.exit('blob 不对 %s：%s %s' % (sha[:7], st, str(r)[:200]))
print('blob 传完，sha 全对上')

path_depth = {}
for line in sh('git', 'rev-list', '--objects', remote_sha + '..HEAD').splitlines():
    parts = line.split(' ', 1)
    if len(parts) == 2 and parts[0] in objs and objs[parts[0]] == 'tree':
        p = parts[1]
        path_depth[parts[0]] = (p.count('/') + 1) if p else 0  # 根树路径为空 → 0
trees = [s for s, t in objs.items() if t == 'tree']
trees.sort(key=lambda s: -path_depth.get(s, 0))
for sha in trees:
    entries = []
    for line in git('-c', 'core.quotepath=false', 'ls-tree', sha).splitlines():
        meta, name = line.split('\t', 1)
        mode, typ, osha = meta.split()
        entries.append({'path': name, 'mode': mode, 'type': typ, 'sha': osha})
    st, r = api('POST', '/git/trees', {'tree': entries})
    if st != 201 or r.get('sha') != sha:
        sys.exit('tree 不对 %s：%s %s' % (sha[:7], st, str(r)[:300]))
print('tree 传完，sha 全对上')

# ── 提交：远端照 GitHub 的格式造，本地也照同一格式重建，两边 sha 一致 ──
def split_ident(s):
    lt, gt = s.rfind('<'), s.rfind('>')
    name, email = s[:lt].strip(), s[lt + 1:gt]
    ts, tz = s[gt + 1:].split()
    sign = 1 if tz[0] == '+' else -1
    off = timezone(sign * timedelta(hours=int(tz[1:3]), minutes=int(tz[3:5])))
    return {'name': name, 'email': email, 'date': datetime.fromtimestamp(int(ts), off).isoformat()}, s


new_head = remote_sha
for c in local_commits:
    raw = git('cat-file', 'commit', c)
    head, _, msg_full = raw.partition('\n\n')
    msg = msg_full.rstrip('\n')          # GitHub 会去掉末尾换行，先照办
    tree, parents, author, committer = None, [], None, None
    for line in head.splitlines():
        if line.startswith('tree '):
            tree = line[5:]
        elif line.startswith('parent '):
            parents.append(line[7:])
        elif line.startswith('author '):
            author = line[7:]
        elif line.startswith('committer '):
            committer = line[10:]
    a_info, a_raw = split_ident(author)
    c_info, _ = split_ident(committer)

    st, r = api('POST', '/git/commits', {'message': msg, 'tree': tree,
                                         'parents': [new_head], 'author': a_info, 'committer': c_info})
    if st != 201:
        sys.exit('造提交失败 %s：%s %s' % (c[:7], st, str(r)[:400]))
    new_sha = r['sha']
    # 本地照同一字节格式重建（时区原样、消息无尾换行），保证两边 sha 一致
    a_ts_tz = a_raw[a_raw.rfind('>') + 1:].strip()
    c_ts_tz = committer[committer.rfind('>') + 1:].strip()
    local_raw = ('tree %s\nparent %s\nauthor %s <%s> %s\ncommitter %s <%s> %s\n\n%s'
                 % (tree, new_head, a_info['name'], a_info['email'], a_ts_tz,
                    c_info['name'], c_info['email'], c_ts_tz, msg))
    got = sh('git', 'hash-object', '-t', 'commit', '-w', '--stdin', inp=local_raw)
    if got != new_sha:
        sys.exit('本地重建对不上 %s：本地 %s / 远端 %s' % (c[:7], got[:7], new_sha[:7]))
    print('commit ok  %s -> %s' % (c[:7], new_sha[:7]))
    new_head = new_sha

st, r = api('PATCH', '/git/refs/heads/%s' % BRANCH, {'sha': new_head, 'force': False})
if st != 200:
    sys.exit('挪分支失败：%s %s' % (st, str(r)[:300]))
print('远端 %s 已到 %s' % (BRANCH, r['object']['sha'][:7]))

# 本地分支也挪过去（旧历史留在 reflog，丢不了）
subprocess.run(['git', 'update-ref', '-m', 'push via api', 'refs/heads/%s' % BRANCH, new_head], check=True)
print('本地 %s 也对齐到 %s' % (BRANCH, new_head[:7]))
print('推完。')
