/**
 * created by wml
 * 距离测量、面积测量
 * 基于ArcGIS JS API 4.12
 */
define([
    "dojo/_base/lang",
    "dojo/_base/declare",
    "dojo/number",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Sketch/SketchViewModel",
    "esri/symbols/TextSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/Font",
    "esri/Color",
    "esri/Graphic",
    "esri/geometry/Polyline",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "esri/geometry/geometryEngine",
    "esri/tasks/support/AreasAndLengthsParameters",
    "esri/tasks/support/LengthsParameters",
    "esri/tasks/GeometryService",
], function (
    lang,
    declare,
    number,
    GraphicsLayer,
    SketchViewModel,
    TextSymbol,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleFillSymbol,
    Font,
    Color,
    Graphic,
    Polyline,
    Point,
    Polygon,
    geometryEngine,
    AreasAndLengthsParameters,
    LengthsParameters,
    GeometryService,
    ) {
        return declare(null, {
            _view: null,
            _map: null,
            _tempGraphicsLayer: null,
            _sketchVM: null,
            _geometryServiceUrl: null,
            _viewClickListener: null,
            _options: {
                view: this._view,
                map: this._map,
                geometryServiceUrl: ''
            },
            _inputPoints: [],
            _totalDistance: 0.00,
            _totalGraphic: null,
            _measureMethod: "GeometryServer",//默认测量方式为几何服务
            _distanceMeasure: false,//距离测量flag
            _areaMeasure: false,//面积测量

            constructor: function (options) {
                lang.mixin(this._options, options);
                this._checkParams(options);
                this._view = this._options.view;
                this._map = this._options.map;
                this._geometryServiceUrl = this._options.geometryServiceUrl;
                this._view = this._options.view;
                this._tempGraphicsLayer = new GraphicsLayer({
                    id: "measureLayer"
                });
                this._map.add(this._tempGraphicsLayer);
                this._sketchVM = new SketchViewModel({
                    layer: this._tempGraphicsLayer,
                    view: this._view
                });
                this._font = new Font({
                    size: '12px',
                    weight: 'bold'
                });
                this._defaultMarkerSymbol = new SimpleMarkerSymbol({
                    style: "circle",
                    color: "red",
                    size: "7px",  // pixels
                    outline: {  // autocasts as new SimpleLineSymbol()
                        color: [255, 255, 0],
                        width: 1  // points
                    }
                });
                var self = this;

                //监听view单击事件(绘制时监听不到)
                // this._viewClickListener = this._sketchVM.view.on('click', this._viewClickHandler.bind(this));

                // Listen to sketchViewModel's create event.
                this._sketchVM.on("create", function (event) {
                    if (self._distanceMeasure) {//距离测量
                        if (event.toolEventInfo && event.toolEventInfo.type === "vertex-add") {
                            // console.log(event);
                            var point = {
                                type: 'point',
                                x: event.toolEventInfo.added[0],
                                y: event.toolEventInfo.added[1],
                                spatialReference: self._view.spatialReference
                            }
                            self._distanceMeasureHandler(point);
                        }
                    }
                    if (self._areaMeasure) { //面积测量
                        // console.log(event);
                        if (event.state === "complete") {
                            self._areaMeasureHandler(event.graphic.geometry);
                        }
                    }
                });
            },
            //测量距离
            measureDistance: function () {
                this.clearMeasureActionAndGraphics();
                this._distanceMeasure = true;//激活距离测量
                this._totalDistance = 0.00;//总长度重置为0
                this._inputPoints = [];//输入点数组置为空
                this._sketchVM.create("polyline", { mode: "click" });//激活绘图工具
            },
            //单击事件处理
            // _viewClickHandler: function (evt) {
            //     if (this._distanceMeasure) {
            //         this._distanceMeasureHandler(evt.mapPoint);
            //     }
            // },
            /**
             * 距离测量处理
             * @param mapPoint 单击的点
             */
            _distanceMeasureHandler: function (mapPoint) {
                let me = this;
                this._inputPoints.push(mapPoint);//地图上添加鼠标点击处的点            
                //添加起点
                let textSymbol;
                if (this._inputPoints.length === 1) { //记录第一个点
                    textSymbol = new TextSymbol({
                        text: '起点',
                        font: this._font,
                        color: [204, 102, 51],
                        xoffset: 0,
                        yoffset: -20
                    });
                    this._map.findLayerById("measureLayer").add(new Graphic({
                        geometry: mapPoint,
                        symbol: textSymbol,
                    }));
                }
                //鼠标点击处添加点，并设置其样式
                this._map.findLayerById("measureLayer").add(new Graphic({
                    geometry: mapPoint,
                    symbol: this._defaultMarkerSymbol
                }));
                if (this._inputPoints.length >= 2) {
                    if (this._measureMethod === "GeometryServer") {
                        //方式一：利用ArcGIS Server的GeometryService服务，适用于具备ArcGIS Server环境的项目
                        let lengthParams = new LengthsParameters();
                        let url = this._geometryServiceUrl;
                        let geometryService = new GeometryService({ url: url });
                        lengthParams.distanceUnit = GeometryService.UNIT_METER;
                        lengthParams.calculationType = "preserveShape";
                        let p1 = this._inputPoints[this._inputPoints.length - 2];
                        let p2 = this._inputPoints[this._inputPoints.length - 1];
                        //同一个点，解决重复添加的bug
                        if (p1.x == p2.x && p1.y == p2.y)
                            return;
                        //在两点之间画线将两点连接起来
                        let polyline = new Polyline({
                            spatialReference: this._view.spatialReference
                        });
                        polyline.addPath([[p1.x, p1.y], [p2.x, p2.y]]);
                        lengthParams.polylines = [polyline];
                        //根据参数,动态计算长度
                        geometryService.lengths(lengthParams).then(function (distance) {
                            let _distance = number.format(distance.lengths[0]);//长度单位改为米
                            // debugger;
                            _distance = _distance.replace(",", '');//返回值每3位','隔开
                            me._totalDistance += parseFloat(_distance);//计算总长度
                            let beetwentDistances = _distance + "米";
                            let tdistance = new TextSymbol({
                                text: beetwentDistances,
                                font: me._font,
                                color: [204, 102, 51],
                                xoffset: 40,
                                yoffset: -3
                            });
                            me._map.findLayerById("measureLayer").add(new Graphic({ geometry: p2, symbol: tdistance }));
                            if (me._totalGraphic) //如果总长度存在的话,就删除总长度Graphic
                                me._map.findLayerById("measureLayer").remove(me._totalGraphic);
                            let total = number.format(me._totalDistance, { pattern: "#.000" });//保留三位小数
                            //设置总长度显示样式,并添加到地图上
                            let totalSymbol = new TextSymbol({
                                text: "总长度:" + total + "米",
                                font: me._font,
                                color: [204, 102, 51],
                                xoffset: 40,
                                yoffset: -20
                            });
                            me._totalGraphic = new Graphic({ geometry: p2, symbol: totalSymbol });
                            me._map.findLayerById("measureLayer").add(me._totalGraphic);
                        });
                    } else {
                        //方式二：利用ArcGIS API中自带的GeometryEngine类，适用于地图坐标系(wkid)为3857或4326或平面投影坐标系
                        //设置距离测量的参数
                        let p1 = this._inputPoints[this._inputPoints.length - 2];
                        let p2 = this._inputPoints[this._inputPoints.length - 1];
                        //同一个点，解决重复添加的bug
                        if (p1.x == p2.x && p1.y == p2.y)
                            return;
                        //在两点之间画线将两点连接起来
                        let polyline = new Polyline({
                            spatialReference: this._view.spatialReference
                        });
                        polyline.addPath([[p1.x, p1.y], [p2.x, p2.y]]);
                        let distance = 0;
                        //根据参数,动态计算长度
                        if (this._view.spatialReference.wkid == "3857" || (this._view.spatialReference.wkid == "102100") || this._view.spatialReference.wkid == "4326") {//在web麦卡托投影和WGS84坐标系下的计算方法
                            distance = geometryEngine.geodesicLength(polyline, "meters");//geodesicArea适用坐标系见官网API
                        } else {//在其他投影坐标系下的计算方法
                            distance = geometryEngine.planarLength(polyline, "meters");//planarArea适用于平面投影坐标系
                        }

                        let _distance = number.format(distance / 1000);
                        this._totalDistance += parseFloat(_distance);//计算总长度
                        let beetwentDistances = _distance + "米";
                        let tdistance = new TextSymbol({
                            text: beetwentDistances, 
                            font: this._font,
                            color: [204, 102, 51],
                            xoffset: 40,
                            yoffset: -3
                        });
                        this._map.findLayerById("measureLayer").add(new Graphic({geometry: p2, symbol: tdistance}));
                        if (this._totalGraphic) //如果总长度存在的话,就删除总长度Graphic
                            this._map.findLayerById("measureLayer").remove(this._totalGraphic);
                        let total = number.format(this._totalDistance, { pattern: "#.000" });//保留三位小数
                        //设置总长度显示样式,并添加到地图上
                        let totalSymbol = new TextSymbol({
                            text: "总长度:" + total + "米",
                            font: me._font,
                            color: [204, 102, 51],
                            xoffset: 40,
                            yoffset: -20
                        });
                        me._totalGraphic = me._map.findLayerById("measureLayer").add(new Graphic({ geometry: p2, symbol: totalSymbol }));
                    }
                }
            },
            /**
             * 面积测量，对外暴露
             */
            measureArea: function () {
                this.clearMeasureActionAndGraphics();
                this._areaMeasure = true;
                this._sketchVM.create("polygon", { mode: "click" });//激活绘图工具
            },
            /**
             * 面积测量处理
             * @param {*} geometry 绘制完成后的图形 
             */
            _areaMeasureHandler: function (geometry) {
                let me = this;
                if (this._measureMethod === "GeometryServer") {
                    //方式一：利用ArcGIS Server的GeometryService服务，适用于具备ArcGIS Server环境的项目
                    let areasAndLengthParams = new AreasAndLengthsParameters();
                    let url = this._geometryServiceUrl;
                    let geometryService = new GeometryService({ url: url });
                    areasAndLengthParams.lengthUnit = GeometryService.UNIT_METER;
                    areasAndLengthParams.areaUnit = GeometryService.UNIT_SQUARE_METERS;//单位改为平方米
                    areasAndLengthParams.calculationType = 'preserveShape';
                    geometryService.simplify([geometry]).then(function (simplifiedGeometries) {
                        areasAndLengthParams.polygons = simplifiedGeometries;
                        geometryService.areasAndLengths(areasAndLengthParams).then(function (result) {
                            let font = new Font({
                                size: '18px',
                                weight: 'bolder'
                            });
                            let areaResult = new TextSymbol({
                                text: number.format(result.areas[0], { pattern: '#.000' }) + "平方米",
                                font: font,
                                color: [204, 102, 51],
                            });
                            let spoint = new Point({
                                x: geometry.centroid.x,
                                y: geometry.centroid.y,
                                spatialReference: me._view.spatialReference
                            });
                            me._map.findLayerById("measureLayer").add(new Graphic({ geometry: spoint, symbol: areaResult })); //在地图上显示测量的面积
                        });
                    });
                } else {
                    //方式二：利用ArcGIS API中自带的GeometryEngine类，适用于地图坐标系(wkid)为3857或4326或平面投影坐标系
                    let area = 0;
                    if ((geometry.spatialReference.wkid == "4326") || (geometry.spatialReference.wkid == "3857") || (geometry.spatialReference.wkid == "102100")) {
                        area = geometryEngine.geodesicArea(geometry, "square-kilometers");//geodesicArea适用坐标系见官网API
                    } else {
                        area = geometryEngine.planarArea(geometry, "square-kilometers");//planarArea适用于平面投影坐标系
                    }
                    this.drawArea += parseFloat(area.toFixed(3));
                    let font = new Font({
                        size: '18px',
                        weight: 'bolder'
                    });
                    let areaResult = new TextSymbol({
                        text: number.format(area, { pattern: '#.000' }) + "平方千米",
                        font: font,
                        color: [204, 102, 51],
                    });
                    let spoint = new Point({
                        x: geometry.centroid.x,
                        y: geometry.centroid.y,
                        spatialReference: me._view.spatialReference
                    });
                    me._map.findLayerById("measureLayer").add(new Graphic({ geometry: spoint, symbol: areaResult })); //在地图上显示测量的面积
                }
            },
            /**
             * 绘制结束监听事件
             */
            _drawEnd: function (evt) {
                if (this._distanceMeasure) {
                    this._inputPoints = [];
                }
                if (this._areaMeasure) {

                }
                let resultSymbol;
                switch (geometry.type) {
                    case 'polyline':
                        resultSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.8]), 2);
                        break;
                    case 'polygon':
                        resultSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]));
                        break;
                }
                this._map.findLayerById("measureLayer").add(new Graphic(geometry, resultSymbol));
                this._distanceMeasure = false;
                this._areaMeasure = false;
                this._drawBar.deactivate();
            },
            /**
             * 清除测量动作及图上图形
             */
            clearMeasureActionAndGraphics: function () {
                this._distanceMeasure = false;
                this._areaMeasure = false;
                this._map.findLayerById("measureLayer").removeAll();
            },
            /**
             * 参数校验
             */
            _checkParams: function (options) {
                if (!options.view || !options.map) {
                    throw new Error("参数中必须包含map及view对象，参数格式：{'map': map,'view': view}");
                }
                if (!options.geometryServiceUrl) {
                    this._measureMethod = "GeometryEngine";//未传入几何服务地址，改用GeometryEngine类进行测量
                    console.warn("未传入参数'geometryServiceUrl'，采用方式2计算，若地图坐标系非['4326','3857','任意平面投影坐标系']之一，可能测量失败");
                }
            },
        });
    }
);