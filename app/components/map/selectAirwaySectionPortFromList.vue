<template>
  <div :id="changedId" style="height: 100%;">

    <div v-if="showCheckBox" class="layer-control-top-right">
      <MapProhibitedAreaControl :map="map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
      <MapLayerControl :stepNo="stepNo" :map="map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
    </div>
    <div v-if="showLegend" class="legend-bottom-left">
      <MapLegend />
    </div>
    <div id="selectAirwayFromList" class="map-select-airway-from-list"></div>
  </div>
</template>

<script>
import 'leaflet/dist/leaflet.css';
import starticonUrl from '../assets/css/img/dummyImg/svg_uaslSectionStart.svg';
import goaliconUrl from '../assets/css/img/dummyImg/svg_uaslSectionGoal.svg';
import iconUrl from "../assets/css/img/dummyImg/dummy_new_legendIcon_waypoint.svg";
import iconSelectedUrl from "../assets/css/img/dummyImg/dummy_legendIcon_waypoint_selected.svg";
// 料金表管理改修  Start
import porticonUrl from '../assets/css/img/dummyImg/dummy_new_circle-dot-regular.svg';
// 料金表管理改修  End
import { ref, onMounted, watch, computed } from 'vue';
import MapLayerControl from '../mapLayerControl.vue';
import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';
import { semanticUaslResultToPayload } from '~/utils/airway';

export default {
  components: {
    MapLayerControl,
    MapProhibitedAreaControl,
  },
  props: {
    airwayId: {
      type: Array,
      required: true,
    },
    airwayData: {
      type: Object,
      required: true,
    },
    section: {
      type: String,
      required: false,
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
    portData: {
      type: Object,
      required: false,
    },
    stepNo: {
      type: String,
      required: true,
    },
    departureSectionPoint: {
      type: Array,
      required: false
    },
    arrivalSectionPoint: {
      type: Array,
      required: false
    },
    selectedAirwayIds: {
      type: Array,
      required: false,
      default: () => [],
    },
    selectedSectionLine: {
      type: Array,
      required: false,
      default: () => [],
    },
    selectedSegments: {
      type: Array,
      required: false,
      default: () => [],
    },
    area: {
      type: String,
      required: false,
      default: '---',
    },
    areaInfo: {
      type: Object,
      required: false,
      default: () => ({ areas: [] }),
    },
    suppressFitBounds: {
      type: Boolean,
      required: false,
      default: false,
    },
    droneData: {
      type: Object,
      required: true,
    },
  },
  emits: ['update:isEndIdFirst', 'airwaysUpdated', 'ownAirwaysUpdated', 'portsUpdated'],
  setup(props, { emit }) {
    let client = null;
    const map = ref(null);
    const map_moveend = ref(false);
    let L;

    // 料金表管理改修  Start
    const { constants } = useMyConstant()
    const { convertCode } = useMyFilter()
    let portGroup = null;
    // 料金表管理改修  End

    let backgroundGroup = null;
    let selectedGroup = null;
    let markerGroup = null;
    let selectionLineGroup = null;

    const viewCorners = ref({ point1: null, point2: null, point3: null, point4: null });
    const airwayJunctions = ref([]);
    const allAirwayData = ref(null);
    const centerCoordinate = ref(null);
    const radiusMeters = ref(null);

    const changedId = computed(() => {
      return props.id ? `mapShowAirwayReservationConfirmation${props.id}` : 'mapShowAirwayReservationConfirmation';
    });

    const waypointIconRef = ref(null);
    const lastFitBoundsKey = ref('');

    const waypointIconDefaultRef = ref(null);
    const waypointIconSelectedRef = ref(null);

    const selectedIdsFromProps = () => {
      if (Array.isArray(props.selectedAirwayIds) && props.selectedAirwayIds.length) return props.selectedAirwayIds;
      if (Array.isArray(props.airwayId)) return props.airwayId;
      if (typeof props.airwayId === 'string' && props.airwayId) return [props.airwayId];
      return [];
    };

    // 「start/end が揃って青ルート線（selectedSegments）が引けている航路ID」だけを確定扱いにする
    const completedAirwayIdSet = computed(() => {
      const segs = Array.isArray(props.selectedSegments) ? props.selectedSegments : [];
      const ids = segs
        .filter(s => s && !s.dashed && s.airwayId)   // 航路間点線(dashed)は除外
        .map(s => String(s.airwayId));
      return new Set(ids);
    });

    const isRouteCompletedFor = (airwayId) => {
      if (!airwayId) return false;
      return completedAirwayIdSet.value.has(String(airwayId));
    };

    const updateViewCorners = () => {
      const m = map.value;
      if (!m?._loaded) return false;

      const b = m.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const center = b.getCenter();

      // 半径（中心〜表示領域の最遠点）
      const maxMeters = Math.max(m.distance(center, sw), m.distance(center, ne));
      radiusMeters.value = maxMeters * 1.05;

      viewCorners.value = {
        point1: `${sw.lng},${sw.lat}`,
        point2: `${ne.lng},${sw.lat}`,
        point3: `${ne.lng},${ne.lat}`,
        point4: `${sw.lng},${ne.lat}`,
      };
      centerCoordinate.value = center;

      return true;
    };

    const initMap = async () => {
      if (!process.client) return;
      const leafletModule = await import('leaflet');
      L = leafletModule.default;
      waypointIconDefaultRef.value = L.icon({ iconUrl: iconUrl, iconSize: [10, 10] });
      waypointIconSelectedRef.value = L.icon({ iconUrl: iconSelectedUrl, iconSize: [16, 16] }); // 少し大きく等

      try {
        const mod = await import('semantic-client-library');
        const UaslSystemClient = mod.UaslSystemClient; // named export想定
        client = new UaslSystemClient();
      } catch (e) {
        console.warn('[semantic] dynamic import/init failed -> fallback', e);
        client = null;
      }

      const container = L.DomUtil.get(changedId.value);
      if (container !== null) container._leaflet_id = null;

      map.value = L.map(changedId.value, { scrollWheelZoom: false, keyboard: false });

      L.tileLayer(
        useRuntimeConfig().public.mapTileUrl,
        {
          className: "grayscale-map",
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
        }
      ).addTo(map.value);

      map.value.zoomControl.setPosition('topleft');

      backgroundGroup = L.layerGroup().addTo(map.value);
      selectedGroup = L.layerGroup().addTo(map.value);
      markerGroup = L.layerGroup().addTo(map.value);
      selectionLineGroup = L.layerGroup().addTo(map.value);

      // 料金表管理改修  Start
      portGroup = L.layerGroup().addTo(map.value);
      // 料金表管理改修  End

      waypointIconRef.value = L.icon({ iconUrl: iconUrl, iconSize: [15, 15] });

      map.value.on('moveend', async () => {
        if (props.area === '---') return;
        if (!updateViewCorners()) return;

        map_moveend.value = true;
        await fetchAllAirways();
        drawBackground();
        scheduleUpdate();
      });
    };
    // 料金表管理改修  Start
    /**
     * 離着陸場を地図に描画する
     */
    const drawPorts = () => {
      if (!map.value || !portGroup) return;
      portGroup.clearLayers();

      if (!portCache.value || !Array.isArray(portCache.value.data)) return;

      const portIcon = L.icon({
        iconUrl: porticonUrl,
        iconSize: [15, 15],
      });

      portCache.value.data.forEach(port => {
        if (port.lat == null || port.lon == null) return;

        const marker = L.marker([port.lat, port.lon], { icon: portIcon });
        const popupContent = createPopupContent([
          port.lat,
          port.lon,
          port.dronePortName,
          port.dronePortId,
          port.portType,
          port.activeStatus,
          port.priceInfos,
        ]);

        marker.bindPopup(popupContent, { minWidth: 500 });
        portGroup.addLayer(marker);
      });
    };
    /**
     * ポップアップ表示内容を編集する
     * @param coords 離着陸場情報
     */
    function createPopupContent(coords) {
      // 離着陸場名
      const portName = coords[2];
      // 離着陸場情報
      const popupContent = `<b>${portName}</b><br>
        <div style="margin: 8px 0; height: 1px; background-color: #e0e0e0;"></div>
        <table style="border-collapse: collapse;">
          <tr>
            <td style="padding: 2px 8px 2px 0; vertical-align: top; width: 120px;">離着陸場ID:</td>
            <td style="padding: 2px 0;">${coords[3]}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px 2px 0; vertical-align: top;">離着陸場種類:</td>
            <td style="padding: 2px 0;">${convertCode(coords[4], 'portType')}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px 2px 0; vertical-align: top;">動作状況:</td>
            <td style="padding: 2px 0;">${convertCode(coords[5], 'activeStatus')}</td>
          </tr>
        </table>
        <div style="margin: 8px 0; height: 1px; background-color: #e0e0e0;"></div>`;

      // 料金表情報
      let priceTable = `<b>料金表</b><br>
        <div style="max-height: 250px; overflow-y: auto; margin-top: 8px;">
          <table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f2f2f2; text-align: center;">
                <th style="border: 1px solid #ddd; padding: 4px;">料金単価</th>
                <th style="border: 1px solid #ddd; padding: 4px; width: 90px;">料金タイプ</th>
                <th style="border: 1px solid #ddd; padding: 4px;">時間単位</th>
                <th style="border: 1px solid #ddd; padding: 4px; width: 130px;">適用開始日時</th>
                <th style="border: 1px solid #ddd; padding: 4px; width: 130px;">適用終了日時</th>
              </tr>
            </thead>
            <tbody>`;

      if (coords[6] && coords[6].length > 0) {
        coords[6]
        .slice()
        .sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0))
        .forEach(priceInfo => {
          const priceTypeText = convertCode(priceInfo.priceType, 'priceType') || priceInfo.priceType;
          
          priceTable += `
            <tr>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: end;">${utils.formatPrice(priceInfo.price) || priceInfo.price}</td>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${priceTypeText}</td>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: end;">${priceInfo.pricePerUnit}</td>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${utils.toFormatJSTtime(priceInfo.effectiveStartTime, constants.format.datetimeWithSeconds, 'local')}</td>
              <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${utils.toFormatJSTtime(priceInfo.effectiveEndTime, constants.format.datetimeWithSeconds, 'local')}</td>
            </tr>`;
        });
      }
      priceTable += `</tbody></table></div>`;

      return popupContent + priceTable;
    }
    // 料金表管理改修  End

    const centerListOf = (aw) => {
      return aw.airwayJunctions.map((junction) => {
        const c = junction.airways[0].airway.geometry.coordinates;
        return [ (c[0][1] + c[2][1]) / 2, (c[0][0] + c[2][0]) / 2 ];
      });
    };

    const drawBackground = () => {
      if (!map.value || !backgroundGroup) return;
      backgroundGroup.clearLayers();
      if (airwayJunctions.value.length === 0) return;

      const selectedIds = selectedIdsFromProps();

      airwayJunctions.value.forEach(airway => {
        // 選択中の航路は背景側では描かない（重複防止）
        if (selectedIds.includes(airway.id)) return;

        // 航路線
        const gray = L.polyline(airway.points, {
          color:'#556AA0',
          weight:24,
          opacity:0.24,
          lineCap:'round',
          lineJoin:'round'
        });

        // クリックで飛行目的・航路名をポップアップ表示
        const tooltipLines = [
          airway.purpose   ? `飛行目的: ${airway.purpose}`   : null,
          airway.airwayName ? `航路名: ${airway.airwayName}` : null,
        ].filter(Boolean);
        if (tooltipLines.length > 0) {
          gray.bindPopup(tooltipLines.join('<br>'), { maxWidth: 300 });
          gray.on('click', (e) => {
            gray.openPopup(e.latlng);
          });
        }

        backgroundGroup.addLayer(gray);

        // 航路点（通常アイコン）
        airway.points.forEach((coords, idx) => {
          const m = L.marker(coords, { icon: waypointIconDefaultRef.value });
          const name = Array.isArray(airway.names) ? airway.names[idx] : '';
          if (name) m.bindPopup(name);
          m.on('click', () => { if (m.getPopup()) m.openPopup(); });
          backgroundGroup.addLayer(m);
        });
      });
    };

    const drawSelected = () => {
      if (!map.value || !selectedGroup) return;
      selectedGroup.clearLayers();

      const dataAirways = props.airwayData?.airway?.airways || [];
      const ids = selectedIdsFromProps();
      const bounds = [];

      // 色定義
      const BLUE = '#2C69FF';
      const GRAY = '#556AA0';

      ids.forEach(id => {
        const aw = dataAirways.find(a => a.airwayId === id);
        if (!aw) return;

        const coords = centerListOf(aw);
        if (!coords.length) return;

        const completed = isRouteCompletedFor(id);

        if (!completed) {
          const outline = L.polyline(coords, {
            color: BLUE,
            weight: 30,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          });
          selectedGroup.addLayer(outline);

          const band = L.polyline(coords, {
            color: '#B1C8FF',
            weight: 24,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          });
          selectedGroup.addLayer(band);

          band.bringToFront?.();
        } else {
          const grayBand = L.polyline(coords, {
            color: GRAY,
            weight: 24,
            opacity: 0.24,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          });
          selectedGroup.addLayer(grayBand);

          const dotted = L.polyline(coords, {
            color: GRAY,
            weight: 4,
            opacity: 0.8,
            dashArray: '1 14',
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          });
          selectedGroup.addLayer(dotted);
          dotted.bringToFront?.();
        }

        bounds.push(...coords);

        coords.forEach((p, idx) => {
          const name = aw.airwayJunctions[idx]?.airwayJunctionName || '';
          const m = L.marker(p, { icon: waypointIconSelectedRef.value });
          if (name) m.bindPopup(name);
          m.on('click', () => m.openPopup());
          selectedGroup.addLayer(m);
        });
      });

      return bounds;
    };

    const drawMarkers = (bounds) => {
      if (!map.value || !markerGroup) return;
      markerGroup.clearLayers();

      let startPoint = null;
      let goalPoint = null;

      if (Array.isArray(props.departureSectionPoint) && props.departureSectionPoint.length === 2) {
        startPoint = props.departureSectionPoint;
      }
      if (Array.isArray(props.arrivalSectionPoint) && props.arrivalSectionPoint.length === 2) {
        goalPoint = props.arrivalSectionPoint;
      }

      if (props.showMarker) {
        if (startPoint) {
          const startIcon = L.icon({ iconUrl: starticonUrl, iconSize: [35, 35], iconAnchor: [17, 17] });
          markerGroup.addLayer(L.marker(startPoint, { icon: startIcon }));
          bounds.push(startPoint);
        }
        if (goalPoint) {
          const goalIcon = L.icon({ iconUrl: goaliconUrl, iconSize: [35, 35], iconAnchor: [17, 17] });
          markerGroup.addLayer(L.marker(goalPoint, { icon: goalIcon }));
          bounds.push(goalPoint);
        }
      }
      return bounds;
    };

    const fitBoundsIfChanged = (bounds) => {
      if (!map.value || !bounds || bounds.length === 0) return;
      const key = JSON.stringify(bounds);
      if (key === lastFitBoundsKey.value) return;
      lastFitBoundsKey.value = key;
      map.value.fitBounds(bounds);
    };

    const fetchAllAirways = async () => {
      try {
        // 前提情報が揃っていないときは何もしない
        if (!centerCoordinate.value || !radiusMeters.value) return;


        // 1) 離着陸場：semantic 優先
        let portsUpdated = false;
        
        if (client) {
          try {
            const searchArea = {
              latitude: centerCoordinate.value.lat,
              longitude: centerCoordinate.value.lng,
              radiusMeters: radiusMeters.value,
            }
            console.log('searchArea: ', searchArea)
            const nearbyPortRes = await client.getAllNearbyDroneport(searchArea);
            console.log('AllNearbyDroneport: ', nearbyPortRes)
            const nearbyPortData = (nearbyPortRes.data?.systems ?? []).flatMap(s => s.droneports ?? []);

            // ports を semantic で更新できた場合はキャッシュして親へ通知
            portCache.value.data = nearbyPortData.filter(p => Number(p?.activeStatus) === 2);
            console.log('portData: ', portCache.value)
            emit('portsUpdated', portCache.value);
            portsUpdated = true;
          } catch (e) {
            console.warn('[droneport] semantic failed -> fallback', e);
          }
        }

        // semanticでports更新できてないなら従来の fetchPortsOnce()
        if (!portsUpdated) {
          await fetchPortsOnce();
          emit('portsUpdated', portCache.value)
        }

        // 2) 航路：自社は GET /uasl-list、他社は semantic で追加取得
        // 2-1) 自社航路の取得（常に GET /uasl-list を使用）
        const ownUaslRes = await $fetch('/api/airway/uasl-list', { 
          method: 'GET',
          query: viewCorners.value
        });
        if (ownUaslRes.status !== 200) {
          console.error(`error: get uasl info {status: ${ownUaslRes.status}}.`);
          return;
        }
        const ownPayload = ownUaslRes.data;

        // 自社航路の uaslId セットを構築（他社フィルタに使用）
        const ownUaslIdSet = new Set(
          (ownPayload.uasl || []).flatMap(group => {
            const routes = Array.isArray(group.uasl) ? group.uasl : (group.uasl ? [group.uasl] : []);
            return routes.map(u => u.uaslId);
          })
        );

        // 自社航路のみのデータを変換して親へ通知（機体選択候補の絞り込みに使用）
        const ownAirwayResData = utils.convertUaslToAirway(ownPayload);
        const ownConverted = useAirwayConvertConnectionOrder(ownAirwayResData);
        emit('ownAirwaysUpdated', ownConverted);

        // 2-2) 他社航路の取得（semantic が使える場合のみ）
        let uaslData = ownPayload;

        if (client) {
          try {
            const searchArea = {
              latitude: centerCoordinate.value.lat,
              longitude: centerCoordinate.value.lng,
              radiusMeters: radiusMeters.value,
            }
            console.log('searchArea: ', searchArea)
            const nearbyUaslRes = await client.getAllNearbyUasl(searchArea);
            console.log('AllNearbyUasl: ', nearbyUaslRes)
            const semanticData = nearbyUaslRes?.data;
            if (!semanticData) {
              throw new Error('getAllNearbyUasl: data not found.');
            }
            const semanticPayload = semanticUaslResultToPayload(semanticData);

            // getAllNearbyUasl の結果から自社航路ID（GET /uasl-list 取得分）を除外して他社航路のみ残す
            const otherPayload = {
              uasl: (semanticPayload.uasl || [])
                .map(group => {
                  const routes = Array.isArray(group.uasl) ? group.uasl : (group.uasl ? [group.uasl] : []);
                  return { ...group, uasl: routes.filter(u => !ownUaslIdSet.has(u.uaslId)) };
                })
                .filter(group => group.uasl.length > 0)
            };

            // セマンティックデータから { [uaslId]: { [uaslPointId]: name } } ルックアップを構築し、
            // 自社 uaslPoints の uaslPointName が null かつ externalSystemInfo がある点の名前を補完する
            const extPointLookup = {};
            for (const grp of (semanticPayload.uasl || [])) {
              for (const u of (grp.uasl || [])) {
                if (!extPointLookup[u.uaslId]) extPointLookup[u.uaslId] = {};
                for (const p of (u.uaslPoints || [])) {
                  if (p.uaslPointId && p.uaslPointName) {
                    extPointLookup[u.uaslId][p.uaslPointId] = p.uaslPointName;
                  }
                }
              }
            }
            for (const grp of (ownPayload.uasl || [])) {
              const routes = Array.isArray(grp.uasl) ? grp.uasl : (grp.uasl ? [grp.uasl] : []);
              for (const u of routes) {
                for (const p of (u.uaslPoints || [])) {
                  if (!p.uaslPointName && p.externalSystemInfo?.uaslId && p.externalSystemInfo?.uaslPointId) {
                    const name = extPointLookup[p.externalSystemInfo.uaslId]?.[p.externalSystemInfo.uaslPointId];
                    if (name) p.uaslPointName = name;
                  }
                }
              }
            }

            // 自社（GET /uasl-list）＋他社（semantic）をマージ
            uaslData = {
              uasl: [...(ownPayload.uasl || []), ...(otherPayload.uasl || [])]
            };

            const keyToId = buildAircraftKeyToIdMap();
            normalizeDroneListToAircraftInfoIds(uaslData, keyToId);
          } catch (e) {
            console.warn('[uasl] semantic failed -> own company only', e);
            // semantic 失敗時は自社航路のみ使用（uaslData は ownPayload のまま）
          }
        }

        const airwayResData = utils.convertUaslToAirway(uaslData);
        const converted = useAirwayConvertConnectionOrder(airwayResData);
        allAirwayData.value = converted;

        console.log('airwayData: ', converted)
        emit('airwaysUpdated', converted);

        airwayJunctions.value = converted['airway']['airways'].map((airway) => {
          const points = airway['airwayJunctions'].map((junction) => {
            const c = junction['airways'][0]['airway']['geometry']['coordinates'];
            return [(c[0][1] + c[2][1]) / 2, (c[0][0] + c[2][0]) / 2];
          });
          const names = airway['airwayJunctions'].map(j => j.airwayJunctionName);
          return {
            id: airway['airwayId'],
            points,
            names,
            airwayName: airway['airwayName'] || '',
            purpose: airway['flightPurpose'] || '',
          };
        });

      } catch (e) {
        console.error(e);
        airwayJunctions.value = [];
        allAirwayData.value = null;
        emit('airwaysUpdated', { airway: { airways: [] } });
      }
    };

    let updateTimer = null;
    const scheduleUpdate = () => {
      if (!map.value || !map.value._loaded) return;
      if (updateTimer) clearTimeout(updateTimer);

      updateTimer = setTimeout(() => {
        updateTimer = null;
        if (!map.value) return;

        const boundsFromSelected = drawSelected() || [];
        const afterMarkers = drawMarkers(boundsFromSelected) || boundsFromSelected;
        const finalBounds = drawSelectedSectionLine(afterMarkers) || afterMarkers;

        // ＋/−のときだけ抑止
        if (!props.suppressFitBounds) {
          fitBoundsIfChanged(finalBounds);
        }
      }, 50);
    };

    const activateByArea = async () => {
      if (!map.value) return;

      const center = getAreaCenterLatLng();
      if (!center) {
        backgroundGroup?.clearLayers();
        airwayJunctions.value = [];
        allAirwayData.value = null;

        // エリア未選択なので、候補は空
        emit('airwaysUpdated', { airway: { airways: [] } });

        return;
      }

      map.value.setView(center, 15, { animate: false });
      await new Promise(resolve => map.value.whenReady(resolve));
      await fetchPortsOnce();
      if (!updateViewCorners()) return;
      await fetchAllAirways();
      drawBackground();
      scheduleUpdate();
    };

    const drawSelectedSectionLine = (bounds) => {
      if (!map.value || !selectionLineGroup) return bounds;
      selectionLineGroup.clearLayers();

      const CENTER = '#2C69FF';
      const BORDER = '#394FD8';

      const addRouteLine = (pts, extraOpts = {}) => {
        if (!Array.isArray(pts) || pts.length < 2) return;
      
        const baseOpts = {
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
          ...extraOpts,
        };
      
        // 1) 枠線（下）
        const borderLine = L.polyline(pts, {
          ...baseOpts,
          color: BORDER,
          weight: 12,
          opacity: 1.0,
        });
        selectionLineGroup.addLayer(borderLine);
      
        // 2) 真ん中（上）
        const centerLine = L.polyline(pts, {
          ...baseOpts,
          color: CENTER,
          weight: 8,
          opacity: 1.0,
        });
        selectionLineGroup.addLayer(centerLine);
      
        // 必ず真ん中線が前面
        centerLine.bringToFront?.();
        bounds.push(...pts);
      };

      const addDottedLine = (pts) => {
        if (!Array.isArray(pts) || pts.length < 2) return;
        const dot = L.polyline(pts, {
          color: '#E47200',
          weight: 6,             // ドットの直径感（太さ）
          opacity: 1.0,
          dashArray: '1 14',
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        });
        selectionLineGroup.addLayer(dot);
        dot.bringToFront?.();
        bounds.push(...pts);
      };

      const segs = Array.isArray(props.selectedSegments) ? props.selectedSegments : [];
      if (segs.length > 0) {
        segs.forEach(seg => {
          const pts = Array.isArray(seg.line)
            ? seg.line.filter(p => Array.isArray(p) && p.length === 2)
            : [];
          if (pts.length >= 2) {
            if (seg.dashed) {
              addDottedLine(pts);
            } else {
              addRouteLine(pts); 
            }
          }
        });
        const depPort = (Array.isArray(props.departurePort) && props.departurePort.length === 2) ? props.departurePort : null;
        const arrPort = (Array.isArray(props.arrivalPort) && props.arrivalPort.length === 2) ? props.arrivalPort : null;
        const depSec  = (Array.isArray(props.departureSectionPoint) && props.departureSectionPoint.length === 2) ? props.departureSectionPoint : null;
        const arrSec  = (Array.isArray(props.arrivalSectionPoint) && props.arrivalSectionPoint.length === 2) ? props.arrivalSectionPoint : null;
        if (depPort && depSec) addRouteLine([depPort, depSec]);
        if (arrSec && arrPort) addRouteLine([arrSec, arrPort]);
        return bounds;
      }

      const pts = Array.isArray(props.selectedSectionLine)
        ? props.selectedSectionLine.filter(p => Array.isArray(p) && p.length === 2)
        : [];
      if (pts.length >= 2) {
        addRouteLine(pts);
        bounds = bounds.concat(pts);
      }

      const depPort = (Array.isArray(props.departurePort) && props.departurePort.length === 2) ? props.departurePort : null;
      const arrPort = (Array.isArray(props.arrivalPort) && props.arrivalPort.length === 2) ? props.arrivalPort : null;
      const depSec  = (Array.isArray(props.departureSectionPoint) && props.departureSectionPoint.length === 2) ? props.departureSectionPoint : null;
      const arrSec  = (Array.isArray(props.arrivalSectionPoint) && props.arrivalSectionPoint.length === 2) ? props.arrivalSectionPoint : null;
      if (depPort && depSec) addRouteLine([depPort, depSec]);
      if (arrSec && arrPort) addRouteLine([arrSec, arrPort]);

      return bounds;
    };

    const getAreaCenterLatLng = () => {
      const name = props.area;
      if (!name || name === '---') return null;

      const areas = props.areaInfo?.areas;
      if (!Array.isArray(areas)) return null;

      const area = areas.find(a => a.name === name);
      const coords = area?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;

      const [lon, lat] = coords;
      if (typeof lat !== 'number' || typeof lon !== 'number') return null;

      return [lat, lon];
    };

    const portCache = ref(null);
    
    const fetchPortsOnce = async () => {
      if (portCache.value) return portCache.value;
       try {
        const portRes = await $fetch('/api/drone/droneport/info/list', { 
          method: 'GET',
          query: { 
          activeStatus: '2',
          portType: '1,2',
          publicFlag: 'true',
          // 料金表管理改修  Start
          isRequiredPriceInfo: true
          // 料金表管理改修  End
          }
        });
       
        if (portRes.status !== 200) {
          console.error(`error: get port info {status: ${portRes.status}}.`);
          portCache.value = { data: [] };
          emit('portsUpdated', portCache.value);
          return portCache.value;
        }
       
         portCache.value = portRes.data;
         emit('portsUpdated', portCache.value);
         return portCache.value;
       } catch (e) {
         console.error('failed to fetch droneport list:', e);
         portCache.value = { data: [] };
         emit('portsUpdated', portCache.value);
         return portCache.value;
       }
     };

    const hasSelectionOnMap = () => {
      // 何かしら描画対象があるなら fitBounds 優先にする
      const ids = selectedIdsFromProps();
      if (ids.length > 0) return true;

      if (Array.isArray(props.selectedSegments) && props.selectedSegments.length > 0) return true;
      if (Array.isArray(props.selectedSectionLine) && props.selectedSectionLine.length >= 2) return true;

      if (Array.isArray(props.departureSectionPoint) && props.departureSectionPoint.length === 2) return true;
      if (Array.isArray(props.arrivalSectionPoint) && props.arrivalSectionPoint.length === 2) return true;

      return false;
    };

    // maker+modelNumber -> aircraftInfoId の辞書を作る
    const buildAircraftKey = (x) => {
      const maker = (x?.maker ?? '').trim();
      const modelNumber = (x?.modelNumber ?? x?.model_number ?? '').trim();
      return `${maker}|${modelNumber}`;
    };

    const buildAircraftKeyToIdMap = () => {
      const aircraft = props.droneData?.aircraft || [];
      const m = new Map();
      for (const a of aircraft) {
        m.set(buildAircraftKey(a), Number(a.aircraftInfoId));
      }
      return m;
    };

    // uaslData 内の droneList を再帰的に走査して、
    // droneList が「オブジェクト配列」なら aircraftInfoId 配列に置換する
    const normalizeDroneListToAircraftInfoIds = (node, keyToId) => {
      if (!node) return;

      if (Array.isArray(node)) {
        node.forEach(v => normalizeDroneListToAircraftInfoIds(v, keyToId));
        return;
      }

      if (typeof node !== 'object') return;

      for (const [k, v] of Object.entries(node)) {
        if (k === 'droneList' && Array.isArray(v)) {
          // 既に number/string 配列なら従来形式なのでそのまま
          const first = v[0];
          const isIdArray = typeof first === 'number' || typeof first === 'string';
          if (v.length === 0 || isIdArray) continue;

          // オブジェクト配列 -> aircraftInfoId 配列へ
          const ids = v
            .map(item => keyToId.get(buildAircraftKey(item)))
            .filter(id => Number.isFinite(id));

          // 必要なら重複排除（従来仕様に合わせたいなら Set 推奨）
          node[k] = [...new Set(ids)];

          continue;
        }

        normalizeDroneListToAircraftInfoIds(v, keyToId);
      }
    };

    onMounted(async () => {
      await initMap();
    });

    watch(airwayJunctions, () => {
      drawBackground();
    });
    
    // エリア選択が変わったら中心移動（選択が無い場合のみ）
    watch(
      [() => props.area, () => props.areaInfo],
      async () => { await activateByArea(); },
      { deep: true }
    );
    
    // 料金表管理改修  Start
    watch(
      () => portCache,
      () => {
        drawPorts();
      },
      { deep: true }
    );
    // 料金表管理改修  End
    
    watch(
      [
        () => props.section,
        () => props.airwayId,
        () => props.selectedAirwayIds,
        () => props.departurePort,
        () => props.arrivalPort,
        () => props.departureSectionPoint,
        () => props.arrivalSectionPoint,
        () => props.showMarker,
        () => props.selectedSectionLine,
        () => props.selectedSegments,
      ],
      () => { scheduleUpdate(); },
      { deep: false }
    );

    watch(
      () => props.suppressFitBounds,
      (nv, ov) => {
        if (ov === true && nv === false) lastFitBoundsKey.value = '';
      }
    );

    watch(
      [() => props.selectedAirwayIds, () => props.airwayId],
      () => {
        drawBackground();   // 背景を選択状態に合わせて描き直す
        scheduleUpdate();   // 選択レイヤー等も更新
      },
      { deep: false }
    );

    return { map, map_moveend, changedId };
  },
  methods: {
    handleWeatherChanged(changeed) {
      this.map_moveend = false;
    },
    handleMapLayerControlMounted(Mounted) {
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
.map-select-airway-from-list {
  height: 100%;
}

/* Leaflet は .leaflet-container に overflow:hidden を自分で持つため、
   border-radius をここに直接当てるのが最も確実 */
:deep(.leaflet-container) {
  border-radius: 8px;
}
</style>