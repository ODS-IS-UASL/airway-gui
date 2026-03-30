<template>
  <div id="leafletMap" style="height:96.5dvh">
    <div class="layer-control-middle-right">
      <MapProhibitedAreaControl :map="l_map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :map="l_map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div class="legend-bottom-left">
      <MapLegend />
    </div>
    <div class="airway-menu-link">
      <v-btn-toggle
        v-model="viewType"
        mandatory
        variant="flat"
        rounded="pill"
        border
        density="comfortable"
        class="drn_toggle drn_toggle--viewtype"
      >
        <a href="/airway">
          <v-btn
            value="listview"
            class="drn_toggle__btn"
          >
            <img class="drn_toggle__map_btn" src="/assets/css/img/main/list-solid.svg" width="15" height="15">
          </v-btn>
        </a>
        <v-btn
          value="mapview"
          class="drn_toggle__btn"
        >
          <img src="/assets/css/img/main/map-regular.svg" width="20" height="20">
        </v-btn>
      </v-btn-toggle>
    </div>
  </div>
</template>

<script>
import "leaflet/dist/leaflet.css";
import { onMounted, ref } from "vue";
import iconUrl from "../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg";
import MapLayerControl from '../mapLayerControl.vue';
import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';

export default {
  components: {
    MapLayerControl,
    MapProhibitedAreaControl,
  },
  data() {
    return {
      viewType: 'mapview'
    }
  },
  setup() {
    let zoomInit = 16;
    let centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
    const l_map = ref(null);
    const map_moveend = ref(false);
    const areas = ref([]);
    const airwayJunctions = ref([]);
    let rangeData = null;
    let airwayData = null;
    const MapLayerControlMounted = ref(true);

    const goToDetail = (params) => {
      console.log(params);
      const baseUrl = '/airway/detail';
      const fullUrl = `${baseUrl}?id=${params}`;
      window.location.href = fullUrl;
    };

    onMounted(async () => {
      const rangeRes = await $fetch('/api/airway/max-fall-range', { 
        method: 'GET',
        query: { businessNumber: useRuntimeConfig().public.businessNumber }
      });
      console.log(rangeRes);
      if (rangeRes.status != 200) {
        console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
        rangeData = null;
        return;
      }
      rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);
      const uaslRes = await $fetch('/api/airway/uasl', { 
        method: 'GET',
        query: { all: true }
      });
      console.log(uaslRes);
      if (uaslRes.status !== 200) {
        console.error(`error: get uasl info {status: ${uaslRes.status}}.`);
        airwayData = null;
        return;
      }
      const uaslResData = utils.convertUaslToAirway(uaslRes.data);
      airwayData = useAirwayConvertConnectionOrder(uaslResData);

      const leafletModule = await import('leaflet');
      const L = leafletModule.default;

      l_map.value = L.map('leafletMap', {
        center: centerInit,
        zoom: zoomInit,
        scrollWheelZoom: false,
      });

      L.tileLayer(
        useRuntimeConfig().public.mapTileUrl,
	      {
          className: "grayscale-map",
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
        }
      ).addTo(l_map.value);

      // ページ遷移アニメーション中にマウントされた場合コンテナサイズが0になることがあるため再計算
      l_map.value.invalidateSize();

      /* Zoomコントロール位置移動 */
      l_map.value.zoomControl.setPosition('topleft');

      rangeData['fallToleranceRanges'].forEach((range) => {
        let markerList = [];
        if (range['geometry']['coordinates'].length) {
          range['geometry']['coordinates'][0].forEach((coord) => {
            markerList.push([coord[1], coord[0]]);
          })
          areas.value.push(markerList);
        }
      });

      // 最大落下範囲を描画
      areas.value.forEach(area => {
        L.polygon(area, {
          fill: true,
          stroke: true,
          fillColor: "#000000",
          color: "#FFFFFF",
          weight: 3,
          fillOpacity: 0.3,
          opacity: 1
        }).addTo(l_map.value);
      });

      airwayData['airway']['airways'].forEach((airway) => {
        let airwayInfo = {id:airway['airwayId'], points:[]};
        let coordinateList = [];
        airway['airwayJunctions'].forEach((junction) => {
          let coordinates = junction['airways'][0]['airway']['geometry']['coordinates'];
          coordinateList.push(coordinates);
        })

        coordinateList.forEach((coordinates) => {
          airwayInfo.points.push([(coordinates[0][1] + coordinates[2][1]) / 2, (coordinates[0][0] + coordinates[2][0]) / 2]);
        })

        airwayJunctions.value.push(airwayInfo);
      })

      // Add airway markers and polylines
      airwayJunctions.value.forEach(airway => {
        L.polyline(airway.points, {
          color: "#000000",
          weight: 8
        }).addTo(l_map.value);
        
        const polyline = L.polyline(airway.points, {
          color: "#FFFFFF",
          weight: 7
        }).addTo(l_map.value);
        polyline.on('click', () => goToDetail(airway.id));

        airway.points.forEach(markerCoords => {
          const icon = L.icon({
            iconUrl,
            iconSize: [15, 15],
          });
          L.marker(markerCoords, { icon }).addTo(l_map.value);
        });
      });

      l_map.value.on('moveend', (event) => {
        console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
        if (!MapLayerControlMounted.value) {
          console.log(`map moved:${event}`);
          map_moveend.value = true;
        }
      });

    });

    return {
      l_map,
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
  }
};
</script>

<style>
#leafletMap {
  z-index: 0;
}
.grayscale-map .leaflet-tile {
  filter: grayscale(100%);
}
.airway-menu-link {
  position: absolute;
  top: 40px;
  right: 30px;
  z-index: 1000;
}
.layer-control-middle-right {
  display: flex;        /* 横並びにする */
  position: absolute;
  top: 100px;
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
