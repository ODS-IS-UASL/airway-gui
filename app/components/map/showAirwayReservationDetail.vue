<template>
  <div :id="changedId" style="height: 100%;">
    <div v-if="showCheckBox" class="layer-control-top-right">
      <MapProhibitedAreaControl :map="map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :map="map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div v-if="showLegend" class="legend-bottom-left">
      <MapLegend />
    </div>
  </div>
</template>

<script>
// 必要なモジュールをインポート
import 'leaflet/dist/leaflet.css';
import starticonUrl from '../assets/css/img/dummyImg/svg_airwaySectionStart.svg';
import goaliconUrl from '../assets/css/img/dummyImg/svg_airwaySectionGoal.svg';
import { ref, onMounted, watch, computed } from 'vue';
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
    section: {
      type: String,
      required: true,
    },
    airwayId: {
      type: String,
      required: true,
    },
    airwaySectionId: {
      type: Array,
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
    startJunctionId: { type: [String, Number], required: true },
    endJunctionId:   { type: [String, Number], required: true },
  },
  setup(props, { emit }) {
    const map = ref(null);  // 地図インスタンス
    const map_moveend = ref(false); // チェックボックス部品に渡す変数
    let L;  // Leafletライブラリのインスタンス

    const MapLayerControlMounted = ref(true);

    const changedId = computed(() => {
      return props.id ? `mapShowAirwayReservationConfirmation${props.id}` : 'mapShowAirwayReservationConfirmation';
    });

        // 地図を描画する非同期関数
    const renderMap = async (data, section, ids) => {
      if (process.client) {  // クライアントサイドでのみ実行
        if (map.value) {
          // 既存の地図を削除
          map.value.remove();
          map.value = null; // mapインスタンスをリセット
        }
        // Leaflet モジュールを非同期でインポート
        const leafletModule = await import('leaflet');
        L = leafletModule.default;
        
        // 地図を初期化
        map.value = L.map(changedId.value, {
          scrollWheelZoom: false,  // ホイールズームを無効化
        });

        // 国土地理院のタイルレイヤーを追加
        L.tileLayer(
          useRuntimeConfig().public.mapTileUrl,
          {
            className: "grayscale-map",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
          }
        ).addTo(map.value);

        map.value.zoomControl.setPosition('topleft');

        // ベース線（全既存セクション）と強調線（選択区間）をセグメント配列で保持
        const baseSegments = [];       // [[[lat,lng], [lat,lng]], ...]
        const highlightSegments = [];  // 選択区間だけのセグメント配列
        const dashedSegments = [];     // 追加: 未設定区画を結ぶ点線
        const allPointsForBounds = []; // fitBounds 用の全点
        const uniqueMarkerPoints = new Map(); // junctionId -> [lat,lng]

        // 複数 ID or 単一 ID を配列化
        const idList = Array.isArray(ids) ? ids : [ids];

        const startId = String(props.startJunctionId ?? '').trim();
        const endId   = String(props.endJunctionId ?? '').trim();


        // 対象航路の抽出（idList 順）
        const targetAirways = data.airway.airways.filter(a => idList.includes(a.airwayId));

        // 航路をまたいで start/end を特定
        let startPos = null;
        let endPos = null;

        targetAirways.forEach((airwayData, airwayIdx) => {
          airwayData.airwayJunctions.forEach((j, junctionIdx) => {
            const jid = String(j.airwayJunctionId ?? '').trim();
            if (!startPos && jid === startId) startPos = { airwayIdx, junctionIdx };
            if (!endPos && jid === endId)     endPos   = { airwayIdx, junctionIdx };
          });
        });

        // 進行方向の判定（航路をまたいで比較）
        let isEndIdFirst = false;
        if (startPos && endPos) {
          if (startPos.airwayIdx > endPos.airwayIdx) {
            isEndIdFirst = true;
          } else if (startPos.airwayIdx === endPos.airwayIdx && startPos.junctionIdx > endPos.junctionIdx) {
            isEndIdFirst = true;
          }
        }
        emit('update:isEndIdFirst', isEndIdFirst);

        // 予約された区画IDのセット（通過順は props.airwaySectionId の順）
        const reservedOrder = (props.airwaySectionId || []).filter(Boolean);
        const reservedSet   = new Set(reservedOrder);

        // junction の中心点計算（fallback 付き）
        function computeCenterFromCoords(coords) {
          try {
            const flat = Array.isArray(coords?.[0]?.[0]) ? coords.flat(2) : coords;
            let latSum = 0, lngSum = 0, n = 0;
            for (const pt of flat || []) {
              if (Array.isArray(pt) && pt.length >= 2) {
                lngSum += pt[0];
                latSum += pt[1];
                n++;
              }
            }
            if (n > 0) return [latSum / n, lngSum / n];
          } catch (e) {}
          return null;
        }
        // 距離の簡易計算（経度緯度のユークリッド距離）
        function distance(a, b) {
          if (!a || !b) return Number.POSITIVE_INFINITY;
          const dLat = a[0] - b[0];
          const dLng = a[1] - b[1];
          return Math.sqrt(dLat * dLat + dLng * dLng);
        }
        // 離発着ジャンクション判定
        function isStartOrEndJunction(jId) {
          return jId === startId || jId === endId;
        }

        // まず、全航路の junction 座標を集め、ベース線（全区画）と予約セクション情報を収集
        const reservedSectionsData = []; // {id, j0, j1, p0, p1}

        targetAirways.forEach((airwayData) => {
          // junction 重心キャッシュ
          const junctionCenter = new Map();
          airwayData.airwayJunctions.forEach(j => {
            const coords = j.airways?.[0]?.airway?.geometry?.coordinates;
            let center = computeCenterFromCoords(coords);
            // 緯度経度が直接ある場合のフォールバック（必要なら仕様に合わせて調整）
            if (!center && j.latitude != null && j.longitude != null) {
              center = [j.latitude, j.longitude];
            }
            if (!center) return;
            junctionCenter.set(j.airwayJunctionId, center);
            uniqueMarkerPoints.set(j.airwayJunctionId, center);
          });

          // 定義済み区画（ベース線）と予約セクション情報蓄積
          airwayData.airwaySections.forEach(sec => {
            const [j0, j1] = sec.airwayJunctionIds;
            const p0 = junctionCenter.get(j0) || uniqueMarkerPoints.get(j0);
            const p1 = junctionCenter.get(j1) || uniqueMarkerPoints.get(j1);
            if (!p0 || !p1) return;

            // ベース線（全区画）
            baseSegments.push([p0, p1]);
            allPointsForBounds.push(p0, p1);

            // 予約対象のセクションだけ保持
            if (reservedSet.has(sec.airwaySectionId)) {
              reservedSectionsData.push({ id: sec.airwaySectionId, j0, j1, p0, p1 });
            }
          });
        });

        // props.airwaySectionId の順に並べ替え（通過順の保証）
        const orderedSections = reservedOrder
        .map(id => reservedSectionsData.find(s => s.id === id))
        .filter(Boolean);

        // 出発点・着地点の座標
        const startCoord = uniqueMarkerPoints.get(startId);
        const endCoord   = uniqueMarkerPoints.get(endId);

        // セクションの入出（entry/exit）を決めて、ハイライトと点線を生成
        let prevExitCoord = null;
        let prevExitJunction = null;

        for (let i = 0; i < orderedSections.length; i++) {
          const s = orderedSections[i];
          // 隣接セクションとの共有ジャンクション判定に使う値（ループ内で算出）
          const prev = i > 0 ? orderedSections[i - 1] : null;
          const next = i < orderedSections.length - 1 ? orderedSections[i + 1] : null;
          const ends = [s.j0, s.j1];
          const prevEnds = prev ? [prev.j0, prev.j1] : [];
          const nextEnds = next ? [next.j0, next.j1] : [];
          const prevShared = ends.find(j => prevEnds.includes(j));
          const nextShared = ends.find(j => nextEnds.includes(j));

          // 離発着ジャンクション判定関数（先に定義）
          function isStartOrEndJunction(jId) {
            return jId === startId || jId === endId;
          }

          // entry/exit の決定
          let entryJunction = null;
          let exitJunction  = null;

          if (i === 0 && ends.includes(startId)) {
            // 最初のセクションは startId を入口にし、もう一方を出口にする
            entryJunction = startId;
            exitJunction  = ends[0] === startId ? ends[1] : ends[0];
          } else if (i === orderedSections.length - 1 && ends.includes(endId)) {
            // 最後のセクションは endId を出口にし、もう一方を入口にする
            exitJunction  = endId;
            entryJunction = ends[0] === endId ? ends[1] : ends[0];
          } else {
            // 中間セクション
            if (nextShared) {
              // 次セクションと共有している側を出口に、もう一方を入口に
              exitJunction  = nextShared;
              entryJunction = ends[0] === nextShared ? ends[1] : ends[0];
            } else if (prevShared) {
              // 前セクションと共有している側を入口に、もう一方を出口に
              entryJunction = prevShared;
              exitJunction  = ends[0] === prevShared ? ends[1] : ends[0];
            } else {
              // どちらとも共有が無い場合は、着地点に近い方を出口にする
              const e0 = uniqueMarkerPoints.get(ends[0]);
              const e1 = uniqueMarkerPoints.get(ends[1]);
              const d0 = distance(e0, endCoord);
              const d1 = distance(e1, endCoord);
              if (d0 <= d1) {
                exitJunction  = ends[0];
                entryJunction = ends[1];
              } else {
                exitJunction  = ends[1];
                entryJunction = ends[0];
              }
            }
          }

          const entryCoord = uniqueMarkerPoints.get(entryJunction);
          const exitCoord  = uniqueMarkerPoints.get(exitJunction);

          // 入出座標が取れないときはフォールバック（セクション全体をハイライト）
          if (!entryCoord || !exitCoord) {
            highlightSegments.push([s.p0, s.p1]);
            allPointsForBounds.push(s.p0, s.p1);
            prevExitCoord = s.p1;
            prevExitJunction = s.j1;
            continue;
          }

          if (i === 0) {
            // 最初のセクションは start -> exit を黒実線
            const head = startCoord || entryCoord;
            highlightSegments.push([head, exitCoord]);
            allPointsForBounds.push(head, exitCoord);
          } else {
            // 前セクションの出口と現セクションの入口が一致しない場合のみ、点線候補
            const mismatch = prevExitJunction !== entryJunction;

            // 現在セクションの隣接共有判定
            const prevEnds = prev ? [prev.j0, prev.j1] : [];
            const nextEnds = next ? [next.j0, next.j1] : [];
            const prevShared = ends.find(j => prevEnds.includes(j));
            const nextShared = ends.find(j => nextEnds.includes(j));

            // 現セクションが「両端が離発着点でなく、前後どちらとも共有なし」なら孤立内部扱い
            const isIsolatedCurrent =
              !isStartOrEndJunction(s.j0) &&
              !isStartOrEndJunction(s.j1) &&
              !prevShared &&
              !nextShared;

            // 前セクションの孤立内部判定（前の前との共有＆現セクションとの共有をチェック）
            const prevPrev = i > 1 ? orderedSections[i - 2] : null;
            const prevPrevEnds = prevPrev ? [prevPrev.j0, prevPrev.j1] : [];
            const prevEnds2 = prev ? [prev.j0, prev.j1] : [];
            const prevSharedWithPrevPrev = prevEnds2.find(j => prevPrevEnds.includes(j));
            const prevSharedWithCurrent  = prevEnds2.find(j => ends.includes(j));

            const isIsolatedPrev =
              prev != null &&
              !isStartOrEndJunction(prev.j0) &&
              !isStartOrEndJunction(prev.j1) &&
              !prevSharedWithPrevPrev &&
              !prevSharedWithCurrent;

            // どちらか一方が孤立内部セクションなら、そのセクションの航路点を含む点線は描画しない
            const shouldDrawDashed = mismatch && !isIsolatedCurrent && !isIsolatedPrev;

            if (shouldDrawDashed) {
              dashedSegments.push([prevExitCoord, entryCoord]);
              allPointsForBounds.push(prevExitCoord, entryCoord);
            }

            // 現セクションの入口 -> 出口を黒実線
            highlightSegments.push([entryCoord, exitCoord]);
            allPointsForBounds.push(entryCoord, exitCoord);
          }

          // 次へ渡す出口
          prevExitCoord = exitCoord;
          prevExitJunction = exitJunction;
        }

        // 最後の出口が endCoord と一致しない場合は、終点まで点線で補完
        if (
          prevExitCoord &&
          endCoord &&
          (prevExitJunction !== endId) // ジャンクションIDで一致判定
        ) {
          // 片方が着地点なので bothInternalDashedEndpoints は満たされず、描画してよい
          dashedSegments.push([prevExitCoord, endCoord]);
          allPointsForBounds.push(prevExitCoord, endCoord);
        }

        // 描画（存在する区画のセグメントだけを描く）

        if (baseSegments.length > 0) {
          L.polyline(baseSegments, {
            color: 'black',
            weight: 12,
            opacity: 1,
          }).addTo(map.value);

          L.polyline(baseSegments, {
            color: 'white',
            weight: 10,
            opacity: 1,
          }).addTo(map.value);
        }

        // 未設定区画の補間（点線）
        if (dashedSegments.length > 0) {
          L.polyline(dashedSegments, {
            color: 'black',
            weight: 4,
            opacity: 0.8,
            dashArray: '6,6',
          }).addTo(map.value);
        }
        
        // 強調（選択区間のみ）
        if (highlightSegments.length > 0) {
          L.polyline(highlightSegments, {
            color: 'black',
            weight: 5,
            opacity: 1,
          }).addTo(map.value);
        }

        // junction の丸マーカー（重複排除）
        uniqueMarkerPoints.forEach((latlng) => {
          L.circleMarker(latlng, {
            radius: 5,
            color: 'black',
            fill: true,
            fillColor: 'white',
            fillOpacity: 0.6,
          }).addTo(map.value);
        });

        // 予約区間の始点と終点にマーカーを追加（Marker & Icon）
        if (props.showMarker && highlightSegments.length > 0) {
          const startLatLng = highlightSegments[0][0];
          const endLatLng   = highlightSegments[highlightSegments.length - 1][1];

          const startIcon = L.icon({
            iconUrl: starticonUrl,
            iconSize: [35, 35],
            iconAnchor: [17, 36],
          });
          const goalIcon = L.icon({
            iconUrl: goaliconUrl,
            iconSize: [35, 35],
            iconAnchor: [17, 36],
          });

          L.marker(startLatLng, {icon: startIcon}).addTo(map.value);
          L.marker(endLatLng,   {icon: goalIcon}).addTo(map.value);
        }

        // 地図をズームして範囲を調整
        if (allPointsForBounds.length > 0) {
          map.value.fitBounds(allPointsForBounds);
        }
        // チェックボックス部品に渡す変数
        map.value.on('moveend', (event) => {
          console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
          if (!MapLayerControlMounted.value) {
            console.log(`map moved:${event}`);
            map_moveend.value = true;
          }
        });
      }
    };

    // 親から chartData が変更された時に再描画
    watch(() => props.chartData, (newData) => {
      renderMap(newData, props.section, props.airwayId);
    });

    watch(() => props.section, (newData) => {
      renderMap(props.chartData, newData, props.airwayId);
    });

    watch(() => props.airwayId, (newData) => {
      renderMap(props.chartData, props.section, newData);
    });
    watch(() => props.airwaySectionId, () => {
      renderMap(props.chartData, props.section, props.airwayId);
    });

    // コンポーネントのマウント時に初期描画
    onMounted(async () => {
      renderMap(props.chartData, props.section, props.airwayId);
    });

    return { map, map_moveend, MapLayerControlMounted, changedId };
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
