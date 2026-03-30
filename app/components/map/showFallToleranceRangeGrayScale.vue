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
  import iconUrl from "../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg";
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
    }
  });

  const l_map = ref(null);
  const map_moveend = ref(false);
  let centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
  let outerLatLangs = [[-90,-180],[-90,180],[90,180],[90,-180]]; //範囲外をグレーアウトする
  let insideLatLangs = [];
  let polygon = [];
  let zoomInit = 16;

  const MapLayerControlMounted = ref(true);
  const stepNo = ref(props.stepNo);
  const selectedFallToleranceRange = ref(null);

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

    // 最大落下範囲を結合してすべて表示
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
    
    await drawAirLine(l_map.value, "uasl-list");

    l_map.value.on('moveend', async (event) => {
      console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
      if (!MapLayerControlMounted.value) {
        console.log(`map moved:${event}`);
        map_moveend.value = true;
        await drawAirLine(l_map.value, "uasl-list");
      }
    });
  })

  // エリアにフォーカス
  watch(() => props.area, (newData) => {
    console.log(newData);
    
    // エリアの座標を特定する
    props.areaInfo.areas.forEach((area) => {
      if (area.name === newData) {
        centerInit = [area.geometry.coordinates[1], area.geometry.coordinates[0]];
        l_map.value.setView(centerInit);
      }
    })
  })

  // 最大落下範囲にフォーカス
  watch(() => props.rangeId, (newData) => {
    console.log(newData);
    
    // 最大落下範囲を特定する
    props.rangeInfo['fallToleranceRanges'].forEach((range) => {
      if (range['fallToleranceRangeId'] === newData) {
        let markerList = [];
        if (range['geometry']['coordinates'].length) {
          range['geometry']['coordinates'][0].forEach((coord) => {
            markerList.push([coord[1], coord[0]]);
          })
          l_map.value.fitBounds(markerList);
          // 切り替え
          if (selectedFallToleranceRange.value) {
            l_map.value.removeLayer(selectedFallToleranceRange.value);
          }
          // 結合した場合にどの最大落下範囲かがわからないため強調する
          selectedFallToleranceRange.value = L.polygon(markerList, {
            color: "rgb(44, 105, 255)",
            weight: 3,
            opacity: 1,
            fillColor: "rgb(44, 105, 255)",
            fillOpacity: 0.3
          }).addTo(l_map.value);
        }
      }
    });
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