<template>
  <div id="createJunctionMap" style="height: 70dvh; position: relative;"></div> 
  <div class="control-window">
    <div class="area-control">
      <button type="button" @click="clearSetting">
        <img src="../../assets/css/img/dummyImg/svg_create.svg" alt="clear" style="width: 30px; height: 30px;">
      </button>
      <p>削除</p>
    </div>
    <div class="layer-control-top-right">
      <MapProhibitedAreaControl :map="l_map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :stepNo="stepNo" :map="l_map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div class="legend-bottom-left">
      <MapLegend />
    </div> 
  </div>
</template>

<script lang="ts">
import "leaflet/dist/leaflet.css";
import clickIconUrl from "../assets/css/img/map/circle-solid.svg";
import iconUrl from "../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg";
import { ref, onMounted, markRaw } from "vue";
import { Chart, registerables } from 'chart.js';
import * as turf from "@turf/turf";
import MapLayerControl from '../mapLayerControl.vue';
import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';
Chart.register(...registerables);

export default {
  components: {
    MapLayerControl,
    MapProhibitedAreaControl,
  },
  emits: ['update-data', 'isJunctionSetting'],
  props: {
    message: {
      type: String,
      required: true
    },
    stepNo: {
      type: String,
      required: true,
    },
    fallToleranceRange: {
      type: Object,
      required: true
    },
    corridorData: {
      type: Object,
      required: true
    },
    aircrafts: {
      type: Array,
      required: true,
    },
  },
  setup(props, { emit }) {
    let selectedMaxFallRangeCoordListInit = ref<[number, number][]>([]);
    const selectedMaxFallRangeCoords = ref(selectedMaxFallRangeCoordListInit);
    let maskPolygon = null; // 最大落下範囲グレーマスクポリゴン（ズーム追従のため動的更新）

    let lineWeight = 13;
    const l_map = ref(null);
    let map_moveend = ref(false);
    const centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
    const zoomInit = 18;
    const geoJson = ref(null);
    const lines = ref<[number, number][][]>([]); // 描画する全ての線
    const settingFlag = ref(false); // 設定ボタン押下フラグ
    const curLine = ref<[number, number][]>([]); // クリックした2点間を結んだ線の座標
    const curIntersections = ref<[number, number][][]>([]); // 最大落下範囲と新規に引いた線との交点
    let curJunctionIcon = null; // カレントの航路点アイコン
    let curSectionLinesStart = null; // カレントの航路区画
    let curSectionLinesEnd = null; // カレントの航路区画
    let curSectionIconObjStart = null; // カレントの航路区画名アイコン
    let curSectionIconObjEnd = null; // カレントの航路区画名アイコン
    let originalSectionName = ''; // ×ボタンロールバック用: 中間点挿入前の区画名
    // 高度幅ダイアログ再表示用 — 最後の挿入操作内容
    let curStart = null;            // makeGraphData へ渡す start [lng, lat]
    let curEnd = null;              // makeGraphData へ渡す end   [lng, lat]
    let curDist = 0;                // makeGraphData へ渡す dist
    let curIntersectionCoords = []; // makePlugins へ渡す intersectionCoords
    const junctionReopenData = {}; // { [viewCoordsIdx]: { start, end, dist, intersectionCoords, savedRect, LDN_name } }
    let isReopeningJunction = false; // 既存航路点の再編集モードフラグ
    let baseAllCoordinates = []; // ポリゴン座標(初期表示)
    let allCoordinates = []; // ポリゴン座標(編集用)
    let baseViewCoordinates = []; // マーカー・ポリライン用の座標(初期表示)
    let viewCoordinates = []; // マーカー・ポリライン用の座標(編集用)
    let junctionMarkers = []; // 航路点のマーカー
    let sectionIcons = []; // 航路区画アイコン
    let airwayPolyLines = []; // 航路のポリライン
    let polyLineCoords = [];
    let crossCoord = []; // 選択された航路と落下節の交点座標
    const newPoints = ref({}); // 追加する航路点情報
    let lat1;
    let lat2;
    let lng1;
    let lng2;
    let lat1Airway;
    let lat2Airway;
    let lng1Airway;
    let lng2Airway;
    let topHeight;
    let bottomHeight;
    let airwayMargin = 10; // 航路と逸脱範囲の隙間 (MVP2では 1m固定)
    let aircraftLength = 0; // 機体長(m)
    let lineWeight_i = 45;
    let lineWeight_o = 53;
    let determinationId;
    let parabolaCoordsTmp = [];
    let LDN_section_name_list = []; // 航路区間名リスト(編集用)
    let initial_LDN_section_name_list = []; // 航路区間名リスト(初期表示)
    let insertIdx = 0;
    const PolygonLatLngList = [];
    const OuterLatLangs = [[-90,-180],[-90,180],[90,180],[90,-180]];
    const InsideLatLangs = [];
    const PolygonOptions = {
      opacity:0,
      fillOpacity:0.6,
      color:"#D3D3D3"
    };
    let errorMsg;
    let landmarkNameInput; // getElementByIdの代わりに直接参照を保持
    let clickIconList = [];
    let lineList = [];
    let controlList = [];
    let loadingControl = null; // 地形データ取得中ローディングコントロール
    let arrowList = [];
    let corridor_points = [];
    let despersionNodes = [];
    let resJSON = {};
    let lastSelectedPolyLine = null;
    let clickPolyLineFlg = false;
    let selectedPolyLineData = {};
    let step1 = {};
    const crossAirwayFallToleranceRangeLineErrorMsg = "選択した航路区画と落下範囲節が交わるように設定してください。";
    const inputLandmarkNameErrorMsg = "航路点名を入力してください。";
    const MapLayerControlMounted = ref(true);
    const chartCanvas = ref(null);
    const chart = ref(null);
    const div1 = ref(null);

    const setMarker = async (event) => {
      const pt = turf.point([event.latlng.lng, event.latlng.lat]);
      const poly = turf.polygon([InsideLatLangs.map(([lng, lat]) => [lat, lng])])
      const b = turf.booleanPointInPolygon(pt, poly);
      if (b) {
        // 最大落下範囲内に落下節作成するためのマーカーは表示させない
        return;
      }
      if (!clickPolyLineFlg) {
        alert("航路点を追加する対象の航路区画を選択して下さい");
        return;
      }
      if (curLine.value.length == 2) {
        // ランドマーク設定
        console.log("settingLandmark() execute.");
        settingLandmark();
        if (settingFlag.value) { // 正しく設定されている場合
          removeControlFromMap(l_map.value, controlList);
          curLine.value = [];
          curIntersections.value = [];
          settingFlag.value = false;
          clickPolyLineFlg = false;
        } else { // 正しく設定されていない場合
          console.log("断面図が正しく設定されていません。");
          return;
        }
      } else {
        console.log("settingLandmark() not execute.");
      }
      // クリックした地点にアイコンを表示
      const icon = L.icon({
        iconUrl: clickIconUrl,
        iconSize: [10, 10]
      });
      const clickMarker = L.marker(
        [event.latlng.lat, event.latlng.lng],
        {icon: icon}
      ).addTo(l_map.value);
      clickIconList.push(clickMarker);

      curLine.value.push([event.latlng.lat, event.latlng.lng]);
      if (curLine.value.length == 2) {
        // クリックした2点を結ぶ線
        const lineChecked1 = turf.lineString([[curLine.value[0][1], curLine.value[0][0]], [curLine.value[1][1], curLine.value[1][0]]]);
        // 選択されたポリライン
        const lineChecked2 = turf.lineString([
          [selectedPolyLineData.startCoords[1], selectedPolyLineData.startCoords[0]],
          [selectedPolyLineData.endCoords[1], selectedPolyLineData.endCoords[0]]
        ]);
        const tmpIntersect = turf.lineIntersect(lineChecked1, lineChecked2);
        if (tmpIntersect.features.length !== 1) {
          alert(crossAirwayFallToleranceRangeLineErrorMsg);
          curLine.value = [];
          curIntersections.value = [];
          removeControlFromMap(l_map.value, controlList);
          const clearList = [clickIconList, arrowList, lineList];
          clearList.forEach(item => {
            removeLayerFromMap(l_map.value, item)
          });
          settingFlag.value = false;
          return;
        }
        crossCoord = tmpIntersect.features[0].geometry.coordinates;
        // データ挿入場所の特定
        insertIdx = 0
        for (insertIdx=0; insertIdx< viewCoordinates.length; insertIdx++) {
          // 緯度・経度比較
          if (selectedPolyLineData.startCoords[0] === viewCoordinates[insertIdx][0]
            && selectedPolyLineData.startCoords[1] === viewCoordinates[insertIdx][1]
          )　break;
        }
        if (insertIdx > viewCoordinates.length) {
          console.log("データ不正")
          return;
        }
        // 交点取得
        const intersections = getIntersection(curLine.value, selectedMaxFallRangeCoords.value);
        if (intersections.length === 2) {
          // 中間点のデータを挿入
          viewCoordinates.splice(insertIdx+1, 0, [crossCoord[1], crossCoord[0]]);
          const tmpAirwayName = LDN_section_name_list[insertIdx]
          originalSectionName = tmpAirwayName; // ×ボタンロールバック用に保存
          LDN_section_name_list[insertIdx] = `${tmpAirwayName}-1`
          LDN_section_name_list.splice(insertIdx+1, 0, `${tmpAirwayName}-2`);
        // 航路・航路点・航路区画名表示
        drawMarkerPolyLine(viewCoordinates, LDN_section_name_list);
          if (lastSelectedPolyLine !== null) {
            l_map.value.removeLayer(lastSelectedPolyLine);
          }
          // 交点の左右の決定
          // const ret = calcIntersections(intersections, viewCoordinates[insertIdx+1]);
          const ret = determineIntersectionDirection(
            [intersections[0][1], intersections[0][0]],
            [intersections[1][1], intersections[1][0]],
            viewCoordinates[insertIdx]
          );
          const start = ret.start
          const end = ret.end
          const dist = ret.dist
          const intersectionCoords = [[start[1], start[0]], [end[1], end[0]]];
          // ダイアログ再表示用に現在の挿入操作情報を保存
          curStart = start;
          curEnd   = end;
          curDist  = dist;
          curIntersectionCoords = intersectionCoords;
          const s = getLeftRight(allCoordinates[insertIdx]);
          const e = getLeftRight(allCoordinates[insertIdx+1]);
          const { dist1, dist2 } = calcCrossSection(s, e, lineChecked1, intersections);
          step1 = interpolateLatLng(dist, dist1, dist2, topHeight, bottomHeight, intersectionCoords, airwayMargin);
          // グラフ作成時は次へ進めないようにする
          emit('isJunctionSetting', false);
          // グラフ作成用データ作成
          showLoadingControl();
          const currentUaslId = props.corridorData?.airway?.airways?.[0]?.airwayId ?? null;
          const data = await makeGraphData(despersionNodes, determinationId, geoJson.value, start, end, dist, currentUaslId);
          removeLoadingControl();
          // グラフ作成
          await createChartWindow(l_map.value);
          const plugins = makePlugins(
            data.parabolaList, 
            dist, 
            data.maxParabolaHeight, 
            data.geoInfo, 
            data.parabolaCoordsTmp, 
            data.existingAirwaysCoords, 
            data.terrainCoords,
            intersectionCoords
          );
          createChart(dist, data.maxParabolaHeight, data.geoInfo, plugins);
          // クリックした地点のアイコンをクリア
          removeLayerFromMap(l_map.value, clickIconList);
          // 交点を結ぶ線とLRの描画
          drawLineLR(l_map.value, start, end, lineList, arrowList);
          lines.value.push([...curLine.value]);
        } else {
          console.log("交点が2個になるように線を引いてください");
          curLine.value = [];
          curIntersections.value = [];
          removeLayerFromMap(l_map.value, clickIconList);
        }
      }
    }

    onMounted(async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default;
      
      l_map.value = markRaw(L.map('createJunctionMap', {
        center: centerInit,
        zoom: zoomInit,
        scrollWheelZoom: false,
        zoomControl: true,
        doubleClickZoom: false
      }));
      l_map.value.zoomControl.setPosition('bottomright');

      L.tileLayer(
        useRuntimeConfig().public.mapTileUrl,
        {
          className: "grayscale-map",
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
        }
      ).addTo(l_map.value);
      l_map.value.on('click', setMarker);

      // 地物情報を読み込み
      geoJson.value = await loadGeoJson();

      // ジャンクションの設定が1つ以下の場合は次へは進めないようにする
      emit('isJunctionSetting', false);

      // 落下空間取得 API で航路区画IDを取得する
      const headers = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const toObjects = (arr) =>
        (arr || [])
          .map((s) => {
            try {
              return typeof s === 'string' ? JSON.parse(s) : s;
            } catch (e) {
              console.error('JSON parse error:', e, s);
              return null;
            }
          })
          .filter(Boolean);
      // props.aircrafts が ref でも配列でも対応
      const aircraftStrings = Array.isArray(props.aircrafts)
        ? props.aircrafts
        : (props.aircrafts?.value ?? []);
      const aircraftObjs = toObjects(aircraftStrings);
      airwayMargin = Math.max(...aircraftObjs.map(item => item.deviationRange));
      if (Number.isNaN(airwayMargin)) {
        airwayMargin = 10;
      }
      const aircraftLengthMM = Math.max(...aircraftObjs.map(item => item.length));
      aircraftLength = aircraftLengthMM / 1000; // mm => m
      // feasible-vol API 用の droneList を構築
      const droneList = aircraftObjs.map((a) => ({
        aircraftInfoId: a.aircraftInfoId,
        maker: a.maker,
        modelNumber: a.modelNumber,
        name: a.name,
        type: a.type,
        ip: a.ip,
        length: a.length,
        weight: a.weight,
        maximumTakeoffWeight: a.maximumTakeoffWeight,
        maximumFlightTime: a.maximumFlightTime,
      }));
      const params = {
        maxFallRangeId: props.message, // 最大落下範囲ID
        numCrossSectionDivisions: Number(useRuntimeConfig().public.numCrossSectionDivisions) || 30,      // 断面分割数
        droneList,                           // 変換済み配列をそのまま渡す
      };
      try {
        const response = await $fetch('/api/airway/feasible-vol', { 
          method: 'POST',
          body: params
        });
        if (response.status !== 201) {
          console.error('API request failed:', response.status);
          return;
        }
        determinationId = response.data.uaslDeterminationId;
      } catch (error) {
        console.error('API request failed:', error);
        return;
      }
      console.log(determinationId);

      // 最大落下範囲表示
      const selectedFallToleranceRangeId = props.fallToleranceRange['fallToleranceRanges'].find(item => item.fallToleranceRangeId === props.message)
      if (selectedFallToleranceRangeId['geometry']['coordinates'].length > 0) {
        selectedFallToleranceRangeId['geometry']['coordinates'][0].forEach((coord) => {
          selectedMaxFallRangeCoords.value.push([coord[1], coord[0]]);
          InsideLatLangs.push([coord[1], coord[0]]);
        })
      }
      PolygonLatLngList.push(OuterLatLangs);
      PolygonLatLngList.push(InsideLatLangs);
      // if (InsideLatLangs && InsideLatLangs.length > 0) {
      //   l_map.value.fitBounds(InsideLatLangs);

      //   // 最大落下範囲が広いと細かい操作ができないため、ズームレベルを1上げる
      //   const zoomLevel = l_map.value.getZoom();
      //   l_map.value.setZoom(zoomLevel + 1);
      // } else {
      // }
      // マスクポリゴンを追加（ズームに追従して外側リングを動的更新）
      updateMaskPolygon();

      // マップコンテナサイズを再計算してから表示準備
      l_map.value.invalidateSize();
      initDraw();

      l_map.value.on('zoomend', updateMaskPolygon);
      l_map.value.on('moveend', (event) => {
        console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
        if (!MapLayerControlMounted.value) {
          console.log(`map moved:${event}`);
          map_moveend.value = true;
        }
        updateMaskPolygon();
      });
    });

    function initDraw() {
      const airwaysData = props.corridorData;
      const tmp = makeCorridorPointsJson(airwaysData["airway"]["airways"][0])
      resJSON.corridor_points = tmp.corridor_points;
      const data = airwaysData["airway"]["airways"][0]
      // ポリゴン座標を抽出
      data.airwayJunctions.forEach((point) => {
        point["airways"].forEach((coordinates) => {
          const coords = coordinates["airway"]["geometry"]["coordinates"];
          if (Array.isArray(coords)) {
            baseAllCoordinates.push(coords);
          }
        });
      });
      allCoordinates = [...baseAllCoordinates];
      // ポリライン・マーカー座標取得
      baseViewCoordinates = calcPolylineCoordinates(data);
      viewCoordinates = [...baseViewCoordinates];

      // 地図をズームして範囲を調整（invalidateSize でコンテナサイズを再計算してから fitBounds）
      l_map.value.invalidateSize();
      l_map.value.fitBounds([viewCoordinates]);

      // 航路区画名取得
      initial_LDN_section_name_list = [];
      props.corridorData.airway.airways[0].airwaySections.forEach((sections) => {
        initial_LDN_section_name_list.push(sections.airwaySectionName)
      });
      LDN_section_name_list = [...initial_LDN_section_name_list];
      resJSON.corridor_sections = LDN_section_name_list;

      // 航路・航路点・航路区画名表示
      drawMarkerPolyLine(viewCoordinates, LDN_section_name_list);
    }

    // 航路・航路点・航路区画名表示
    function drawMarkerPolyLine(coordinates, sections) {
      const clearList = [airwayPolyLines, junctionMarkers, sectionIcons]
      clearList.forEach(item => {
        removeLayerFromMap(l_map.value, item)
      });

      // 航路点表示
      let iconSizeW = 50;
      let iconSizeH = 50;
      for (let i=0; i<coordinates.length; i++) {
        let sectionIcon = L.divIcon({
          className: '',
          // html: svgTemplate(i + 1), // 各マーカーに対して動的に数字を設定
          html: svgTemplate(i + 1, iconSizeW, iconSizeH),
          iconSize: [iconSizeW, iconSizeH],
          iconAnchor: [25, 25],
        });
        junctionMarkers.push(L.marker(coordinates[i], { icon: sectionIcon }).addTo(l_map.value));
      }

      // 航路・航路区画名表示
      polyLineCoords = [];
      for (let i=0; i<coordinates.length-1; i++) {
        const airwayPolyLine = drawAirway(
          l_map.value, 
          [coordinates[i][0], coordinates[i][1]],
          [coordinates[i+1][0], coordinates[i+1][1]]
        );
        airwayPolyLines.push(airwayPolyLine)
        const sectionIcon = drawAirwaySection(
          l_map.value, 
          [coordinates[i][0], coordinates[i][1]],
          [coordinates[i+1][0], coordinates[i+1][1]],
          sections[i],
        );
        sectionIcons.push(sectionIcon);
        polyLineCoords.push([coordinates[i], coordinates[i+1]])
      }

      // クリックイベント
      // airwayPolyLines[i] は [polyOuter, polyInner] の配列なので各レイヤーに登録する
      for (let i=0; i<airwayPolyLines.length; i++) {
        const handler = onClickPolyLine(LDN_section_name_list[i], polyLineCoords[i], airwayPolyLines[i]);
        if (Array.isArray(airwayPolyLines[i])) {
          airwayPolyLines[i].forEach(layer => { if (layer) layer.on('click', handler); });
        } else if (airwayPolyLines[i]) {
          airwayPolyLines[i].on('click', handler);
        }
      }
      for (let i=0; i<sectionIcons.length; i++) {
        sectionIcons[i].on('click', onClickMarker(LDN_section_name_list[i], polyLineCoords[i], airwayPolyLines[i]));
      }
      // 追加済み航路点マーカー: はクリックで再編集ダイアログを表示
      for (let i=0; i<junctionMarkers.length; i++) {
        if (junctionReopenData[i]) {
          junctionMarkers[i].on('click', onClickJunctionMarker(i));
        }
      }
    }

    // polyLine は [polyOuter, polyInner] 配列または単体レイヤー
    function setPolyLineStyle(polyLine, style) {
      if (Array.isArray(polyLine)) {
        polyLine.forEach(layer => { if (layer) layer.setStyle(style); });
      } else if (polyLine) {
        polyLine.setStyle(style);
      }
    }
    // 選択色を適用 (outer=枠色, inner=塗り色)
    function setPolyLineStyleSelected(polyLine) {
      if (Array.isArray(polyLine)) {
        if (polyLine[0]) polyLine[0].setStyle({ color: 'rgb(216, 24, 129)', weight: airwayOptions.weight });
        if (polyLine[1]) polyLine[1].setStyle({ color: 'rgb(251, 223, 239)', weight: airwayInnerOptions.weight });
      } else if (polyLine) {
        polyLine.setStyle({ color: 'rgb(216, 24, 129)' });
      }
    }
    // デフォルト色に戻す (outer/inner それぞれ元の色へ)
    function resetPolyLineStyle(polyLine) {
      if (Array.isArray(polyLine)) {
        if (polyLine[0]) polyLine[0].setStyle(airwayOptions);
        if (polyLine[1]) polyLine[1].setStyle(airwayInnerOptions);
      } else if (polyLine) {
        polyLine.setStyle(airwayOptions);
      }
    }
    function onClickMarker(sectionName, coords, polyLine) {
      return function(e) {
        if (lastSelectedPolyLine) {
          resetPolyLineStyle(lastSelectedPolyLine);
        }
        setPolyLineStyleSelected(polyLine);
        lastSelectedPolyLine = polyLine;
        clickPolyLineFlg = true;
        selectedPolyLineData = {
          sectionName: sectionName,
          startCoords: coords[0],
          endCoords: coords[1],
        }
      }
    }
    function onClickPolyLine(sectionName, coords, polyLine) {
      return function(e) {
        if (lastSelectedPolyLine) {
          resetPolyLineStyle(lastSelectedPolyLine);
        }
        setPolyLineStyleSelected(polyLine);
        lastSelectedPolyLine = polyLine;
        clickPolyLineFlg = true;
        selectedPolyLineData = {
          sectionName: sectionName,
          startCoords: coords[0],
          endCoords: coords[1],
        }
      }
    }

    // 追加済み航路点マーカークリック → 再編集ダイアログを表示
    function onClickJunctionMarker(markerIdx) {
      return async function(e) {
        const d = junctionReopenData[markerIdx];
        if (!d) return;
        L.DomEvent.stopPropagation(e); // Leafletイベントのバブリングを停止

        // モードフラグ・インデックス・和路内位置を設定
        isReopeningJunction = true;
        insertIdx = markerIdx - 1;
        selectedPolyLineData = {
          startCoords: viewCoordinates[insertIdx],
          endCoords:   viewCoordinates[insertIdx + 2],
        };

        // 初期矩形（保存済み矩形）とデフォルトフォールバックからを保存値で
        newPoints.value = { ...d.savedRect };
        step1 = { ...d.savedRect };

        // curStart/End/Dist/IntersectionCoords を再編集内容で上書き
        curStart              = d.start;
        curEnd                = d.end;
        curDist               = d.dist;
        curIntersectionCoords = d.intersectionCoords;

        emit('isJunctionSetting', false);

        // API 再呼び出し（despersionNodes に影響しないよう一時配列を渡す）
        const tempDespersionNodes = [...despersionNodes];
        showLoadingControl();
        const currentUaslId = props.corridorData?.airway?.airways?.[0]?.airwayId ?? null;
        const data = await makeGraphData(tempDespersionNodes, determinationId, geoJson.value, d.start, d.end, d.dist, currentUaslId);
        removeLoadingControl();
        if (!data) {
          isReopeningJunction = false;
          emit('isJunctionSetting', true);
          return;
        }

        await createChartWindow(l_map.value);
        const plugins = makePlugins(
          data.parabolaList,
          d.dist,
          data.maxParabolaHeight,
          data.geoInfo,
          data.parabolaCoordsTmp,
          data.existingAirwaysCoords,
          data.terrainCoords,
          d.intersectionCoords
        );
        createChart(d.dist, data.maxParabolaHeight, data.geoInfo, plugins);

        // 高度幅ダイアログの名前入力欄に保存済み名を復元
        if (landmarkNameInput) landmarkNameInput.value = d.LDN_name;

        // LR線・矢印を再描画
        drawLineLR(l_map.value, d.start, d.end, lineList, arrowList);
      };
    }

    // プラグイン作成
    function makePlugins(
      parabolaList, 
      dist, 
      maxParabolaHeight, 
      geoInfo, 
      parabolaCoordsTmp, 
      existingAirwaysCoords, 
      terrainCoords,
      intersections
    ) {
      const flightAreaPlugin = createFlightAreaPlugin({
        parabolaList,
        dist,
        maxParabolaHeight,
        chartMinY: Math.floor(geoInfo?.minAltitude ?? 0),
      });
      const textPlugin = createTextPlugin();
      // middlePointPlugin は initialRectData により dragPlugin が初期矩形を描画するため不要
      // const middlePointPlugin = createMiddlePointPlugin(newPoints);
      const optionCallbacks = {
        clearMiddleMarkerPolyline,
        addMiddleMarkerPolyline,
      }
      let prevCoords = [];
      if (resJSON.corridor_points && resJSON.corridor_points.length > 0) {
        const i = insertIdx;
        prevCoords[0] = [resJSON.corridor_points[i].LDN_coordinates[0][0], resJSON.corridor_points[i].LDN_coordinates[0][1]];
        prevCoords[1] = [resJSON.corridor_points[i].LDN_coordinates[2][0], resJSON.corridor_points[i].LDN_coordinates[2][1]];
      }
      const dragPlugin = createChartDragPlugin({
        dist,
        geoInfo,
        errorMsg,
        initDragPolylineMarker,
        parabolaCoordsTmp,
        prevCoords,
        selectedMaxFallRangeCoords,
        connectLandmark,
        airwayMargin,
        aircraftLength,
        intersections,
        drawJunctionIcon,
        existingAirwaysCoords, 
        terrainCoords,
        optionCallbacks,
        initialRectData: newPoints, // 既存航路点矩形を初期状態で9点ハンドル付き矩形として表示
      });
      const existingAirwaysPlugin = createExistingAirwaysPlugin(existingAirwaysCoords);
      const terrainPlugin = createTerrainPlugin(terrainCoords, dist);
      return [
        existingAirwaysPlugin,
        terrainPlugin,
        flightAreaPlugin,
        textPlugin,
        dragPlugin
      ];
    }

    // 挿入区間の元レイヤー非表示フラグ
    let insertionOverlayHidden = false;

    // airwayPolyLines の各要素は drawAirway が返す [polyOuter, polyInner] の配列のため、
    // removeLayer/addTo を直接呼ばず以下ヘルパーを使用する
    function removePolyLayer(layerOrArray) {
      if (Array.isArray(layerOrArray)) {
        layerOrArray.forEach(layer => { if (layer) l_map.value.removeLayer(layer); });
      } else if (layerOrArray) {
        l_map.value.removeLayer(layerOrArray);
      }
    }
    function addPolyLayer(layerOrArray) {
      if (Array.isArray(layerOrArray)) {
        layerOrArray.forEach(layer => { if (layer) layer.addTo(l_map.value); });
      } else if (layerOrArray) {
        layerOrArray.addTo(l_map.value);
      }
    }

    // 挿入区間に相当するレイヤーを地図から一時非表示（配列の参照は保持）
    function hideInsertionOverlay() {
      if (insertionOverlayHidden) return;
      insertionOverlayHidden = true;
      removePolyLayer(airwayPolyLines[insertIdx]);
      removePolyLayer(airwayPolyLines[insertIdx + 1]);
      if (sectionIcons[insertIdx])        l_map.value.removeLayer(sectionIcons[insertIdx]);
      if (sectionIcons[insertIdx + 1])    l_map.value.removeLayer(sectionIcons[insertIdx + 1]);
      if (junctionMarkers[insertIdx + 1]) l_map.value.removeLayer(junctionMarkers[insertIdx + 1]);
    }

    // 非表示にした挿入区間レイヤーを地図に再表示（キャンセル・リセット時）
    function showInsertionOverlay() {
      if (!insertionOverlayHidden) return;
      insertionOverlayHidden = false;
      addPolyLayer(airwayPolyLines[insertIdx]);
      addPolyLayer(airwayPolyLines[insertIdx + 1]);
      if (sectionIcons[insertIdx])        sectionIcons[insertIdx].addTo(l_map.value);
      if (sectionIcons[insertIdx + 1])    sectionIcons[insertIdx + 1].addTo(l_map.value);
      if (junctionMarkers[insertIdx + 1]) junctionMarkers[insertIdx + 1].addTo(l_map.value);
    }

    function initDragPolylineMarker() {
      showInsertionOverlay(); // キャンセル時：元の挿入区間を再表示
      const clearList = [
        curJunctionIcon,
        curSectionIconObjStart,
        curSectionIconObjEnd,
        curSectionLinesStart,
        curSectionLinesEnd
      ]
      clearList.forEach(item => {
        removeLayerFromMap(l_map.value, item)
      });
    }

    function drawJunctionIcon() {
      // ジャンクションIconセット
      let iconSizeW = 50;
      let iconSizeH = 50;
      let sectionIcon = L.divIcon({
        className: '',
        html: svgTemplate(insertIdx+2, iconSizeW, iconSizeH),
        iconSize: [iconSizeW, iconSizeH],
        iconAnchor: [25, 25],
      });
      removeLayerFromMap(l_map.value, curJunctionIcon);
      curJunctionIcon = L.marker([chart.value.$curLandmark[0], chart.value.$curLandmark[1]], { icon: sectionIcon }).addTo(l_map.value);
      return;
    }

    // グラフ作成
    const createChart = (dist, maxParabolaHeight, geoInfo, plugins) => {
      if (div1.value) {
        const chartMarginY = 5;

        if (chart.value) {
          chart.value.destroy();
        }
        chart.value = markRaw(createLineChart(
          chartCanvas.value,
          geoInfo,
          dist,
          maxParabolaHeight,
          chartMarginY,
          plugins
        ));
      }
    };

    // 地形データ取得中ローディングダイアログを表示
    function showLoadingControl() {
      if (loadingControl !== null) return;
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = '50%';
      div.style.left = '50%';
      div.style.transform = 'translate(-50%, -50%)';
      div.style.backgroundColor = '#FFFFFF';
      div.style.border = '1px solid #cccccc';
      div.style.borderRadius = '12px';
      div.style.width = '360px';
      div.style.height = '80px';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.style.textAlign = 'center';
      div.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
      div.style.fontSize = '16px';
      div.style.fontFamily = "'Roboto', sans-serif";
      div.style.zIndex = '1500';
      div.innerHTML = 'データを取得中です。<br>しばらくお待ちください';
      l_map.value.getContainer().appendChild(div);
      loadingControl = div;
      controlList.push(loadingControl);
    }
    // ローディングダイアログを削除
    function removeLoadingControl() {
      if (loadingControl !== null) {
        loadingControl.parentNode?.removeChild(loadingControl);
        const idx = controlList.indexOf(loadingControl);
        if (idx !== -1) controlList.splice(idx, 1);
        loadingControl = null;
      }
    }

    const createChartWindow = async (map: any) => {
      const customControl = L.Control.extend({
        onAdd: function(map) {
          const elements = createChartWindowDom(insertIdx+2);
          div1.value = elements.container;
          chartCanvas.value = elements.chartCanvas;
          errorMsg = elements.errorMsg;
          landmarkNameInput = elements.inputElement;
          l_map.value = markRaw(map);

          // 保存ボタン: 航路点を確定
          elements.saveButton.addEventListener('click', () => {
            settingLandmark();
          });

          // ×ボタン: 新規追加→ロールバック / 再編集→ダイアログを閉じて元状態を再描画
          elements.cancelButton.addEventListener('click', () => {
            // チャートリセット
            if (chart.value && chart.value.dragData) {
              chart.value.dragData.rect = null;
              chart.value.dragData.isEditing = false;
              chart.value.$curLandmark = [];
              chart.value.update();
            }
            // curSection系レイヤーをクリア
            const clearList = [curJunctionIcon, curSectionIconObjStart, curSectionIconObjEnd, curSectionLinesStart, curSectionLinesEnd];
            clearList.forEach(item => removeLayerFromMap(l_map.value, item));
            // 挿入区間の一時非表示フラグをリセット
            hideInsertionOverlay();
            insertionOverlayHidden = false;
            // LR線・矢印の削除 (新規/再編集共通)
            if (lineList.length > 0) l_map.value.removeLayer(lineList.pop());
            for (let i = 0; i < 2 && arrowList.length > 0; i++) l_map.value.removeLayer(arrowList.pop());

            if (isReopeningJunction) {
              // 再編集キャンセル: viewCoordinates/LDN_section_name_list はそのまま
              isReopeningJunction = false;
              emit('isJunctionSetting', true);
            } else {
              // 新規追加キャンセル: 挿入前の状態にロールバック
              viewCoordinates.splice(insertIdx + 1, 1);
              LDN_section_name_list.splice(insertIdx, 2, originalSectionName);
              removeLayerFromMap(l_map.value, clickIconList);
              if (lines.value.length > 0) lines.value.pop();
            }
            curLine.value = [];
            curIntersections.value = [];
            if (errorMsg) errorMsg.textContent = '';
            // 元の航路状態を再描画
            drawMarkerPolyLine(viewCoordinates, LDN_section_name_list);
            // ダイアログを閉じる
            if (controlList.length > 0) {
              l_map.value.removeControl(controlList.pop());
            }
          });

          return elements.container;
        }
      });
      const control = new customControl({ position: 'bottomleft' });
      control.addTo(map);
      controlList.push(control);
    }

    // ランドマーク接続
    function connectLandmark() {
      hideInsertionOverlay(); // 初回呼び出し時に元の挿入区間を非表示（二重表示防止）
      // 航路区画表示
      removeLayerFromMap(l_map.value, curSectionLinesStart);
      curSectionLinesStart = drawAirway(
        l_map.value,
        [selectedPolyLineData.startCoords[0], selectedPolyLineData.startCoords[1]],
        [chart.value.$curLandmark[0], chart.value.$curLandmark[1]]
      )
      removeLayerFromMap(l_map.value, curSectionLinesEnd);
      curSectionLinesEnd = drawAirway(
        l_map.value,
        [selectedPolyLineData.endCoords[0], selectedPolyLineData.endCoords[1]],
        [chart.value.$curLandmark[0], chart.value.$curLandmark[1]]
      )

      // 航路区画Icon表示
      removeLayerFromMap(l_map.value, curSectionIconObjStart);
      curSectionIconObjStart = drawAirwaySection(
        l_map.value,
        [selectedPolyLineData.startCoords[0], selectedPolyLineData.startCoords[1]],
        [chart.value.$curLandmark[0], chart.value.$curLandmark[1]],
        LDN_section_name_list[insertIdx]
      );
      removeLayerFromMap(l_map.value, curSectionIconObjEnd)
      curSectionIconObjEnd = drawAirwaySection(
        l_map.value,
        [selectedPolyLineData.endCoords[0], selectedPolyLineData.endCoords[1]],
        [chart.value.$curLandmark[0], chart.value.$curLandmark[1]],
        LDN_section_name_list[insertIdx+1]
      );
    }

    // ジャンクション設定
    const settingLandmark = async () => {
      const LDN_name_elem = landmarkNameInput;
      if (!LDN_name_elem || LDN_name_elem.value === '') {
        errorMsg.textContent = inputLandmarkNameErrorMsg;
        console.log(inputLandmarkNameErrorMsg);
        return;
      }
      settingFlag.value = true;
      if (!chart.value.$curLandmark || chart.value.$curLandmark.length === 0) {
        // 矩形を描いていない場合(デフォルトの場合)
        lat1 = step1.lat1
        lng1 = step1.lng1
        lat1Airway = step1.lat1Airway
        lng1Airway = step1.lng1Airway
        lat2 = step1.lat2
        lng2 = step1.lng2
        lat2Airway = step1.lat2Airway
        lng2Airway = step1.lng2Airway
        topHeight = step1.topHeight
        bottomHeight = step1.bottomHeight
      } else {
        const res = chart.value.$resCoords
        lat1 = res.lat1
        lng1 = res.lng1
        lat1Airway = res.lat1Airway
        lng1Airway = res.lng1Airway
        lat2 = res.lat2
        lng2 = res.lng2
        lat2Airway = res.lat2Airway
        lng2Airway = res.lng2Airway
        topHeight = res.topHeight
        bottomHeight = res.bottomHeight
      }
      const deviation = [
        [lat1, lng1, topHeight],
        [lat1, lng1, bottomHeight],
        [lat2, lng2, bottomHeight],
        [lat2, lng2, topHeight],
        [lat1, lng1, topHeight],
      ];
      const airway = [
        [lat1Airway, lng1Airway, topHeight - airwayMargin],
        [lat1Airway, lng1Airway, bottomHeight + airwayMargin],
        [lat2Airway, lng2Airway, bottomHeight + airwayMargin],
        [lat2Airway, lng2Airway, topHeight - airwayMargin],
        [lat1Airway, lng1Airway, topHeight - airwayMargin],
      ]
      const lnglatAirway = [
        [lng1Airway, lat1Airway, topHeight - airwayMargin],
        [lng1Airway, lat1Airway, bottomHeight + airwayMargin],
        [lng2Airway, lat2Airway, bottomHeight + airwayMargin],
        [lng2Airway, lat2Airway, topHeight - airwayMargin],
        [lng1Airway, lat1Airway, topHeight - airwayMargin],
      ]
      allCoordinates.splice(insertIdx + 1, isReopeningJunction ? 1 : 0, lnglatAirway);

      // 再表示用に確定した矩形情報を afterDraw が要求する形式で保存
      // { leftCrossPointDist, rightCrossPointDist, leftMaxHeight, leftMinHeight, rightMaxHeight, rightMinHeight }
      // x 位置 (dist1/dist2): newPoints.value に格納済み、高さ: 確定後の topHeight/bottomHeight を使用
      junctionReopenData[insertIdx + 1] = {
        start: curStart,
        end:   curEnd,
        dist:  curDist,
        intersectionCoords: curIntersectionCoords,
        savedRect: {
          leftCrossPointDist:  newPoints.value.leftCrossPointDist,
          rightCrossPointDist: newPoints.value.rightCrossPointDist,
          leftMaxHeight:  topHeight,
          leftMinHeight:  bottomHeight,
          rightMaxHeight: topHeight,
          rightMinHeight: bottomHeight,
        },
        LDN_name: landmarkNameInput?.value ?? '',
      };

      let Corridor_Point_JSON = {};
      Corridor_Point_JSON.LDN_name = LDN_name_elem.value;
      Corridor_Point_JSON.LDN_coordinates = deviation;
      Corridor_Point_JSON.LDN_airway_coordinates = airway;
      Corridor_Point_JSON.LDN_new = true;
      // corridor_points.push(Corridor_Point_JSON);
      // console.log(corridor_points)

      // 以下の処理は航路点追加時は不要(新規航路作成時に修正済みのため)
      // // 一個目の矩形のみ座標が逆回りになっているかチェックし修正する
      // // 二個目以降の断面図は進行方向に見る向きで揃えているのでずれない
      // if (corridor_points.length == 2) {
      //   corridor_points = checkAndFixCoordinates(corridor_points)
      // }

      const clearList = [
        curJunctionIcon,
        curSectionIconObjStart,
        curSectionIconObjEnd,
        curSectionLinesStart,
        curSectionLinesEnd,
        lineList,
        arrowList
      ]
      clearList.forEach(item => {
        removeLayerFromMap(l_map.value, item)
      });
      if (chart.value.$curLandmark && chart.value.$curLandmark.length !== 0) {
        // 矩形を描いた場合はデフォルトで追加したデータを置換
        viewCoordinates.splice(insertIdx+1, 1, chart.value.$curLandmark);
      }
      chart.value.$curLandmark = [];
      // 航路点追加確定 → 非表示フラグをリセット（drawMarkerPolyLine が配列を再構築するため）
      insertionOverlayHidden = false;
      // 航路・航路点・航路区画名表示
      drawMarkerPolyLine(viewCoordinates, LDN_section_name_list);
      resJSON.corridor_points.splice(insertIdx+1, isReopeningJunction ? 1 : 0, Corridor_Point_JSON);
      resJSON.corridor_sections = LDN_section_name_list;
      resJSON.determination_id = determinationId;
      resJSON.despersion_nodes = despersionNodes;
      emit('isJunctionSetting', true);
      sendData();
      isReopeningJunction = false; // 再編集モードをリセット
      // ダイアログを閉じる
      curLine.value = [];
      curIntersections.value = [];
      if (controlList.length > 0) {
        l_map.value.removeControl(controlList.pop());
      }
    }

    // 中間点に関するマーカー・ポリラインの削除
    const clearMiddleMarkerPolyline = () => {
      removePolyLayer(airwayPolyLines[insertIdx]);
      if (sectionIcons[insertIdx])      l_map.value.removeLayer(sectionIcons[insertIdx]);
      removePolyLayer(airwayPolyLines[insertIdx+1]);
      if (sectionIcons[insertIdx+1])    l_map.value.removeLayer(sectionIcons[insertIdx+1]);
      if (junctionMarkers[insertIdx+1]) l_map.value.removeLayer(junctionMarkers[insertIdx+1]);
    }

    // 中間点に関するマーカー・ポリラインの追加
    const addMiddleMarkerPolyline = () => {
      addPolyLayer(airwayPolyLines[insertIdx]);
      if (sectionIcons[insertIdx])      l_map.value.addLayer(sectionIcons[insertIdx]);
      addPolyLayer(airwayPolyLines[insertIdx+1]);
      if (sectionIcons[insertIdx+1])    l_map.value.addLayer(sectionIcons[insertIdx+1]);
      if (junctionMarkers[insertIdx+1]) l_map.value.addLayer(junctionMarkers[insertIdx+1]);
    }

    // マスクポリゴンをビューポートに合わせて作成/更新
    function updateMaskPolygon() {
      if (!l_map.value || InsideLatLangs.length === 0) return;
      // 現在のビューポートより十分大きい外側リングでSVGクリップ問題を回避
      const b = l_map.value.getBounds().pad(2);
      const outerRing = [
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getWest()],
        [b.getNorth(), b.getEast()],
        [b.getSouth(), b.getEast()],
      ];
      if (maskPolygon) {
        maskPolygon.setLatLngs([outerRing, InsideLatLangs]);
      } else {
        maskPolygon = L.polygon([outerRing, InsideLatLangs], {
          color: PolygonOptions.color,
          opacity: PolygonOptions.opacity,
          fillOpacity: PolygonOptions.fillOpacity,
          interactive: false,
        }).addTo(l_map.value);
      }
    }

    // クリアボタン押下時の処理
    const clearSetting = () => {
      curLine.value = [];
      curIntersections.value = [];
      despersionNodes = [];
      lines.value = [];
      corridor_points = [];
      chart.value.$curLandmark = [];
      LDN_section_name_list = [];
      clickPolyLineFlg = false;
      const clearList = [
        curJunctionIcon,
        curSectionLinesStart,
        curSectionLinesEnd,
        curSectionIconObjStart,
        curSectionIconObjEnd,
        clickIconList,
        lineList,
        arrowList,
        airwayPolyLines,
        junctionMarkers,
        sectionIcons,
      ]
      clearList.forEach(item => {
        removeLayerFromMap(l_map.value, item)
      });
      removeControlFromMap(l_map.value, controlList);
      resJSON = {};
      initDraw();
      emit('update-data', resJSON);
      emit('isJunctionSetting', false);
      if (div1.value) {
        div1.value.remove();
      }
    }

    // [lng, lat]
    // 座標間の距離計算
    function distanceCalculation(a, b) {
      const p1 = turf.point(a)
      const p2 = turf.point(b)
      const result = turf.distance(p1, p2, { units: 'meters' })
      return result
    }

    // 左上・右上座標と高さ取得
    function getLeftRight(coordsTmp: Array<number>[]) : {} {
      const coords = JSON.parse(JSON.stringify(coordsTmp));
      if (coords.length !== 5) {
        console.log("getLeftTopRightTop() failed.")
        return { leftTop: null, rightTop: null };
      }
      // 最後の要素は重複部分のため削除
      coords.pop();
      // 高さ(z)が最大の要素を抽出すると左上 or 右上の座標2つが残る
      const height = coords.map(subArr => subArr[subArr.length - 1]);
      const maxHeight = Math.max(...height);
      const minHeight = Math.min(...height);
      // 座標を2つに絞る
      const result = coords.filter(subArr => subArr[subArr.length - 1] === maxHeight);
      // 経度比較
      if (result[0][0] > result[1][0]) {
        return { left: result[1], right: result[0], minHeight: minHeight, maxHeight: maxHeight };
      } else {
        return { left: result[0], right: result[1], minHeight: minHeight, maxHeight: maxHeight };
      }
    }

    // 切断面計算
    // TODO APIで計算する予定
    function calcCrossSection(start, end, line, intersections) {
      // クリックした2点を結ぶ線と四角形の左上を結んだ線の交点の座標
      const leftLine = turf.lineString([
        [start.left[0], start.left[1]],
        [end.left[0], end.left[1]]
      ])
      const leftCrossPoint = turf.lineIntersect(line, leftLine);
      // クリックした2点を結ぶ線と四角形の右上を結んだ線の交点座標
      const rightLine = turf.lineString([
        [start.right[0], start.right[1]],
        [end.right[0], end.right[1]]
      ])
      const rightCrossPoint = turf.lineIntersect(line, rightLine);
      // 左上・右上同士の距離
      const leftDist = distanceCalculation(
        [start.left[1], start.left[0]],
        [end.left[1], end.left[0]]
      );
      const rightDist = distanceCalculation(
        [start.right[1], start.right[0]],
        [end.right[1], end.right[0]]
      );
      // 既存の航路 と左上交点の距離
      const leftCrossPointDist = distanceCalculation(
        [start.left[1], start.left[0]],
        [leftCrossPoint.features[0].geometry.coordinates[1], leftCrossPoint.features[0].geometry.coordinates[0]]
      );
      // 既存の航路 と右上交点の距離
      const rightCrossPointDist = distanceCalculation(
        [start.right[1], start.right[0]],
        [rightCrossPoint.features[0].geometry.coordinates[1], rightCrossPoint.features[0].geometry.coordinates[0]]
      );
      if (start.maxHeight < end.maxHeight) {
        topHeight = start.maxHeight + leftCrossPointDist / leftDist * Math.abs(start.maxHeight - end.maxHeight);
        bottomHeight = start.minHeight + leftCrossPointDist / leftDist * Math.abs(start.minHeight - end.minHeight);
      } else {
        topHeight = start.maxHeight - leftCrossPointDist / leftDist * Math.abs(start.maxHeight - end.maxHeight); 
        bottomHeight = start.minHeight - leftCrossPointDist / leftDist * Math.abs(start.minHeight - end.minHeight); 
      }
      // クリックした2点を結ぶ線と最大落下範囲の交点とリックした2点を結ぶ線と四角形(start, end)の左上を結んだ線の交点との距離
      const dist1 = distanceCalculation(
        [intersections[0][1], intersections[0][0]],
        [leftCrossPoint.features[0].geometry.coordinates[0], leftCrossPoint.features[0].geometry.coordinates[1]]
      );
      // クリックした2点を結ぶ線と最大落下範囲の交点とリックした2点を結ぶ線と四角形(start, end)の右上を結んだ線の交点との距離
      const dist2 = distanceCalculation(
        [intersections[0][1], intersections[0][0]],
        [rightCrossPoint.features[0].geometry.coordinates[0], rightCrossPoint.features[0].geometry.coordinates[1]]
      );

      newPoints.value = {
        leftCrossPointDist: dist1,
        leftMinHeight: bottomHeight,
        leftMaxHeight: topHeight,
        rightCrossPointDist: dist2,
        rightMinHeight: bottomHeight,
        rightMaxHeight: topHeight,
      }

      return { dist1, dist2 }
    }

    // 子から親へ値を渡す
    const sendData = () => {
      // resJSONが空でないことをチェック
      if (Object.keys(resJSON).length > 0) {
        console.log("Emitting data to parent: ", resJSON);
        emit('update-data', resJSON);
      } else {
      }
    }

    return {
      sendData,
      settingLandmark,
      clearSetting,
      map_moveend,
      MapLayerControlMounted,
      l_map
    };
  },
  methods: {
    // 天候情報の変更完了ハンドラ
    handleWeatherChanged(changeed) {
      console.log(`map_moveend: ${this.map_moveend}.`);
      console.log(`Weather_Changeed: ${changeed}`);
      this.map_moveend = false;
    },
    // MapLayerControl Mounted 完了ハンドラ
    handleMapLayerControlMounted(Mounted) {
      console.log(`MapLayerControl_Mounted: ${Mounted}`);
      this.MapLayerControlMounted = false;
      console.log(`MapLayerControl_Mounted: ${this.MapLayerControlMounted}`);
    },
  }
};
</script>

<style>
#createJunctionMap {
  width: 100%;
  height: 100%;
  /* z-index を削除してスタッキングコンテキストを解消し、
     Leaflet コントロール（高度・幅設定ダイアログ）が他の UI より
     手前に表示されるようにする */
}
.grayscale-map .leaflet-tile {
  filter: grayscale(100%);
}
.custom-control {
  position: absolute;
  left: 10px;
  bottom: 50px;
  width: 30dvh;
  height: 50dvh;
  background-color: #FFFFFF;
  border: 1px solid #000;
  /* 凡例・削除・禁止エリア・地図レイヤーUI（z-index: 1000）より手前に表示 */
  z-index: 1001;
}
.control-window {
  display: flex;
}
.area-control {
  position: absolute;
  top: 20px;
  right: 200px;
  /* Leaflet コントロールペイン（z-index:1000）より低くして
     高度・幅設定ダイアログが最前面になるようにする */
  z-index: 999;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0;
  padding: 10px;
  text-align: center;
  border-width: 1px;
  border-style: solid;
  border-color: #000000;
  background-color: #FFFFFF;
}
.layer-control-top-right {
  position: absolute;
  top: 0px;
  right: 20px;
  z-index: 999;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0;
  padding: 10px;
}
.LDN_Setting {
  padding-top: 10px;
  padding-left: 30px;
  display: flex;
  flex-direction: row;
}
.legend-bottom-left {
  position: absolute;
  bottom: 20px;
  left: 10px;
  z-index: 999;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0;
  padding: 10px;
}
</style>