<template>
  <div id="leafletMap" style="height:100%; position: relative;">
    <div class="layer-control-top-right">
      <MapProhibitedAreaControl :map="l_map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :stepNo="stepNo" :map="l_map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div class="legend-bottom-left">
      <MapLegend />
    </div>
  </div>
</template>

<script setup lang="js">
  import "leaflet/dist/leaflet.css";
  import { ref, onMounted } from "vue";
  import MapLayerControl from '../mapLayerControl.vue';
  import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';

  const props = defineProps({
    markerList: {
      type: Array,
      required: false,
    },
    selectedRouteFid: {
      type: String,
      required: false,
      default: "fall_tolerance_range_id_1"
    },
    rangeData: {
      type: Object,
      required: false,
      default: null
    },
    stepNo: {
      type: String,
      required: false,
    }
  });

  const l_map = ref(null);
  let zoomInit = 16;
  let centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon]; // 秩父 大滝総合支所
  const markerList = ref(props.markerList || []);
  const selectedRouteFid = ref(props.selectedRouteFid);
  const map_moveend = ref(false); // チェックボックス部品に渡す変数

  const MapLayerControlMounted = ref(true);
  const stepNo = ref(props.stepNo);

  // 天候情報の変更完了ハンドラ
  const handleWeatherChanged = (changeed) => {
    console.log(`map_moveend: ${map_moveend.value}.`);
    console.log(`Weather_Changeed: ${changeed}`);
    map_moveend.value = false;
  }

  // MapLayerControl Mounted 完了ハンドラ
  const handleMapLayerControlMounted = (Mounted) => {
    console.log(`MapLayerControl_Mounted: ${Mounted}`);
    MapLayerControlMounted.value = false;
    console.log(`MapLayerControl_Mounted: ${MapLayerControlMounted.value}`);
  }
  
  onMounted(async () => {
    
    const leafletModule = await import('leaflet');
    const L = leafletModule.default;
    
    // create basemap layer
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

    /* Zoomコントロール位置移動 */
    l_map.value.zoomControl.setPosition('topleft');

    // 詳細・プレビュー画面 markerListに値をセット
    if (markerList.value.length == 0) {
      if (props.rangeData && props.rangeData.fallToleranceRanges) {
        props.rangeData['fallToleranceRanges'].forEach((range) => {
          if (range['fallToleranceRangeId']  === selectedRouteFid.value) {
            if (range['geometry']['coordinates'].length) {
              range['geometry']['coordinates'][0].forEach((coord) => {
                markerList.value.push([coord[1], coord[0]]);
              })
            }
          }
        });
      }
    }

    // 最大落下範囲を表示
    if (markerList.value.length > 1) {
      const polygon = L.polygon(markerList.value, {
        color: "#949593",
        opacity: 0,
        fillOpacity: 0.6
      }).addTo(l_map.value);
    }

    if (markerList.value.length > 0) {
        l_map.value.fitBounds(markerList.value);
    }

    l_map.value.on('moveend', (event) => {
      console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
      if (!MapLayerControlMounted.value) {
        console.log(`map moved:${event}`);
        map_moveend.value = true;
      }
    });
  })
  
</script>

<style>
  .grayscale-map .leaflet-tile {
    filter: grayscale(100%);
  }
  .layer-control-top-right {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0;
  padding: 10px;
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