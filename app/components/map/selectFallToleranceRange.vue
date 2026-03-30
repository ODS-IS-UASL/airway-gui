<template>
  <div id="leafletMap" style="height:100%; position: relative;"></div>
  <div class="layer-control-top-right">
    <MapProhibitedAreaControl :map="l_map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
    <MapLayerControl :map="l_map" :map_moveend="map_moveend"  @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
  </div>
  <div class="legend-bottom-left">
    <MapLegend />
  </div> 
</template>

<script setup lang="js">
  import "leaflet/dist/leaflet.css";
  import { ref, onMounted } from "vue";
  import MapLayerControl from '../mapLayerControl.vue';
  import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';

  const props = defineProps({
    selectedRouteFid: {
      type: String,
      required: false,
      default: null
    },
    rangeData: {
      type: Object,
      required: true,
      default: null
    }
  });

  const l_map = ref(null);
  let zoomInit = 16;
  let centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon]; // 秩父 大滝総合支所
  const focusMarkerList = ref([]);
  const map_moveend = ref(false); // チェックボックス部品に渡す変数
  const MapLayerControlMounted = ref(true);

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
  
  const goToDetail = (params) => {
    console.log(params);
    const baseUrl = '/fallToleranceRange/detail';
    const query = new URLSearchParams();
    query.set('fid', params['fid']);
    query.set('name', params['name']);
    query.set('application_date', params['application_date']);
    query.set('area', params['area']);
    const fullUrl = `${baseUrl}?${query.toString()}`;
    window.location.href = fullUrl;
  };

  const renderMap = async (data, fid) => {
    if (process.client) { 
      if (l_map.value) {
        // 既存の地図を削除
        l_map.value.remove();
        l_map.value = null; // mapインスタンスをリセット
      }
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

      // 最大落下範囲をすべて表示
      if (data && data.fallToleranceRanges) {
        data['fallToleranceRanges'].forEach((range) => {
          // 表で選択されている最大落下範囲を把握
          if (fid && range['fallToleranceRangeId'] === fid) {
            if (range['geometry']['coordinates'].length) {
              range['geometry']['coordinates'][0].forEach((coord) => {
                focusMarkerList.value.push([coord[1], coord[0]]);
              })
            }
          }

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
          const detailInfo = {
            fid: range['fallToleranceRangeId'],
            name: range['name'],
            application_date: useDateString1(range['createdAt']),
            area: range['areaName']
          }
          polygon.on('click', () => goToDetail(detailInfo));
        });
      }

      // 表で選択されているならフォーカス
      if (focusMarkerList.value.length > 0) {
          l_map.value.fitBounds(focusMarkerList.value);
      }
      
      l_map.value.on('moveend', async (event) => {
        console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
        if (!MapLayerControlMounted.value) {
          console.log(`map moved:${event}`);
          map_moveend.value = true;
        }
      });
    }
  }

  watch(() => props.rangeData, (newData) => {
    renderMap(newData, props.selectedRouteFid);
  })

  onMounted(async () => {
    renderMap(props.rangeData, props.selectedRouteFid);
  });

</script>

<style>
  .grayscale-map .leaflet-tile {
    filter: grayscale(100%);
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

  .legend-bottom-left{
    position: absolute;
    bottom: 20px;
    left: 10px;
    z-index: 1000;
    font-size: 0.8rem;
    line-height: 2em;
    margin: 0;
    padding: 10px;
  }

  .layer-control-top-right {
    position: absolute;
    top: 0px;
    right: 20px;
    z-index: 1000;
    font-size: 0.8rem;
    line-height: 2em;
    margin: 0;
    padding: 10px;
  }
</style>