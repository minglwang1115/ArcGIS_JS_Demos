# 基于ArcGIS JS API 3.29实现的两种距离和面积测量方式

# 前言

在一些地图地图应用中，距离、面积测量属于基础功能。ArcGIS API for JavaScript有单独提供一个测量的微件，就像鹰眼、比例尺那样拿来就可以用,但是具体效果不是我想要的。之前在项目中有测量这方面的需求，在网上直接找了代码就粘上去了，后来测试的时候发现不能用，经过对比官方API文档，发现其对坐标系还有些限制。因此，根据ArcGIS提供的接口进一步封装了一个测量类，里面提供两种测量方式，一种是采用`几何服务(GeometryServer)`，适用于具备ArcGIS Server环境的项目；另一种是`GeometryEngine`类，适用于坐标系为**[4326,3857,102100,任意平面坐标系]**之一的项目，这个主要是那些不使用ArcGIS平台，但采用ArcGIS JS API的项目用到。个人更加推荐第一种，不需要考虑坐标系问题，只要有个几何服务(装ArcGIS Server的时候就已经带着了，或者可以使用ArcGIS官方的一个地址，就是有点慢)地址就可以了。

# 开发思路

1. 封装一个通用的测量类，提供距离测量、面积测量、结果清除功能；
2. 提供两种测量方式，当参数中不包含`几何服务`地址时，采用`GeometryEngine`测量；
3. 需要用到`Draw`工具类，距离测量时需要用到`地图单击`监听事件，通过记录单击点的坐标计算距离，面积测量双击结束触发`draw-complete`监听事件，记录绘制的多边形(geometry)计算面积；
4. 绘制完毕要关掉`Draw`工具；

# 主要代码

见 `modules/Measure.js`

# 效果测试
下面通过一个单页面测试一下封装的测量类。
## 效果图

![distance](https://img-blog.csdnimg.cn/20190414160143454.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dtbDAwMDAw,size_16,color_FFFFFF,t_70)

![area](https://img-blog.csdnimg.cn/20190414160211727.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dtbDAwMDAw,size_16,color_FFFFFF,t_70)

## [预览地址]()

## 测试页面

`index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>基于ArcGIS JS API 3.29实现的两种距离和面积测量方式</title>
    <link rel="stylesheet" href="https://js.arcgis.com/3.29/esri/css/esri.css">
</head>
<style>
    html,
    body,
    #map {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
    }
    .horizontal-toolbar{
        position: absolute;
        top: 30px;
        right: 75px;
        /* width: 100px; */
        height: 50px;
        overflow: hidden;
        background-color: white;
        border-radius: 4px;
        z-index: 100;
    }
    .horizontal-toolbar>li{
        position: relative;
        margin: 5px;
        list-style: none; 
        float: left;
        width: 46px;
        height: 46px;
    }
</style>
<script>
    var package_path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    //var package_path = window.location.pathname.replace(/\/[^\/]*$/,"");
    var dojoConfig = {
        // The locationPath logic below may look confusing but all its doing is
        // enabling us to load the api from a CDN and load local modules from the correct location.
        packages: [{
            name: "modules",
            location: package_path + '/modules'
        }]
    };
</script>
<script src="https://js.arcgis.com/3.29/"></script>
<script>
    var map,measureTool;
    require([
        "esri/map",
        "modules/Measure",
        "dojo/domReady!"
    ], function (Map, Measure) {
        map = new Map("map", {
            basemap: 'topo',
            center: [117.02156, 36.65993],
            zoom: 16
        });
        //方式一：使用几何服务
        var options = {
            map: map,
            geometryServiceUrl: 'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer'
        };
        //方式二：不传几何服务参数，使用GeometryEngine
        // var options = {
        //     map: map
        // };
        measureTool = new Measure(options);
    });
    function measureDistance () {
        measureTool.measureDistance();
    }
    function measureArea () {
        measureTool.measureArea();
    }
    function clearMeasureActionAndGraphics () {
        measureTool.clearMeasureActionAndGraphics();
    }
</script>
<body>
    <div id="map" style="position:relative;">
        <ul class="horizontal-toolbar">
            <li onclick="measureDistance()">
                <img src="./icons/distance.png" alt="测量距离" title="测量距离">
            </li>
            <li onclick="measureArea()">
                <img src="./icons/area.png" alt="测量面积" title="测量面积">
            </li>
            <li onclick="clearMeasureActionAndGraphics()">
                <img src="./icons/clear.png" alt="清除" title="清除">
            </li>
        </ul>
    </div>
</body>
</html>
```

# 开发总结

1. ArcGIS Server有自带的几何服务，若使用官方几何服务地址，由于网络原因结果可能出来的很慢或直接请求失败；

![tool](https://img-blog.csdnimg.cn/20190414160223767.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dtbDAwMDAw,size_16,color_FFFFFF,t_70) 

2. 使用几何服务距离测量时注意设置`calculationType`，包括三种：`planar(平面)`,`geodesic(曲面)`,`preserveShape(通用)`，面积测量类似；
3. 使用`GeometryEngine`测量时注意区分`geodesicArea`,`planarArea`,前者适用于wkid为[4326、3857、102100]，后者适用于平面坐标系，如果地图坐标系与使用的测量方法匹配不起来可能会出现错误；
>Calculates the area of the input geometry. As opposed to planarArea(), geodesicArea takes into account the curvature of the earth when performing this calculation. Therefore, when using input geometries with a spatial reference of either WGS-84 (wkid: 4326) or Web Mercator Auxiliary Sphere (wkid: 3857), it is best practice to calculate areas using geodesicArea(). If the input geometries have a projected coordinate system other than Web Mercator, use planarArea() instead. 

>This method only works with WGS-84 (wkid: 4326) and Web Mercator (wkid: 3857) spatial references.


4. `3857`和`102100`表示的是同一个投影坐标系，只是`wkid`有所不同，`3857`是较新版本的(`latestWkid`);

3857     | WGS_1984_Web_Mercator_Auxiliary_Sphere
-------- | -----
PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]

102100   | WGS_1984_Web_Mercator_Auxiliary_Sphere
-------- | -----
PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]




# 参考链接

1. ArcGIS官方测量微件:https://developers.arcgis.com/javascript/3/sandbox/sandbox.html?sample=widget_measurement
2. LengthsParameters计算类型：https://developers.arcgis.com/javascript/3/jsapi/lengthsparameters-amd.html#calculationtype
3. 坐标系大全：https://developers.arcgis.com/javascript/3/jshelp/pcs.html
4. https://developers.arcgis.com/javascript/3/jsapi/esri.geometry.geometryengine-amd.html#geodesiclength