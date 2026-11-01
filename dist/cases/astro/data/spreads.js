// 牌阵定义（free=免费组；付费组需激活）
const SPREADS = [
  {id:"single",name:"单张指引",free:true,count:1,
   positions:["今日核心指引"],
   tip:"心里默念一个想问的问题，抽一张就好，适合快速要个方向。"},
  {id:"three",name:"三牌时间流",free:true,count:3,
   positions:["过去","现在","未来"],
   tip:"看一件事情的来龙去脉与走向，适合纠结时梳理。"},
  {id:"choice",name:"二选一",free:true,count:2,
   positions:["选项A的能量","选项B的能量"],
   tip:"在两件事间犹豫时用，看看各自带给你的感觉。"},
  {id:"relationship",name:"关系牌阵",free:false,count:4,
   positions:["你的状态","对方的状态","你们的连结","建议方向"],
   tip:"深入看一段关系的状态与走向，付费解锁。"},
  {id:"celtic",name:"凯尔特十字",free:false,count:10,
   positions:["现状","挑战/阻碍","根基","过去","可能性/目标","近期未来","你的姿态","外在环境","希望与恐惧","最终结果"],
   tip:"经典深盘，剖析一个复杂处境的十个面向，付费解锁。"},
  {id:"year",name:"年度运势牌阵",free:false,count:5,
   positions:["全年主题","上半年","下半年","关键转机","年度建议"],
   tip:"看一年的大致走向与关键节点，付费解锁。"}
];

if (typeof module !== "undefined" && module.exports) { module.exports = { SPREADS }; }
