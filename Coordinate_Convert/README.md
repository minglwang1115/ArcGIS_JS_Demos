# 经纬度坐标转换高斯-克吕格平面坐标

# 前言

支持将WGS-84椭球下的经纬度坐标(GPS坐标)转换到高斯-克吕格投影下的平面坐标，如北京54平面坐标、西安80平面坐标、大地2000平面坐标。

# 主要代码

代码已经封装成了dojo模块(类)，方便在使用ArcGIS JS API时引用该坐标转换模块。

[**LatLong2GaussKruger.js**](https://github.com/minglwang1115/ArcGIS_JS_Demos/blob/master/Coordinate_Convert/modules/LatLong2GaussKruger.js)


# 使用示例

[Coord_Convert.html](https://github.com/minglwang1115/ArcGIS_JS_Demos/blob/master/Coordinate_Convert/Coord_Convert.html)

经过与ArcGIS Server的几何服务投影功能的结果对比，结果 `<0.0001`

![](http://ww1.sinaimg.cn/large/007TqXN5ly1g62qvmtos0j30t00b7tdo.jpg)

![](http://ww1.sinaimg.cn/large/007TqXN5ly1g62qv97kxnj30rq0ml0x5.jpg)

# 参考链接

https://blog.csdn.net/jianyi7659/article/details/7583339