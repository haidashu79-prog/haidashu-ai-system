// 主要城市经纬度（用于上升星座计算；可按需增删）
const CITIES = [
  {name:"北京",lat:39.90,lon:116.40},
  {name:"上海",lat:31.23,lon:121.47},
  {name:"广州",lat:23.13,lon:113.26},
  {name:"深圳",lat:22.54,lon:114.06},
  {name:"成都",lat:30.57,lon:104.07},
  {name:"重庆",lat:29.56,lon:106.55},
  {name:"杭州",lat:30.27,lon:120.16},
  {name:"武汉",lat:30.59,lon:114.31},
  {name:"西安",lat:34.34,lon:108.94},
  {name:"南京",lat:32.06,lon:118.80},
  {name:"天津",lat:39.13,lon:117.20},
  {name:"苏州",lat:31.30,lon:120.62},
  {name:"长沙",lat:28.23,lon:112.94},
  {name:"郑州",lat:34.75,lon:113.63},
  {name:"青岛",lat:36.07,lon:120.38},
  {name:"沈阳",lat:41.80,lon:123.43},
  {name:"哈尔滨",lat:45.80,lon:126.53},
  {name:"昆明",lat:25.04,lon:102.72},
  {name:"厦门",lat:24.48,lon:118.09},
  {name:"福州",lat:26.07,lon:119.30},
  {name:"南宁",lat:22.82,lon:108.32},
  {name:"贵阳",lat:26.65,lon:106.63},
  {name:"兰州",lat:36.06,lon:103.83},
  {name:"乌鲁木齐",lat:43.83,lon:87.62},
  {name:"拉萨",lat:29.65,lon:91.14},
  {name:"香港",lat:22.32,lon:114.17},
  {name:"台北",lat:25.03,lon:121.57}
];

if (typeof module !== "undefined" && module.exports) { module.exports = { CITIES }; }
