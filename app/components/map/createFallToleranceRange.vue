<template>
  <div id="createFallToleranceRange" style="height:75dvh; position: relative;"></div>
  <div class="area-control">
    <button type="button" @click="deleteArea">
      <img src="../../assets/css/img/dummyImg/svg_create.svg" alt="clear" style="width: 30px; height: 30px;">
    </button>
    <p>削除</p>
  </div>
  <div class="area-control-top-right">
    <MapProhibitedAreaControl :map="l_map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
    <MapLayerControl :stepNo="stepNo" :map="l_map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>    
  </div>
  <div class="area-control-bottom-left">
    <MapLegend></MapLegend>
  </div>
</template>

<script setup>
  import "leaflet/dist/leaflet.css";
  import { ref, onMounted, defineEmits } from "vue";
  import iconUrl from "../assets/css/img/map/circle-solid.svg";
  import MapLegend from '../mapLegend.vue';
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
  let zoomInit = 16;
  let centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
  let lineWeight = 5;
  const markerList = ref([]);
  const markerCount = ref(0);
  const port_marker_List = ref([]);
  const polyline_list = ref([]);
  const map_moveend = ref(false);
  const drawEnd = ref(false);
  const MapLayerControlMounted = ref(true);

  const emit = defineEmits(['markerClosed']);
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

  const closeArea = (event) => {
    // クリックされたアイコンが最初に配置されたアイコンでなければなにもしない。
    if ((markerList.value[0][0] != event.latlng.lat) && (markerList.value[0][1] != event.latlng.lng) ) {
      return;
    }
    markerList.value.push(markerList.value[0])
    markerCount.value++
    // 接続線描画および枠内塗りつぶし
    const polyline = L.polyline(
      markerList.value, 
      {
        color: "#000000",
        weight: lineWeight, 
        fill: true,
        fillColor: '#000000',
        fillOpacity: 0.5,
        fillRule: 'nonzero'
      }
    ).addTo(l_map.value);
    polyline_list.value.push(polyline);

    drawEnd.value = true;
    emit('markerClosed', markerList);  // Send the marker position to the parent
  }

  // 地図上にマーカーを配置
  const setMarker = (event, L) => {
    if(drawEnd.value === true) {
      return;
    }
    // マーカー数管理
    markerList.value.push([event.latlng.lat, event.latlng.lng]);
    markerCount.value++;
    // マップ上にマーカー追加
    const icon = L.icon({
      iconUrl: iconUrl,
      iconSize: [10, 10]
    });
    const marker = L.marker(
      [event.latlng.lat, event.latlng.lng],
      {icon: icon}
    ).addTo(l_map.value);
    port_marker_List.value.push(marker);
    console.log(`port_marker_List: ${port_marker_List.value}`);
    
    // 接続線描画
    if (markerCount.value > 1) {
      const polyline = L.polyline(
        markerList.value, 
        {
          color: "#000000",
          weight: lineWeight, 
          fill: false,
          fillColor: '#000000',
          fillOpacity: 0.5,
          fillRule: 'nonzero'
        }
      ).addTo(l_map.value);
      polyline_list.value.push(polyline);
    }
    // マーカクリック時のイベントハンドラ登録
    marker.on('click', function(event) {
      closeArea(event);
    });
  }

  const deleteArea = () => {
    markerList.value = [];
    markerCount.value = 0;
    for (let i=0; i<port_marker_List.value.length; i++) {
      l_map.value.removeLayer(port_marker_List.value[i]);
    }
    port_marker_List.value = [];
    for (let i=0; i<polyline_list.value.length; i++) {
      l_map.value.removeLayer(polyline_list.value[i]);
    }
    polyline_list.value = [];

    drawEnd.value = false;
    emit('markerClosed', []);
  }

  // コンポーネントマウント後
  onMounted(async () => {
    const leafletModule = await import('leaflet');
    const L = leafletModule.default;

    console.log("createFallToleranceRange mounted.");

    // エリアの座標を特定する
    props.areaInfo.value.areas.forEach((area) => {
      if (area.name === props.area) {
        centerInit = [area.geometry.coordinates[1], area.geometry.coordinates[0]];
        if (l_map.value != null) {
          l_map.value.setView(centerInit);
        }
      }
    })

    // create basemap layer
    l_map.value = L.map('createFallToleranceRange', {
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

    // 地図移動完了時イベントハンドラ
    l_map.value.on('moveend', async(event) => {
      console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
      if (!MapLayerControlMounted.value) {
        console.log(`map moved:${event}`);
        map_moveend.value = true;
        await drawFallToleranceRange(false);
      }
    });

    // 地図上をクリックした時の動作を指定
    l_map.value.on('click', (event) => {
      console.log([event.latlng.lat, event.latlng.lng]);
      setMarker(event, L);
    });

    await drawFallToleranceRange(false);
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

  // 地図移動完了フラグを初期化
  // 初期表示時におこなわれる地図位置調整でmapが反応してしまうため
  map_moveend.value = false;
</script>

<style>
#leafletMap {
  z-index: 0;
}

.grayscale-map {
  filter: grayscale(100%);
}

.area-control {
  position: absolute;
  top: 10px;
  right: calc(20px + 120px);
  z-index: 1000;
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