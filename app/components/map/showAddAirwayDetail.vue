<template>
  <div id="showAirwayDetailMap" style="height:70dvh; position: relative;">
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
    console.log('---', props)
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
      console.log('---', data)
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
        console.log('---', data)
        const normalData = { ...data };
        console.log(normalData);

        const polyline = calcPolylineCoordinates(normalData);
        console.log('---', polyline)

        // 地図をズームして範囲を調整
        console.log('---', polyline.length)
        if (polyline.length > 0) {
          console.log('---', map.value)
          map.value.fitBounds(polyline);
        }

        // 地図にポリラインを描画
        if (polyline.length > 0) {
          L.polyline(polyline, {
            color: 'white',
            weight: 35,
            opacity: 1,
          }).addTo(map.value);

          L.polyline(polyline, {
            color: '#BBBBBB',
            weight: 30,
            opacity: 1,
          }).addTo(map.value);
        }

        // 各座標にマーカーを追加
        const svgTemplate = (number) => `
          <svg xmlns="http://www.w3.org/2000/svg" width="33.818" height="33.818" viewBox="0 0 33.818 33.818">
            <g id="グループ_1434" data-name="グループ 1434" transform="translate(-17.05 -30.53)">
              <g id="グループ_167" data-name="グループ 167" transform="translate(17.05 30.53)">
                <g id="楕円形_45" data-name="楕円形 45" fill="#fff" stroke="#000" stroke-miterlimit="10" stroke-width="2">
                  <circle cx="16.909" cy="16.909" r="16.909" stroke="none"/>
                  <circle cx="16.909" cy="16.909" r="15.909" fill="none"/>
                </g>
                <g id="グループ_166" data-name="グループ 166" transform="translate(5.251 5.871)">
                  <line id="線_208" data-name="線 208" x2="22.545" y2="22.545" fill="#fff" stroke="#000" stroke-miterlimit="10" stroke-width="2"/>
                  <line id="線_209" data-name="線 209" x1="22.118" y2="22.118" transform="translate(0.427)" fill="#fff" stroke="#000" stroke-miterlimit="10" stroke-width="2"/>
                </g>
              </g>
              <g id="グループ_168" data-name="グループ 168" transform="translate(22.659 31.288)">
                <ellipse id="楕円形_46" data-name="楕円形 46" cx="10.789" cy="11.71" rx="10.789" ry="11.71" transform="translate(0 6.837)" fill="#fff" opacity="0.7"/>
                <text id="_6" data-name="6" transform="translate(10.274 23)" font-size="22" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700"><tspan x="-7.444" y="0">${number}</tspan></text>
                <text id="_6-2" data-name="6" transform="translate(10.274 23)" font-size="22" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700"><tspan x="-7.444" y="0">${number}</tspan></text>
              </g>
            </g>
          </svg>
        `;

        polyline.forEach((coord, index) => {
          let sectionIcon = L.divIcon({
            className: '',
            html: svgTemplate(index + 1), // 各マーカーに対して動的に数字を設定
            iconSize: [38, 38],
          });

          L.marker([coord[0], coord[1]], { icon: sectionIcon }).addTo(map.value);
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

        // 選択された最大落下範囲を色付けて表示
        const fallRange = rangeData['fallToleranceRanges'].find(item => item.fallToleranceRangeId === props.message)
        markerCount.value = fallRange['geometry']['coordinates'].length;
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
        // if (InsideLatLangs && InsideLatLangs.length > 0) {
        //   map.value.fitBounds(InsideLatLangs);
        // }
        // ポリゴンを追加
        // if (markerCount.value > 1) {
          L.polygon(PolygonLatLngList, {
            color: PolygonOptions.color,
            opacity: PolygonOptions.opacity,
            fillOpacity: PolygonOptions.fillOpacity
          }).addTo(map.value);
        // }
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
      console.log('---', props.corridorData)
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
