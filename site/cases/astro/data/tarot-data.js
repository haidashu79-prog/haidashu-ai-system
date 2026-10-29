/* =========================================================================
 * 塔罗牌数据 tarot-data.js
 * 通过 <script src="data/tarot-data.js"></script> 引入，全局变量 TAROT_CARDS。
 * 78 张：22 大阿尔卡那(major) + 56 小阿尔卡那(minor)。
 * 字段：id, name(中), nameEn, arcana, suit, element, keywords[], upright, reversed, brief
 * 语气定位：自我觉察 / 心理投射，不迷信、不恐吓。
 * ========================================================================= */
const TAROT_CARDS = [
  /* ----------------------- 大阿尔卡那 Major Arcana ----------------------- */
  {
    id: 0, name: "愚人", nameEn: "The Fool", arcana: "major", suit: "",
    element: "风", keywords: ["新的开始", "纯真", "自由", "冒险"],
    upright: "你正站在一段全新旅程的起点。内心有股想去试试看的冲动，世界在你眼中充满可能。不妨带着好奇心出发，但出发前先看清脚下的路。",
    reversed: "可能是冲动冒进，或者明明想改变却迈不开腿。提醒自己：自由不等于鲁莽，勇气也包含对后果的诚实面对。",
    brief: "带着好奇心出发，但先看清脚下的路。"
  },
  {
    id: 1, name: "魔术师", nameEn: "The Magician", arcana: "major", suit: "",
    element: "风", keywords: ["行动力", "创造", "专注", "资源"],
    upright: "你手边其实已经备齐了想要的东西。这一刻适合把想法变成行动——专注、笃定，你比自己以为的更有掌控力。",
    reversed: "可能想法很多却迟迟不动，或把才华用在了掩盖真实需求上。先别急着说服别人，先把自己想清楚。",
    brief: "你拥有的比想象中多，是时候把它用起来。"
  },
  {
    id: 2, name: "女祭司", nameEn: "The High Priestess", arcana: "major", suit: "",
    element: "水", keywords: ["直觉", "内省", "神秘", "静默"],
    upright: "答案不在外面，而在你心里。今天适合慢下来、听听直觉，少一点喧哗，多一点信任自己的感受。",
    reversed: "可能是忽略了内在声音，或被过度理性困住。试着放下「必须想明白」的执念，让潜意识先开口。",
    brief: "安静下来，答案会自己浮现。"
  },
  {
    id: 3, name: "皇后", nameEn: "The Empress", arcana: "major", suit: "",
    element: "土", keywords: ["丰盛", "滋养", "创造", "温柔"],
    upright: "你正处在被滋养、也能滋养他人的阶段。无论是关系、事业还是自我照顾，都值得温柔以待，允许自己丰盛。",
    reversed: "可能对自己太苛刻，或过度付出而耗尽。记得照顾别人之前，先把自己喂饱。",
    brief: "允许自己丰盛，也允许自己被爱。"
  },
  {
    id: 4, name: "皇帝", nameEn: "The Emperor", arcana: "major", suit: "",
    element: "火", keywords: ["秩序", "掌控", "稳定", "规则"],
    upright: "建立结构和边界的时机到了。把事情理顺、定下规矩，你会更有安全感，也更能推动结果。",
    reversed: "可能是控制欲太强，或反过来——一团乱麻不敢碰。刚性需要一点弹性，权威也需要有人情味。",
    brief: "用秩序撑起自由，而不是绑住自己。"
  },
  {
    id: 5, name: "教皇", nameEn: "The Hierophant", arcana: "major", suit: "",
    element: "土", keywords: ["传统", "指引", "信念", "学习"],
    upright: "你可能需要一位老师、一套方法或一种信念来依靠。遵循成熟的路径不丢人，借力前行也是智慧。",
    reversed: "可能是对旧规则心生怀疑，或感到被教条束缚。可以尊重传统，但不必盲从。",
    brief: "向内求索也需要向外借力。"
  },
  {
    id: 6, name: "恋人", nameEn: "The Lovers", arcana: "major", suit: "",
    element: "风", keywords: ["选择", "关系", "价值观", "和谐"],
    upright: "一个重要的选择摆在你面前，它关乎你真正在意什么。听从内心而非旁人眼光，关系与价值会自然对齐。",
    reversed: "可能是价值观冲突、关系失衡，或逃避做选择。先把「我到底要什么」想清楚，答案就清晰了。",
    brief: "所有的选择，最终都是选择成为谁。"
  },
  {
    id: 7, name: "战车", nameEn: "The Chariot", arcana: "major", suit: "",
    element: "水", keywords: ["意志", "前进", "胜利", "专注"],
    upright: "靠意志力向前冲的时机。两股力量需要你同时驾驭——稳住方向，集中注意力，就能突破眼下难关。",
    reversed: "可能是方向分散、被情绪带偏，或中途泄气。别和所有人较劲，先和自己达成一致。",
    brief: "你不是在赢别人，是在驾驭自己。"
  },
  {
    id: 8, name: "力量", nameEn: "Strength", arcana: "major", suit: "",
    element: "火", keywords: ["勇气", "柔软", "耐心", "内在力量"],
    upright: "真正的力量不是压制，而是温柔地驯服内心的猛兽。耐心与善意，比强硬更有穿透力。",
    reversed: "可能是自我怀疑、情绪失控，或对他人失去耐心。先接纳自己的脆弱，力量自然回来。",
    brief: "温柔，是最不容易被复制的力量。"
  },
  {
    id: 9, name: "隐士", nameEn: "The Hermit", arcana: "major", suit: "",
    element: "土", keywords: ["独处", "反思", "指引", "智慧"],
    upright: "是时候一个人待一待了。退后一步，向内寻找答案，你会遇见更清醒的自己。",
    reversed: "可能是过度孤立、拒绝帮助，或逃避人群到失去联结。独处是为了更好地回来，而非永远离开。",
    brief: "一个人走一段，才能听见自己。"
  },
  {
    id: 10, name: "命运之轮", nameEn: "Wheel of Fortune", arcana: "major", suit: "",
    element: "火", keywords: ["转机", "循环", "机遇", "变化"],
    upright: "局势正在转动，好运或新契机悄然靠近。顺势而为比逆流挣扎更省力，接受无常也是一种从容。",
    reversed: "可能是坏运气反复、或抗拒变化。轮子总会转，别卡在最低点怨天尤人，等它过去就好。",
    brief: "潮起潮落是常态，风来时别松手。"
  },
  {
    id: 11, name: "正义", nameEn: "Justice", arcana: "major", suit: "",
    element: "风", keywords: ["公平", "因果", "真相", "责任"],
    upright: "事情会按它本来的样子被衡量。诚实面对、承担应负的责任，你会得到公正的结果。",
    reversed: "可能是逃避责任、自欺欺人，或不公正在发生。先对自己诚实，外界的天平才会慢慢摆正。",
    brief: "你种下什么，就会收回什么。"
  },
  {
    id: 12, name: "倒吊人", nameEn: "The Hanged Man", arcana: "major", suit: "",
    element: "水", keywords: ["暂停", "换个视角", "牺牲", "等待"],
    upright: "主动停一停，换个角度看问题。有时候「不做」才是最有智慧的动作，等待也是一种推进。",
    reversed: "可能是无谓的拖延、牺牲感太重，或拒绝放手。别把「苦」当「修」，该断就断。",
    brief: "倒过来看，世界就不一样了。"
  },
  {
    id: 13, name: "死神", nameEn: "Death", arcana: "major", suit: "",
    element: "水", keywords: ["结束", "转化", "放下", "重生"],
    upright: "一段旧篇章到了需要画句号的时刻。放下不是失去，而是为新生腾出空间。允许它结束。",
    reversed: "可能是抗拒改变、迟迟不放手，让结束拖成消耗。你越抓着旧的，新的越进不来。",
    brief: "结束，是另一种开始的方式。"
  },
  {
    id: 14, name: "节制", nameEn: "Temperance", arcana: "major", suit: "",
    element: "火", keywords: ["平衡", "调和", "耐心", "中庸"],
    upright: "把不同的东西慢慢调和，找到属于你的节奏。不急不躁，恰到好处就是一种能力。",
    reversed: "可能是失衡、过度，或急于求成。给自己减减速，把生活重新调回中间档。",
    brief: "恰到好处，胜过用力过猛。"
  },
  {
    id: 15, name: "恶魔", nameEn: "The Devil", arcana: "major", suit: "",
    element: "土", keywords: ["束缚", "执念", "欲望", "依赖"],
    upright: "你可能在被某种执念、习惯或关系绑住。看清那根链子——它往往比你以为的更容易解开。",
    reversed: "开始挣脱束缚、觉察依赖，是觉醒的信号。你比枷锁更有力量。",
    brief: "看清锁链，你就已经握住钥匙。"
  },
  {
    id: 16, name: "高塔", nameEn: "The Tower", arcana: "major", suit: "",
    element: "火", keywords: ["突变", "崩塌", "醒悟", "解放"],
    upright: "某种建立在沙子上的东西正在崩塌。骤变虽然疼，却常常带来迟到的清醒与解放。",
    reversed: "可能是灾后余震、迟迟不愿面对真相。崩塌已经发生，别再费力修补危房。",
    brief: "有的墙塌了，光才照得进来。"
  },
  {
    id: 17, name: "星星", nameEn: "The Star", arcana: "major", suit: "",
    element: "风", keywords: ["希望", "疗愈", "信念", "平静"],
    upright: "风雨之后，守得云开。你正被希望和宁静慢慢疗愈，相信前方值得期待。",
    reversed: "可能是信心动摇、感到迷茫。别急着要答案，先允许自己慢慢恢复。",
    brief: "再暗的夜，也挡不住星星。"
  },
  {
    id: 18, name: "月亮", nameEn: "The Moon", arcana: "major", suit: "",
    element: "水", keywords: ["潜意识", "迷雾", "不安", "直觉"],
    upright: "眼前有些模糊与不安，是潜意识在给你信号。别急着下判断，先分辨哪些是恐惧、哪些是真相。",
    reversed: "迷雾正在散去，或你开始直面内心阴影。把说不清的焦虑写下来，它会变小。",
    brief: "怕，往往比未知本身更黑。"
  },
  {
    id: 19, name: "太阳", nameEn: "The Sun", arcana: "major", suit: "",
    element: "火", keywords: ["喜悦", "成功", "活力", "明朗"],
    upright: "阳光洒下来的时刻。温暖、清晰、被看见——你值得这份坦荡的快乐与肯定。",
    reversed: "可能是暂时的低落、或快乐里掺了点不踏实。阳光没走远，只是被云挡了一下。",
    brief: "被看见、被照亮，本来就很好。"
  },
  {
    id: 20, name: "审判", nameEn: "Judgement", arcana: "major", suit: "",
    element: "火", keywords: ["觉醒", "回顾", "召唤", "释怀"],
    upright: "是回顾与觉醒的时刻。过去的经历正在召唤你做出更高版本的自己，原谅并向前。",
    reversed: "可能是自我批判过重、反复纠结旧账。审判是为了放下，不是为了把自己钉在羞耻里。",
    brief: "听见内心的召唤，然后回应它。"
  },
  {
    id: 21, name: "世界", nameEn: "The World", arcana: "major", suit: "",
    element: "土", keywords: ["圆满", "完成", "整合", "通达"],
    upright: "一个循环走到了圆满。你付出的努力有了回响，是庆祝、也是为下一程蓄力的时候。",
    reversed: "可能是临近完成却功亏一篑，或迟迟不画句号。差的那一步，往往只是「允许自己结束」。",
    brief: "走到这里，你已经完成了很多。"
  },

  /* ----------------------- 小阿尔卡那 · 权杖(火) Wands ----------------------- */
  {
    id: 22, name: "权杖王牌", nameEn: "Ace of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["灵感", "出发", "热情", "契机"],
    upright: "一簇火苗被点燃——新的灵感或机会出现。趁热打铁，先动起来，细节可以后补。",
    reversed: "可能是热情被浇灭、或想法迟迟不落地。别等「完全准备好」，火要烧就得现在添柴。",
    brief: "火苗已经点着，去把它烧旺。"
  },
  {
    id: 23, name: "权杖二", nameEn: "Two of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["规划", "远望", "抉择", "扩张"],
    upright: "你站在高处眺望更大的版图。是守着已知的安稳，还是迈出扩张的一步？先看清再决定。",
    reversed: "可能是计划卡壳、或害怕走出舒适区。远望之后需要落地，别只停在「想」。",
    brief: "看得多远，就能走多远。"
  },
  {
    id: 24, name: "权杖三", nameEn: "Three of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["探索", "起步", "合作", "等待回报"],
    upright: "把船推下水了，前路正在展开。耐心等待第一批回音，合作与远方会带来进展。",
    reversed: "可能是推进受阻、或期待落空。别急着换方向，先检查是不是自己没把船推够远。",
    brief: "起航之后，耐心等风来。"
  },
  {
    id: 25, name: "权杖四", nameEn: "Four of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["庆祝", "稳定", "归属", "里程碑"],
    upright: "值得小小庆祝一下。无论关系还是事业，你已经打下了稳稳的一块地基，享受这份安定。",
    reversed: "可能是暂时的动荡、或归属感缺失。庆祝可以推迟，但别否定已经建起来的东西。",
    brief: "走到一站，就值得为自己鼓掌。"
  },
  {
    id: 26, name: "权杖五", nameEn: "Five of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["竞争", "冲突", "分歧", "热闹"],
    upright: "场面有点乱、意见很多。这不一定是坏事——在碰撞里反而能跑出真东西。",
    reversed: "可能是内耗、或避免正面冲突导致问题拖延。该吵就吵清楚，别憋成冷战。",
    brief: "乱，有时候是活力的另一种说法。"
  },
  {
    id: 27, name: "权杖六", nameEn: "Six of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["胜利", "认可", "自信", "公开"],
    upright: "你的努力被人看见了。一次小小的胜利与认可，值得挺起胸膛。",
    reversed: "可能是期待落空、或过度在意他人评价。认可会迟到，但你的价值不靠掌声定义。",
    brief: "被看见，是努力的回声。"
  },
  {
    id: 28, name: "权杖七", nameEn: "Seven of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["防守", "坚持", "压力", "立场"],
    upright: "你在守自己得来不易的东西，压力不小但立场是对的。站稳了，就能顶住。",
    reversed: "可能是力不从心、或守得过于辛苦。不是所有阵地都值得死守，学会取舍。",
    brief: "守住立场，也要量力而行。"
  },
  {
    id: 29, name: "权杖八", nameEn: "Eight of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["加速", "消息", "流动", "效率"],
    upright: "事情突然提速，消息与机会接踵而至。趁势头顺，把积压的迅速推进。",
    reversed: "可能是delay、或节奏被打乱。慢一点没关系，先把悬在半空的事落地。",
    brief: "风来了，就加快脚步。"
  },
  {
    id: 30, name: "权杖九", nameEn: "Nine of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["警戒", "韧性", "伤痕", "坚持"],
    upright: "你经历了不少，身上有伤但还站着。再撑一下，终点就在前方，别在最后一程松懈。",
    reversed: "可能是过度防备、或被旧伤困住。不是每个新人都来伤害你，试着放下武器喘口气。",
    brief: "伤痕是走过的路，不是终点的墙。"
  },
  {
    id: 31, name: "权杖十", nameEn: "Ten of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["重担", "责任", "超载", "收尾"],
    upright: "你扛得有点多。责任在身是好事，但也记得：不是所有担子都得自己一个人挑。",
    reversed: "可能是终于放下、或学会 delegation。减负不是偷懒，是让路走得更远。",
    brief: "扛得动是能力，懂得放是智慧。"
  },
  {
    id: 32, name: "权杖侍从", nameEn: "Page of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["好奇", "试探", "热忱", "新消息"],
    upright: "带着孩子般的好奇去试探新事物。不在乎结果先玩起来，热情会带你入门。",
    reversed: "可能是三分钟热度、或方向飘忽。热情要有，落地也得有。",
    brief: "先玩起来，答案在路上。"
  },
  {
    id: 33, name: "权杖骑士", nameEn: "Knight of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["行动", "冲劲", "冒险", "急切"],
    upright: "说干就干的劲头来了。行动力拉满，适合推进、开拓、来一场说走就走的尝试。",
    reversed: "可能是冲动误事、或方向多变。冲劲是燃料，但得先看好地图。",
    brief: "冲劲很贵，用在刀刃上。"
  },
  {
    id: 34, name: "权杖王后", nameEn: "Queen of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["自信", "魅力", "热情", "主导"],
    upright: "你散发自然的光与热，自信而有感染力。做自己、带领他人，这是你的主场。",
    reversed: "可能是自信变自负、或光芒被自我怀疑遮住。先对自己温柔，魅力才会回来。",
    brief: "你本来的样子，就很有力量。"
  },
  {
    id: 35, name: "权杖国王", nameEn: "King of Wands", arcana: "minor", suit: "权杖",
    element: "火", keywords: ["远见", "领导", "魄力", "行动派"],
    upright: "你是那个能点燃别人、也能落地蓝图的人。远见加行动，事业与影响都在上升。",
    reversed: "可能是专断、或只画饼不落地。领导力不是压人，是把人带向共同的目标。",
    brief: "既能看见远方，也能迈出脚步。"
  },

  /* ----------------------- 小阿尔卡那 · 圣杯(水) Cups ----------------------- */
  {
    id: 36, name: "圣杯王牌", nameEn: "Ace of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["爱", "情感", "新生", "丰沛"],
    upright: "心被温柔地打开了。新的情感、爱意或创造力涌出——允许自己去感受、去爱。",
    reversed: "可能是情感阻塞、或不敢打开心。先抱抱那个紧闭的自己，门不必一次全开。",
    brief: "心打开了，爱就流进来了。"
  },
  {
    id: 37, name: "圣杯二", nameEn: "Two of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["联结", " pairing", "吸引", "平等"],
    upright: "一段对等的联结正在发生——彼此看见、彼此回应。无论爱情还是合作，都是好兆头。",
    reversed: "可能是失衡、或表面亲密内里疏离。关系要两人都端平杯子，才倒得进东西。",
    brief: "好的关系，是两个人都愿意递杯子。"
  },
  {
    id: 38, name: "圣杯三", nameEn: "Three of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["欢聚", "友谊", "庆祝", "社群"],
    upright: "值得和在意的人一起庆祝。友情、社群、小团体的温暖，会给你充电。",
    reversed: "可能是社交过度、或圈子里的微妙。独处一下也行，热闹不是唯一解。",
    brief: "有人一起笑，苦也淡一点。"
  },
  {
    id: 39, name: "圣杯四", nameEn: "Four of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["倦怠", "错过", "内省", "不满足"],
    upright: "你有点提不起劲，对摆在面前的机会视而不见。先不急着要，允许自己倦怠一会儿。",
    reversed: "可能是重新睁眼、或错过后的醒悟。别让「都差不多」的麻木，漏掉真正想要的。",
    brief: "倦怠时，先别急着做决定。"
  },
  {
    id: 40, name: "圣杯五", nameEn: "Five of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["失落", "遗憾", "哀伤", "余温"],
    upright: "你在为打翻的杯子难过。允许哀伤存在，但也抬头看看——身后还有没倒的杯子。",
    reversed: "开始走出遗憾、或学会释怀。失落是真的，但生活没有全空。",
    brief: "哭完，记得看身后还在的杯子。"
  },
  {
    id: 41, name: "圣杯六", nameEn: "Six of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["回忆", "怀旧", "纯真", "温暖"],
    upright: "旧时光涌上心头，或与旧人旧地重逢。那份纯真与温暖，是此刻的慰藉。",
    reversed: "可能是陷在过去、或美化从前。回忆是糖，吃多了也会齁。",
    brief: "怀旧可以，别把从前当避难所。"
  },
  {
    id: 42, name: "圣杯七", nameEn: "Seven of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["幻想", "选择多", "迷惘", "诱惑"],
    upright: "眼前飘着许多诱人的幻象，选择太多反而晃神。先分清楚哪个是真实、哪个是泡影。",
    reversed: "开始落地、或从幻梦中清醒。别被「看起来很美」带跑，看清再选。",
    brief: "好看的选项，未必是真的选项。"
  },
  {
    id: 43, name: "圣杯八", nameEn: "Eight of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["离开", "寻真", "放下", "出走"],
    upright: "你决定离开一段不再滋养你的关系或处境，去寻更真实的东西。离开需要勇气，也是成长。",
    reversed: "可能是想走又走不掉、或逃避面对。别用「离开」回避该解决的问题。",
    brief: "有些路，要自己走才踏实。"
  },
  {
    id: 44, name: "圣杯九", nameEn: "Nine of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["满足", "心愿", "安逸", "小确幸"],
    upright: "心里的愿望正被满足，是惬意自足的时刻。好好享受这份「差不多都挺好」。",
    reversed: "可能是表面满足内里空虚，或愿望达成后反而失落。满足不在杯子满，而在心知足。",
    brief: "知足，是最稳的富有。"
  },
  {
    id: 45, name: "圣杯十", nameEn: "Ten of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["圆满", "家庭", "幸福", "归属"],
    upright: "情感上的圆满与归属感——家庭、亲密关系里的暖意。这是值得珍惜的风景。",
    reversed: "可能是关系表面和谐内里有隙，或把幸福寄托在别人身上。圆满从接纳开始。",
    brief: "心在一起，就是最好的牌。"
  },
  {
    id: 46, name: "圣杯侍从", nameEn: "Page of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["柔情", "创意", "消息", "易感"],
    upright: "一颗柔软敏感的心在张开，可能是浪漫的消息或灵感的火花。允许自己天真一点。",
    reversed: "可能是情绪化、或把幻想当信号。敏感是天赋，也别被情绪牵着走。",
    brief: "柔软一点，灵感才会靠近。"
  },
  {
    id: 47, name: "圣杯骑士", nameEn: "Knight of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["浪漫", "邀请", "追随心", "理想"],
    upright: "一位带着邀约与浪漫的使者到来。跟随心的指引、去追求理想中的爱与美。",
    reversed: "可能是空想、或情感上的不靠谱。浪漫要有，落地也得有。",
    brief: "心动值得追，但别只看诗不看路。"
  },
  {
    id: 48, name: "圣杯王后", nameEn: "Queen of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["共情", "温柔", "直觉", "包容"],
    upright: "你以温柔与深刻的共情滋养周遭。先安顿好自己的情绪，才能稳稳托住别人。",
    reversed: "可能是情绪过载、或过度讨好。你不是谁的容器，先把自己盛满。",
    brief: "温柔是你的力量，别拿来耗尽自己。"
  },
  {
    id: 49, name: "圣杯国王", nameEn: "King of Cups", arcana: "minor", suit: "圣杯",
    element: "水", keywords: ["沉稳", "情商", "包容", "掌控情绪"],
    upright: "在情绪的风浪里你稳如磐石。用成熟的情商与包容带领关系，既感性又清醒。",
    reversed: "可能是情绪压抑、或忽冷忽热。掌控情绪不等于关掉感受，别憋出内伤。",
    brief: "真正的稳，是看得见浪也撑得住船。"
  },

  /* ----------------------- 小阿尔卡那 · 宝剑(风) Swords ----------------------- */
  {
    id: 50, name: "宝剑王牌", nameEn: "Ace of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["清明", "真相", "突破", "决断"],
    upright: "一道光劈开迷雾——你想清楚了，真相浮现。适合做决定、把话说透、开启新思路。",
    reversed: "可能是思路混乱、或真相刺得太疼。先别急着下刀，想明白再开口。",
    brief: "想清楚，比赢争论更重要。"
  },
  {
    id: 51, name: "宝剑二", nameEn: "Two of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["两难", "僵局", "回避", "权衡"],
    upright: "你蒙着眼在两项之间摇摆，迟迟不选。有时需要先放下「必须公平」，才能看清真心。",
    reversed: "可能是逃避到撑不住、或终于愿意面对。别用「我都可以」假装没在纠结。",
    brief: "不选，也是在被选择拖着走。"
  },
  {
    id: 52, name: "宝剑三", nameEn: "Three of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["心碎", "痛楚", "分离", "疗愈起点"],
    upright: "心被刺了一下——失落、背叛或分离之痛。允许它疼，痛是疗愈开始的信号。",
    reversed: "可能是痛苦松动、或开始释怀。伤口还在，但你已经能喘气了。",
    brief: "心碎不是终点，是疗愈的起点。"
  },
  {
    id: 53, name: "宝剑四", nameEn: "Four of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["休整", "静养", "暂停", "恢复"],
    upright: "你需要停下来歇一歇，给过载的脑子放个假。休息不是偷懒，是 recharge。",
    reversed: "可能是躺平太久、或逃避现实。歇够了，就该起身了。",
    brief: "停下来，是为了走更远的路。"
  },
  {
    id: 54, name: "宝剑五", nameEn: "Five of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["得失", "争执", "代价", "胜负"],
    upright: "你也许「赢了」争论，却失了关系。衡量一下：这场胜利的代价，你真愿意付吗？",
    reversed: "可能是放下输赢、或和解。有些架不必打赢，关系比道理金贵。",
    brief: "赢了道理，别输了人心。"
  },
  {
    id: 55, name: "宝剑六", nameEn: "Six of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["过渡", "离开", "平复", "远行"],
    upright: "你正从一段 turbulence 划向平静。离开是为了疗愈，前方虽不热闹，但更安稳。",
    reversed: "可能是迟迟不走、或旧痛反复。船已经下水，别再往回看。",
    brief: "离开风暴，水面会慢慢平。"
  },
  {
    id: 56, name: "宝剑七", nameEn: "Seven of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["机巧", "隐瞒", "取巧", "自保"],
    upright: "你可能在想办法「走捷径」或藏着什么。先问自己：这招是在保护你，还是在骗自己？",
    reversed: "可能是坦白、或阴谋被看穿。与其耍小聪明，不如把牌摊开。",
    brief: "捷径往往最绕路。"
  },
  {
    id: 57, name: "宝剑八", nameEn: "Eight of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["受限", "自我设限", "无助", "看清"],
    upright: "你觉得自己被围住、动弹不得——但很多剑是你自己插上的。先看清：门其实开着。",
    reversed: "开始觉察束缚、或找到出口。限制常常是心造的，松开手就松了绑。",
    brief: "多数牢笼，是我们自己锁的门。"
  },
  {
    id: 58, name: "宝剑九", nameEn: "Nine of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["焦虑", "夜思", "担忧", "噩梦"],
    upright: "深夜的焦虑把你叫醒，担忧被放大。多数怕的事不会真的发生，天亮再说。",
    reversed: "可能是焦虑缓解、或直面恐惧。把担心写下来，它会从怪兽变清单。",
    brief: "半夜的怕，天亮常会小。"
  },
  {
    id: 59, name: "宝剑十", nameEn: "Ten of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["谷底", "终结", "释然", "触底"],
    upright: "最坏的情况似乎已经落定。痛是真的，但「都已经这样了」也意味着——该触底反弹了。",
    reversed: "可能是慢慢爬起、或摆脱谷底。最暗之后，任何方向都是上。",
    brief: "跌到底，剩下的都是回升。"
  },
  {
    id: 60, name: "宝剑侍从", nameEn: "Page of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["警觉", "好奇", "直言", "求知"],
    upright: "你眼亮心明、求知欲强，喜欢戳破表象。保持警觉，但别把「直言」变成「伤言」。",
    reversed: "可能是多疑、或说话不过脑。好奇要有，分寸也得有。",
    brief: "眼尖是好事，嘴快要小心。"
  },
  {
    id: 61, name: "宝剑骑士", nameEn: "Knight of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["疾速", "锐利", "直言", "冲撞"],
    upright: "你带着锋利与速度直冲目标。效率惊人，但留意别撞翻路上的人。",
    reversed: "可能是鲁莽、或言语伤人。快不等于对，先看好方向再冲。",
    brief: "快很爽，但也容易撞墙。"
  },
  {
    id: 62, name: "宝剑王后", nameEn: "Queen of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["清醒", "独立", "犀利", "边界"],
    upright: "你以清醒与独立立身，看得透、说得准，懂得划清边界。这份冷峻里藏着通透。",
    reversed: "可能是尖刻、或把人推开。清醒很好，别让它变成拒绝温柔的壳。",
    brief: "通透不是冷，是看得清也放得下。"
  },
  {
    id: 63, name: "宝剑国王", nameEn: "King of Swords", arcana: "minor", suit: "宝剑",
    element: "风", keywords: ["理性", "公正", "谋略", "权威"],
    upright: "你以理性与公正掌舵，抽丝剥茧、运筹帷幄。用脑子领导，而不是用情绪。",
    reversed: "可能是过于冷酷、或滥用逻辑伤人。理性是刀，握法决定它是工具还是武器。",
    brief: "脑子清醒，心也别关上。"
  },

  /* ----------------------- 小阿尔卡那 · 星币(土) Pentacles ----------------------- */
  {
    id: 64, name: "星币王牌", nameEn: "Ace of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["机会", "开端", "务实", "收获种子"],
    upright: "一颗实在的种子落到手里——新的工作、收入或项目机会。踏实种下，它会长大。",
    reversed: "可能是机会擦肩、或落地迟缓。好种子也要配好土壤，先把自己的地整好。",
    brief: "实在的机会，要实在地去抓。"
  },
  {
    id: 65, name: "星币二", nameEn: "Two of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["平衡", "周旋", "灵活", " juggling"],
    upright: "你在几项事务间灵活周旋，有点忙但还稳。保持弹性，别让任何一头彻底掉地。",
    reversed: "可能是失衡、或顾此失彼。忙不是问题，乱才是。先排个优先级。",
    brief: " juggling 可以，别砸了手里的球。"
  },
  {
    id: 66, name: "星币三", nameEn: "Three of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["协作", "匠艺", "打磨", "认可"],
    upright: "和他人一起把事情做扎实，分工合作出成果。你的专业正在被看见。",
    reversed: "可能是配合不畅、或敷衍了事。团队要的是合力，不是各扫门前雪。",
    brief: "好活儿，是大家一起磨出来的。"
  },
  {
    id: 67, name: "星币四", nameEn: "Four of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["守住", "掌控", "吝啬", "安全"],
    upright: "你谨慎地守护已有的东西，重视安全感。守住没错，但也别把拳头攥得太紧。",
    reversed: "可能是过度紧抓、或反而失控。握得太死，东西更容易从指缝溜走。",
    brief: "守得住是安心，守太死是束缚。"
  },
  {
    id: 68, name: "星币五", nameEn: "Five of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["匮乏", "困境", "孤独", "求助"],
    upright: "你正经历一段物质或归属上的匮乏与寒冷。记得：困境里也常有伸出援手的人，别独自硬扛。",
    reversed: "可能是转机出现、或走出低谷。最冷的时候， warmth 往往就在转角。",
    brief: "穷一阵不可怕，别把心也关上。"
  },
  {
    id: 69, name: "星币六", nameEn: "Six of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["给予", "流动", "互助", "平衡"],
    upright: "资源在流动——你或在给予、或在接受帮助。施与受都自然，关系因此平衡。",
    reversed: "可能是施舍心态、或付出失衡。帮忙是情分，别让它变成居高临下。",
    brief: "给与得，都是流动的一部分。"
  },
  {
    id: 70, name: "星币七", nameEn: "Seven of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["等待", "耕耘", "复盘", "耐心"],
    upright: "你种下的正在慢慢长，需要耐心等待回报。趁此复盘：投入的方向对吗？",
    reversed: "可能是急功近利、或怀疑投入。成长有季节，别在春天就拔苗看根。",
    brief: "耕耘之后，给时间一点时间。"
  },
  {
    id: 71, name: "星币八", nameEn: "Eight of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["专注", "打磨", "熟练", "苦干"],
    upright: "你沉下心把一件事反复打磨，技艺在长。踏实练兵，成果会自己来。",
    reversed: "可能是机械重复、或失去热情。苦干之外，也看看自己还在不在生长。",
    brief: "把手艺磨熟，路就宽了。"
  },
  {
    id: 72, name: "星币九", nameEn: "Nine of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["自足", "丰裕", "独美", "成果"],
    upright: "你凭自己的积累，活出了从容与丰裕。享受这份「靠自己得来」的安稳与优雅。",
    reversed: "可能是表面光鲜内里空虚，或孤独感。丰裕不只看账户，也看心里满不满。",
    brief: "靠自己活得好，是很飒的事。"
  },
  {
    id: 73, name: "星币十", nameEn: "Ten of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["稳固", "传承", "家业", "长远"],
    upright: "物质与家庭的安稳累积成厚实的底子。这是长久、可传承的丰盛，值得欣慰。",
    reversed: "可能是家业表面的裂痕、或财富带来的疏离。稳固不只是钱，更是人的联结。",
    brief: "真正的富有，是代代有人、事事有底。"
  },
  {
    id: 74, name: "星币侍从", nameEn: "Page of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["学习", "务实", "新机会", "踏实"],
    upright: "你抱着踏实的心态学新东西、接新机会。别嫌起点小，星币从一颗种子长起。",
    reversed: "可能是三心二意、或眼高手低。想学就沉下去，别停在「想很厉害」。",
    brief: "从小处学起，才学得扎实。"
  },
  {
    id: 75, name: "星币骑士", nameEn: "Knight of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["稳健", "可靠", "慢行", "坚持"],
    upright: "你不快，但每一步都算数。稳健可靠、说到做到，长期主义会回报你。",
    reversed: "可能是过于迟缓、或固执不变。稳是优点，但别稳成原地踏步。",
    brief: "慢一点没关系，别停下就好。"
  },
  {
    id: 76, name: "星币王后", nameEn: "Queen of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["务实", "滋养", "持家", "丰盛"],
    upright: "你以务实与温暖把生活打理得妥帖，既能赚钱也懂生活。这份从容，来之不易。",
    reversed: "可能是忙到忽略自己、或过度务实失了柔。会赚钱也要会疼自己。",
    brief: "把日子过稳，也把自己养好。"
  },
  {
    id: 77, name: "星币国王", nameEn: "King of Pentacles", arcana: "minor", suit: "星币",
    element: "土", keywords: ["富足", "稳健", "成就", "掌舵"],
    upright: "你是那个把事业与财富稳稳掌舵的人。务实、有远见、可靠，成果自然丰厚。",
    reversed: "可能是固执守财、或只顾物质忽略人情。富足是手段，别让它成了目的。",
    brief: "会赚钱是本事，会用钱是智慧。"
  }
];

// 小阿尔卡那四花色（用于分类与牌面元素符号）
const SUITS = {
  "权杖": { element: "火", symbol: "🔥", en: "Wands" },
  "圣杯": { element: "水", symbol: "💧", en: "Cups" },
  "宝剑": { element: "风", symbol: "🌬️", en: "Swords" },
  "星币": { element: "土", symbol: "🌿", en: "Pentacles" }
};

if (typeof module !== "undefined" && module.exports) { module.exports = { TAROT_CARDS, SUITS }; }
