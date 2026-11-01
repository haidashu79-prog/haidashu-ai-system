// 十二星座档案 + 每日/每周运势示例（内置兜底，离线可用）
// 语气：温暖陪伴、不恐吓不宿命、落"娱乐参考"（人设：星语）
const ZODIAC_SIGNS = [
  {id:1,name:"白羊座",dateRange:"3.21-4.19",element:"火",ruler:"火星",traits:["热情","直率","敢为人先"],luckyColor:"正红",luckyNumber:6,
   daily:{summary:"行动力满格的一天，想做就去做，但出门前给自己三秒冷静。",love:"别把话说太满，留点余地更温柔。",career:"适合主动出击，你的冲劲会被看见。",health:"注意别太上火，多喝水。",advice:"你可以先把最难的那件事放在早上搞定。"},
   weekly:{summary:"本周节奏偏快，是你的推进期；稳住情绪就顺。",advice:"你可以每天睡前写三件今天做成的小事，攒成就感。"}},
  {id:2,name:"金牛座",dateRange:"4.20-5.20",element:"土",ruler:"金星",traits:["踏实","有品位","稳中求进"],luckyColor:"牛油果绿",luckyNumber:2,
   daily:{summary:"适合慢下来把一件事做扎实，别急着同时开好几个头。",love:"陪伴比甜言蜜语更打动你。",career:"守住节奏，你的稳就是竞争力。",health:"犒劳下味蕾，但也别过量。",advice:"你可以给今天定一个'只做成一件事'的小目标。"},
   weekly:{summary:"本周宜整理与积累，物质和生活都在慢慢变好。",advice:"你可以清理一处角落，心情会跟着清爽。"}},
  {id:3,name:"双子座",dateRange:"5.21-6.21",element:"风",ruler:"水星",traits:["机敏","好奇","能说会道"],luckyColor:"明黄",luckyNumber:5,
   daily:{summary:"信息量大的一天，多听少说，能捡到好机会。",love:"一句真心的问候，好过十条群发。",career:"沟通是你的主场，适合谈事、链接人。",health:"脑子转太久，让眼睛歇歇。",advice:"你可以把今天冒出的好点子立刻记下来。"},
   weekly:{summary:"本周事情杂但你能应付，分清主次就不乱。",advice:"你可以给待办排个序，先做最重要的两件。"}},
  {id:4,name:"巨蟹座",dateRange:"6.22-7.22",element:"水",ruler:"月亮",traits:["温柔","重情","顾家"],luckyColor:"月白",luckyNumber:7,
   daily:{summary:"情绪雷达很灵敏，照顾好自己的感受最重要。",love:"想被懂得，也试着先说出你的需要。",career:"团队里你是有凝聚力的那一个。",health:"别替别人操太多心，心疼自己。",advice:"你可以给自己泡杯热的，安静十分钟。"},
   weekly:{summary:"本周围绕'家与心安'打转，安稳就是你的好运。",advice:"你可以主动联系一位很久没聊的家人。"}},
  {id:5,name:"狮子座",dateRange:"7.23-8.22",element:"火",ruler:"太阳",traits:["自信","大方","有领导力"],luckyColor:"金色",luckyNumber:1,
   daily:{summary:"你的光很亮，大方展示就好，但记得把舞台也让给别人一点。",love:"被夸会开心，也夸夸对方效果更好。",career:"适合站出来担当，你的气场能镇场。",health:"注意别熬夜，光环也需要休息撑。",advice:"你可以今天做一件让自己骄傲的小事。"},
   weekly:{summary:"本周存在感强，容易被看见和认可的一周。",advice:"你可以把成果大方分享出去，好运翻倍。"}},
  {id:6,name:"处女座",dateRange:"8.23-9.22",element:"土",ruler:"水星",traits:["细致","靠谱","追求更好"],luckyColor:"米白",luckyNumber:4,
   daily:{summary:"适合打磨细节，但别在小处反复纠结，放过自己。",love:"别用挑剔表达在意，温柔一点更近。",career:"你的严谨能避开大坑，被信赖。",health:"久坐记得起身拉伸。",advice:"你可以给今天设个'够好就行'的标准。"},
   weekly:{summary:"本周适合复盘与优化，越理越顺的一周。",advice:"你可以把一件拖了很久的事清掉，会很爽。"}},
  {id:7,name:"天秤座",dateRange:"9.23-10.23",element:"风",ruler:"金星",traits:["优雅","善解人意","重平衡"],luckyColor:"淡粉",luckyNumber:3,
   daily:{summary:"选择困难的一天，别求两全，选更接近你心的那个。",love:"关系需要主动一点，别总等对方开口。",career:"协调关系是你的天赋，适合当桥梁。",health:"注意情绪性进食，馋了就缓十分钟。",advice:"你可以今天只做决定、不反复推翻。"},
   weekly:{summary:"本周人际活跃，好的连接在靠近。",advice:"你可以赴一场想去的约，会收获好心情。"}},
  {id:8,name:"天蝎座",dateRange:"10.24-11.22",element:"水",ruler:"冥王星/火星",traits:["敏锐","专注","有韧劲"],luckyColor:"深红",luckyNumber:8,
   daily:{summary:"直觉很准的一天，相信第一感觉，同时别把怀疑藏心里。",love:"坦诚比试探更能拉近。",career:"深度投入一件事，会出成果。",health:"情绪别闷着，找个出口。",advice:"你可以把在意的事直接说给靠谱的人听。"},
   weekly:{summary:"本周适合深耕与转化，旧状况有新解法。",advice:"你可以放手一件不再适合你的执念。"}},
  {id:9,name:"射手座",dateRange:"11.23-12.21",element:"火",ruler:"木星",traits:["乐观","爱自由","爱探索"],luckyColor:"宝蓝",luckyNumber:9,
   daily:{summary:"想喘口气、想出门的一天，给心灵放个短假。",love:"给彼此空间，关系反而更透气。",career:"适合学新东西、看大方向。",health:"动起来，出一身汗最解压。",advice:"你可以今天走一条没走过的路回家。"},
   weekly:{summary:"本周心态开阔，机会与好心情一起来。",advice:"你可以计划一次小小的短途或新体验。"}},
  {id:10,name:"摩羯座",dateRange:"12.22-1.19",element:"土",ruler:"土星",traits:["自律","有野心","能扛事"],luckyColor:"炭黑",luckyNumber:10,
   daily:{summary:"事业心在线，适合推进正事，但别忘了犒劳自己。",love:"再忙也回个消息，别让人等凉。",career:"你的靠谱正在被上位者看见。",health:"肩膀和脖子别僵硬，揉一揉。",advice:"你可以完成一个拖延的硬任务，后面都轻松。"},
   weekly:{summary:"本周是爬坡期，每一步都算数。",advice:"你可以把大目标拆成本周能做到的一小步。"}},
  {id:11,name:"水瓶座",dateRange:"1.20-2.18",element:"风",ruler:"土星/天王星",traits:["独立","有创意","不走寻常路"],luckyColor:"银灰",luckyNumber:11,
   daily:{summary:"脑子里点子乱蹦，抓住最有意思的那个试试。",love:"你需要被尊重独特，也这样对别人。",career:"适合打破常规、提出新解法。",health:"别熬太晚，创意需要睡眠养。",advice:"你可以今天记录一个奇怪但喜欢的想法。"},
   weekly:{summary:"本周灵感与变化同在，拥抱新鲜感。",advice:"你可以尝试一种没用过的新工具或新方法。"}},
  {id:12,name:"双鱼座",dateRange:"2.19-3.20",element:"水",ruler:"木星/海王星",traits:["共情","浪漫","有想象力"],luckyColor:"海蓝",luckyNumber:12,
   daily:{summary:"感受力爆棚的一天，适合创作与共情，也易感伤，抱抱自己。",love:"温柔是你的武器，别用委屈换在乎。",career:"凭感觉与创意出发，反而出彩。",health:"注意睡眠，梦多就早点躺。",advice:"你可以把此刻的心情写下来或画下来。"},
   weekly:{summary:"本周感性流动，美与感动都在。",advice:"你可以听一首老歌，让情绪慢慢落下来。"}}
];

// 每日彩蛋语（首页轮换）
const DAILY_QUOTES = [
  "牌不语，却最懂你此刻想问什么。",
  "星星不决定你的路，只是陪你照亮脚边。",
  "抽到什么不重要，重要的是你为什么而来。",
  "所谓运势，是你此刻状态的另一种回响。",
  "慢慢来，宇宙偏爱认真生活的人。",
  "答案常在提问里，而不只在结果里。",
  "把今天当作一张待翻开的牌，温柔以待。"
];

if (typeof module !== "undefined" && module.exports) { module.exports = { ZODIAC_SIGNS, DAILY_QUOTES }; }
