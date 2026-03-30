<template>
  <div id="leafletMap" style="height:76.5dvh; position: relative;">
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
  import { unionFallToleranceRanges } from '~/utils/airway'

  const props = defineProps({
    area: {
      type: String,
      required: true,
    },
    areaInfo: {
      type: Object,
      required: true,
    },
    rangeId: {
      type: String,
      required: true,
    },
    rangeInfo: {
      type: Object,
      required: true,
    },
    stepNo: {
      type: String,
      required: true,
    },
    corridorData: {
      type: Object,
      required: true,
    },
    targetUaslId: {
      type: String,
      required: true,
    },
    sourceUaslId: {
      type: String,
      required: true,
    },
  });

  const l_map = ref(null);
  const map_moveend = ref(false);
  const excludedIds = ref([]);
  let centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
  let outerLatLangs = [[-90,-180],[-90,180],[90,180],[90,-180]]; //範囲外をグレーアウトする
  let insideLatLangs = [];
  let polygon = [];
  let zoomInit = 16;
  let sourceCoordinates = null;

  const MapLayerControlMounted = ref(true);
  const stepNo = ref(props.stepNo);
  const selectedFallToleranceRange = ref(null);
  const emit = defineEmits(['change-value'])

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

  // 選択された最大落下範囲のリセット
  const resetSelectedFallToleranceRange = () => {
    if (selectedFallToleranceRange.value) {
      l_map.value.removeLayer(selectedFallToleranceRange.value);
    }
  }
  defineExpose({
    resetSelectedFallToleranceRange
  })

  onMounted(async () => {
    const leafletModule = await import('leaflet');
    const L = leafletModule.default;
  
    console.log("ShowFallToleranceRange mounted.");
    // create basemap layer
    l_map.value = L.map('leafletMap', {
      center: centerInit,
      zoom: zoomInit,
      scrollWheelZoom: false,
    });
    console.log("Create l_map");

    L.tileLayer(
      useRuntimeConfig().public.mapTileUrl,
      {
        className: "grayscale-map",
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
      }
    ).addTo(l_map.value);
    console.log("Set tileLayer");

    l_map.value.zoomControl.setPosition('topleft');

    // 最大落下範囲をすべて表示
    const allPolygons = unionFallToleranceRanges(props.rangeInfo['fallToleranceRanges']);
    for (let i = 0; i < allPolygons.length; i++) {
      insideLatLangs.push(allPolygons[i].geometry.coordinates[0])
    }
    polygon.push(insideLatLangs);
    polygon.push(outerLatLangs);
    L.polygon(polygon, {
      color: "#D3D3D3",
      opacity: 0,
      fillOpacity: 0.6
    }).addTo(l_map.value);
    
    sourceCoordinates = await drawSingleAirline(l_map.value, props.corridorData, props.sourceUaslId, "blue");
    // 地図をズームして範囲を調整(接続元にズーム)
    if (sourceCoordinates.length > 0) {
      l_map.value.fitBounds(sourceCoordinates);
    }
    excludedIds.value = [props.sourceUaslId];
    await drawUaslList(l_map.value, excludedIds.value);

    l_map.value.on('moveend', async (event) => {
      console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
      if (!MapLayerControlMounted.value) {
        console.log(`map moved:${event}`);
        map_moveend.value = true;
        await drawUaslList(l_map.value, excludedIds.value);
      }
    });
  })

  // 選択されたエリアの最大落下範囲を表示
  watch(() => props.rangeId, (newData) => {
    console.log("fallToleranceRangeId:" + newData);
    
    // 最大落下範囲を特定する
    props.rangeInfo['fallToleranceRanges'].forEach((range) => {
      if (range['fallToleranceRangeId'] === newData) {
        let markerList = [];
        if (range['geometry']['coordinates'].length) {
          range['geometry']['coordinates'][0].forEach((coord) => {
            markerList.push([coord[1], coord[0]]);
          })
          // 切り替え
          if (selectedFallToleranceRange.value) {
            l_map.value.removeLayer(selectedFallToleranceRange.value);
          }
          selectedFallToleranceRange.value = L.polygon(markerList, {
            color: "yellow",
            opacity: 0,
            fillOpacity: 0.3
          }).addTo(l_map.value);
        }
      }
    });
  });

  watch(() => props.targetUaslId, async (newData) => {
    excludedIds.value = [props.sourceUaslId, newData];
    // 新規航路改修用 start
    // 接続先航路を赤色で表示（接続元は青色のまま）。再描画前に既存の接続先航路を削除
    l_map.value.eachLayer((layer) => {
      if (layer instanceof L.Polyline && layer.options.color === 'red') {
        l_map.value.removeLayer(layer);
      }
    });
    // 新規航路改修用 end
    const polyline = await drawSingleAirline(l_map.value, props.corridorData, newData, "red");
    if (polyline.length > 0) {
      l_map.value.fitBounds([sourceCoordinates, polyline]);
    }
  });
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