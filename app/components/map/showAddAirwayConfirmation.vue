<template>
  <div id="map" style="height: 100%;">
    <div class="area-control-top-right">
      <MapProhibitedAreaControl :map="map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :stepNo="stepNo" :map="map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div> 
    <div class="area-control-bottom-left">
      <MapLegend />
    </div>
  </div>
</template>

<script>
// 必要なモジュールをインポート
import 'leaflet/dist/leaflet.css';
import { ref, onMounted } from 'vue'; // Vue 3 の Composition API
import MapLayerControl from '../mapLayerControl.vue';
import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';
import { unionFallToleranceRanges, searchPolygonWithin } from '~/utils/airway'
import iconUrl from "../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg";

export default {
  components: {
    MapLayerControl,
    MapProhibitedAreaControl,
  },
  props: {
    corridorData: {
      type: Object,
      required: true,
    },
    message: {
      type: String,
      required: true
    },
    stepNo: {
      type: String,
      required: true,
    },
    source: {
      type: Object,
      required: true
    },
    target: {
      type: Object,
      required: true
    },
    errorSectionIndex: {
      type: Number,
      default: -1,
    },
    contactCoordinates: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const map = ref(null);  // 地図インスタンス
    const map_moveend = ref(false);
    let L;
    let markerListInit = [[null, null]];
    let markerCountInit = 0;
    const markerList = ref(markerListInit);
    const markerCount = ref(markerCountInit);
    const PolygonLatLngList = [];
    const OuterLatLangs = [[-90,-180],[-90,180],[90,180],[90,-180]];
    const InsideLatLangs = [];
    const PolygonOptions = {
      opacity:0,
      fillOpacity:0.6,
      color:"#D3D3D3"
    };

    const MapLayerControlMounted = ref(true);
    const stepNo = ref(props.stepNo);

    // 地図を描画する非同期関数
    const renderMap = async (data) => {
      if (process.client) {  // クライアントサイドでのみ実行
        // Leaflet モジュールを非同期でインポート
        const leafletModule = await import('leaflet');
        L = leafletModule.default;

        // 地図を初期化
        map.value = L.map('map', {
          scrollWheelZoom: false,  // ホイールズームを無効化
        });

        map.value.zoomControl.setPosition('topleft');
        
        // OpenStreetMapのタイルレイヤーを追加
        L.tileLayer(
          useRuntimeConfig().public.mapTileUrl,
          {
            className: "grayscale-map",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
          }
        ).addTo(map.value);

        // 地図にポリラインを描画
        // 接続元航路
        if (props.source.length > 0) {
          L.polyline(props.source, {
            color: 'blue',
            weight: 35,
            opacity: 1,
          }).addTo(map.value);
        }
        // 接続先航路
        if (props.target.length > 0) {
          L.polyline(props.target, {
            color: 'red',
            weight: 35,
            opacity: 1,
          }).addTo(map.value);
        }
        
        const icon = L.icon({
          iconUrl,
          iconSize: [40, 40],
        });
        // 接続元のマーカーを追加
        for (let i=0; i<props.source.length; i++) {
          console.log(props.source[i])
          L.marker([props.source[i][0], props.source[i][1]], { icon }).addTo(map.value);
        }
        // 接続先のマーカーを追加
        for (let i=0; i<props.target.length; i++) {
          L.marker([props.target[i][0], props.target[i][1]], { icon }).addTo(map.value);
        }

        // 座標を格納するリスト
        const polyline = calcPolylineCoordinates(data);

        // 地図をズームして範囲を調整
        if (polyline.length > 0) {
          map.value.fitBounds(polyline);
        }

        // 地図にポリラインを描画
        if (polyline.length > 0) {
          L.polyline(polyline, airwayOptions).addTo(map.value);
          L.polyline(polyline, airwayInnerOptions).addTo(map.value);
        }

        // エラーセクションを赤でハイライト（青いデザインと同じ二重ポリライン構成）
        if (props.errorSectionIndex >= 0 && polyline.length > props.errorSectionIndex + 1) {
          const errorPolyline = [polyline[props.errorSectionIndex], polyline[props.errorSectionIndex + 1]];
          L.polyline(errorPolyline, { color: '#FF0000', weight: 22, opacity: 1 }).addTo(map.value);
          L.polyline(errorPolyline, { color: '#FFB3B3', weight: 14, opacity: 1 }).addTo(map.value);
        }

        // 各座標にマーカーを追加
        polyline.forEach((coord, index) => {
          const sectionIcon = L.divIcon({
            className: '',
            html: svgTemplate(index + 1),
            iconSize: [33, 33],
            iconAnchor: [17, 17],
          });

          L.marker([coord[0], coord[1]], { icon: sectionIcon }).addTo(map.value);
        });

        // E0002: 接触座標に×マーカーを追加（航路点マーカーより上に表示するため後に描画）
        if (props.contactCoordinates?.points) {
          const xSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 33 33" style="opacity:0.6">
            <circle cx="16.5" cy="16.5" r="16.5" fill="red"/>
            <line x1="9" y1="9" x2="24" y2="24" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="24" y1="9" x2="9" y2="24" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
          </svg>`;
          for (const point of props.contactCoordinates.points) {
            const coords = point.coordinates; // [lng, lat, alt]
            const xIcon = L.divIcon({ className: '', html: xSvg, iconSize: [17, 17], iconAnchor: [8, 8] });
            L.marker([coords[1], coords[0]], { icon: xIcon }).addTo(map.value);
          }
        }

        // 航路区画の中点と対応する航路名を格納するリスト
        const allSections = [];

        // 航路区画を抽出
        var index = 0;
        data.airwaySections.forEach((section) => {
          let sectionName = section['airwaySectionName'];
          let middlePoint = [
            (polyline[index][0] + polyline[index+1][0]) / 2,
            (polyline[index][1] + polyline[index+1][1]) / 2,
          ];
          allSections.push({sectionName: sectionName, middlePoint: middlePoint});
          index++;
        });

        // 航路区画名のボックスを追加
        var index = 0;
        allSections.forEach((section) => {
           // 1文字のサイズ(px)
           const fontSize = 12
           // sectionNameの長さを取得
           const sectionNameLen = section['sectionName'].length;
           // 長さに基づいて横幅を計算
           const boxWidth = sectionNameLen * fontSize + fontSize; // px単位
           // 長さに基づいて縦幅を計算
           const boxHeight = fontSize * 2; // px単位
          let html = `
            <div style="
              background-color: white;
              font-size: ${fontSize}px;
              font-weight: bold;
              display: flex;
              width:${boxWidth}px;
              justify-content: center; // 水平揃え
              height: ${boxHeight}px;
              align-items: center;     // 垂直揃え
            ">
              <p>${section['sectionName']}</p>
            </div>
          `;
          let sectionIcon = L.divIcon({
            html: html
          });
          L.marker(section['middlePoint'], {icon: sectionIcon}).addTo(map.value);
        });

        // 最大落下範囲表示
        const rangeRes = await $fetch('/api/airway/max-fall-range', { 
          method: 'GET',
          query: { businessNumber: useRuntimeConfig().public.businessNumber }
        });
        if (rangeRes.status != 200) {
          console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
          // this.rangeData = null;
          return;
        }
        const rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);

        // 航路と関連する最大落下範囲の結合を表示
        const fallRange = rangeData['fallToleranceRanges'].find(item => item.fallToleranceRangeId === props.message)
        markerCount.value = fallRange['geometry']['coordinates'].length;
        const allPolygons = unionFallToleranceRanges(rangeData['fallToleranceRanges']);
        const unionRange = searchPolygonWithin(fallRange, allPolygons);
        if (unionRange['geometry']['coordinates'].length > 0) {
          unionRange['geometry']['coordinates'][0].forEach((coord) => {
            InsideLatLangs.push([coord[0], coord[1]]);
          })
        }

        PolygonLatLngList.push(OuterLatLangs);
        PolygonLatLngList.push(InsideLatLangs);
        if (InsideLatLangs && InsideLatLangs.length > 0) {
          map.value.fitBounds(InsideLatLangs);
        }
        // ポリゴンを追加
        //if (markerCount.value > 1) {
          L.polygon(PolygonLatLngList, {
            color: PolygonOptions.color,
            opacity: PolygonOptions.opacity,
            fillOpacity: PolygonOptions.fillOpacity
          }).addTo(map.value);
        //}
      }

      map.value.on('moveend', (event) => {
        console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
        if (!MapLayerControlMounted.value) {
          console.log(`map moved:${event}`);
          map_moveend.value = true;
        }
      });
    };

    // コンポーネントのマウント時に初期描画
    onMounted(async () => {
      await renderMap(props.corridorData);
    });

    // 地図移動完了フラグを初期化
    // 初期表示時におこなわれる地図位置調整でmapが反応してしまうため
    map_moveend.value = false;

    return { map, map_moveend, MapLayerControlMounted};
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
  },
};
</script>

<style scoped>
#map {
  height: 100%;
  width: 100%;
}
.grayscale-map {
  filter: grayscale(100%);
}
.section-name-icon {
  font-size: 100px;
  background-color: #ffffff
}

.area-control-top-right {
  display: flex;        /* 横並びにする */
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0px;
  padding: 0px;
  flex-direction: column;     /* 子要素を縦並びにする */
  align-items: flex-end;      /* 右端に揃える */
}

.area-control-bottom-left {
  position: absolute;
  bottom: 20px;
  left: 10px;
  z-index: 1000;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0;
  padding: 10px;
}
</style>
