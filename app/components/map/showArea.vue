<template>
  <div id="showArea" style="height:76.5dvh; position: relative;">
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
    area: {
      type: String,
      required: true,
    },
    areaInfo: {
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
  let zoomInit = 16;

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
    
    console.log("ShowArea mounted.");
    // create basemap layer
    l_map.value = L.map('showArea', {
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

    l_map.value.on('moveend', async (event) => {
      console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
      if (!MapLayerControlMounted.value) {
        console.log(`map moved:${event}`);
        map_moveend.value = true;
        await drawFallToleranceRange(true);
      }
    });
    
    await drawFallToleranceRange(false);
  })

  watch(() => props.area, (newData) => {
    console.log(newData);
    
    // エリアの座標を特定する
    props.areaInfo.areas.forEach((area) => {
      if (area.name === newData) {
        centerInit = [area.geometry.coordinates[1], area.geometry.coordinates[0]];
        if (l_map.value != null) {
          l_map.value.setView(centerInit);
        }
      }
    })
  })

  async function drawFallToleranceRange(isMove) {
    // 最大落下範囲表示
    const rangeRes = await $fetch('/api/airway/max-fall-range', { 
      method: 'GET',
      query: { businessNumber: useRuntimeConfig().public.businessNumber }
    });
    console.log(rangeRes);

    // 全ての最大落下範囲を表示
    if (rangeRes.status === 200 && rangeRes.data) {
      const rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);
      rangeData['fallToleranceRanges'].forEach((range) => {
        let markerList = [];
        if (range['geometry']['coordinates'].length) {
          range['geometry']['coordinates'][0].forEach((coord) => {
            markerList.push([coord[1], coord[0]]);
          })
        }
        const polygon = L.polygon(markerList, {
          color: "#949593",
          opacity: 0,
          fillOpacity: 0.6
        }).addTo(l_map.value);
      });
    } else {
      return;
    }
  }

</script>

<style>
.grayscale-map .leaflet-tile {
  filter: grayscale(100%);
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