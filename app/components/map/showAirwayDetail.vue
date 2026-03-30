<template>
  <div id="showAirwayDetailMap" style="height:80dvh; position: relative;">
    <div class="layer-control-top-right">
      <MapProhibitedAreaControl :map="map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :stepNo="stepNo" :map="map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div class="legend-bottom-left">
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
      required: false,
    }
  },
  setup(props) {
    const map = ref(null);  // 地図インスタンス
    let L;
    let map_moveend = ref(false);
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
        map.value = L.map('showAirwayDetailMap', {
          scrollWheelZoom: false,  // ホイールズームを無効化
        });

        // OpenStreetMapのタイルレイヤーを追加
        L.tileLayer(
          useRuntimeConfig().public.mapTileUrl,
          {
            className: "grayscale-map",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
          }
        ).addTo(map.value);
        
        map.value.zoomControl.setPosition('topleft');

        // 座標を格納するリスト
        const allCoordinates = [];
        
        const normalData = { ...data };
        console.log(normalData);

        // 座標を抽出
        normalData.airwayJunctions.forEach((point) => {
          point["airways"].forEach((coordinates) => {
            const coords = coordinates["airway"]["geometry"]["coordinates"];
            if (Array.isArray(coords)) {
              allCoordinates.push(coords);
            }
          });
        });

        // ポリライン用の座標を計算（平均座標を使用）
        const polyline = [];
        let count = 0;
        allCoordinates.forEach((coords) => {
          let x = 0;
          let y = 0;
          // 矩形の座標は 5 点だが、計算に使うのは 4 点
          for (let i = 0; i < 4; i++) {
            if (coords[i][1] !== undefined && coords[i][0] !== undefined) {
              x += coords[i][1];
              y += coords[i][0];
            }
          }
          x /= 4;
          y /= 4;

          polyline.push([x, y]);
          count += 1;
        });

        // 地図をズームして範囲を調整
        if (polyline.length > 0) {
          map.value.fitBounds(polyline);
        }

        // 地図にポリラインを描画
        if (polyline.length > 0) {
          L.polyline(polyline, airwayOptions).addTo(map.value);
          L.polyline(polyline, airwayInnerOptions).addTo(map.value);
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

        // 最大落下範囲表示
        let rangeId = props.message;
        const rangeRes = await $fetch('/api/airway/max-fall-range', { 
          method: 'GET',
          query: { businessNumber: useRuntimeConfig().public.businessNumber }
        });
        console.log(rangeRes);
        if (rangeRes.status != 200) {
          console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
          this.rangeData = null;
          return;
        }
        const rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);

        for (let i = 0; i < rangeData.fallToleranceRanges.length; i++) {
          if (rangeData.fallToleranceRanges[i]['fallToleranceRangeId'] == rangeId) {
            let coordinates = rangeData.fallToleranceRanges[i]['geometry']['coordinates'][0];
            markerCount.value = coordinates.length;
            for (let j = 0; j < coordinates.length; j++) {
              markerList.value[j] = [coordinates[j][1], coordinates[j][0]];
              InsideLatLangs.push([coordinates[j][1], coordinates[j][0]]);
            }
            break;
          }
        }

        PolygonLatLngList.push(OuterLatLangs);
        PolygonLatLngList.push(InsideLatLangs);
        if (InsideLatLangs && InsideLatLangs.length > 0) {
          map.value.fitBounds(InsideLatLangs);
        }
        // ポリゴンを追加
        if (markerCount.value > 1) {
          L.polygon(PolygonLatLngList, {
            color: PolygonOptions.color,
            opacity: PolygonOptions.opacity,
            fillOpacity: PolygonOptions.fillOpacity
          }).addTo(map.value);
        }
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
      renderMap(props.corridorData);
    });

    return {
      map,
      map_moveend,
      MapLayerControlMounted,
    }
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
#showAirwayDetailMap {
  height: 100%;
  width: 100%;
}
.grayscale-map {
  filter: grayscale(100%)!important;
}
.section-name-icon {
  font-size: 100px;
  background-color: #ffffff
}

.layer-control-top-right {
  display: flex;        /* 横並びにする */
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0;
  padding: 10px;
  flex-direction: column;     /* 子要素を縦並びにする */
  align-items: flex-end;      /* 右端に揃える */
}

.legend-bottom-left {
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
