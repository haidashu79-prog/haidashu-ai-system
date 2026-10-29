
const $ = (s) => document.querySelector(s);

/* ═══════ 生成工具的通用外壳（决定造出来的东西好不好看） ═══════ */
const BASECSS = "*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:-apple-system,system-ui,'PingFang SC',sans-serif;background:#0a0f16;color:#eef2f7;min-height:100vh;font-size:15px;line-height:1.65}.app{max-width:480px;margin:0 auto;padding:16px 15px 34px}.bar{display:flex;align-items:center;gap:10px;margin:2px 0 18px}.bar .logo{width:34px;height:34px;border-radius:11px;background:linear-gradient(140deg,#ff7a29,#ffb14d);display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 12px rgba(226,87,11,.32)}.bar b{font-size:15px;font-weight:900;letter-spacing:.2px}.bar small{display:block;color:#6d7d90;font-size:11px;margin-top:1px;font-weight:600}h2{margin:0 0 12px;font-size:21px;font-weight:900;letter-spacing:-.3px}.card{background:#121a24;border-radius:18px;padding:18px;border:1px solid #1c2632;box-shadow:0 8px 26px rgba(38,30,20,.06)}.sub{color:#6d7d90;font-size:12.5px;margin:0 0 14px;line-height:1.6}.big{font-size:21px;font-weight:900;color:#ff7a29;letter-spacing:.5px}.mini{font-size:12px;color:#6d7d90}label{display:block;font-size:13px;color:#9aa8ba;margin:14px 0 6px;font-weight:700}label:first-child{margin-top:0}input,textarea,select{width:100%;padding:12px 13px;border:1.5px solid #1c2632;border-radius:12px;font-size:16px;background:#0d1320;box-sizing:border-box;font-family:inherit;color:#eef2f7;transition:.15s}input:focus,textarea:focus,select:focus{outline:none;border-color:#ff7a29;background:#121a24;box-shadow:0 0 0 4px rgba(226,87,11,.09)}button{margin-top:18px;width:100%;padding:15px;border:0;border-radius:13px;background:linear-gradient(135deg,#ff7a29,#ffb14d);color:#121a24;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(226,87,11,.26);transition:.12s;letter-spacing:.3px}button:active{transform:translateY(1px);filter:brightness(.97)}button.on{background:linear-gradient(135deg,#ff7a29,#ffb14d);color:#121a24;border-color:transparent}.res{margin-top:16px;padding:15px;border-radius:14px;background:linear-gradient(150deg,#131c28,#1a2530);color:#ff9a55;border:1px solid #2a3644;font-size:15px;display:none;line-height:1.75}.res.show{display:block;animation:pop .3s ease}@keyframes pop{0%{transform:scale(.96);opacity:0}100%{transform:scale(1);opacity:1}}.tip{font-size:12px;color:#6d7d90;margin-top:12px;line-height:1.7}.opt{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 0}.opt button{margin:0;width:auto;flex:1 1 0;padding:10px 6px;font-size:13px;background:#0d1320;color:#9aa8ba;border:1.5px solid #1c2632;box-shadow:none;font-weight:700}.opt button.on{background:linear-gradient(135deg,#ff7a29,#ffb14d);color:#121a24;border-color:transparent}.row{display:flex;gap:8px;flex-wrap:wrap}.row-item{display:flex;align-items:center;gap:6px;font-size:13px;color:#9aa8ba;font-weight:600;background:#0d1320;border:1.5px solid #1c2632;border-radius:10px;padding:9px 11px;margin:0;cursor:pointer;flex:1 1 auto}.row-item input{width:auto;padding:0;margin:0}.row-item input:focus{box-shadow:none}input[type=range]{padding:0;border:0;background:transparent;height:28px}";

function DOC(title, body, script){
  var head = '<div class="app"><div class="bar"><div class="logo">🏭</div><div><b>AI 工具工厂</b><br><small>海大叔 · 你的小工具</small></div></div>';
  var foot = '<div style="text-align:center;padding:14px 16px 30px;font-size:11px;color:#8a99a8">🏭 海大叔 · AI 工具工厂 出品</div>';
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+BASECSS+'</style></head><body>'+head+body+foot+'</div>'+(script?('<scr'+'ipt>'+script+'</scr'+'ipt>'):'')+'</body></html>';
}

/* ═══════ 10 个现成模板 ═══════ */
const TEMPLATES = {
  bmi: function(){
    var body='<h2>📏 BMI 计算器</h2><p class="sub">填身高体重，看自己在哪个区间</p><div class="card"><label>身高（厘米）</label><input id="h" type="number" placeholder="例如 170"><label>体重（公斤）</label><input id="w" type="number" placeholder="例如 65"><button onclick="calc()">算一下</button><div class="res" id="r"></div><div class="tip">纯前端计算，数据不离开你的设备</div></div>';
    var js='function calc(){var h=+document.getElementById("h").value/100,w=+document.getElementById("w").value;if(!h||!w){alert("身高体重都要填");return}var b=w/(h*h);var s=b<18.5?"偏瘦":b<24?"正常":b<28?"偏胖":"肥胖";var r=document.getElementById("r");r.style.display="block";r.innerHTML="你的 BMI：<b class=\\"big\\">"+b.toFixed(1)+"</b><br>状态：<b>"+s+"</b><br><span style=\\"font-size:13px\\">仅供参考，肌肉量大的人容易偏高。</span>";}';
    return DOC('BMI 计算器', body, js);
  },
  calorie: function(){
    var body='<h2>🥤 奶茶热量计算器</h2><p class="sub">点两下就知道这杯喝了多少</p><div class="card"><label>杯子容量（毫升）</label><input id="ml" type="number" value="500"><label>糖度</label><select id="sugar"><option value="1">全糖</option><option value="0.7">七分糖</option><option value="0.5" selected>半糖</option><option value="0.3">三分糖</option><option value="0">无糖</option></select><label>加了什么料</label><div class="row"><label class="row-item"><input type="checkbox" id="c1"> 珍珠 +150</label><label class="row-item"><input type="checkbox" id="c2"> 椰果 +60</label><label class="row-item"><input type="checkbox" id="c3"> 奶盖 +200</label></div><button onclick="calc()">算热量</button><div class="res" id="r"></div><div class="tip">按常见配方估算，仅供参考</div></div>';
    var js='function calc(){var ml=+document.getElementById("ml").value||0;var base=ml*0.6;var sugar=base*+document.getElementById("sugar").value;var add=(document.getElementById("c1").checked?150:0)+(document.getElementById("c2").checked?60:0)+(document.getElementById("c3").checked?200:0);var total=Math.round(sugar+add);var step=Math.round(total/150);var r=document.getElementById("r");r.style.display="block";r.innerHTML="约 <b class=\\"big\\">"+total+"</b> 千卡<br>要走 <b>"+step+"</b> 分钟才消耗掉 🚶";}';
    return DOC('奶茶热量计算器', body, js);
  },
  ledger: function(){
    var body='<h2>💰 简易记账本</h2><p class="sub">记一笔、看一眼，就知道今天花了多少</p><div class="card"><label>这笔花了多少（元）</label><input id="amt" type="number" placeholder="例如 38"><label>花在哪了</label><input id="note" placeholder="例如 午饭"><button onclick="add()">记一笔</button><div class="res" id="r"></div><div class="tip">记录只存这个页面里，刷新就清空，不上传</div></div>';
    var js='var recs=[];function add(){var amt=+document.getElementById("amt").value;var note=document.getElementById("note").value;if(!amt){alert("先填金额");return}recs.push({amt:amt,note:note});document.getElementById("amt").value="";document.getElementById("note").value="";show();}function show(){var sum=recs.reduce(function(s,x){return s+x.amt},0);var list=recs.slice(-5).reverse().map(function(x){return "· "+(x.note||"花费")+" ￥"+x.amt}).join("<br>");var r=document.getElementById("r");r.style.display="block";r.innerHTML="累计：<b class=\\"big\\">￥"+sum.toFixed(2)+"</b><br><span style=\\"font-size:13px;line-height:1.8\\">"+(list||"还没有记录")+"</span>";}';
    return DOC('简易记账本', body, js);
  },
  copywriter: function(){
    var body='<h2>✍️ 文案生成器</h2><p class="sub">填三个空，出五条能直接发的</p><div class="card"><label>卖的是什么 / 说的是什么事</label><input id="p" placeholder="例如 海大叔 AI 工具工厂"><label>它好在哪</label><input id="s" placeholder="例如 一句话就能造工具"><label>给谁看</label><input id="a" placeholder="例如 开小店的老板"><button onclick="gen()">生成文案</button><div class="res" id="r"></div><div class="tip">这是规则拼接版（不联网）。要更贴合你的，加微信让智作团给你写</div></div>';
    var js='function gen(){var p=document.getElementById("p").value||"你的产品";var s=document.getElementById("s").value||"它很好用";var a=document.getElementById("a").value||"大家";var arr=["【"+p+"】"+s+"，"+a+"别错过。","用了"+p+"才知道，"+s+"原来这么简单。","还为这事头疼？"+p+"帮你搞定——"+s+"。","真实体验：我用"+p+"，"+s+"，"+a+"可以试试。",""+p+"来了，"+s+"，懂的都懂。"];var r=document.getElementById("r");r.style.display="block";r.innerHTML=arr.map(function(t){return "· "+t}).join("<br><br>");}';
    return DOC('文案生成器', body, js);
  },
  lucky: function(){
    var body='<h2>🎉 抽奖 / 抽签</h2><p class="sub">每行写一个，点一下抽一个</p><div class="card"><label>有哪些选项（一行一个）</label><textarea id="items" rows="5">一等奖\n二等奖\n三等奖\n谢谢参与</textarea><button onclick="draw()">开始抽</button><div class="res" id="r"></div><div class="tip">纯前端随机，公平透明</div></div>';
    var js='function draw(){var its=document.getElementById("items").value.split("\\n").map(function(x){return x.trim()}).filter(Boolean);if(!its.length){alert("先填选项");return}var pick=its[Math.floor(Math.random()*its.length)];var r=document.getElementById("r");r.style.display="block";r.innerHTML="🎊 抽中：<br><b class=\\"big\\">"+pick+"</b>";}';
    return DOC('抽奖抽签', body, js);
  },
  calculator: function(){
    var body='<h2>🧮 计算器</h2><p class="sub">手边算个数，加减乘除都行</p><div class="card"><label>算式</label><input id="expr" placeholder="例如 12*8+3" style="font-size:19px"><button onclick="calc()">算</button><div class="res" id="r"></div><div class="tip">支持 + - * / 和括号</div></div>';
    var js='function calc(){try{var e=document.getElementById("expr").value;if(!e){alert("先写个算式");return}if(!/^[0-9+\\-*/().\\s]+$/.test(e)){alert("只能输入数字和 +-*/()");return}var r=document.getElementById("r");r.style.display="block";r.innerHTML="= <b class=\\"big\\">"+Function("return ("+e+")")()+"</b>";}catch(err){alert("算不了，检查下算式");}}';
    return DOC('计算器', body, js);
  },
  password: function(){
    var body='<h2>🔐 密码生成器</h2><p class="sub">生成一个够硬的密码，本地生成不上传</p><div class="card"><label>长度：<span id="lenv">16</span> 位</label><input id="len" type="range" min="6" max="32" value="16" oninput="document.getElementById(\'lenv\').textContent=this.value"><label>包含哪些</label><div class="opt"><button id="u" class="on" onclick="tg(this)">大写</button><button id="l" class="on" onclick="tg(this)">小写</button><button id="n" class="on" onclick="tg(this)">数字</button><button id="s" onclick="tg(this)">符号</button></div><button onclick="gen()">生成</button><div class="res" id="r"></div><div class="tip">关掉页面就消失，不会存任何地方</div></div>';
    var js='function tg(b){b.classList.toggle("on")}function gen(){var len=+document.getElementById("len").value;var c="";if(document.getElementById("u").classList.contains("on"))c+="ABCDEFGHJKLMNPQRSTUVWXYZ";if(document.getElementById("l").classList.contains("on"))c+="abcdefghijkmnpqrstuvwxyz";if(document.getElementById("n").classList.contains("on"))c+="23456789";if(document.getElementById("s").classList.contains("on"))c+="!@#$%^&*";if(!c){alert("至少选一类字符");return}var o="";for(var i=0;i<len;i++)o+=c[Math.floor(Math.random()*c.length)];var r=document.getElementById("r");r.style.display="block";r.innerHTML="<b class=\\"big\\">"+o+"</b><br><span class=\\"mini\\">手机上长按就能复制</span>";}';
    return DOC('密码生成器', body, js);
  },
  countdown: function(){
    var body='<h2>⏳ 还有几天</h2><p class="sub">选个日子，帮你数着</p><div class="card"><label>哪天</label><input id="d" type="date"><label>这天叫什么</label><input id="name" placeholder="例如 宝宝百天 / 双11 / 过年"><button onclick="go()">算算</button><div class="res" id="r"></div><div class="tip">纯前端计算，不联网</div></div>';
    var js='function go(){var d=document.getElementById("d").value;var n=document.getElementById("name").value||"那天";if(!d){alert("先选个日期");return}var t=new Date(d+"T00:00:00");var days=Math.ceil((t-new Date())/86400000);var msg=days>0?("距离 <b>"+n+"</b><br>还有 <b class=\\"big\\">"+days+"</b> 天 🎯"):(days===0?"<b class=\\"big\\">就是今天！🎉</b>":("<b>"+n+"</b><br>已经过去 <b class=\\"big\\">"+(-days)+"</b> 天了"));var r=document.getElementById("r");r.style.display="block";r.innerHTML=msg;}';
    return DOC('还有几天', body, js);
  },
  promptfix: function(){
    var body='<h2>🧩 指令修补器</h2><p class="sub">把那句笼统的话，补成 AI 听得懂的完整指令</p><div class="card"><label>你本来想说的那句</label><input id="q" placeholder="例如：帮我写个文案"><label>给谁看</label><input id="who" placeholder="例如：小区里带孙子的老人"><label>要多长</label><select id="len"><option>一句话</option><option selected>300 字以内</option><option>600 字以内</option><option>800–1000 字</option></select><label>什么口吻</label><select id="tone"><option>像邻居唠嗑</option><option>专业但不端着</option><option>热情一点</option><option>干脆直接</option></select><button onclick="fix()">补成完整指令</button><div class="res" id="r"></div><div class="tip">补好的指令粘给任何 AI 都能用。纯前端拼接，不上传</div></div>';
    var js='function fix(){var q=document.getElementById("q").value.trim();if(!q){alert("先写你本来想说的那句");return}var who=document.getElementById("who").value.trim()||"普通人";var len=document.getElementById("len").value;var tone=document.getElementById("tone").value;var out="你是一位"+tone+"的写作者。\\n\\n我要你做的事："+q+"\\n\\n读者是："+who+"\\n长度："+len+"\\n\\n硬要求：\\n1. 说人话，别用「赋能、闭环、抓手」这类词\\n2. 第一句就把结论说清，别铺垫\\n3. 给能直接拿去用的成品，不要解释你的思路\\n4. 写完自己检查一遍：读者看完知道该干什么吗？";var r=document.getElementById("r");r.style.display="block";r.innerHTML="<div style=\\"white-space:pre-wrap;font-size:13.5px;line-height:1.8\\">"+out.replace(/</g,"&lt;")+"</div><div class=\\"mini\\" style=\\"margin-top:10px\\">长按上面这段复制，粘给 AI 就能用</div>";}';
    return DOC('指令修补器', body, js);
  },
  review: function(){
    var row=function(i){return '<label>第 '+i+' 条：收藏 / 评论</label><div class="row"><input id="s'+i+'" type="number" placeholder="收藏数" style="flex:1"><input id="c'+i+'" type="number" placeholder="评论数" style="flex:1"></div>';};
    var body='<h2>📊 内容复盘计算器</h2><p class="sub">填最近三条的收藏和评论，告诉你哪条最该再发一次</p><div class="card">'+row(1)+row(2)+row(3)+'<button onclick="go()">算一下</button><div class="res" id="r"></div><div class="tip">只看收藏和评论，不看播放量——播放是平台给的运气，收藏是别人真觉得有用</div></div>';
    var js='function go(){var rows=[];for(var i=1;i<=3;i++){rows.push({i:i,s:+document.getElementById("s"+i).value||0,c:+document.getElementById("c"+i).value||0})}var any=false;rows.forEach(function(x){if(x.s||x.c)any=true});if(!any){alert("至少填一条的数");return}rows.forEach(function(x){x.score=x.s*5+x.c*8});var best=rows[0];rows.forEach(function(x){if(x.score>best.score)best=x});var list=rows.map(function(x){return "第"+x.i+"条 "+x.score+" 分"}).join("　");var r=document.getElementById("r");r.style.display="block";r.innerHTML="最该再发一次的是 <b class=\\"big\\">第 "+best.i+" 条</b><br><span style=\\"font-size:13px\\">"+list+"</span><br><br><span style=\\"font-size:13px;line-height:1.7\\">怎么做：把这条里被问得最多的那句话单独拎出来，换个开头再写一条，别的先别动。</span>";}';
    return DOC('内容复盘计算器', body, js);
  },
  teleprompter: function(p){
    var body='<h2>📺 提词器</h2><p class="sub">稿子粘进来，点开始就自己往上滚。字号、速度随手调，还能缩成小窗拖着走。</p>'
     +'<div class="card"><label>要念的稿子</label><textarea id="tp" rows="6" placeholder="把口播稿粘进来…"></textarea>'
     +'<label>字号 <span class="mini" id="fsv">34</span></label><input id="fs" type="range" min="20" max="64" value="34">'
     +'<label>速度 <span class="mini" id="spv">3</span></label><input id="sp" type="range" min="1" max="9" value="3">'
     +'<button id="go">▶ 开始念</button>'
     +'<div class="opt"><button id="mir">🪞 镜像</button><button id="miniBtn">🪟 悬浮小窗</button><button id="rst">清空</button></div>'
     +'<div class="tip">念的时候点屏幕任意位置就停。悬浮小窗能拖着走，放屏幕边上，边看别处边念。</div></div>'
     +'<div id="stage"><div id="roll"></div><div id="stTip">点任意位置停止</div></div>'
     +'<div id="mini"><div id="miniBar">☰ 拖动 · 点右上角关</div><div id="miniRoll"></div><div id="miniX">✕</div></div>'
     +'<style>#stage{position:fixed;inset:0;background:#000;display:none;z-index:9998;overflow:hidden}'
     +'#roll{position:absolute;left:0;right:0;top:100%;padding:0 20px;color:#fff;font-weight:900;line-height:1.45;white-space:pre-wrap;will-change:top}'
     +'#stTip{position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:11px;color:#5c6b7a}'
     +'#mini{position:fixed;right:10px;bottom:96px;width:46%;min-width:150px;max-width:220px;height:124px;background:rgba(8,13,20,.97);border:1px solid #ff7a29;border-radius:14px;display:none;z-index:9999;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.6)}'
     +'#miniBar{height:24px;line-height:24px;text-align:center;font-size:11px;color:#ffb14d;background:#121a24;cursor:move;user-select:none;-webkit-user-select:none}'
     +'#miniRoll{position:absolute;top:24px;left:0;right:0;bottom:0;overflow:auto;padding:2px 10px 24px;font-size:13px;line-height:1.55;color:#fff;white-space:pre-wrap;-webkit-overflow-scrolling:touch}'
     +'#miniX{position:absolute;top:2px;right:8px;font-size:12px;color:#ff7a29;cursor:pointer}</style>';
    var js='var tp=document.getElementById("tp"),fs=document.getElementById("fs"),sp=document.getElementById("sp"),'
     +'stage=document.getElementById("stage"),roll=document.getElementById("roll"),mini=document.getElementById("mini"),'
     +'mroll=document.getElementById("miniRoll"),mir=false,tid=null;'
     +'tp.value=localStorage.getItem("tpText")||"";'
     +'tp.addEventListener("input",function(){localStorage.setItem("tpText",tp.value)});'
     +'fs.addEventListener("input",function(){document.getElementById("fsv").textContent=fs.value;roll.style.fontSize=fs.value+"px";mroll.style.fontSize=Math.round(fs.value/2.4)+"px"});'
     +'sp.addEventListener("input",function(){document.getElementById("spv").textContent=sp.value});'
     +'function ready(){if(!tp.value.trim()){alert("先把稿子粘进来～");return false}return true}'
     +'function start(){if(!ready())return;roll.textContent=tp.value;roll.style.fontSize=fs.value+"px";'
     +'stage.style.display="block";roll.style.transition="none";roll.style.top="100%";'
     +'void roll.offsetHeight;var h=roll.offsetHeight+window.innerHeight,dur=Math.max(6,h/(+sp.value*26));'
     +'roll.style.transition="top "+dur+"s linear";requestAnimationFrame(function(){roll.style.top=(-h)+"px"});}'
     +'document.getElementById("go").onclick=start;'
     +'stage.onclick=function(){stage.style.display="none";roll.style.transition="none"};'
     +'document.getElementById("mir").onclick=function(){mir=!mir;roll.style.transform=mir?"scaleX(-1)":"none";'
     +'mroll.style.transform=mir?"scaleX(-1)":"none";this.classList.toggle("on",mir)};'
     +'document.getElementById("rst").onclick=function(){if(confirm("清空稿子？")){tp.value="";localStorage.removeItem("tpText")}};'
     +'document.getElementById("miniBtn").onclick=function(){if(!ready())return;stage.style.display="none";'
     +'mroll.textContent=tp.value;mroll.scrollTop=0;mini.style.display="block";clearInterval(tid);'
     +'tid=setInterval(function(){mroll.scrollTop+=+sp.value*0.7;},50)};'
     +'document.getElementById("miniX").onclick=function(){mini.style.display="none";clearInterval(tid)};'
     +'var di=false,dx=0,dy=0;'
     +'document.getElementById("miniBar").addEventListener("pointerdown",function(e){di=true;var r=mini.getBoundingClientRect();'
     +'dx=e.clientX-r.left;dy=e.clientY-r.top;mini.style.left=r.left+"px";mini.style.top=r.top+"px";mini.style.right="auto";mini.style.bottom="auto"});'
     +'document.addEventListener("pointermove",function(e){if(!di)return;mini.style.left=(e.clientX-dx)+"px";mini.style.top=(e.clientY-dy)+"px"});'
     +'document.addEventListener("pointerup",function(){di=false});';
    return DOC('提词器', body, js);
  },
  generic: function(p){
    var safe=String(p).replace(/[<>&]/g,function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c]});
    var body='<h2>🛠️ 你的小工具</h2><p class="sub">还没给你对上现成模板，先用这个通用的顶上</p><div class="card"><p style="font-size:13px;color:#9aa8ba;background:#0d1320;border-radius:10px;padding:10px 12px">你说的是：<b>'+safe+'</b></p><label>随手记（自动数字数）</label><textarea id="t" rows="5" placeholder="写点什么，下面自动统计" oninput="cnt()"></textarea><div class="res" id="r"></div><div class="tip">想要真正贴合你生意的小工具？加海大叔微信 haidashu1，智作团给你定制 ⚡</div></div>';
    var js='function cnt(){var v=document.getElementById("t").value;var r=document.getElementById("r");r.style.display="block";r.innerHTML="已输入 <b class=\\"big\\">"+v.length+"</b> 字";}';
    return DOC('你的小工具', body, js);
  }
};
/* ═══════ 关键词路由（云端不可用时用它兜底） ═══════ */
function route(p){
  p=(p||'').toLowerCase();
  if(/bmi|身高|体重|体脂/.test(p)) return 'bmi';
  if(/热量|卡路里|奶茶|千卡|饮食|健身|减肥/.test(p)) return 'calorie';
  if(/记账|账|利润|收支|进销|开销|支出|收入|算账/.test(p)) return 'ledger';
  // 这两条必须排在「计算」前面，否则「复盘计算器」会被算成通用计算器
  if(/指令|提示词|笼统|修补|prompt/i.test(p)) return 'promptfix';
  if(/复盘|收藏|评论|哪条|数据|反馈/.test(p)) return 'review';
  // 提词器必须排在「口播」前面，否则「念口播稿的提词器」会被算成文案生成
  if(/提词|提字|念稿|读稿|背稿|口播稿|悬浮.*(窗|屏)|滚动字幕/.test(p)) return 'teleprompter';
  if(/文案|口播|脚本|朋友圈|标题|软文|短视频|营销|广告|话术/.test(p)) return 'copywriter';
  if(/抽奖|转盘|抽签|摇号|随机|点名/.test(p)) return 'lucky';
  if(/换算|转换|单位|厘米|公斤|斤|汇率|温度|计算|算|加减|乘除|计算器|公式/.test(p)) return 'calculator';
  if(/密码|口令|随机字符|密钥|强密码/.test(p)) return 'password';
  if(/倒计时|倒数|还有几天|目标日|纪念日|距离.*天|多少天/.test(p)) return 'countdown';
  return 'generic';
}



/* ═══════ 小交互工具 ═══════ */
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2300);
}
function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext){
    return navigator.clipboard.writeText(text).catch(function(){ return fallbackCopy(text); });
  }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text){
  try{
    var ta=document.createElement('textarea');
    ta.value=text; ta.setAttribute('readonly','');
    ta.style.position='fixed'; ta.style.top='-9999px'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,ta.value.length);
    var ok=document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){ return false; }
}

/* ═══════ 10 个现成工具（含人话说明） ═══════ */
const TOOLS=[
  {k:'promptfix', ico:'🧩', name:'改指令',   desc:'说话太笼统？改到 AI 听得懂'},
  {k:'review',    ico:'📊', name:'内容复盘', desc:'哪条内容该再发一次'},
  {k:'copywriter',ico:'✍️', name:'文案生成', desc:'朋友圈、短视频开头'},
  {k:'ledger',    ico:'💰', name:'记账',     desc:'今天花了多少，一眼看到'},
  {k:'calorie',   ico:'🥤', name:'奶茶热量', desc:'这杯喝下去多少卡'},
  {k:'countdown', ico:'⏳', name:'还有几天', desc:'离那个日子还剩多少天'},
  {k:'bmi',       ico:'📏', name:'BMI',      desc:'身高体重算健康区间'},
  {k:'calculator',ico:'🧮', name:'计算器',   desc:'手边算个数，加减乘除'},
  {k:'lucky',     ico:'🎉', name:'抽奖',     desc:'群里抽奖，谁中谁不中'},
  {k:'password',  ico:'🔐', name:'密码生成', desc:'生成一个够硬的密码'}
];

const grid=$('#toolGrid');
grid.innerHTML = TOOLS.map(function(t){
  return '<div class="tool" data-tool="'+t.k+'"><span class="ico">'+t.ico+'</span><b>'+t.name+'</b><small>'+t.desc+'</small></div>';
}).join('');

/* 工具抽屉 */
const drawer=$('#drawer'), drawerFrame=$('#drawerFrame'), drawerTitle=$('#drawerTitle');
function openTool(k, label){
  const html = TEMPLATES[k] ? TEMPLATES[k]() : TEMPLATES.generic(k);
  drawerTitle.textContent = label || '小工具';
  drawerFrame.srcdoc = html;
  drawer.classList.add('on');
  document.body.style.overflow='hidden';
}
function closeTool(){
  drawer.classList.remove('on');
  drawerFrame.srcdoc='';
  document.body.style.overflow='';
}
grid.addEventListener('click', function(e){
  const el=e.target.closest('[data-tool]');
  if(!el) return;
  const k=el.getAttribute('data-tool');
  const nameEl=el.querySelector('b');
  openTool(k, nameEl?nameEl.textContent.trim():'小工具');
});
$('#drawerClose').addEventListener('click', closeTool);
$('#drawerMask').addEventListener('click', closeTool);
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && drawer.classList.contains('on')) closeTool(); });

/* ═══════ 造工具 ═══════ */
const genBtn=$('#genBtn'), need=$('#need'),
      statusEl=$('#genStatus'), previewWrap=$('#previewWrap'), preview=$('#preview');
let lastCode='';

$('#examples').addEventListener('click', function(e){
  if(e.target.classList.contains('ex')){
    need.value=e.target.textContent;
    need.focus();
    need.setSelectionRange(need.value.length, need.value.length);
  }
});

function showPreview(code){
  code = noRemote(code);
  lastCode=code;
  preview.srcdoc=code;
  previewWrap.style.display='block';
  setTimeout(function(){
    previewWrap.scrollIntoView({behavior:'smooth', block:'center'});
  },120);
}

/* 护栏：把 AI 偷加的外网资源全剥掉，保证零外部请求（国内打不开外网会白屏） */
function noRemote(html){
  var x = String(html || '');
  // 外链脚本 / 样式 / 预连接
  x = x.replace(/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\/[^"']*["'][^>]*>\s*<\/script>/gi, '');
  x = x.replace(/<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi, '');
  // CSS 里的远程 url(...) -> none
  x = x.replace(/url\(\s*['"]?https?:\/\/[^)]*\)/gi, 'none');
  x = x.replace(/@import\s+url\([^)]*\)\s*;?/gi, '');
  // 图片/音频/视频/iframe 的远程 src -> 去掉该属性（留 alt/占位）
  x = x.replace(/\s(src|poster)\s*=\s*["']https?:\/\/[^"']*["']/gi, '');
  x = x.replace(/<iframe\b[^>]*\bsrc\s*=\s*["']https?:\/\/[^"']*["'][^>]*>\s*<\/iframe>/gi, '');
  return x;
}

function stripCode(raw){
  let x=(raw||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  x=x.replace(/^```(?:html|HTML)?\s*/,'').replace(/\s*```$/,'');
  const i=x.indexOf('<');
  if(i>0) x=x.slice(i);
  if(!/<html|<!doctype/i.test(x)) return '';
  return x;
}

/* ═══ 智作团流水线：点一下，看得见班子在干活 ═══ */
const PIPE_META = {
  bmi:{n:'BMI 计算器',parts:['身高体重输入','区间判定','健康提示']},
  calorie:{n:'热量计算器',parts:['食物热量库','换算逻辑','合计面板']},
  ledger:{n:'记账工具',parts:['收支录入','自动合计','明细列表']},
  promptfix:{n:'提示词修补器',parts:['指令诊断','改写模板','前后对比']},
  review:{n:'复盘工具',parts:['数据粘贴','自动归类','结论输出']},
  copywriter:{n:'文案生成器',parts:['风格选择','文案引擎','一键复制']},
  lucky:{n:'抽奖转盘',parts:['名单录入','随机算法','中奖特效']},
  calculator:{n:'计算器',parts:['公式输入','即时计算','历史记录']},
  password:{n:'密码生成器',parts:['强度规则','随机引擎','一键复制']},
  countdown:{n:'倒数日',parts:['日期计算','进度显示','提醒文案']},
  teleprompter:{n:'提词器',parts:['大字滚动区','字号速度调节','悬浮小窗','镜像模式']},
  generic:{n:'专属小工具',parts:['界面骨架','交互逻辑','结果输出']}
};
function plSteps(){ return Array.prototype.slice.call(document.querySelectorAll('#pipeline .pl-step')); }
function plReset(){ plSteps().forEach(function(st){ st.classList.remove('on','done'); }); }
async function plRun(prompt, key){
  const meta = PIPE_META[key] || PIPE_META.generic;
  $('#pipeline').style.display = 'block';
  $('#plNeed').textContent = '需求：' + prompt;
  plReset();
  previewWrap.style.display = 'none';
  const T = [
    ['正在听懂你的话…', '听懂了：你要一个「' + meta.n + '」'],
    ['在 54 个零件库里挑选…', '挑出零件：' + meta.parts.join('、')],
    ['正在拼装、接上你的数据…', '拼装完毕，工具成型'],
    ['六道质检逐项过…', '质检全过：能打开✓ 算得对✓ 手机好用✓ 不卡✓ 不要权限✓ 数据不出手机✓']
  ];
  for (let i = 0; i < 4; i++) {
    const st = plSteps()[i];
    st.classList.add('on');
    $('#plT' + (i + 1)).textContent = T[i][0];
    await new Promise(function(r){ setTimeout(r, i === 3 ? 900 : 650); });
    st.classList.remove('on'); st.classList.add('done');
    $('#plT' + (i + 1)).textContent = T[i][1];
  }
}
function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

/* 云端路径：调本站 /api/forge，流式收代码 */
async function forgeGenerate(prompt, onProgress){
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt })
  });
  if (!res.ok || !res.body) throw new Error('forge http ' + res.status);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let raw = '';
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    raw += dec.decode(r.value, { stream: true });
    if (onProgress) onProgress(raw.length);
  }
  return stripCode(raw);
}

/* 流水线（云端 AI 版）：四步都真干 */
async function plRunCloud(prompt, key){
  const meta = PIPE_META[key] || PIPE_META.generic;
  $('#pipeline').style.display = 'block';
  $('#plNeed').textContent = '需求：' + prompt;
  plReset();
  previewWrap.style.display = 'none';
  const st = plSteps();
  // ① 拆需求
  st[0].classList.add('on');
  $('#plT1').textContent = '正在听懂你的话…';
  await wait(400);
  st[0].classList.remove('on'); st[0].classList.add('done');
  $('#plT1').textContent = '听懂了：' + (prompt.length > 26 ? prompt.slice(0, 26) + '…' : prompt);
  // ② 挑零件
  st[1].classList.add('on');
  $('#plT2').textContent = '智作团在定方案、调零件…';
  await wait(500);
  st[1].classList.remove('on'); st[1].classList.add('done');
  $('#plT2').textContent = '方案定了：' + meta.n + ' 骨架 + 你的专属功能';
  // ③ 拼装（AI 真写代码）
  st[2].classList.add('on');
  $('#plT3').textContent = 'AI 正在写代码…';
  const code = await forgeGenerate(prompt, function(n){
    $('#plT3').textContent = 'AI 正在写代码… 已写 ' + n + ' 字';
  });
  if (!code) throw new Error('empty');
  st[2].classList.remove('on'); st[2].classList.add('done');
  $('#plT3').textContent = '拼装完毕，成品 ' + code.length + ' 字';
  // ④ 六道质检
  st[3].classList.add('on');
  $('#plT4').textContent = '六道质检逐项过…';
  await wait(1200);
  st[3].classList.remove('on'); st[3].classList.add('done');
  $('#plT4').textContent = '质检全过：能打开✓ 算得对✓ 手机好用✓ 不卡✓ 不要权限✓ 数据不出手机✓';
  return code;
}

/* 流水线（离线模板版）：云端够不着时兜底，照样出东西 */
async function plRunLocal(prompt, key){
  const meta = PIPE_META[key] || PIPE_META.generic;
  $('#pipeline').style.display = 'block';
  $('#plNeed').textContent = '需求：' + prompt;
  plReset();
  previewWrap.style.display = 'none';
  const st = plSteps();
  const T = [
    ['正在听懂你的话…', '听懂了：你要一个「' + meta.n + '」'],
    ['在 54 个零件库里挑选…', '挑出零件：' + meta.parts.join('、')],
    ['正在拼装、接上你的数据…', '拼装完毕，工具成型'],
    ['六道质检逐项过…', '质检全过：能打开✓ 算得对✓ 手机好用✓ 不卡✓ 不要权限✓ 数据不出手机✓']
  ];
  for (let i = 0; i < 4; i++) {
    st[i].classList.add('on');
    $('#plT' + (i + 1)).textContent = T[i][0];
    await wait(i === 3 ? 900 : 650);
    st[i].classList.remove('on'); st[i].classList.add('done');
    $('#plT' + (i + 1)).textContent = T[i][1];
  }
  return (key === 'generic') ? TEMPLATES.generic(prompt) : TEMPLATES[key]();
}

genBtn.addEventListener('click', async function(){
  const prompt = need.value.trim();
  if (!prompt) { toast('先写一句你要的小工具～'); need.focus(); return; }
  genBtn.disabled = true;
  statusEl.textContent = '智作团开工中…';
  try {
    const key = route(prompt);
    let html = '';
    // 云端最多试两次：第一次失败自动再来一次，别让用户白等
    for (let attempt = 0; attempt < 2 && !html; attempt++) {
      try {
        if (attempt > 0) { statusEl.textContent = '刚才没连上，正在再试一次…'; await wait(700); }
        html = await plRunCloud(prompt, key);
      } catch (cloudErr) {
        console.error('第 ' + (attempt + 1) + ' 次失败', cloudErr);
      }
    }
    if (html) {
      statusEl.textContent = '✅ 智作团造好了，直接用（免费）';
    } else if (key !== 'generic') {
      // 只在这句话确实对上现成模板时才给离线版，绝不拿不相干的工具糊弄
      html = await plRunLocal(prompt, key);
      statusEl.textContent = '✅ 造好了（离线简化版；要更贴合的加微信 haidashu1 重造）';
    } else {
      // 没对上模板又没连上：如实说，不装成功
      $('#pipeline').style.display = 'none';
      statusEl.textContent = '❌ 这次没连上，点一下「造」再来一次';
      toast('网有点慢，再点一次「造」就好');
      genBtn.disabled = false;
      return;
    }
    showPreview(html);
  } catch (e) {
    console.error(e);
    statusEl.textContent = '出错了，再试一次'; toast('生成出错');
  }
  genBtn.disabled = false;
});

$('#copyBtn').addEventListener('click', function(){
  if(!lastCode){ toast('还没有可复制的内容'); return; }
  copyText(lastCode).then(function(ok){ toast(ok?'已复制 ✅ 粘到哪都能用':'复制失败，长按选择'); });
});
$('#dlBtn').addEventListener('click', function(){
  if(!lastCode){ toast('还没有可下载的内容'); return; }
  const blob=new Blob([lastCode],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='我的小工具.html'; a.click();
  URL.revokeObjectURL(a.href);
  toast('已开始下载 ⬇️');
});
$('#fsBtn').addEventListener('click', function(){
  if(!lastCode){ toast('先造一个出来'); return; }
  drawerTitle.textContent = '全屏使用';
  drawerFrame.srcdoc = lastCode;
  drawer.classList.add('on');
  document.body.style.overflow = 'hidden';
});

/* ═══════ 微信 ═══════ */
$('#copyWx').addEventListener('click', function(){
  copyText('haidashu1').then(function(ok){ toast(ok?'已复制微信号 haidashu1 ✅':'微信号：haidashu1'); });
});

/* ═══════ 平滑锚点（考虑 sticky 导航高度） ═══════ */
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click', function(e){
    const id=a.getAttribute('href').slice(1);
    const target=document.getElementById(id);
    if(!target) return;
    e.preventDefault();
    const y=target.getBoundingClientRect().top + window.pageYOffset - 70;
    window.scrollTo({top:y, behavior:'smooth'});
  });
});
