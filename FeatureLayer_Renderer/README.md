# 基于ArcGIS JS API 4.11实现对FeatureLayer的多变量渲染

# 需求背景

有一个二维数组，里面包含几万个表示高度的值，现在要把这些高度值在地图上展示出来。可以通过小立方体的方式展现，长宽固定，高用实际值代替。

# 需求分析

1. 数据量较大，需要考虑性能问题；
2. 在三维场景中对点数据(二维数组中的单个值)进行三维符号化

# 开发过程

最开始的思路是创建类型为`Point`的`Graphic`,通过`PointSymbol3D`进行符号化，在`ObjectSymbol3DLayer`中设置固定的长宽，高度根据数组里面的具体值对应，主要代码大概如下：
``` javascript
                    var elevArr = [];//模拟二维数组
                    for (let i=0;i<10;i++) {
                        let rowArr = [];
                        for (let j=0;j<10;j++) {
                            rowArr.push(Math.random() * 1000);
                        }
                        elevArr.push(rowArr);
                    }
                    
                    for (let row=0;row<elevArr.length;row++) {
                        for (let col=0;col<elevArr[row].length;col++) {
                            let locX = 17004630.030532643 + 500 + col*500;
                            let locY = 3875195.620791356 - 500 - row*500;
                            const objectSymbol = {
                                type: "point-3d",  // autocasts as new PointSymbol3D()
                                symbolLayers: [{
                                    type: "object",  // autocasts as new ObjectSymbol3DLayer()
                                    width: 1000,  // diameter of the object from east to west in meters
                                    height: elevArr[row][col],  // height of the object in meters
                                    depth: 1000,  // diameter of the object from north to south in meters
                                    resource: { primitive: "cube" },
                                    material: { color: "blue" }
                                }]
                            };
                            var point = {
                                type: "point", // autocasts as new Point()
                                x: locX,
                                y: locY,
                                z: 100,  
                                spatialReference: { wkid: 3857 }
                            };
                            const graphic = new Graphic({
                                geometry: point,
                                symbol: objectSymbol
                                });

                            graphicsLayer.add(graphic);
                        }
                    }  
```
经过测试发现1000个点的时候页面响应就有点慢了，增加到10000个点之后，页面崩溃，估计是和创建过多的`Graphic` , `ObjectSymbol3DLayer`等对象有关系。该方法在较大数据量的情况下不适用。
ArcGIS JS API里面有大数据集要素可视化的例子，通过`FeatureLayer`和`Renderer`的方式进行可视化渲染，FeatureLayer可通过3种方式创建：
> FeatureLayers may be created in one of three ways: from a service URL, an ArcGIS portal item ID, or from an array of client-side features.
这里采用第三种，直接在代码里面通过数组的方式，具体代码如下：
```html
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>实现FeatureLayer大数据集的多变量渲染</title>
  <style>
    html,
    body,
    #viewDiv {
      padding: 0;
      margin: 0;
      height: 100%;
      width: 100%;
    }
  </style>
  <link rel="stylesheet" href="https://js.arcgis.com/4.11/esri/themes/light/main.css" />
  <script src="https://js.arcgis.com/4.11/"></script>
  <script>
    require(["esri/Map", "esri/views/SceneView", "esri/layers/FeatureLayer"], function (Map, SceneView, FeatureLayer) {
      var map = new Map({
        basemap: "streets",
        ground: "world-elevation"
      });
      var view = new SceneView({
        container: "viewDiv", // Reference to the scene div created in step 5
        map: map, // Reference to the map object created before the scene
        scale: 5000000, // Sets the initial scale to 1:50,000,000
        center: [-101.17, 21.78], // Sets the center point of view with lon/lat
        // viewingMode: "local"
      });
      view.on('click', (evt) => {
        console.log(evt.mapPoint);
      })
      var features = [];

      //模拟二维数组
      var elevArr = [];
      var fid = 0;
      for (let i = 0; i < 100; i++) {
        let rowArr = [];
        for (let j = 0; j < 600; j++) {
          rowArr.push(Math.random() * 1000);
        }
        elevArr.push(rowArr);
      }

      let leftCoorX, upCoorY, resolution;
      for (let row = 0; row < elevArr.length; row++) {
        for (let col = 0; col < elevArr[row].length; col++ , fid++) {
          let locX = -11807396.534464896 + 500 + col * 500;
          let locY = 2727548.99928753 - 500 - row * 500;
          let feature = {
            geometry: {
              type: "point",  //不可省略
              x: locX,
              y: locY,
              spatialReference: { wkid: 3857 },  //不可省略
            },
            attributes: {
              ObjectID: fid,
              elevation: elevArr[row][col],
              width: "100",
              depth: "100"
            }
          };
          features.push(feature);
        }
      }
      var uvRenderer = {
        type: "simple",  // autocasts as new SimpleRenderer()
        symbol: {
          type: "point-3d",  // autocasts as new PointSymbol3D()
          symbolLayers: [{
            type: "object",  // autocasts as new ObjectSymbol3DLayer()
            // width: 1000,  // diameter of the object from east to west in meters
            // height: 5000,  // height of the object in meters
            // depth: 1000,  // diameter of the object from north to south in meters
            resource: { primitive: "cube" },
            material: { color: "blue" }
          }]
        },
        visualVariables: [
          {
            type: "size",
            axis: "height", //在symbolLayers设置width、height、depth无效
            field: "elevation",
            valueUnit: "meters"
          },
          {
            type: "size",
            axis: "width",
            field: "width",
            valueUnit: "meters"
          },
          {
            type: "size",
            axis: "depth",
            field: "depth",
            valueUnit: "meters"
          }
        ]
      };

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
          }, {
            name: "width",
            alias: "width",
            type: "string"
          }, {
            name: "depth",
            alias: "depth",
            type: "string"
          }],
        objectIdField: "ObjectID",
        source: features,  // autocast as a Collection of new Graphic()，注意数组长度限制，尽量低于60000
        geometryType: "point",
        spatialReference: { wkid: 3857 },
        renderer: uvRenderer,
        // type: "feature",
        outFields: ["*"]
      });
      map.add(layer);
    });
  </script>
</head>

<body>
  <div id="viewDiv"></div>
</body>

</html>
```
通过60000个点进行测试，无卡顿情况，推测ArcGIS JS API内部有优化，如分块渲染、量化操作等([可参考链接1](https://www.esri.com/arcgis-blog/products/js-api-arcgis/3d-gis/visualize-large-feature-datasets-in-3d-with-arcgis-api-for-javascript/?tdsourcetag=s_pcqq_aiomsg))

# 效果图
![在这里插入图片描述](https://img-blog.csdnimg.cn/20190702203258121.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dtbDAwMDAw,size_16,color_FFFFFF,t_70)


# 注意事项
1. `geometry`里面属性`type`和`spatialReference`不可忽略，否则图形加不到地图上；
2. 创建`FeatureLayer`时`source`有数组长度限制，经测试60000个点时正常，70000报错栈溢出，推测限制长度可能为65535；
3. 当geometry中包含`z`属性值时，符号化后高度是在`z`值之上叠加,如果不包含`z`属性，符号化后高度从该点所对应地形高程值之上累加；

# 参考链接 

> 1. Visualize large feature datasets in 3D with ArcGIS API for JavaScript: https://www.esri.com/arcgis-blog/products/js-api-arcgis/3d-gis/visualize-large-feature-datasets-in-3d-with-arcgis-api-for-javascript/?tdsourcetag=s_pcqq_aiomsg
> 2. https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html