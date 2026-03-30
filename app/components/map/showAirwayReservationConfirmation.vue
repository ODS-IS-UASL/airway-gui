<template>
  <div :id="changedId" style="height: 100%;">
    <div v-if="showCheckBox" class="layer-control-top-right">
      <MapProhibitedAreaControl :map="map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :stepNo="stepNo" :map="map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div v-if="showLegend" class="legend-bottom-left">
      <MapLegend />
    </div>
  </div>
</template>

<script>
import 'leaflet/dist/leaflet.css';
import starticonUrl from '../assets/css/img/dummyImg/svg_airwaySectionStart.svg';
import goaliconUrl from '../assets/css/img/dummyImg/svg_airwaySectionGoal.svg';
import porticonUrl from '../assets/css/img/dummyImg/dummy_circle-dot-regular.svg';
import { ref, onMounted, computed } from 'vue';
import MapLayerControl from '../mapLayerControl.vue';
import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';

export default {
  components: {
    MapLayerControl,
    MapProhibitedAreaControl,
  },
  props: {
    chartData: {
      type: Object,
      required: true,
    },
    sectionList: {
      type: Array,
      required: true,
    },
    sectionJunctionIdList: {
      type: Array,
      required: false,
      default: () => []
    },
    airwayId: {
      type: [String, Array],
      required: true,
    },
    showCheckBox: {
      type: Boolean,
      required: true,
    },
    showLegend: {
      type: Boolean,
      required: true,
    },
    showMarker: {
      type: Boolean,
      required: true,
    },
    id: {
      type: String,
      required: false,
    },
    departurePort: {
      type: Array,
      required: false,
    },
    arrivalPort: {
      type: Array,
      required: false,
    },
    isEndIdFirst: {
      type: Boolean,
      required: true
    },
    stepNo: {
      type: String,
      required: false,
    }
  },
  setup(props) {
    const map = ref(null);
    const map_moveend = ref(false);
    let L;

    const MapLayerControlMounted = ref(true);

    const changedId = computed(() => {
      return props.id ? `mapShowAirwayReservationConfirmation${props.id}` : 'mapShowAirwayReservationConfirmation';
    });

    const renderMap = async (data, id, sectionList) => {
      if (process.client) {
        if (map.value) {
          map.value.remove();
          map.value = null;
        }
        const leafletModule = await import('leaflet');
        L = leafletModule.default;

        map.value = L.map(changedId.value, {
          scrollWheelZoom: false,
        });

        L.tileLayer(
          useRuntimeConfig().public.mapTileUrl,
          {
            className: "grayscale-map",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
          }
        ).addTo(map.value);

        map.value.zoomControl.setPosition('topleft');
        // ── ここから置き換え ──

        // ヘルパー: ポリゴン(矩形)の中心を算出（最初の4点で平均）
        const centerFromRect = (coords) => {
          const n = Math.min(coords.length, 4);
          let lat = 0, lng = 0;
          for (let i = 0; i < n; i++) {
            lat += coords[i][1]; // lat
            lng += coords[i][0]; // lng
          }
          return [lat / n, lng / n]; // Leafletは [lat, lng]
        };

        // ヘルパー: BFSで最短経路（junctionId配列）を探索
        const bfsPath = (startId, endId, adjacency) => {
          if (!startId || !endId) return null;
          if (startId === endId) return [startId];
          const queue = [startId];
          const visited = new Set([startId]);
          const parent = new Map();
          while (queue.length) {
            const cur = queue.shift();
            const nbrs = adjacency[cur] || [];
            for (const nb of nbrs) {
              if (visited.has(nb)) continue;
              visited.add(nb);
              parent.set(nb, cur);
              if (nb === endId) {
                // 経路復元
                const path = [endId];
                while (parent.has(path[path.length - 1])) {
                  path.push(parent.get(path[path.length - 1]));
                }
                path.reverse();
                return path;
              }
              queue.push(nb);
            }
          }
          return null;
        };

        // id が配列/文字列どちらでもOKにする
        const targetIds = Array.isArray(id) ? id : (id ? [id] : []);

        // sectionList（航路点名の配列）を正規化
        const waypointNames = Array.isArray(sectionList)
          ? sectionList
          : (typeof sectionList === 'string'
              ? sectionList.split(',').map(s => s.trim()).filter(Boolean)
              : []);

        const waypointIds = Array.isArray(props.sectionJunctionIdList)
          ? props.sectionJunctionIdList.map(v => String(v).trim()).filter(Boolean)
          : [];
        const useIdWaypoints = waypointIds.length >= 2;

        // 下地（すべての既存区間）と選択経路（実線/点線）を格納
        const baseSegments = [];              // dataに存在する区間（airwaySectionsに定義されているもの）だけ
        const selectedSolidSegments = [];     // ユーザー順に沿って見つかった実在経路（実線）
        const selectedDashedSegments = [];    // 実在しない部分（補間の点線）
        // JunctionId → [lat, lng]
        const junctionLatLngMap = {};
        // airwayJunctionName → [junctionId,...]
        const nameToIds = {};
        // 経路探索用グラフ（無向）：junctionId → Set<junctionId>
        const adjacency = {};

        // 下地・ノード情報の構築
        for (const targetId of targetIds) {
          const airway = data?.airway?.airways?.find(a => a.airwayId === targetId);
          if (!airway) continue;

          // JunctionId → [lat, lng] と name → ids
          airway.airwayJunctions.forEach(j => {
            const coords = j.airways?.[0]?.airway?.geometry?.coordinates;
            if (Array.isArray(coords) && coords.length >= 4) {
              if (!junctionLatLngMap[j.airwayJunctionId]) {
                junctionLatLngMap[j.airwayJunctionId] = centerFromRect(coords);
              }
              if (j.airwayJunctionName) {
                if (!nameToIds[j.airwayJunctionName]) nameToIds[j.airwayJunctionName] = [];
                if (!nameToIds[j.airwayJunctionName].includes(j.airwayJunctionId)) {
                  nameToIds[j.airwayJunctionName].push(j.airwayJunctionId);
                }
              }
            }
          });

          // baseSegments と adjacency（両端の座標があるエッジのみ追加）
          airway.airwaySections.forEach(sec => {
            const [j1, j2] = sec.airwayJunctionIds || [];
            const p1 = junctionLatLngMap[j1];
            const p2 = junctionLatLngMap[j2];
            if (p1 && p2) {
              baseSegments.push([p1, p2]);
              if (!adjacency[j1]) adjacency[j1] = new Set();
              if (!adjacency[j2]) adjacency[j2] = new Set();
              adjacency[j1].add(j2);
              adjacency[j2].add(j1);
            }
          });
        }

        // ユーザーが選択した航路点名の順に、隣接ペアごとに最短経路を探索し segments を構成
        let globalStartCoord = null;
        let globalEndCoord = null;

        const waypoints = useIdWaypoints ? waypointIds : waypointNames;
              
        for (let i = 0; i < waypoints.length - 1; i++) {
          let startIds = [];
          let endIds = [];
        
          if (useIdWaypoints) {
            startIds = [String(waypoints[i])];
            endIds   = [String(waypoints[i + 1])];
          } else {
            const startName = waypoints[i];
            const endName   = waypoints[i + 1];
            startIds = nameToIds[startName] || [];
            endIds   = nameToIds[endName] || [];
          }
        
          // 候補の全組合せで最短経路を探索（ID指定時は実質1通り）
          let bestPathIds = null;
          for (const sId of startIds) {
            for (const eId of endIds) {
              const pathIds = bfsPath(sId, eId, adjacency);
              if (pathIds && pathIds.length >= 2) {
                if (!bestPathIds || pathIds.length < bestPathIds.length) {
                  bestPathIds = pathIds;
                }
              }
            }
          }

          if (bestPathIds) {
            // junctionId列 → 連続する座標線分に変換
            for (let k = 0; k < bestPathIds.length - 1; k++) {
              const a = junctionLatLngMap[bestPathIds[k]];
              const b = junctionLatLngMap[bestPathIds[k + 1]];
              if (a && b) selectedSolidSegments.push([a, b]);
            }
            if (!globalStartCoord) globalStartCoord = junctionLatLngMap[bestPathIds[0]];
            globalEndCoord = junctionLatLngMap[bestPathIds[bestPathIds.length - 1]];
          } else {
            // 実在しない（つながらない）場合は点線で補間
            const sCoord = (startIds.map(id => junctionLatLngMap[id]).find(Boolean)) || null;
            const eCoord = (endIds.map(id => junctionLatLngMap[id]).find(Boolean)) || null;
            if (sCoord && eCoord) {
              selectedDashedSegments.push([sCoord, eCoord]);
              if (!globalStartCoord) globalStartCoord = sCoord;
              globalEndCoord = eCoord;
            }
          }
        }

        // 下地（存在する全区間）を描画
        if (baseSegments.length > 0) {
          // 太い黒→白で上書き
          L.polyline(baseSegments, { color: 'black', weight: 12, opacity: 1 }).addTo(map.value);
          L.polyline(baseSegments, { color: 'white', weight: 10, opacity: 1 }).addTo(map.value);
        }

        // 選択経路：実在区間は実線、欠落区間は点線
        if (selectedSolidSegments.length > 0) {
          L.polyline(selectedSolidSegments, { color: 'black', weight: 5, opacity: 1 }).addTo(map.value);
        }
        if (selectedDashedSegments.length > 0) {
          L.polyline(selectedDashedSegments, {
            color: 'black',
            weight: 5,
            opacity: 1,
            dashArray: '6 6',
            lineCap: 'butt'
          }).addTo(map.value);
        }

        // 航路点の目印（任意）：下地の端点を重複排除して描画
        {
          const endpoints = baseSegments.flat();
          const uniq = [];
          const keySet = new Set();
          for (const p of endpoints) {
            const key = `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
            if (!keySet.has(key)) {
              keySet.add(key);
              uniq.push(p);
            }
          }
          uniq.forEach(coord => {
            L.circleMarker(coord, {
              radius: 5,
              color: 'black',
              fill: true,
              fillColor: 'white',
              fillOpacity: 0.6,
            }).addTo(map.value);
          });
        }

        // スタート/ゴール マーカー（ユーザー順の全経路から決定）
        if (props.showMarker) {
          const startCoord = globalStartCoord;
          const endCoord   = globalEndCoord;

          if (startCoord && endCoord) {
            let startIcon, goalIcon;
            if (props.isEndIdFirst) {
              startIcon = L.icon({ iconUrl: goaliconUrl,  iconSize: [35, 35], iconAnchor: [17, 36] });
              goalIcon  = L.icon({ iconUrl: starticonUrl, iconSize: [35, 35], iconAnchor: [17, 36] });
            } else {
              startIcon = L.icon({ iconUrl: starticonUrl, iconSize: [35, 35], iconAnchor: [17, 36] });
              goalIcon  = L.icon({ iconUrl: goaliconUrl,  iconSize: [35, 35], iconAnchor: [17, 36] });
            }
            L.marker(startCoord, { icon: startIcon }).addTo(map.value);
            L.marker(endCoord,   { icon: goalIcon  }).addTo(map.value);
          }
        }

        // 出発・到着ポートは従来通り
        if (props.departurePort) {
          const portIcon = L.icon({ iconUrl: porticonUrl, iconSize: [15, 15] });
          L.marker(props.departurePort, { icon: portIcon, type: 'departurePort' }).addTo(map.value);
        }
        if (props.arrivalPort) {
          const portIcon = L.icon({ iconUrl: porticonUrl, iconSize: [15, 15] });
          L.marker(props.arrivalPort, { icon: portIcon, type: 'arrivalPort' }).addTo(map.value);
        }

        // 表示範囲調整（下地＋選択経路すべて）
        {
          const boundsLatLngs = []
            .concat(...baseSegments)
            .concat(...selectedSolidSegments)
            .concat(...selectedDashedSegments);
          if (boundsLatLngs.length > 0) {
            map.value.fitBounds(boundsLatLngs);
          }
        }

        // ── ここまで置き換え ──
      }
    };

    onMounted(async () => {
      renderMap(props.chartData, props.airwayId, props.sectionList);
    });

    return { map, map_moveend, MapLayerControlMounted, changedId };
  },
  methods: {
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
.grayscale-map {
  filter: grayscale(100%)!important;
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
