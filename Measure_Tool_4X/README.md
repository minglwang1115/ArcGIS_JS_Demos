# 基于ArcGIS JS API 4.12实现的两种距离和面积测量方式

# 前言

之前已经有基于ArcGIS JS API 3.29的扩展模块`Measure.js`，此处只简单说说基于4.12版本的与之前版本有哪些区别，以及需要注意的地方。

# 两个版本间的区别

1. 所依赖的类名有所改变，3.X系列与4.X系列的API结构有所调整，具体可参考[3.x to 4.x functionality matrix](https://developers.arcgis.com/javascript/latest/guide/functionality-matrix/);
2. 构造函数有所不同，在3.x版本中创建对象时写法如`new SimpleFillSymbol(style, outline, color)`,在4.x版本中写法如`new SimpleFillSymbol(properties?)`,参数有所变化，4.x中传入的参数是一个对象；
3. 3.x中借助`Draw`类绘制图形，4.x中使用`SketchViewModel`；
4. 部分方法名有改变，如3.x中的`map.getLayer()`与4.x中的`map.findLayerById()`;
5. 部分异步处理方法有变化，如3.x的异步方法`geometryService.lengths(lengthParams, callback() {})`与4.x中的`geometryService.lengths(lengthParams).then(callback() {})`,回调方法的位置有区别，4.x中方法调用后返回`Promise`对象；
6. 在3.x中`Map`既是图层的容器又负责与用户交互，在4.x中map只是图层容器，多出来`View`处理用户交互事件、管理UI微件等,如3.x中的单击事件监听`map.on('click', callback)`与4.x中的`view.on('click',callback)`，3.x中的`map.spatialReference`与4.x中的`view.spatialReference`；

> Maps are containers used to manage references to layers and basemaps. Views are used to display the map layers and handle user interactions, popups, widgets, and the map location.

# 注意

1. 在4.x版本中，`SketchViewModel`对象处于绘制状态时，`View`监听不到点击事件;
2. 在4.x版本中当涉及到`Font`字体时，会到 https://static.arcgis.com/fonts 这个地址请求字体资源，速度极慢，可以考虑将字体文件下载后部署到本地服务器上。

# 主要代码

见 `modules/Measure.js`,测试页面代码见`index.html`

# 效果图

![效果图](http://ww1.sinaimg.cn/large/007TqXN5ly1g5k6k411lfj31f30qb7wh.jpg)

# 效果预览

## [预览地址](https://minglwang1115.github.io/ArcGIS_JS_Demos/Measure_Tool_4X/index.html)