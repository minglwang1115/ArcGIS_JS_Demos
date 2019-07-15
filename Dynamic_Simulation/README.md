# 基于AcrGIS平台实现三维场景下的积水效果动态模拟

# 1.前言

现有基于暴雨洪水管理模型(SWMM)生成的多个时刻的积水区数据(json格式)，要求在三维场景下依照时间动态展示积水的变化效果。在此记录开发过程中遇到的一些问题及注意事项。

# 2.环境准备

1. ArcGIS Pro 2.3,  ArcGIS Enterprise 10.6,  ArcGIS JS API 4.12
2. 高程数据(DEM，用于产生地形起伏效果)， 影像数据(DOM，用于展示地形)

# 3.开发过程

## 3.1 软件安装

   - [ArcGIS Enterprise安装及配置方法介绍(windows版)](http://zhihu.esrichina.com.cn/article/3594)
   - [ArcGIS Pro许可操作手册](http://zhihu.esrichina.com.cn/article/471)

ArcGIS Pro用于发布三维场景服务(包含Elevation Layer和Tile Layer)，发布到Portal账户下。

## 3.2 共享(发布)场景服务

这部分需要注意在ArcGIS Pro中创建项目时是选择**Global Scene** 还是**Local Scene**，**Global Scene**是个球，而**Local Scene**是平的，只是一块区域。

![不同场景模式](https://developers.arcgis.com/javascript/assets/img/apiref/views/scene-global-vs-local.png)

另外一个区别是**Gloal Scene**支持**WGS84 or WebMercator坐标系**(wkid: 4326 or wkid: 3857)，而**Local Scene**支持任何投影坐标系统。
> The SceneView supports following coordinate systems in a global scene:
>
> - WGS84 or WebMercator
> - Noncached layers with any spatial reference since they will be reprojected to the scene spatial reference
>
> In a local scene the following coordinate systems are supported:
>
> - Any Projected Coordinate System
> - Noncached layers with any spatial reference since they will be reprojected to the scene spatial reference

发布服务的详细步骤参见: [ArcGIS Pro发布三维场景服务](https://blog.csdn.net/wml00000/article/details/95634251)

## 3.3 积水区三维可视化

积水数据通过GeoJson格式存储，每个时刻对应一个GeoJson文件。要实现对GeoJson数据的渲染有两种方式：
- 使用类`GeoJSONLayer`,要求里面的坐标数据必须是**WGS84**坐标系；

>  The GeoJSON data must comply with the RFC 7946 specification which states that the coordinates are in SpatialReference.WGS84.

- 解析GeoJson数据，获取其坐标数据，通过要素图层(**FeatureLayer**)、渲染器(**Renderer**)、视觉变量(**VisualVariable**)进行可视化。

另外还有一种方式，先解析GeoJson数据，通过其坐标数据创建graphic添加至`GraphicsLayer`,再进行符号化。不过这种方式下，在graphic数量较大时，页面会出现卡顿甚至崩溃(10000时出现崩溃情况)。主要还是由于`GraphicsLayer`和`FeatureLayer`作用不太一致，前者可以承载多种类型的几何体(Point、Polyline、Polygon等)，各个graphic之间没有统一的模式，每个graphic可以有自己的符号；而后者是有统一模式的，同样的几何类型，同样的属性字段，可以用同样的符号渲染(一个renderer即可)，因此可视化效率更高。

> Each graphic must have its own symbol since the GraphicsLayer cannot have an associated renderer. Graphics may also contain different attribute schema from one another.

> It is generally preferred to construct a FeatureLayer with its source property when working with client-side graphics since the FeatureLayer has more capabilities than the GraphicsLayer, including rendering, querying, and labeling.

这里采用第二种方式，部分代码如下:

``` javascript
// FeatureLayer的渲染器
                var renderer = {
                    type: "simple",  // autocasts as new SimpleRenderer()
                    symbol: {
                        type: "polygon-3d", // autocasts as new PolygonSymbol3D()
                        symbolLayers: [
                            {
                                type: "extrude", // autocasts as new ExtrudeSymbol3DLayer()
                                material: {
                                    color: "#4ec2cd"
                                }
                            }
                        ]
                    },
                    visualVariables: [ //视觉变量，elevation字段控制拉伸高度
                        {
                            type: "size",
                            field: "elevation",
                            valueUnit: "meters"
                        }
                    ]
                };
                let features = [];
                var layer = new FeatureLayer({
                    fields: [
                        {
                            name: "ObjectID",
                            alias: "ObjectID",
                            type: "oid"
                        }, {
                            name: "elevation",
                            alias: "elevation",
                            type: "double"
                        }],
                    objectIdField: "ObjectID",
                    // source: features,  // autocast as a Collection of new Graphic()
                    geometryType: "polygon",
                    spatialReference: { wkid: 3857 },
                    renderer: renderer,
                    outFields: ["*"]
                });

                // 先添加开始时刻的积水数据
                $.get('assets/data/2019-03-01-16-00.json', function (geoJson) {
                    var featureCollections = geoJson.features;//获取积水区域
                    featureCollections.forEach(function (element) {
                        let feature = {
                            geometry: {
                                type: "polygon",  //不可省略
                                rings: element.geometry.coordinates,
                                spatialReference: { wkid: 3857 },  //不可省略
                            },
                            attributes: {
                                ObjectID: element.id,
                                elevation: element.properties.elevation,
                            }
                        };
                        features.push(feature);
                    }, this);
                    layer.source = features;//设置featurelayer数据源
                    map.add(layer);
                });
```

具体可参考[基于ArcGIS JS API 4.11实现对FeatureLayer的多变量渲染](https://blog.csdn.net/wml00000/article/details/94479353)

## 3.4 动态模拟

要实现积水的动态变化效果的话，就要借助时间滑块`TimeSlider`,这里的主要思路就是通过监听时间滑块状态变化，去取该时刻对应的积水数据，解析GeoJson数据，创建FeatureLayer的数据源，重置数据源，刷新FeatureLayer。部分代码如下：
``` javascript
// watch for time slider timeExtent change
                timeSlider.watch("timeExtent", function (timeExtent) {
                    console.log("Time extent now starts at", timeExtent.start, "and finishes at:", timeExtent.end);
                    // 动态修改featureLayer数据源
                    var fileName = dateUtil(timeExtent.end);
                    $.get(`assets/data/${fileName}.json`, function (geoJson) {
                        features = [];//清空
                        var featureCollections = geoJson.features;
                        featureCollections.forEach(function (element) {
                            let feature = {
                                geometry: {
                                    type: "polygon",  //不可省略
                                    rings: element.geometry.coordinates,
                                    spatialReference: { wkid: 3857 },  //不可省略
                                },
                                attributes: {
                                    ObjectID: element.id,
                                    elevation: element.properties.elevation,
                                }
                            };
                            features.push(feature);
                        }, this);
                        layer.source = features; //重置FeatureLayer数据源
                        layer.refresh(); // 刷新FeatureLayer
                    });
                });
```

# 4. [完整代码](https://github.com/minglwang1115/ArcGIS_JS_Demos/tree/master/Dynamic_Simulation)

# 5. 效果图

![动态效果图](http://ww1.sinaimg.cn/large/007TqXN5ly1g50iu88hwkg31f40qee83.gif)

[效果预览]()

