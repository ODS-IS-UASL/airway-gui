<template>
  <div id="createAirwayMap" style="height: 70dvh; position: relative;"></div> 
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
    aircrafts: {
      type: Array,
      required: true,
    }
  },
  setup(props, { emit }) {
    let selectedMaxFallRangeCoordListInit = ref<[number, number][]>([]);
    const selectedMaxFallRangeCoords = ref(selectedMaxFallRangeCoordListInit);
    let maskPolygon = null; // 最大落下範囲グレーマスクポリゴン（ズーム追従のため動的更新）
    let lineWeight = 13;
    const l_map = ref<any>(null);
    let map_moveend = ref(false);
    const centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
    const zoomInit = 18;
    const geoJson = ref(null);
    const lines = ref<[number, number][][]>([]); // 描画する全ての線
    const landmarkNumbers = ref<[number, number][][]>([]); // ジャンクションの番号を置く座標のリスト
    const settingFlag = ref(false); // 設定ボタン押下フラグ
    const curLine = ref<[number, number][]>([]);
    const curIntersections = ref<[number, number][]>([]);
    const curJunctionIcon = ref(null);
    const curSectionLine = ref(null);
    const curSectionIconObj = ref(null);
    let airwayMargin = 10; // 航路と逸脱範囲の隙間 (MVP2では 1m固定)
    let aircraftLength = 0; // 機体長(m)
    let lineWeight_i = 45;
    let lineWeight_o = 53;
    let determinationId;
    let parabolaCoordsTmp = [];
    let LDN_section_name_list = []; // 航路区間名リスト
    let curSectionName = ""; // 航路区間名
    const PolygonLatLngList = [];
    const OuterLatLangs = [[-90,-180],[-90,180],[90,180],[90,-180]];
    const InsideLatLangs = [];
    const PolygonOptions = {
      opacity:0,
      fillOpacity:0.6,
      color:"#D3D3D3"
    };
    let LandmarkIndex = 0;
    let errorMsg;
    let landmarkNameInput; // getElementByIdの代わりに直接参照を保持
    let LandmarkIconList = [];
    let sectionIconList = [];
    let clickIconList = [];
    let lineList = [];
    let sectionLineList = [];
    let controlList = [];
    let loadingControl = null; // 地形データ取得中ローディングコントロール
    let arrowList = [];
    let curSectionLineReopenPrev = null; // re-edit時: 直前区間の代替航路ライン
    let curSectionLineReopenNext = null; // re-edit時: 後区間の代替航路ライン
    // 航路点再編集用
    let curStart = null;            // makeGraphData へ渡す start
    let curEnd = null;              // makeGraphData へ渡す end
    let curDist = 0;                // makeGraphData へ渡す dist
    let curIntersectionCoords = []; // makePlugins へ渡す intersectionCoords
    const junctionReopenData = {}; // { [markerIdx]: { start, end, dist, intersectionCoords, savedRect, LDN_name } }
    let isReopeningJunction = false; // 既存航路点の再編集モードフラグ
    let reopenIdx = -1;             // 再編集対象の LandmarkIconList/corridor_points インデックス
    let savedLandmarkIndex = 0;     // 再編集中の LandmarkIndex バックアップ
    const newPoints = ref({});      // 再編集時の初期矩形データ (initialRectData として dragPlugin へ渡す)
    let corridor_points = [];
    let despersionNodes = [];
    let resJSON = {};
    const MapLayerControlMounted = ref(true);
    const chartCanvas = ref(null);
    const chart = ref(null);
    const div1 = ref(null);

    const setMarker = async (event) => {
      // 高度幅設定ダイアログ表示中はマップクリックを無視
      if (controlList.length > 0) return;
      // ランドマーク設定
      if (curJunctionIcon.value !== null) {
        console.log("settingLandmark() execute.");
        settingLandmark();
      } else {
        console.log("settingLandmark() not execute.");
      }

      if (curLine.value.length == 2) {
        if (settingFlag.value) { // 正しく設定されている場合
          removeControlFromMap(l_map.value, controlList)
          curLine.value = [];
          curIntersections.value = [];
          settingFlag.value = false;
        } else { // 正しく設定されていない場合
          console.log("断面図が正しく設定されていません。");
          return;
        }
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
        // 交点取得
        const intersections = getIntersection(curLine.value, selectedMaxFallRangeCoords.value);
        if (intersections.length === 2) {
          // 交点の左右の決定
          // const ret = calcIntersections(intersections, landmarkNumbers.value[landmarkNumbers.value.length - 1]);
          const ret = determineIntersectionDirection(
            [intersections[0][1], intersections[0][0]],
            [intersections[1][1], intersections[1][0]],
            landmarkNumbers.value[landmarkNumbers.value.length - 1]
          );
          const start = ret.start
          const end = ret.end
          const dist = ret.dist
          const intersectionCoords = [[start[1], start[0]], [end[1], end[0]]];
          // 航路点再編集用にダイアログ情報を保存
          curStart = start;
          curEnd = end;
          curDist = dist;
          curIntersectionCoords = intersectionCoords;
          // グラフ作成時は次へ進めないようにする
          emit('isJunctionSetting', false);
          // グラフ作成用データ作成
          console.log(geoJson.value)
          showLoadingControl();
          const data = await makeGraphData(despersionNodes, determinationId, geoJson.value, start, end, dist);
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
          LandmarkIndex = LandmarkIndex + 1;
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
      
      l_map.value = markRaw(L.map('createAirwayMap', {
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

      /* 指定された最大落下範囲を特定 */
      let rangeId = props.message;

      // 最大落下範囲取得
      const rangeRes = await $fetch('/api/airway/max-fall-range', { 
        method: 'GET',
        query: { businessNumber: useRuntimeConfig().public.businessNumber }
      });
      if (rangeRes.status != 200) {
        console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
        return;
      }
      const rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);
      const selectedFallToleranceRangeId = rangeData['fallToleranceRanges'].find(item => item.fallToleranceRangeId === props.message)
      if (selectedFallToleranceRangeId['geometry']['coordinates'].length > 0) {
        selectedFallToleranceRangeId['geometry']['coordinates'][0].forEach((coord) => {
          selectedMaxFallRangeCoords.value.push([coord[1], coord[0]]);
          InsideLatLangs.push([coord[1], coord[0]]);
        })
      }
      PolygonLatLngList.push(OuterLatLangs);
      PolygonLatLngList.push(InsideLatLangs);
      if (InsideLatLangs && InsideLatLangs.length > 0) {
        // マップコンテナサイズを再計算（遷移アニメーション後の表示崩れ防止）
        l_map.value.invalidateSize();
        l_map.value.fitBounds(InsideLatLangs);

        // 最大落下範囲が広いと細かい操作ができないため、ズームレベルを1上げる
        const zoomLevel = l_map.value.getZoom();
        l_map.value.setZoom(zoomLevel + 1);
      } else {
      }

      drawAirLine(l_map.value, "uasl-list");

      // ポリラインを追加
      lines.value.forEach((line) => {
        L.polyline(line, { color: "#000000", weight: lineWeight }).addTo(l_map.value);
      });

      // マスクポリゴンを追加（ズームに追従して外側リングを動的更新）
      updateMaskPolygon();

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
      const optionCallbacks = {}
      let prevCoords = [];
      if (resJSON.corridor_points && resJSON.corridor_points.length > 0) {
        const i = resJSON.corridor_points.length - 1;
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
        initialRectData: newPoints, // 再編集時に保存済み矩形を初期表示
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

    // drawAirway が返す [polyOuter, polyInner] を安全に地図除去（参照配列は保持）
    function removePolyFromMap(layerOrArray) {
      if (Array.isArray(layerOrArray)) {
        layerOrArray.forEach(layer => { if (layer) l_map.value.removeLayer(layer); });
      } else if (layerOrArray) {
        l_map.value.removeLayer(layerOrArray);
      }
    }
    // drawAirway が返す [polyOuter, polyInner] を安全に地図追加
    function addPolyToMap(layerOrArray) {
      if (Array.isArray(layerOrArray)) {
        layerOrArray.forEach(layer => { if (layer) layer.addTo(l_map.value); });
      } else if (layerOrArray) {
        layerOrArray.addTo(l_map.value);
      }
    }

    function initDragPolylineMarker() {
      // 再編集モードで非表示にした確定済みレイヤーを復元
      if (isReopeningJunction) {
        if (reopenIdx > 0 && sectionLineList[reopenIdx - 1]) {
          addPolyToMap(sectionLineList[reopenIdx - 1]);
        }
        if (reopenIdx < landmarkNumbers.value.length - 1 && sectionLineList[reopenIdx]) {
          addPolyToMap(sectionLineList[reopenIdx]);
        }
        // 隠していた確定済みマーカーを非アクティブアイコンで復元
        if (LandmarkIconList[reopenIdx]) {
          LandmarkIconList[reopenIdx].addTo(l_map.value);
          LandmarkIconList[reopenIdx].setIcon(L.divIcon({
            className: '',
            html: svgTemplate(reopenIdx + 1, 33, 33),
            iconSize: [33, 33],
            iconAnchor: [17, 17],
          }));
        }
      }
      // 再編集用の一時区間ラインをクリア
      removePolyFromMap(curSectionLineReopenPrev);
      curSectionLineReopenPrev = null;
      removePolyFromMap(curSectionLineReopenNext);
      curSectionLineReopenNext = null;
      removeLayerFromMap(l_map.value, curSectionLine.value);
      removeLayerFromMap(l_map.value, curSectionIconObj.value);
      removeLayerFromMap(l_map.value, curJunctionIcon.value);
    }

    function drawJunctionIcon() {
      // ジャンクションIconセット
      let iconSizeW = 33;
      let iconSizeH = 33;
      let sectionIcon = L.divIcon({
        className: '',
        html: svgTemplateNumber(LandmarkIndex, iconSizeW, iconSizeH),
        iconSize: [iconSizeW, iconSizeH],
        iconAnchor: [Math.round(iconSizeW / 2), Math.round(iconSizeH / 2)],
      });
      if (curJunctionIcon.value !== null) {
        l_map.value.removeLayer(curJunctionIcon.value);
      }
      curJunctionIcon.value = markRaw(L.marker([chart.value.$curLandmark[0], chart.value.$curLandmark[1]], { icon: sectionIcon }).addTo(l_map.value));
      return;
    }

    // 確定済み航路点マーカークリック → 高度幅ダイアログを再表示して再編集
    function onClickJunctionMarker(markerIdx) {
      return async function(e) {
        const d = junctionReopenData[markerIdx];
        if (!d) return;
        L.DomEvent.stopPropagation(e); // Leafletイベントのバブリングを停止
        // 高度幅設定ダイアログ表示中は航路点クリックを無視
        if (controlList.length > 0) return;

        isReopeningJunction = true;
        reopenIdx = markerIdx;
        savedLandmarkIndex = LandmarkIndex;         // 現在の LandmarkIndex を退避
        LandmarkIndex = markerIdx;                  // createChartWindow のダイアログ番号用 (markerIdx+1 を表示)

        curStart              = d.start;
        curEnd                = d.end;
        curDist               = d.dist;
        curIntersectionCoords = d.intersectionCoords;
        // 保存済み矩形を initialRectData として設定
        newPoints.value = d.savedRect ? { ...d.savedRect } : {};

        // クリック直後: 既存マーカーを隠し、同位置にアクティブアイコンを表示
        if (LandmarkIconList[markerIdx]) {
          const pos = LandmarkIconList[markerIdx].getLatLng();
          l_map.value.removeLayer(LandmarkIconList[markerIdx]);
          if (curJunctionIcon.value !== null) {
            l_map.value.removeLayer(curJunctionIcon.value);
          }
          curJunctionIcon.value = markRaw(L.marker([pos.lat, pos.lng], {
            icon: L.divIcon({
              className: '',
              html: svgTemplateNumber(markerIdx + 1, 33, 33),
              iconSize: [33, 33],
              iconAnchor: [17, 17],
            })
          }).addTo(l_map.value));
        }

        emit('isJunctionSetting', false);

        showLoadingControl();
        const data = await makeGraphData(despersionNodes, determinationId, geoJson.value, d.start, d.end, d.dist);
        removeLoadingControl();
        if (!data) {
          isReopeningJunction = false;
          LandmarkIndex = savedLandmarkIndex;
          reopenIdx = -1;
          newPoints.value = {};
          // API失敗: アクティブアイコンを削除して既存マーカーを復元
          if (curJunctionIcon.value) {
            l_map.value.removeLayer(curJunctionIcon.value);
            curJunctionIcon.value = null;
          }
          if (LandmarkIconList[markerIdx]) {
            LandmarkIconList[markerIdx].addTo(l_map.value);
          }
          emit('isJunctionSetting', true);
          return;
        }

        await createChartWindow(l_map.value);

        // createChartWindow 後: drawJunctionIcon が正しいアイコン番号を使うよう +1
        LandmarkIndex = markerIdx + 1;

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

        // 名前入力欄に保存済み名を復元
        if (landmarkNameInput) landmarkNameInput.value = d.LDN_name;

        // LR線・矢印を再描画
        drawLineLR(l_map.value, d.start, d.end, lineList, arrowList);
      };
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
          const elements = createChartWindowDom(LandmarkIndex + 1);
          div1.value = elements.container;
          chartCanvas.value = elements.chartCanvas;
          errorMsg = elements.errorMsg;
          landmarkNameInput = elements.inputElement;
          l_map.value = markRaw(map);

          // 保存ボタン: 航路点を確定
          elements.saveButton.addEventListener('click', () => {
            settingLandmark();
          });

          // ×ボタン: 新規→ロールバック / 再編集→ダイアログを閉じて元状態を保持
          elements.cancelButton.addEventListener('click', () => {
            // チャートリセット
            if (chart.value && chart.value.dragData) {
              chart.value.dragData.rect = null;
              chart.value.dragData.isEditing = false;
              chart.value.$curLandmark = [];
              chart.value.update();
            }
            initDragPolylineMarker();
            // 直前のLR線を地図から削除 (lineList: 1件, arrowList: L+Rの2件)
            if (lineList.length > 0) {
              l_map.value.removeLayer(lineList.pop());
            }
            for (let i = 0; i < 2 && arrowList.length > 0; i++) {
              l_map.value.removeLayer(arrowList.pop());
            }
            if (isReopeningJunction) {
              // 再編集キャンセル: LandmarkIndex を元に戻してダイアログを閉じる
              // キャンセル時: アクティブ→非アクティブアイコンに戻す
              if (LandmarkIconList[reopenIdx]) {
                LandmarkIconList[reopenIdx].setIcon(L.divIcon({
                  className: '',
                  html: svgTemplate(reopenIdx + 1, 33, 33),
                  iconSize: [33, 33],
                  iconAnchor: [17, 17],
                }));
              }
              isReopeningJunction = false;
              LandmarkIndex = savedLandmarkIndex;
              reopenIdx = -1;
              newPoints.value = {};
              emit('isJunctionSetting', true);
            } else {
              // 新規追加キャンセル
              removeLayerFromMap(l_map.value, clickIconList);
              if (lines.value.length > 0) lines.value.pop();
              LandmarkIndex = Math.max(0, LandmarkIndex - 1);
            }
            curLine.value = [];
            curIntersections.value = [];
            if (errorMsg) errorMsg.textContent = '';
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
      if (isReopeningJunction) {
        // 再編集モード: 確定済み区間を非表示にして前後の代替区間を描画
        if (reopenIdx > 0 && sectionLineList[reopenIdx - 1]) {
          removePolyFromMap(sectionLineList[reopenIdx - 1]);
        }
        if (reopenIdx < landmarkNumbers.value.length - 1 && sectionLineList[reopenIdx]) {
          removePolyFromMap(sectionLineList[reopenIdx]);
        }
        // 通常モードで誤って描かれた区間があれば除去
        removeLayerFromMap(l_map.value, curSectionLine.value);
        curSectionLine.value = null;
        // 前区間: 直前ジャンクション → ドラッグ位置
        if (reopenIdx > 0) {
          removePolyFromMap(curSectionLineReopenPrev);
          curSectionLineReopenPrev = drawAirway(
            l_map.value,
            [landmarkNumbers.value[reopenIdx - 1][0], landmarkNumbers.value[reopenIdx - 1][1]],
            [chart.value.$curLandmark[0], chart.value.$curLandmark[1]]
          );
        }
        // 後区間: ドラッグ位置 → 次ジャンクション（存在する場合）
        if (reopenIdx < landmarkNumbers.value.length - 1) {
          removePolyFromMap(curSectionLineReopenNext);
          curSectionLineReopenNext = drawAirway(
            l_map.value,
            [chart.value.$curLandmark[0], chart.value.$curLandmark[1]],
            [landmarkNumbers.value[reopenIdx + 1][0], landmarkNumbers.value[reopenIdx + 1][1]]
          );
        }
        return;
      }
      // 通常モード: ランドマークが一つの時は接続不可
      if (landmarkNumbers.value.length < 1) {
        return;
      }
      const i = landmarkNumbers.value.length -1;
      curSectionName = `A-${i+1}`;
      // 航路区画表示
      removeLayerFromMap(l_map.value, curSectionLine.value);
      curSectionLine.value = markRaw(drawAirway(
        l_map.value,
        [landmarkNumbers.value[i][0], landmarkNumbers.value[i][1]],
        [chart.value.$curLandmark[0], chart.value.$curLandmark[1]]
      ))

      // 航路区画Icon表示
      removeLayerFromMap(l_map.value, curSectionIconObj.value);
      curSectionIconObj.value = markRaw(drawAirwaySection(
        l_map.value,
        [landmarkNumbers.value[i][0], landmarkNumbers.value[i][1]],
        [chart.value.$curLandmark[0], chart.value.$curLandmark[1]],
        curSectionName
      ))
    }

    // ジャンクション設定
    const settingLandmark = async () => {
      const LDN_name_elem = landmarkNameInput;
      if (!LDN_name_elem || LDN_name_elem.value === '') {
        errorMsg.textContent = '航路点名を入力してください。';
        console.log("航路点名を入力してください。");
        return;
      }
      // 矩形が描かれた場合
      if (chart.value.$curLandmark && chart.value.$curLandmark.length !== 0) {
        const res = chart.value.$resCoords
        settingFlag.value = true;
        const deviation = [
          [res.lat1, res.lng1, res.topHeight],
          [res.lat1, res.lng1, res.bottomHeight],
          [res.lat2, res.lng2, res.bottomHeight],
          [res.lat2, res.lng2, res.topHeight],
          [res.lat1, res.lng1, res.topHeight],
        ];
        const airway = [
          [res.lat1Airway, res.lng1Airway, res.topHeight - airwayMargin],
          [res.lat1Airway, res.lng1Airway, res.bottomHeight + airwayMargin],
          [res.lat2Airway, res.lng2Airway, res.bottomHeight + airwayMargin],
          [res.lat2Airway, res.lng2Airway, res.topHeight - airwayMargin],
          [res.lat1Airway, res.lng1Airway, res.topHeight - airwayMargin],
        ]

        let Corridor_Point_JSON = {};
        Corridor_Point_JSON.LDN_name = LDN_name_elem.value;
        Corridor_Point_JSON.LDN_coordinates = deviation;
        Corridor_Point_JSON.LDN_airway_coordinates = airway;

        if (isReopeningJunction) {
          // 再編集モード: 既存エントリを更新
          corridor_points[reopenIdx] = Corridor_Point_JSON;
          // マーカーを差し替え
          if (LandmarkIconList[reopenIdx]) {
            l_map.value.removeLayer(LandmarkIconList[reopenIdx]);
          }
          LandmarkIconList[reopenIdx] = curJunctionIcon.value;
          curJunctionIcon.value = null;
          // 確定後: アクティブ→非アクティブアイコンに切り替え
          LandmarkIconList[reopenIdx].setIcon(L.divIcon({
            className: '',
            html: svgTemplate(reopenIdx + 1, 33, 33),
            iconSize: [33, 33],
            iconAnchor: [17, 17],
          }));
          // 新マーカーにクリックハンドラを再登録（差し替え後も再編集可能にする）
          LandmarkIconList[reopenIdx].on('click', onClickJunctionMarker(reopenIdx));
          const _rectR = chart.value?.dragData?.rect;
          const _scalesR = chart.value?.scales;
          if (_rectR && _scalesR) {
            junctionReopenData[reopenIdx].savedRect = {
              leftCrossPointDist:  _scalesR.x.getValueForPixel(_rectR.x),
              rightCrossPointDist: _scalesR.x.getValueForPixel(_rectR.x + _rectR.width),
              leftMaxHeight:  res.topHeight,
              leftMinHeight:  res.bottomHeight,
              rightMaxHeight: res.topHeight,
              rightMinHeight: res.bottomHeight,
            };
          }
          junctionReopenData[reopenIdx].LDN_name = LDN_name_elem.value;
          newPoints.value = {}; // 再編集完了後にリセット
          // LandmarkIndex を元に戻す
          LandmarkIndex = savedLandmarkIndex;
          // 確定済みジャンクション位置を更新（次回再編集時の隣接計算に必要）
          if (chart.value.$curLandmark && chart.value.$curLandmark.length !== 0) {
            landmarkNumbers.value[reopenIdx] = [...chart.value.$curLandmark];
          }
          // 再編集で描いた代替区間ラインを sectionLineList に格納
          if (curSectionLineReopenPrev !== null) {
            if (reopenIdx > 0) sectionLineList[reopenIdx - 1] = curSectionLineReopenPrev;
            curSectionLineReopenPrev = null;
          }
          if (curSectionLineReopenNext !== null) {
            sectionLineList[reopenIdx] = curSectionLineReopenNext;
            curSectionLineReopenNext = null;
          }
          isReopeningJunction = false;
          reopenIdx = -1;
        } else {
          // 通常モード: corridor_points・LandmarkIconList 等に追加
          landmarkNumbers.value.push([...chart.value.$curLandmark]);
          corridor_points.push(Corridor_Point_JSON);

          // 一個目の矩形のみ座標が逆回りになっているかチェックし修正する
          // 二個目以降の断面図は進行方向に見る向きで揃えているのでずれない
          if (corridor_points.length == 2) {
            corridor_points = checkAndFixCoordinates(corridor_points)
          }

          LandmarkIconList.push(curJunctionIcon.value);
          // 確定後: アクティブ→非アクティブアイコンに切り替え
          LandmarkIconList[LandmarkIconList.length - 1].setIcon(L.divIcon({
            className: '',
            html: svgTemplate(LandmarkIndex, 33, 33),
            iconSize: [33, 33],
            iconAnchor: [17, 17],
          }));
          sectionIconList.push(curSectionIconObj.value);
          // 確定した区間ラインを sectionLineList に保存（再編集時の非表示/復元に使用）
          if (curSectionLine.value) sectionLineList.push(curSectionLine.value);
          curJunctionIcon.value = null;
          curSectionLine.value = null;
          curSectionIconObj.value = null;
          // データ送信
          if (curSectionName !== "") {
            // 航路点が1つの場合空となるため
            LDN_section_name_list.push(curSectionName);
          }
          curSectionName = "";

          // 確定した航路点マーカーにクリックで再編集できるよう登録
          const markerIdx = LandmarkIconList.length - 1;
          // chart のスケールから矩形の X データ値 (距離) を取得して savedRect を構成
          const _rect = chart.value?.dragData?.rect;
          const _scales = chart.value?.scales;
          const savedRect = (_rect && _scales) ? {
            leftCrossPointDist:  _scales.x.getValueForPixel(_rect.x),
            rightCrossPointDist: _scales.x.getValueForPixel(_rect.x + _rect.width),
            leftMaxHeight:  res.topHeight,
            leftMinHeight:  res.bottomHeight,
            rightMaxHeight: res.topHeight,
            rightMinHeight: res.bottomHeight,
          } : null;
          junctionReopenData[markerIdx] = {
            start: curStart,
            end:   curEnd,
            dist:  curDist,
            intersectionCoords: curIntersectionCoords,
            savedRect,
            LDN_name: LDN_name_elem.value,
          };
          LandmarkIconList[markerIdx].on('click', onClickJunctionMarker(markerIdx));
        }

        resJSON.corridor_points = corridor_points;
        resJSON.corridor_sections = LDN_section_name_list;
        resJSON.determination_id = determinationId;
        resJSON.despersion_nodes = despersionNodes;
        
        removeLayerFromMap(l_map.value, arrowList);
        // ダイアログを閉じて次の航路点入力へ
        settingFlag.value = false;
        curLine.value = [];
        curIntersections.value = [];
        if (controlList.length > 0) {
          l_map.value.removeControl(controlList.pop());
        }
        // ジャンクションを結ぶ線が1つ以上(ジャンクションが2つ以上)設定されている場合のみデータ送信
        if (0 < LDN_section_name_list.length) {
          sendData();
          emit('isJunctionSetting', true);
        }
      }
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
      landmarkNumbers.value = [];
      corridor_points = [];
      LandmarkIndex = 0;
      LDN_section_name_list = [];
      isReopeningJunction = false;
      reopenIdx = -1;
      savedLandmarkIndex = 0;
      Object.keys(junctionReopenData).forEach(k => delete junctionReopenData[k]);
      newPoints.value = {};
      const clearList = [
        curJunctionIcon.value,
        curSectionLine.value,
        curSectionIconObj.value,
        LandmarkIconList,
        sectionIconList,
        clickIconList,
        lineList,
        sectionLineList,
        arrowList,
      ]
      clearList.forEach(item => {
        removeLayerFromMap(l_map.value, item)
      });
      removeControlFromMap(l_map.value, controlList)
      resJSON = {};
      emit('update-data', resJSON);
      emit('isJunctionSetting', false);
      if (div1.value) {
        div1.value.remove();
      }
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
    }
  }
};
</script>

<style>
#createAirwayMap {
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