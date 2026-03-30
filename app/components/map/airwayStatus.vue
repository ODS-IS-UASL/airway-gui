<template>
  <div class="airway-status-layout">

    <!-- 左サイドパネル -->
    <transition name="slide">
      <div v-if="showPopup || showLocation" class="side-panel">

        <!-- 航路詳細パネル -->
        <template v-if="showPopup">
          <div class="panel-header">
            <span class="panel-title">航路情報</span>
            <button class="close-button" @click="closePopup">&times;</button>
          </div>
          <hr class="custom-hr" />
          <table class="info-table">
            <tr><td>航路番号</td><td>{{ PopupContent.airway_id }}</td></tr>
          </table>
          <hr class="custom-hr" />
          <table class="info-table">
            <tr><td>航路</td><td>{{ PopupContent.airway_name }}</td></tr>
          </table>
          <hr class="custom-hr" />
          <table class="info-table">
            <tr><td>区間</td><td>{{ PopupContent.airway_section }}</td></tr>
          </table>
          <hr class="custom-hr" />
          <table class="info-table">
            <tr><td>総距離</td><td>{{ PopupContent.airway_distance }}</td></tr>
          </table>
          <hr class="custom-hr" />
          <table class="info-table">
            <tr><td>飛行目的</td><td>{{ PopupContent.airway_porpose }}</td></tr>
          </table>
          <hr class="custom-hr" />
          <div id="content" class="b-twoColumn">
            <div class="c-landmarkNamingForm">
              <div class="c-formItem">
                <ul class="c-landmarkFormList">
                  <li v-for="(item, index) in combinedList()" :key="index" :class="item.type" style="align-items: center;">
                    <div class="e-dottedLine"></div>
                    <div class="e-textField landmarkNamingField" style="margin-bottom: 0;">{{ item.name }}</div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <table class="info-table">
            <tr><td>航路策定</td><td>{{ PopupContent.airway_date }}</td></tr>
          </table>
          <div class="spacer"></div>
        </template>

        <!-- ドローン位置詳細パネル -->
        <template v-if="showLocation">
          <div class="location-header-row">
            <span
              class="status-badge"
              :style="{ backgroundColor: LocationData.statusBgColor, color: LocationData.statusFgColor }"
            >{{ LocationData.operational_status_display }}</span>
            <span class="location-reservation-id">{{ LocationData.reservation_id }}</span>
            <button class="close-button" style="margin-left:auto" @click="closePopup">&times;</button>
          </div>
          <div class="location-detail">
            <div class="location-detail-row">
              <span class="location-detail-label">飛行日時</span>
              <span class="location-detail-value">{{ LocationData.flight_datetime_display }}</span>
            </div>
            <div class="location-detail-row">
              <span class="location-detail-label">航路</span>
              <span class="location-detail-value">{{ PopupContent.airway_name }}</span>
            </div>
            <div class="location-detail-row">
              <span class="location-detail-label">飛行時間</span>
              <span class="location-detail-value">{{ LocationData.airway_fligt_time }}</span>
            </div>
            <div class="location-detail-row">
              <span class="location-detail-label">総距離</span>
              <span class="location-detail-value">{{ PopupContent.airway_distance }}</span>
            </div>
            <div class="location-detail-row">
              <span class="location-detail-label">予約日</span>
              <span class="location-detail-value">{{ LocationData.reservation_reserved_date }}</span>
            </div>
          </div>
          <div v-if="muteFlg !== null" class="mute-switch-row">
            <span class="mute-switch-label">計画的な逸脱</span>
            <div
              class="ios-toggle"
              :class="{ 'ios-toggle--on': muteFlg === 'on' }"
              role="switch"
              :aria-checked="muteFlg === 'on'"
              @click="toggleMuteFlg()"
            >
              <span class="ios-toggle__thumb"></span>
            </div>
          </div>
          <hr class="custom-hr" />
          <div class="location-route-diagram">
            <v-timeline side="end" truncate-line="both" size="x-small" class="drn_timeline drn_timeline--route">
              <v-timeline-item
                v-for="(item, index) in combinedListTimeline()"
                :key="item.pointKey || ('loc-tl-' + index)"
                class="routeItem"
                :style="{
                  '--above-color': item.aboveColor,
                  '--below-color': item.belowColor
                }"
              >
                <v-tooltip location="top" open-on-click :open-on-hover="false" :open-on-focus="false">
                  <template #activator="{ props }">
                    <span class="routeClickBand" v-bind="props"></span>
                  </template>
                  <div class="routeTooltipContent">
                    <div v-for="p in timelineTooltipPairs" :key="p.name">
                      航路名 {{ p.name }}　予約番号 {{ p.id }}
                    </div>
                  </div>
                </v-tooltip>
                <template #icon>
                  <span class="routeTooltipDot"></span>
                </template>
                <span class="drn_timeline__title">{{ item.name }}</span>
              </v-timeline-item>
            </v-timeline>
          </div>
          <div class="spacer"></div>
        </template>

      </div>
    </transition>

    <!-- マップコンテナ -->
    <div class="map-container">
      <div id="leafletMap"></div>

      <!-- リスト・マップ切り替えトグル -->
      <div class="airway-status-link">
        <v-btn-toggle
          v-model="viewType"
          mandatory
          variant="flat"
          rounded="pill"
          border
          density="comfortable"
          class="drn_toggle drn_toggle--viewtype"
        >
          <a href="/airwayStatus">
            <v-btn value="listview" class="drn_toggle__btn">
              <img class="drn_toggle__map_btn" src="/assets/css/img/main/list-solid.svg" width="15" height="15">
            </v-btn>
          </a>
          <v-btn value="mapview" class="drn_toggle__btn">
            <img src="/assets/css/img/main/map-regular.svg" width="20" height="20">
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- 右オーバーレイコントロール -->
      <div class="area-control-middle-right">
        <MapProhibitedAreaControl :map="map" :map_moveend="map_moveend"></MapProhibitedAreaControl>
        <MapLayerControl :map="map" :map_moveend="map_moveend" @Weather_Changeed="handleWeatherChanged" @MapLayerControl_Mounted="handleMapLayerControlMounted"></MapLayerControl>
      </div>

      <!-- 左下凡例 -->
      <div class="area-control-bottom-left">
        <MapLegend></MapLegend>
      </div>
    </div>

  </div>
</template>

<script>
import 'leaflet/dist/leaflet.css';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import iconUrl from '../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg';
import porticonUrl from '../assets/css/img/dummyImg/dummy_circle-dot-regular.svg';
import MapLegend from '../mapLegend.vue';
import MapLayerControl from '../mapLayerControl.vue';
import MapProhibitedAreaControl from '../mapProhibitedAreaControl.vue';
import toggleBtn from '../toggleBtn.vue'
// 料金表管理改修  Start
import { UaslSystemClient } from "semantic-client-library";
import { getDefaultSearchRadiusMeters } from '~/utils/airway';
// 料金表管理改修  End

export default {
  props: {
    role: {
      type: Number,
      required: true,
    },
    cookie_role: {
      type: Object,
      required: true,
    },
    airwayId: {
      type: String,
      default: null,
    },
  },
  components: {
    MapLegend,
    MapLayerControl,
    MapProhibitedAreaControl,
    toggleBtn,
  },
  data() {
    return {
      viewType: 'mapview',
      buttonList : [{ label: 'off', value: 'off' }, { label: 'on', value: 'on' }],
    }
  },
  setup(props) {
    const operationalStatus = {
      BEFORE: "RouteApproach",
      NORMAL: "NormalOperation",
      DEVIATION: "RouteDeviation",
      // 適合性確認改修 start
      PLANNEDEVIATION: "PlannedRouteDeviation"
      // 適合性確認改修 end
    }

    // 4状態カラー取得ヘルパー（ステータスラベル・ドローンアイコン共通）
    const getOperationalStatusColor = (opStatus, evaluationResults) => {
      const pub = useRuntimeConfig().public;
      if (evaluationResults === false || evaluationResults === 'false') {
        return { fg: pub.statusColorDeviationFg, bg: pub.statusColorDeviationBg };
      }
      if (opStatus === operationalStatus.DEVIATION) {
        return { fg: pub.statusColorDeviationFg, bg: pub.statusColorDeviationBg };
      }
      if (opStatus === operationalStatus.PLANNEDEVIATION) {
        return { fg: pub.statusColorPlannedDeviationFg, bg: pub.statusColorPlannedDeviationBg };
      }
      return { fg: pub.statusColorNormalFg, bg: pub.statusColorNormalBg };
    };

    // RouteDeviation かつ計画的逸脱ONの場合は PlannedRouteDeviation として扱う
    const resolveOpStatus = (opStatus, plannedEnabled) => {
      if (opStatus === operationalStatus.DEVIATION && plannedEnabled) {
        return operationalStatus.PLANNEDEVIATION;
      }
      return opStatus;
    };
    // let L // Leafletインスタンス
    const map = ref(null);
    const showPopup = ref(false);
    const showLocation = ref(false);
    const map_moveend = ref(false);
    const locationList = ref([]);
    let timeout = ref(null);
    const MapLayerControlMounted = ref(true);
    const muteFlg = ref(null);
    const timelineTooltipPairs = ref([]);

    const PopupContent = ref({
      airway_id: "Not found",
      airway_name: "Not found",
      airway_section: "Not found",
      airway_distance: "Not found",
      airway_altitude: "Not found",
      airway_date: "Not found",
    });

    const LocationData = ref({
      reservation_id: "Not found",
      operational_status_flg: true,
      operational_status_display: "Not found",
      operational_status: "",
      statusBgColor: 'rgb(225, 234, 255)',
      statusFgColor: 'rgb(44, 105, 255)',
      airway_section_name: "Not found",
      airway_fligt_time: "Not found",
      airway_fligt_distance: "Not found",
      reservation_date: "Not found",
      flight_datetime_display: "",
      reservation_reserved_date: "",
      latlng: ref([]),
      timestamp: "",
    });

    const closePopup = () => {
      showPopup.value = false;
      showLocation.value = false;
      resetHighlight();
      // 選択中のドローンアイコンを通常状態に戻す
      if (selectedDroneInfo && L) {
        selectedDroneInfo.marker.setIcon(L.divIcon({
          className: '',
          html: selectedDroneInfo.normalHtml,
          iconSize: [45, 45],
          iconAnchor: [22, 22],
        }));
        selectedDroneInfo = null;
      }
    };

    const zoomInit = 16;
    const centerInit = [useRuntimeConfig().public.centerInitLat, useRuntimeConfig().public.centerInitLon];
    const areas = ref([]);
    const airwayJunctions = ref([]);
    let rangeData = null;
    let airwayData = null;
    let reservationData = null;
    let portData = null;
    let chartData = null;
    // 料金表管理改修  Start
    const client = new UaslSystemClient();
    let nearbyPortLayer = null;
    let nearbyUaslLayer = null;
    let airwayLineLayer = null;
    let sectionLineLayer = null;
    let waypointLayer = null;
    let highlightLayer = null; // 選択時の黒枠ポリラインと拡大航路点の层
    // 予約ごとのセクション端点座標リスト: reservationId -> [[p1,p2], ...]
    const reservationSectionEndpointsMap = new Map();
    let L = null;
    // 予約ごとの航路区画レイヤー管理: reservationId -> { isNormal: bool, group: LayerGroup }
    const reservationSectionLayerMap = new Map();
    // 予約ごとの最新位置情報キャッシュ: reservationId -> { locationData, conformityAssessmentRes }
    const reservationLocationMap = new Map();
    // 航路・区画・航路点の描画定数
    const AIRWAY_WEIGHT = 28;
    const SECTION_WEIGHT = 6;
    const WAYPOINT_RADIUS = 6;
    // 予約ごとの区画ポリライン参照 (ハイライト用): reservationId -> [polyline, ...]
    const reservationSectionPolylineMap = new Map();
    // 現在選択中のドローンマーカー情報: { marker, droneColor } | null
    let selectedDroneInfo = null;
    // 料金表管理改修  End

    const setPopupContent = async (id) => {
      // 画定番号
      PopupContent.value.airway_id = id;
      PopupContent.value.airway_name = useAirwayGetAirwayNameFromAirwayId(airwayData, id);
      PopupContent.value.airway_section = useAirwayGetCorridorPointRangeFromAirwayIdFullWidth(airwayData, id);
      PopupContent.value.airway_distance = useAirwayGetFullDistanceFromAirwayId(airwayData, id) + 'm';
      PopupContent.value.airway_date = useDateString2(useAirwayGetAirwayApplicationDateFromAirwayId(airwayData, id));
      PopupContent.value.airway_porpose = useAirwayGetPurposeFromAirwayId(airwayData, id);

      const uaslRes = await $fetch('/api/airway/uasl', { 
        method: 'GET',
        query: { uaslId: [id] }
      });
      if (uaslRes.status !== 200) {
        console.error(`error: get uasl info {status: ${uaslRes.status}}.`);
        chartData = {};
        return;
      }
      const uaslResData = utils.convertUaslToAirway(uaslRes.data);
      chartData = useAirwayConvertConnectionOrder(uaslResData);
      showPopup.value = true;
    };

    const DAYS_JA = ['\u65e5', '\u6708', '\u706b', '\u6c34', '\u6728', '\u91d1', '\u571f'];
    const formatFlightDatetime = (startAt, endAt) => {
      if (!startAt) return '';
      const s = new Date(startAt);
      const e = new Date(endAt ?? startAt);
      const y = s.getFullYear();
      const m = String(s.getMonth() + 1).padStart(2, '0');
      const d = String(s.getDate()).padStart(2, '0');
      const dow = DAYS_JA[s.getDay()];
      const sh = String(s.getHours()).padStart(2, '0');
      const sm = String(s.getMinutes()).padStart(2, '0');
      const eh = String(e.getHours()).padStart(2, '0');
      const em = String(e.getMinutes()).padStart(2, '0');
      return `${y}/${m}/${d}(${dow}) ${sh}:${sm}\uff5e${eh}:${em}`;
    };
    const formatReservedDate = (reservedAt) => {
      if (!reservedAt) return '';
      const date = new Date(reservedAt);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dow = DAYS_JA[date.getDay()];
      return `${y}/${m}/${d}\uff08${dow}\uff09`;
    };

    const setPopupLocation = async (deviationData, reservation, conformityAssessmentRes, latlng) => {
      showPopup.value = false;
      const airwayId = deviationData.uaslId
      PopupContent.value.airway_id = airwayId
      LocationData.value.reservation_id = reservation.reservationId;
      LocationData.value.airway_section_name = useAirwaySectionNameFromSectionId(airwayData, deviationData.uaslSectionId);
      // planned-deviation 取得（ミュートスイッチ常時表示用：失敗時は OFF デフォルト）
      muteFlg.value = 'off';
      if (reservation.reservationId) {
        try {
          const plannedRes = await $fetch(`/api/safety/planned-deviation/${reservation.reservationId}`, { method: 'GET' });
          if (plannedRes.status === 200) {
            muteFlg.value = plannedRes.data?.enabled ? 'on' : 'off';
          }
        } catch (e) {
          console.warn('planned-deviation fetch failed, defaulting to off:', e);
        }
      }
      // 計画的な逸脱 ON の場合は RouteDeviation → PlannedRouteDeviation として扱う
      const plannedEnabled = muteFlg.value === 'on';
      const effectiveOpStatus = resolveOpStatus(deviationData.operationalStatus, plannedEnabled);
      (effectiveOpStatus == operationalStatus.DEVIATION || conformityAssessmentRes.evaluationResults == 'false') ? LocationData.value.operational_status_flg = true : LocationData.value.operational_status_flg = false;
      LocationData.value.status_display = operationalStatusDisplay(effectiveOpStatus);
      // 適合性確認改修 start（適合性結果は予約データから取得。表示文言は従来どおり：適合性NG時は evaluationStatus、適合性OK時は deviation の status_display）
      if (reservation.evaluationResults == true) {
        LocationData.value.operational_status_display = LocationData.value.status_display;
      } else {
        LocationData.value.operational_status_display = reservation.evaluationStatus ?? '';
      }
      // 適合性確認改修 end
      LocationData.value.operational_status = deviationData.operationalStatus
      const statusColors = getOperationalStatusColor(effectiveOpStatus, conformityAssessmentRes.evaluationResults);
      LocationData.value.statusBgColor = statusColors.bg;
      LocationData.value.statusFgColor = statusColors.fg;
      PopupContent.value.airway_name = useAirwayGetAirwayNameFromAirwayId(airwayData, airwayId);
      PopupContent.value.airway_section = useAirwayGetCorridorPointRangeFromAirwayIdFullWidth(airwayData, airwayId);
      LocationData.value.airway_fligt_time = airwayFlightTime(reservation, deviationData.timestamp)
      PopupContent.value.airway_distance = calcReservationTotalDistance(reservation) + 'm';
      PopupContent.value.airway_porpose = useAirwayGetPurposeFromAirwayId(airwayData, airwayId);
      LocationData.value.reservation_date = useDateString2(reservation.updatedAt);
      LocationData.value.flight_datetime_display = formatFlightDatetime(
        reservation.uaslSections[0]?.startAt,
        reservation.uaslSections[reservation.uaslSections.length - 1]?.endAt
      );
      LocationData.value.reservation_reserved_date = formatReservedDate(reservation.reservedAt ?? reservation.updatedAt);
      LocationData.value.latlng = latlng
      LocationData.value.timestamp = deviationData.timestamp
      LocationData.value.airwaySections = reservation.uaslSections
      LocationData.value.startDay = useDateString1(reservation['uaslSections'][0]['startAt']),
      LocationData.value.endDay = useDateString1(reservation['uaslSections'][0]['endAt']),
      LocationData.value.airway_section_id = reservation['uaslSections'][0]['uaslSectionId'];
      // 路線図ツールチップ用データを構築
      const seenTooltipNames = new Set();
      const tooltipPairList = [];
      for (const section of reservation.uaslSections ?? []) {
        const sAirwayId = String(section.airwayId ?? section.uaslId ?? '').trim();
        const name = sAirwayId ? useAirwayGetAirwayNameFromAirwayId(airwayData, sAirwayId) : '';
        const resId = section.reservationId ?? reservation.reservationId ?? '';
        if (name && name !== 'Not found.' && !seenTooltipNames.has(name)) {
          seenTooltipNames.add(name);
          tooltipPairList.push({ name, id: resId });
        }
      }
      timelineTooltipPairs.value = tooltipPairList;
      showLocation.value = true;
      const promises = []
      const routeRequest = setStatus(conformityAssessmentRes).then(async () => { // ※ 描画が完了してからラインを赤くするため非同期処理をしている 要修正
        // 適合性評価の結果を確認
        if (conformityAssessmentRes.evaluationResults == false) {
          applyDeviationStyles();
          return;
        }
        // 逸脱確認
        if (LocationData.value.operational_status_flg) {
          applyDeviationStyles(LocationData.value.airway_section_name);
        } else {
          revertDeviationStyles();
        }
      })
      promises.push(routeRequest);

      // 全ての非同期リクエストが完了するのを待つ
      await Promise.all(promises);
    };
    const setStatus = async (conformityAssessmentRes) => {
      // 適合性評価の結果を確認
      if (conformityAssessmentRes.evaluationResults == false) {
        LocationData.value.airway_section_name = '-'
      }
    }

    const applyDeviationStyles = (airwaySectionId) => {
      let matchIndex = -1;

      const sectionFields = document.querySelectorAll('.c-sectionNameField');
      sectionFields.forEach((el, index) => {
        const textEl = el.children[1] ? el.children[1].children[0] : null;
        if (airwaySectionId) {
          if (textEl && textEl.textContent.trim() === airwaySectionId) {
            el.classList.add('deviation');
            matchIndex = index;
          } else {
            el.classList.remove('deviation');
          }
        } else {
          el.classList.add('deviation');
        }
      });

      const landMarkFields = document.querySelectorAll('.c-landMarkNameField');
      if (airwaySectionId && matchIndex >= 0) {
        
          // ・landMarkFields[matchIndex]：下半分だけ赤にする
          // ・landMarkFields[matchIndex+1]：上半分だけ赤にする
          landMarkFields[matchIndex].classList.remove('deviation');
          landMarkFields[matchIndex+1].classList.remove('deviation');
          landMarkFields[matchIndex].classList.add('half-deviation');
          landMarkFields[matchIndex+1].classList.add('half-deviation');
          // landMarkFields[matchIndex] の下半分赤用オーバーレイを追加
          let elem1 = landMarkFields[matchIndex];
          // 既に存在する場合は削除してから追加
          let lowerOverlay = elem1.querySelector('.half-overlay.lower');
          if (lowerOverlay) {
            lowerOverlay.remove();
          }
          lowerOverlay = document.createElement('div');
          lowerOverlay.classList.add('half-overlay', 'lower');
          elem1.appendChild(lowerOverlay);
        
          // landMarkFields[matchIndex+1] の上半分赤用オーバーレイを追加
          let elem2 = landMarkFields[matchIndex+1];
          let upperOverlay = elem2.querySelector('.half-overlay.upper');
          if (upperOverlay) {
            upperOverlay.remove();
          }
          upperOverlay = document.createElement('div');
          upperOverlay.classList.add('half-overlay', 'upper');
          elem2.appendChild(upperOverlay);
      } else {
        landMarkFields.forEach(el => el.classList.add('deviation'));
      }
    };

    const revertDeviationStyles = () => {
      const sectionFields = document.querySelectorAll('.c-sectionNameField');
      sectionFields.forEach(el => {
        el.classList.remove('deviation');
      });
      const landMarkFields = document.querySelectorAll('.c-landMarkNameField');
      landMarkFields.forEach(el => {
        el.classList.remove('deviation');
      });
    };

    const airwayFlightTime = (reservation, timestamp) => {
      const airwaySections = reservation.uaslSections
      const start = new Date(airwaySections[0].startAt)  // 開始時刻
      const end = new Date(timestamp)
      const diffTime = end.getTime() - start.getTime()
      if (diffTime < 0) return ""
      
      const seconds = Math.floor(diffTime / 1000); // ミリ秒を秒に変換
      const hours = Math.floor(seconds / 3600); // 秒を時間に
      const remainderSeconds = seconds % 3600;
      const minutes = Math.floor(remainderSeconds / 60); // 残り秒を分に
      const flightTime = hours.toString() +':' + (minutes < 10 ? '0' + minutes.toString() : minutes.toString())
      
      return flightTime
    };

    const airwayFlightDistance = (reservation, flightTime) => {
      if (!flightTime) return ''

      const airwaySections = reservation.uaslSections
      const start = new Date(airwaySections[0].startAt)  // 開始時刻
      const end = new Date(airwaySections[0].endAt)  // 到着時刻
      const totalDistance = useAirwayGetFullDistanceFromAirwayId(airwayData, PopupContent.value.airway_id)
      const speed =  totalDistance / ((end.getTime() - start.getTime()) / 1000)
      const parts = flightTime.split(':').map(part => parseInt(part, 10));

      if (parts.length !== 2) {
        throw new Error('flightTime is in invalid state.');
      }

      const hours = parts[0];
      const minutes = parts[1];

      const totalSeconds = hours * 3600 + minutes * 60; // 秒を計算

      const FlightDisatance = speed * totalSeconds
      
      return Math.floor(FlightDisatance)
    };

    const combinedListTimeline = () => {
      const BLUE = 'rgb(44, 105, 255)';
      if (!LocationData.value.airwaySections || !airwayData) return [];
      const allSections = LocationData.value.airwaySections;

      // airwayId → airway オブジェクト
      const airwayById = new Map();
      for (const airway of (airwayData?.airway?.airways ?? [])) {
        airwayById.set(String(airway.airwayId).trim(), airway);
      }

      // ジャンクション名辞書: "airwayId|junctionId" → name
      const junctionNameByKey = {};
      for (const airway of (airwayData?.airway?.airways ?? [])) {
        const aid = String(airway.airwayId).trim();
        for (const j of (airway.airwayJunctions || [])) {
          const jid = String(j.airwayJunctionId).trim();
          junctionNameByKey[`${aid}|${jid}`] = j.airwayJunctionName ?? j.name ?? '';
        }
      }

      // uaslSections の順序通りに junction ペアを収集
      const sectionEntries = [];
      for (const section of allSections) {
        const sectionId = String(section.uaslSectionId ?? section.airwaySectionId ?? '').trim();
        if (!sectionId) continue;
        const airwayId = String(section.airwayId ?? section.uaslId ?? useAirwayGetAirwayIdFromSectionId(airwayData, sectionId)).trim();
        if (!airwayId || airwayId === 'Not found.') continue;
        const airway = airwayById.get(airwayId);
        if (!airway) continue;
        const sec = airway.airwaySections.find(s => String(s.airwaySectionId) === sectionId);
        if (!sec || !sec.airwayJunctionIds || sec.airwayJunctionIds.length < 2) continue;
        const ids = sec.airwayJunctionIds.map(x => String(x).trim());
        sectionEntries.push({ airwayId, sectionId, junctionIds: ids });
      }
      if (!sectionEntries.length) return [];

      // 実際に予約に含まれるエッジ Set（junctionId ペアの順不同キー）
      // → 連続していない区画間は validEdges に存在しないため transparent（スペース）になる
      const edgeKey = (a, b) => {
        const [x, y] = [String(a).trim(), String(b).trim()].sort();
        return `${x}|${y}`;
      };
      const validEdges = new Set();
      for (const entry of sectionEntries) {
        const [j0, j1] = entry.junctionIds;
        validEdges.add(edgeKey(j0, j1));
      }

      // チェーンポイントを構築（uaslSections の sequence 順を尊重して正しい向きを決定）
      const chainPoints = []; // { airwayId, junctionId }
      const pushPoint = (airwayId, junctionId) => {
        if (!airwayId || !junctionId) return;
        const last = chainPoints[chainPoints.length - 1];
        if (last && last.junctionId === junctionId) return; // 重複を除去
        chainPoints.push({ airwayId, junctionId });
      };

      const n = sectionEntries.length;
      if (n === 1) {
        // 1区画: airwayJunctions の並び順で方向を判断
        const entry = sectionEntries[0];
        const airway = airwayById.get(entry.airwayId);
        const junctionOrder = (airway?.airwayJunctions ?? []).map(j => String(j.airwayJunctionId).trim());
        const [j0, j1] = entry.junctionIds;
        const idx0 = junctionOrder.indexOf(j0);
        const idx1 = junctionOrder.indexOf(j1);
        const [start, end] = (idx0 !== -1 && idx1 !== -1 && idx0 <= idx1) ? [j0, j1] : [j1, j0];
        pushPoint(entry.airwayId, start);
        pushPoint(entry.airwayId, end);
      } else {
        // 複数区画: 第1区画と第2区画の共有点から出発点を決定
        const firstIds = sectionEntries[0].junctionIds;
        const secondIds = sectionEntries[1].junctionIds;
        const sharedWith2 = firstIds.find(id => secondIds.includes(id));
        const startId = sharedWith2
          ? firstIds.find(id => id !== sharedWith2) ?? firstIds[0]
          : firstIds[0];

        pushPoint(sectionEntries[0].airwayId, startId);
        let prevEnd = startId;

        for (const entry of sectionEntries) {
          const [a, b] = entry.junctionIds;
          if (a === prevEnd) {
            pushPoint(entry.airwayId, b);
            prevEnd = b;
          } else if (b === prevEnd) {
            pushPoint(entry.airwayId, a);
            prevEnd = a;
          } else {
            // 前区画と繋がらない（航路間のギャップ）: 両端を追加
            pushPoint(entry.airwayId, a);
            pushPoint(entry.airwayId, b);
            prevEnd = b;
          }
        }
      }

      return chainPoints.map((pt, i) => {
        const prev = i > 0 ? chainPoints[i - 1] : null;
        const next = i < chainPoints.length - 1 ? chainPoints[i + 1] : null;
        // 前後の点との間に実際の航路区画エッジが存在するかチェック
        // 存在しない（非連続区間の境界）場合は transparent でスペースを表示
        const aboveColor = prev
          ? (validEdges.has(edgeKey(prev.junctionId, pt.junctionId)) ? BLUE : 'transparent')
          : 'transparent';
        const belowColor = next
          ? (validEdges.has(edgeKey(pt.junctionId, next.junctionId)) ? BLUE : 'transparent')
          : 'transparent';
        return {
          pointKey: `${pt.airwayId}|${pt.junctionId}`,
          name: junctionNameByKey[`${pt.airwayId}|${pt.junctionId}`] ?? pt.junctionId ?? '',
          aboveColor,
          belowColor,
        };
      });
    };

    const combinedList = () => {
      const points = useAirwayGetCorridorPointNameListFromAirwayId(airwayData, PopupContent.value.airway_id);
      const sections = useAirwayGetCorridorSectionNameListFromAirwayId(airwayData, PopupContent.value.airway_id);
      const maxLength = Math.max(points.length, sections.length);
      const combined = [];
      const passAt = []
      if (showLocation.value) {
        // 経過予想時刻の算出
        const airwaySections = LocationData.value.airwaySections
        const start = new Date(airwaySections[0].startAt)  // 開始時刻
        const end = new Date(airwaySections[0].endAt)  // 到着時刻
        const totalDistance = useAirwayGetFullDistanceFromAirwayId(airwayData, PopupContent.value.airway_id)
        const speed =  totalDistance / ((end.getTime() - start.getTime()) / 1000)
        passAt.push(('0' + start.getHours()).slice(-2) + ':' + ('0' + start.getMinutes()).slice(-2))

        let elapsedTime = 0
        for (let i = 0; i < points.length - 1; i++) {
          const sectionList = [points[i], points[i + 1]]
          // 航路区画の間の距離 (メートル)
          const distance = useAirwayGetDistanceFromJunctionNameList(airwayData, PopupContent.value.airway_id, sectionList)
          // 経過時間の計算
          elapsedTime = distance / speed + elapsedTime
          
          // Xメートル地点の通過時刻の計算
          const passageTime = new Date(start.getTime() + elapsedTime * 1000) // ミリ秒単位で計算
         
          passAt.push(('0' + passageTime.getHours()).slice(-2) + ':' + ('0' + passageTime.getMinutes()).slice(-2))
        } 
      }

      for (let i = 0; i < maxLength; i++) {
        if (i < points.length) {
          combined.push({ type: 'c-landMarkNameField', name: points[i], passAt: passAt[i] });
        }
        if (i < sections.length) {
          combined.push({ type: 'c-sectionNameField', name: sections[i] });
        }
      }
      return combined;
    }

    const operationalStatusDisplay = (status) => {
      let stat = ""
      switch (status) {
        case operationalStatus.BEFORE:
          stat = '航路侵入前'
          break
        case operationalStatus.NORMAL:
          stat = '運航中'
          break
        case operationalStatus.DEVIATION:
          stat = '航路逸脱'
          break
        // 適合性確認改修 start
        case operationalStatus.PLANNEDEVIATION:
          stat = '航路逸脱'
          break
        // 適合性確認改修 end
        default:
          break
      }
      return stat
    }

    const polling = () => {
      timeout = setTimeout(async () => {
        await underwayMaerker()
        polling()
      },3000)
    }
    // 料金表管理改修  Start
    const drawNearbyPorts = async () => {
      try {
        if (!map.value || !nearbyPortLayer) return;
        const center = map.value.getCenter();
        // 半径取得
        const radius = getDefaultSearchRadiusMeters();
        const searchArea = {
          latitude: center.lat,   // 中心座標（緯度）
          longitude: center.lng,  // 中心座標（経度）
          radiusMeters: radius,   // 検索半径（メートル）
        };

        const nearbyPortRes = await client.getAllNearbyDroneport(searchArea);
        const nearbyPortData = (nearbyPortRes.data?.systems ?? [])
          .flatMap(s => s.droneports ?? [])
          .filter(d => d.lat != null && d.lon != null);
        console.log("nearbyPortData", nearbyPortData);
        const nearbyPortIcon = L.icon({ iconUrl: porticonUrl, iconSize: [15, 15] });
        nearbyPortLayer.clearLayers();
        nearbyPortData.forEach(d => {
          const lines = [d.dronePortName].filter(Boolean);
          if (d.address) lines.push(d.address);
          if (d.portType) lines.push(d.portType);
          const tooltipText = lines.join('<br>');
          L.marker([d.lat, d.lon], { icon: nearbyPortIcon })
            .bindTooltip(tooltipText, { sticky: true })
            .addTo(nearbyPortLayer);
        });
      } catch (e) {
        console.error('drawNearbyPorts error', e);
      }
    };

    // 料金表管理改修  End

    // 航路点ポリゴンの中心座標を計算する（coords は [[lon, lat, alt?], ...] の多角形リング）
    const getCoordCenter = (coords) => {
      const n = Math.min(coords.length - 1, 4);
      if (n <= 0) return null;
      let lat = 0, lng = 0;
      for (let i = 0; i < n; i++) {
        lng += coords[i][0];
        lat += coords[i][1];
      }
      return [lat / n, lng / n];
    };

    // 選択された予約の全区画をハイライト（2倍の太さ），それ以外はリセット
    const highlightReservationSections = (reservationId) => {
      // 全グループを一度表示状態に戻してから選択グループだけ非表示にする
      for (const [id, info] of reservationSectionLayerMap) {
        info.group.eachLayer(l => { if (l.setStyle) l.setStyle({ opacity: 1, fillOpacity: 1 }); });
        for (const polyline of reservationSectionPolylineMap.get(id) ?? []) {
          const c = polyline.options.origColor ?? polyline.options.color;
          polyline.setStyle({ weight: SECTION_WEIGHT, color: c, opacity: 1 });
        }
      }
      // 選択中グループを非表示（以下 highlightLayer で代替描画するため）
      const selectedInfo = reservationSectionLayerMap.get(reservationId);
      if (selectedInfo) {
        selectedInfo.group.eachLayer(l => { if (l.setStyle) l.setStyle({ opacity: 0, fillOpacity: 0 }); });
      }
      // 黒枠ポリラインと拡大航路点を再描画
      if (highlightLayer) highlightLayer.clearLayers();
      const endpoints = reservationSectionEndpointsMap.get(reservationId);
      const selectedPolylines = reservationSectionPolylineMap.get(reservationId);
      if (!endpoints || !selectedPolylines || !highlightLayer) return;
      // 黒蛀（太い黒ポリライン）を下敘きして細い黒枠を表現
      const BORDER_EXTRA = 3;
      for (let i = 0; i < endpoints.length; i++) {
        const [p1, p2] = endpoints[i];
        const origColor = selectedPolylines[i]?.options.origColor ?? selectedPolylines[i]?.options.color;
        L.polyline([p1, p2], { color: 'black', weight: SECTION_WEIGHT * 2 + BORDER_EXTRA, interactive: false })
          .addTo(highlightLayer);
        L.polyline([p1, p2], { color: origColor, weight: SECTION_WEIGHT * 2, interactive: false })
          .addTo(highlightLayer);
      }
      // 拡大航路点（2倍径）を描画
      const drawnPts = new Set();
      for (const [p1, p2] of endpoints) {
        for (const pt of [p1, p2]) {
          const key = `${pt[0]},${pt[1]}`;
          if (drawnPts.has(key)) continue;
          drawnPts.add(key);
          L.circleMarker(pt, {
            radius: WAYPOINT_RADIUS * 2,
            fillColor: 'white',
            color: 'black',
            weight: 1.5,
            fillOpacity: 1,
            interactive: false,
          }).addTo(highlightLayer);
        }
      }
    };

    // 全区画を通常サイズに戻す（非表示にした選択グループも復元）
    const resetHighlight = () => {
      for (const [id, info] of reservationSectionLayerMap) {
        info.group.eachLayer(l => { if (l.setStyle) l.setStyle({ opacity: 1, fillOpacity: 1 }); });
        for (const polyline of reservationSectionPolylineMap.get(id) ?? []) {
          const origColor = polyline.options.origColor ?? polyline.options.color;
          polyline.setStyle({ weight: SECTION_WEIGHT, color: origColor, opacity: 1 });
        }
      }
      if (highlightLayer) highlightLayer.clearLayers();
    };

    // 予約の uaslSections に含まれる全区画の合計距離（m）を計算する
    const calcReservationTotalDistance = (reservation) => {
      if (!airwayData || !reservation?.uaslSections) return 0;
      let totalDistance = 0;
      for (const section of reservation.uaslSections) {
        const sectionId = section.uaslSectionId ?? section.airwaySectionId;
        if (!sectionId) continue;
        const airwayId = section.airwayId
          ?? useAirwayGetAirwayIdFromSectionId(airwayData, sectionId);
        if (!airwayId || airwayId === 'Not found.') continue;
        const airway = airwayData.airway.airways.find(a => a.airwayId === airwayId);
        if (!airway) continue;
        const airwaySection = airway.airwaySections.find(s => s.airwaySectionId === sectionId);
        if (!airwaySection) continue;
        const [jId1, jId2] = airwaySection.airwayJunctionIds;
        const getMiddle = (jId) => {
          const j = airway.airwayJunctions.find(jj => jj.airwayJunctionId === jId);
          if (!j) return null;
          const coords = j.airways[0].airway.geometry.coordinates;
          return [
            (coords[0][0] + coords[2][0]) / 2,
            (coords[0][1] + coords[2][1]) / 2,
            (coords[0][2] + coords[2][2]) / 2,
          ];
        };
        const m1 = getMiddle(jId1);
        const m2 = getMiddle(jId2);
        if (!m1 || !m2) continue;
        // Leaflet.distanceTo はメートル単位の水平距離
        const horizontal = L.latLng(m1[1], m1[0]).distanceTo(L.latLng(m2[1], m2[0]));
        const vertical = Math.abs(m1[2] - m2[2]);
        totalDistance += Math.floor(Math.sqrt(horizontal ** 2 + vertical ** 2));
      }
      return totalDistance;
    };

    // 運航中の予約に紐づく航路（グレー）と航路点（白丸）を描画する（マウント時1回）
    const drawActiveAirways = () => {
      if (!airwayLineLayer || !waypointLayer || !airwayData || !reservationData) return;
      const activeAirwayIds = new Set();
      for (const reservation of reservationData.result) {
        for (const section of (reservation.uaslSections || [])) {
          // section.airwayId は convertUaslToAirwayReservation で付与済み
          const airwayId = section.airwayId
            ?? useAirwayGetAirwayIdFromSectionId(airwayData, section.uaslSectionId ?? section.airwaySectionId);
          if (airwayId && airwayId !== 'Not found.') {
            activeAirwayIds.add(airwayId);
          }
        }
      }
      airwayJunctions.value.forEach(airway => {
        if (!activeAirwayIds.has(airway.id)) return;
        if (airway.points.length >= 2) {
          L.polyline(airway.points, { color: 'rgb(191, 198, 217)', weight: AIRWAY_WEIGHT })
            .on('click', () => { resetHighlight(); })
            .bindTooltip(airway.name || airway.id, { sticky: true })
            .addTo(airwayLineLayer);
        }
      });
    };

    // 予約に紐づく航路区画を運航状況に応じて色分けして描画する
    // isNormal: true=運航中（青）/ false=逸脱中（逃捕色）
    // 状態または色が変わった時だけ再描画して点滅を防止する
    const drawSectionsForReservation = (reservation, isNormal, sectionColor) => {
      if (!sectionLineLayer || !airwayData) return;
      const reservationId = reservation.requestId;
      // 状態か色が変わっていない場合は再描画しない
      const prev = reservationSectionLayerMap.get(reservationId);
      if (prev && prev.isNormal === isNormal && prev.color === sectionColor) return;

      const sections = reservation.uaslSections || [];
      if (sections.length === 0) return;
      const color = sectionColor;

      // 既存グループを再利用またはレイヤーグループを新規作成
      const group = prev ? prev.group : L.layerGroup().addTo(sectionLineLayer);
      group.clearLayers();
      reservationSectionLayerMap.set(reservationId, { isNormal, color, group });
      // 区画ポリライン参照をリセット
      reservationSectionPolylineMap.set(reservationId, []);
      reservationSectionEndpointsMap.set(reservationId, []);

      // セクションを航路IDごとにグループ化（複数航路にまたがる予約に対応）
      const sectionIdsByAirwayId = new Map();
      for (const section of sections) {
        const sectionId = section.uaslSectionId ?? section.airwaySectionId;
        if (!sectionId) continue;
        // section.airwayId は convertUaslToAirwayReservation で付与済み
        const airwayId = section.airwayId
          ?? useAirwayGetAirwayIdFromSectionId(airwayData, sectionId);
        if (!airwayId || airwayId === 'Not found.') continue;
        if (!sectionIdsByAirwayId.has(airwayId)) sectionIdsByAirwayId.set(airwayId, new Set());
        sectionIdsByAirwayId.get(airwayId).add(sectionId);
      }

      const junctionNameByKey = {};
      for (const [airwayId, reservationSectionIds] of sectionIdsByAirwayId) {
        const airway = airwayData['airway']['airways'].find(a => a.airwayId === airwayId);
        if (!airway) continue;
        const junctionCenterMap = {};
        for (const junction of airway.airwayJunctions) {
          const coords = junction['airways'][0]['airway']['geometry']['coordinates'];
          const center = getCoordCenter(coords);
          junctionCenterMap[junction.airwayJunctionId] = center;
          if (center) {
            junctionNameByKey[`${center[0]},${center[1]}`] = junction.airwayJunctionName ?? junction.name ?? '';
          }
        }
        for (const section of airway.airwaySections) {
          if (!reservationSectionIds.has(section.airwaySectionId)) continue;
          const [id1, id2] = section.airwayJunctionIds;
          const p1 = junctionCenterMap[id1];
          const p2 = junctionCenterMap[id2];
          if (!p1 || !p2) continue;
          const sectionPolyline = L.polyline([p1, p2], { color, weight: SECTION_WEIGHT, origColor: color })
            .on('click', (e) => {
              highlightReservationSections(reservationId);
              const clickData = reservationLocationMap.get(reservationId);
              if (clickData) {
                setPopupLocation(clickData.locationData, reservation, clickData.conformityAssessmentRes, [e.latlng.lat, e.latlng.lng]);
              }
            })
            .addTo(group);
          reservationSectionPolylineMap.get(reservationId).push(sectionPolyline);
          reservationSectionEndpointsMap.get(reservationId).push([p1, p2]);
        }
      }
      // 航路区画の端点に航路点（白丸）を描画（重複を避けるSetで管理）
      const drawnWpts = new Set();
      for (const [p1, p2] of reservationSectionEndpointsMap.get(reservationId)) {
        for (const pt of [p1, p2]) {
          const key = `${pt[0]},${pt[1]}`;
          if (drawnWpts.has(key)) continue;
          drawnWpts.add(key);
          const ptLabel = junctionNameByKey[key] ?? '';
          L.circleMarker(pt, {
            radius: WAYPOINT_RADIUS,
            fillColor: 'white',
            color: 'black',
            weight: 1.5,
            fillOpacity: 1,
            pane: 'waypointPane',
          })
            .bindTooltip(ptLabel, { sticky: true })
            .addTo(group);
        }
      }
    };

    // 他社システムの周辺航路（グレー）と航路点（白丸）を描画する
    const drawNearbyUasls = async () => {
      try {
        if (!map.value || !nearbyUaslLayer) return;
        const center = map.value.getCenter();
        const radius = getDefaultSearchRadiusMeters();
        const searchArea = {
          latitude: center.lat,
          longitude: center.lng,
          radiusMeters: radius,
        };
        console.log('[getAllNearbyUasl] searchArea:', searchArea);
        const nearbyUaslRes = await client.getAllNearbyUasl(searchArea);
        const systems = nearbyUaslRes.data?.systems ?? [];
        nearbyUaslLayer.clearLayers();
        systems.forEach(system => {
          (system.uaslAdministrators ?? []).forEach(admin => {
            (admin.uasl ?? []).forEach(uasl => {
              const pointCenterMap = {};
              (uasl.uaslPoints ?? []).forEach(point => {
                if (point.geometry) {
                  const ring = point.geometry.coordinates[0] ?? [];
                  const n = Math.min(ring.length - 1, 4);
                  if (n > 0) {
                    let lat = 0, lng = 0;
                    for (let i = 0; i < n; i++) {
                      lng += ring[i][0];
                      lat += ring[i][1];
                    }
                    pointCenterMap[point.uaslPointId] = [lat / n, lng / n];
                  }
                }
              });
              const uaslLabel = uasl.uaslName || uasl.uaslId || '';
              (uasl.uaslSections ?? []).forEach(section => {
                const [p1Id, p2Id] = section.uaslPointIds ?? [];
                const p1 = pointCenterMap[p1Id];
                const p2 = pointCenterMap[p2Id];
                if (p1 && p2) {
                  L.polyline([p1, p2], { color: 'rgb(191, 198, 217)', weight: 8 })
                    .bindTooltip(uaslLabel, { sticky: true })
                    .addTo(nearbyUaslLayer);
                }
              });
              (uasl.uaslPoints ?? []).forEach(point => {
                const ptCenter = pointCenterMap[point.uaslPointId];
                if (ptCenter) {
                  const ptLabel = point.uaslPointName || point.uaslPointId || '';
                  L.circleMarker(ptCenter, {
                    radius: 6,
                    fillColor: 'white',
                    color: 'black',
                    weight: 1.5,
                    fillOpacity: 1,
                  })
                    .bindTooltip(ptLabel, { sticky: true })
                    .addTo(nearbyUaslLayer);
                }
              });
            });
          });
        });
      } catch (e) {
        console.error('drawNearbyUasls error', e);
      }
    };

    // ロールと航路データが確定した後に予約データを取得・描画する
    let reservationsInitialized = false;
    const initializeReservations = async (role) => {
      if (reservationsInitialized) return;
      if (!airwayData) return; // 航路データ未取得
      if (role === null || role === undefined) return;
      reservationsInitialized = true;

      let parentOperatorId = null;
      if (typeof window !== 'undefined') {
        parentOperatorId = localStorage.getItem('uasl:user:parentOperatorId');
      }

      let reservationUrl = '';
      if (role == 1 || role == 3) {
        // 航路運営者・関係者：管理者エンドポイント
        reservationUrl = `/api/reservation/admin/uaslReservations`;
      } else if (role == 2) {
        // 運航事業者：自社エンドポイント
        reservationUrl = `/api/reservation/operator/${parentOperatorId}/uaslReservations`;
      } else {
        console.log("error: get airway reservation info (permision denied.)");
        reservationData = { result: [] };
        return;
      }

      let tmpReservationData = null;
      let reservationRes = await $fetch(reservationUrl, { method: 'GET' });
      console.log(reservationRes);
      if (reservationRes.status != 200) {
        console.error(`error: get airway reservation info {status: ${reservationRes.status}}.`);
        reservationData = { result: [] };
        return;
      }
      tmpReservationData = reservationRes.data;
      let currentPage = 1;
      let lastPage = reservationRes.data.lastPage;

      while (currentPage < lastPage) {
        currentPage++;
        let pageRes = await $fetch(reservationUrl, { method: 'GET', query: { page: currentPage } });
        console.log(pageRes);
        if (pageRes.status != 200) {
          console.error(`error: get airway reservation info {status: ${pageRes.status}}.`);
          reservationData = { result: [] };
          return;
        }
        pageRes.data.result.forEach((reservation) => {
          tmpReservationData.result.push(reservation);
        });
      }

      // originReservation/destinationReservations を root へ展開
      tmpReservationData = utils.convertUaslToAirwayReservation(tmpReservationData);

      // requestId で重複排除（admin エンドポイントは同一 requestId が複数返ることがある）
      const uniqueReservationMap = new Map(
        tmpReservationData.result.map((r) => [r.requestId, r])
      );
      const deduplicatedResult = Array.from(uniqueReservationMap.values());

      reservationData = { result: [] };
      deduplicatedResult.forEach((reservation) => {
        // 時刻チェック：RESERVED かつ現在日時が予約開始〜到着（最終区画）の範囲内のみ
        if (!reservation['uaslSections'] || reservation['uaslSections'].length === 0) return;
        const now_date = new Date();
        const Departure_date = new Date(useDateString1(reservation['uaslSections'][0]['startAt']));
        const lastSection = reservation['uaslSections'][reservation['uaslSections'].length - 1];
        const Arrival_date = new Date(useDateString1(lastSection['endAt']));
        const isDateCheck = reservation.status === 'RESERVED' && Departure_date <= now_date && Arrival_date >= now_date;
        console.log('now_date: ' + now_date);
        console.log('Departure_date: ' + Departure_date);
        console.log('Arrival_date: ' + Arrival_date);
        if (isDateCheck) {
          reservationData.result.push(reservation);
        }
      });
      console.log(reservationData);

      // 他社航路を含む全 UASL データを airwayData にマージ（drawActiveAirways 前に実施）
      try {
        const allUaslIds = [...new Set(
          reservationData.result.flatMap(r => (r.uaslSections || []).map(s => s.uaslId).filter(Boolean))
        )];
        if (allUaslIds.length > 0) {
          const crossUaslData = await searchUaslsFromID(allUaslIds, 56000);
          const crossResData = utils.convertUaslToAirway(crossUaslData);
          const crossAirwayData = useAirwayConvertConnectionOrder(crossResData);
          const existingAirwayIds = new Set((airwayData?.airway?.airways ?? []).map(a => a.airwayId));
          for (const airway of (crossAirwayData?.airway?.airways ?? [])) {
            if (existingAirwayIds.has(airway.airwayId)) continue;
            airwayData.airway.airways.push(airway);
            let airwayInfo = { id: airway.airwayId, name: airway.airwayName ?? '', points: [], junctionNames: [] };
            airway.airwayJunctions.forEach((junction) => {
              let coordinates = junction['airways'][0]['airway']['geometry']['coordinates'];
              airwayInfo.points.push([(coordinates[0][1] + coordinates[2][1]) / 2, (coordinates[0][0] + coordinates[2][0]) / 2]);
              airwayInfo.junctionNames.push(junction['airwayJunctionName'] ?? junction['name'] ?? '');
            });
            airwayJunctions.value.push(airwayInfo);
          }
        }
      } catch (e) {
        console.warn('cross-company UASL fetch error (non-fatal):', e);
      }

      drawActiveAirways();
      // drawNearbyUasls() は他社システムの周辺航路を表示するため運航状況マップでは呼ばない
      await underwayMaerker();
      polling();
    };

    // role が親コンポーネントで非同期に設定される場合のウォッチャー
    watch(() => props.role, async (newRole) => {
      if (newRole !== null && newRole !== undefined) {
        await initializeReservations(newRole);
      }
    });

    onMounted(async () => {
      const leafletModule = await import('leaflet');
      // 料金表管理改修  Start
      L = leafletModule.default;
      // 料金表管理改修  End

      map.value = L.map('leafletMap', {
        center: centerInit,
        zoom: zoomInit,
        scrollWheelZoom: false,
        zoomControl: true
      });

      // 料金表管理改修  Start
      nearbyPortLayer = L.layerGroup().addTo(map.value);
      // 料金表管理改修  End
      nearbyUaslLayer = L.layerGroup().addTo(map.value);
      airwayLineLayer = L.layerGroup().addTo(map.value);
      sectionLineLayer = L.layerGroup().addTo(map.value);
      // waypointPane: 航路点を他の航路ポリラインより手前に描画するためのカスタムペイン
      map.value.createPane('waypointPane');
      map.value.getPane('waypointPane').style.zIndex = 450;
      waypointLayer = L.layerGroup().addTo(map.value);
      // highlightPane: 選択時の黒枠・拡大航路点を最前面に描画
      map.value.createPane('highlightPane');
      map.value.getPane('highlightPane').style.zIndex = 460;
      highlightLayer = L.layerGroup({ pane: 'highlightPane' }).addTo(map.value);

      L.tileLayer(
        useRuntimeConfig().public.mapTileUrl,
        {
          className: "grayscale-map",
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
        }
      ).addTo(map.value);

      // ページ遷移アニメーション中にマウントされた場合コンテナサイズが0になることがあるため再計算
      map.value.invalidateSize();

      /* Zoomコントロール位置移動 */
      map.value.zoomControl.setPosition('topleft');

      // 地図移動完了時イベントハンドラ
      // 料金表管理改修  Start
      map.value.on('moveend', async (event) => {
      // 料金表管理改修  End
        console.log(`MapLayerControlMounted: ${MapLayerControlMounted.value}`);
        if (!MapLayerControlMounted.value) {
          console.log(`map moved:${event}`);
          map_moveend.value = true;
          // 料金表管理改修  Start
          await drawNearbyPorts();
          // 料金表管理改修  End
          // drawNearbyUasls() は他社システムの周辺航路を表示するため運航状況マップでは呼ばない
        }
      });
      
      // /operator廃止につき事業者情報取得は展進しない

      /* ポートデータ取得 */
      const portRes = await $fetch('/api/drone/droneport/info/list', { 
        method: 'GET',
      });
      console.log("portRes",portRes);
      if (portRes.status != 200) {
        console.error(`error: get port info {status: ${portRes.status}}.`);
        portData = {};
        return;
      }
      const portList = (portRes.data.data ?? []).filter(port => port.lat != null && port.lon != null);
      portData = portList.map(port => [port.lat, port.lon]);
      console.log("portData",portData);
      const portIcon = L.icon({ iconUrl: porticonUrl, iconSize: [15, 15] });
      portList.forEach(port => {
        const portLabel = port.dronePortName || '';
        L.marker([port.lat, port.lon], { icon: portIcon })
          .bindTooltip(portLabel, { sticky: true })
          .addTo(map.value);
      });

      // 料金表管理改修  Start
      // 指定した座標周辺の離着陸場(ドローンポート)情報を取得する
      await drawNearbyPorts();
      // 料金表管理改修  End

      /* 航路データ取得 */
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

      airwayData['airway']['airways'].forEach((airway) => {
        let airwayInfo = {id: airway['airwayId'], name: airway['airwayName'] ?? '', points: [], junctionNames: []};
        airway['airwayJunctions'].forEach((junction) => {
          let coordinates = junction['airways'][0]['airway']['geometry']['coordinates'];
          airwayInfo.points.push([(coordinates[0][1] + coordinates[2][1]) / 2, (coordinates[0][0] + coordinates[2][0]) / 2]);
          airwayInfo.junctionNames.push(junction['airwayJunctionName'] ?? junction['name'] ?? '');
        });

        airwayJunctions.value.push(airwayInfo);
      });

      // 選択航路が指定されている場合、その中心にマップを移動
      if (props.airwayId) {
        const targetAirway = airwayJunctions.value.find(a => a.id === props.airwayId);
        if (targetAirway && targetAirway.points.length > 0) {
          const lats = targetAirway.points.map(p => p[0]);
          const lngs = targetAirway.points.map(p => p[1]);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
          map.value.setView([centerLat, centerLng], zoomInit);
        }
      }

      // 予約データ取得（ロール確定後に initializeReservations が実行される）
      await initializeReservations(props.role);
    });

    onUnmounted(() => {if(timeout) clearTimeout(timeout)})

    // サイドパネルの開閉に合わせて Leaflet のサイズを再計算
    // ・pan: false で地図中心を維持
    // ・アニメーション（250ms）完了後に呼ぶことで灰色帯を防止
    watch([showPopup, showLocation], () => {
      setTimeout(() => {
        if (map.value) map.value.invalidateSize({ pan: false });
      }, 280);
    });

    const underwayMaerker = async () => {
      for (const reservation of reservationData.result) {
        // 地図のドローンの位置を削除
        const maerked = locationList.value.find(r => r.reservID === reservation.requestId)
        if (maerked) {
          map.value.removeLayer(maerked.marker);
          locationList.value = locationList.value.filter(function( item ) {
            return item !== maerked;
          });
        }
      
        /* 位置情報取得 */
        let locationData = null;
        const locationRes = await $fetch(`/api/safety/get-current-location/${reservation.reservationId}`, { 
          method: 'GET'
        });
        
        if (locationRes.status !== 200) {
          // 位置情報取得失敗時は通常色（青）で区画を描画し、ダミーエントリでクリックも有効にする
          const normalColor = useRuntimeConfig().public.statusColorNormalFg;
          const dummyLocationData = {
            uaslId: reservation.uaslSections[0]?.uaslId ?? reservation.uaslSections[0]?.airwayId ?? '',
            uaslSectionId: reservation.uaslSections[0]?.uaslSectionId ?? reservation.uaslSections[0]?.airwaySectionId ?? '',
            operationalStatus: operationalStatus.BEFORE,
            timestamp: reservation.uaslSections[0]?.startAt ?? new Date().toISOString(),
            latitude: null,
            longitude: null,
          };
          const dummyConformityRes = getConformityAssessmentResFromReservation(reservation);
          reservationLocationMap.set(reservation.requestId, { locationData: dummyLocationData, conformityAssessmentRes: dummyConformityRes });
          drawSectionsForReservation(reservation, true, normalColor);
          continue;
        }

        // 計画的な航路逸脱の取得（originReservation.reservationId を渡す）
        const plannedApiRes = await $fetch(`/api/safety/planned-deviation/${reservation.reservationId}`, { 
          method: 'GET'
        });
        if (plannedApiRes.status !== 200) {
          // 計画逸脱情報取得失敗時も通常色（青）で区画を描画し、ダミーエントリでクリックも有効にする
          const normalColor = useRuntimeConfig().public.statusColorNormalFg;
          const dummyLocationData = {
            uaslId: reservation.uaslSections[0]?.uaslId ?? reservation.uaslSections[0]?.airwayId ?? '',
            uaslSectionId: reservation.uaslSections[0]?.uaslSectionId ?? reservation.uaslSections[0]?.airwaySectionId ?? '',
            operationalStatus: operationalStatus.BEFORE,
            timestamp: reservation.uaslSections[0]?.startAt ?? new Date().toISOString(),
            latitude: null,
            longitude: null,
          };
          const dummyConformityRes = getConformityAssessmentResFromReservation(reservation);
          reservationLocationMap.set(reservation.requestId, { locationData: dummyLocationData, conformityAssessmentRes: dummyConformityRes });
          drawSectionsForReservation(reservation, true, normalColor);
          continue;
        }
        // 選択中のドローンの場合のみ muteFlg を更新（他の予約の状態で上書きしない）
        if (reservation.requestId === selectedDroneInfo?.requestId) {
          muteFlg.value = plannedApiRes.data.enabled ? 'on' : 'off'
        }

        locationData = locationRes.data;
        const latlng = [ locationData.latitude, locationData.longitude ]

        // 適合性確認改修 start（一覧と同様、適合性結果を予約データから取得。APIは呼ばない）
        const conformityAssessmentRes = getConformityAssessmentResFromReservation(reservation);
        // 適合性確認改修 end

        // 計画的な逸脱 ON の場合は RouteDeviation → PlannedRouteDeviation として扱う
        const effectiveOpStatus = resolveOpStatus(locationData.operationalStatus, plannedApiRes.data.enabled);
        // 航路区画を運航状況に応じて色分け描画
        const isNormal = effectiveOpStatus !== operationalStatus.DEVIATION && conformityAssessmentRes.evaluationResults !== false;
        // ドローンアイコン色: effectiveOpStatus に応じた色（PlannedRouteDeviation は黄土色）
        const droneColor = getOperationalStatusColor(effectiveOpStatus, conformityAssessmentRes.evaluationResults).fg;
        // 航路区画色: PlannedRouteDeviation の場合は通常色（青）を使用。ドローンアイコンとは別管理
        const sectionOpStatus = effectiveOpStatus === operationalStatus.PLANNEDEVIATION ? operationalStatus.NORMAL : effectiveOpStatus;
        const sectionColor = getOperationalStatusColor(sectionOpStatus, conformityAssessmentRes.evaluationResults).fg;
        // 区画クリック時に再利用できるよう位置情報をキャッシュ
        reservationLocationMap.set(reservation.requestId, { locationData, conformityAssessmentRes });
        drawSectionsForReservation(reservation, isNormal, sectionColor);
        // 選択中の予約が再描画された場合、highlightLayer も最新色で塗り直す
        // （drawSectionsForReservation は clearLayers() で再構築するため、opacity:0 の状態が
        //   リセットされ旧色の highlightLayer と新色のグループが二重表示される問題を防ぐ）
        if (reservation.requestId === selectedDroneInfo?.requestId) {
          highlightReservationSections(reservation.requestId);
        }

        // icon セット
        const makeDroneIconHtml = (color, inverted) => {
          const bg = inverted ? color : 'white';
          const svgColor = inverted ? 'white' : color;
          const dronePath = 'M5.5,1C8,1 10,3 10,5.5C10,6.38 9.75,7.2 9.31,7.9L9.41,8H14.59L14.69,7.9C14.25,7.2 14,6.38 14,5.5C14,3 16,1 18.5,1C21,1 23,3 23,5.5C23,8 21,10 18.5,10C17.62,10 16.8,9.75 16.1,9.31L15,10.41V13.59L16.1,14.69C16.8,14.25 17.62,14 18.5,14C21,14 23,16 23,18.5C23,21 21,23 18.5,23C16,23 14,21 14,18.5C14,17.62 14.25,16.8 14.69,16.1L14.59,16H9.41L9.31,16.1C9.75,16.8 10,17.62 10,18.5C10,21 8,23 5.5,23C3,23 1,21 1,18.5C1,16 3,14 5.5,14C6.38,14 7.2,14.25 7.9,14.69L9,13.59V10.41L7.9,9.31C7.2,9.75 6.38,10 5.5,10C3,10 1,8 1,5.5C1,3 3,1 5.5,1M5.5,3A2.5,2.5 0 0,0 3,5.5A2.5,2.5 0 0,0 5.5,8A2.5,2.5 0 0,0 8,5.5A2.5,2.5 0 0,0 5.5,3M5.5,16A2.5,2.5 0 0,0 3,18.5A2.5,2.5 0 0,0 5.5,21A2.5,2.5 0 0,0 8,18.5A2.5,2.5 0 0,0 5.5,16M18.5,3A2.5,2.5 0 0,0 16,5.5A2.5,2.5 0 0,0 18.5,8A2.5,2.5 0 0,0 21,5.5A2.5,2.5 0 0,0 18.5,3M18.5,16A2.5,2.5 0 0,0 16,18.5A2.5,2.5 0 0,0 18.5,21A2.5,2.5 0 0,0 21,18.5A2.5,2.5 0 0,0 18.5,16M3.91,17.25L5.04,17.91C5.17,17.81 5.33,17.75 5.5,17.75A0.75,0.75 0 0,1 6.25,18.5L6.24,18.6L7.37,19.25L7.09,19.75L5.96,19.09C5.83,19.19 5.67,19.25 5.5,19.25A0.75,0.75 0 0,1 4.75,18.5L4.76,18.4L3.63,17.75L3.91,17.25M3.63,6.25L4.76,5.6L4.75,5.5A0.75,0.75 0 0,1 5.5,4.75C5.67,4.75 5.83,4.81 5.96,4.91L7.09,4.25L7.37,4.75L6.24,5.4L6.25,5.5A0.75,0.75 0 0,1 5.5,6.25C5.33,6.25 5.17,6.19 5.04,6.09L3.91,6.75L3.63,6.25M16.91,4.25L18.04,4.91C18.17,4.81 18.33,4.75 18.5,4.75A0.75,0.75 0 0,1 19.25,5.5L19.24,5.6L20.37,6.25L20.09,6.75L18.96,6.09C18.83,6.19 18.67,6.25 18.5,6.25A0.75,0.75 0 0,1 17.75,5.5L17.76,5.4L16.63,4.75L16.91,4.25M16.63,19.25L17.75,18.5A0.75,0.75 0 0,1 18.5,17.75C18.67,17.75 18.83,17.81 18.96,17.91L20.09,17.25L20.37,17.75L19.25,18.5A0.75,0.75 0 0,1 18.5,19.25C18.33,19.25 18.17,19.19 18.04,19.09L16.91,19.75L16.63,19.25Z';
          const borderColor = inverted ? 'white' : color;
          const iconDiv = `<div style="width:45px;height:45px;border-radius:50%;background:${bg};border:2.5px solid ${borderColor};display:flex;align-items:center;justify-content:center;box-sizing:border-box;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"><path fill="${svgColor}" d="${dronePath}"/></svg></div>`;
          if (!inverted) return iconDiv;
          // 選択時: 90px外側コンテナ内に半透明円＋45pxアイコンを中央配置
          const glassColor = color.replace('rgb(', 'rgba(').replace(')', ', 0.3)');
          return `<div style="width:90px;height:90px;border-radius:50%;background:${glassColor};display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${iconDiv}</div>`;
        };
        const droneIconProps = (inverted) => inverted
          ? { iconSize: [90, 90], iconAnchor: [45, 45] }
          : { iconSize: [45, 45], iconAnchor: [22, 22] };
        const iconHtml = makeDroneIconHtml(droneColor, false);
        
        {
          const allowIcon = L.divIcon({
            className: '',
            html: iconHtml,
            iconSize: [45, 45],
            iconAnchor: [22, 22]
          });
          const indexOffSet = 1000
          const addMarker = L.marker(latlng, { icon: allowIcon, zIndexOffset: indexOffSet }).addTo(map.value)
          addMarker.on('click', () => {
            // 前の選択マーカーを通常アイコンに戻す
            if (selectedDroneInfo && selectedDroneInfo.marker !== addMarker) {
              selectedDroneInfo.marker.setIcon(L.divIcon({
                className: '',
                html: makeDroneIconHtml(selectedDroneInfo.droneColor, false),
                iconSize: [45, 45],
                iconAnchor: [22, 22]
              }));
            }
            // 今回クリックしたマーカーを反転アイコンにする
            addMarker.setIcon(L.divIcon({
              className: '',
              html: makeDroneIconHtml(droneColor, true),
              ...droneIconProps(true)
            }));
            selectedDroneInfo = { requestId: reservation.requestId, marker: addMarker, droneColor, normalHtml: iconHtml };
            highlightReservationSections(reservation.requestId);
            setPopupLocation(locationData, reservation, conformityAssessmentRes, latlng);
          })
          const location = { reservID: reservation.requestId, marker: addMarker }
          locationList.value.push(location)
          // 選択中の予約のマーカーが再生成された場合、反転状態を復元 + 左ペインを最新の運航状況で更新
          if (selectedDroneInfo?.requestId === reservation.requestId) {
            addMarker.setIcon(L.divIcon({
              className: '',
              html: makeDroneIconHtml(droneColor, true),
              ...droneIconProps(true)
            }));
            selectedDroneInfo = { requestId: reservation.requestId, marker: addMarker, droneColor, normalHtml: iconHtml };
            // 左ペインのステータスラベル・色をポーリング最新結果で更新
            setPopupLocation(locationData, reservation, conformityAssessmentRes, latlng);
          }
        }
      }
    }

    // 適合性確認改修 start（一覧と同様、予約GETレスポンスの evaluationResults を使用。conformity-assessment APIは呼ばない）
    const getConformityAssessmentResFromReservation = (reservation) => {
      const evaluationResults = reservation.evaluationResults ?? true;
      return { evaluationResults };
    };
    // 適合性確認改修 end

    const toggleMuteFlg = async () => {
      const oldVal = muteFlg.value
      const newVal = oldVal === 'on' ? 'off' : 'on'
      const reservationId = LocationData.value.reservation_id
      if (!reservationId || reservationId === 'Not found') return
      muteFlg.value = newVal // 楽観的更新
      try {
        const apiRes = await $fetch(`/api/safety/planned-deviation/${reservationId}`, {
          method: 'PUT',
          query: { enabled: newVal === 'on' }
        })
        if (apiRes.status !== 204) {
          console.error(`error: put planned-deviation info {status: ${apiRes.status}}.`)
          muteFlg.value = oldVal
        }
      } catch (error) {
        console.error(`put planned-deviation failed: ${error}`)
        muteFlg.value = oldVal
      }
    }

    return {
      showPopup,
      closePopup,
      map,
      map_moveend,
      PopupContent,
      LocationData,
      combinedList,
      combinedListTimeline,
      setPopupContent,
      showLocation,
      setPopupLocation,
      underwayMaerker,
      locationList,
      MapLayerControlMounted,
      muteFlg,
      toggleMuteFlg,
      timelineTooltipPairs
    };
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
      this.MapLayerControlMounted= false;
      console.log(`MapLayerControl_Mounted: ${this.MapLayerControlMounted}`);
    }
  },
}
</script>

<style>
/* 全体レイアウト */
.airway-status-layout {
  display: flex;
  height: 96.5vh;
  overflow: hidden;
}

/* 左サイドパネル */
.side-panel {
  width: 380px;
  min-width: 380px;
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #ccc;
  overflow-y: auto;
  padding: 16px 20px;
  box-shadow: 2px 0 6px rgba(0,0,0,0.15);
  z-index: 100;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
  font-family: 'BIZ UDPGothic';
}

/* ハネのスライドアニメーション */
.slide-enter-active, .slide-leave-active {
  transition: width 0.25s ease, opacity 0.25s ease;
  overflow: hidden;
}
.slide-enter-from, .slide-leave-to {
  width: 0;
  opacity: 0;
}
.slide-enter-to, .slide-leave-from {
  width: 380px;
  opacity: 1;
}

/* マップコンテナ */
.map-container {
  flex: 1;
  position: relative;
  height: 100%;
  min-width: 0;
  background-color: #f0ede8; /* タイル未描画領域をLeafletデフォルトに合わせる */
}

#leafletMap {
  height: 100%;
  width: 100%;
  z-index: 0;
  background-color: #f0ede8;
}

.grayscale-map .leaflet-tile {
  filter: grayscale(100%);
}

.area-control-middle-right {
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

.airway-status-link {
  position: absolute;
  top: 40px;
  right: 30px;
  z-index: 1000;
}

.close-button {
  background: transparent;
  border: none;
  border-radius: 0;
  font-size: 20px;
  cursor: pointer;
  padding: 1px;
  line-height: 1;
  color: #555;
}

.custom-hr {
  margin: 10px 0;
  border: none;
  border-top: 1px solid #ccc;
}

.info-table {
  width: 100%;
  margin: 10px 0;
  font-size: 15px;
  border-spacing: 20px 0px;
  border-collapse: separate
}

.info-table td:first-child {
  width: 40%;
  font-weight: bold;
  text-align: right;
}

.info-table td {
  padding: 5px;
}

.airway-detail-button {
  font-size: 15px;
  border: 2px solid #000000;
  padding: 3px 10px;
  text-decoration: none;
  color: #000000;
}

.spacer {
  height: 80px;
}


.c-sectionNameField.deviation::after {
  border-right: 2px solid crimson;
}

.c-sectionNameField::after {
  z-index: -3;
}

/* 左ペイン位置詳細の航路図：ステータスに関わらず常に青色 */
.location-route-diagram .c-sectionNameField::after,
.location-route-diagram .c-landMarkNameField::after,
.location-route-diagram .c-sectionNameField.deviation::after,
.location-route-diagram .c-landMarkNameField.deviation::after {
  border-right-color: rgb(44, 105, 255) !important;
}
.location-route-diagram .half-overlay {
  border-right-color: rgb(44, 105, 255) !important;
}

.landmarkText{
  margin-top: 10;
  margin-left: 0.5rem;
}

.c-landMarkNameField.deviation::after {
  content: "";
  position: absolute;
  top: 0;
  left: 1rem;
  z-index: -2;
  display: block;
  border-right: 2px solid crimson;
  width: 1px;
  height: 100%;
}

.c-landMarkNameField.half-deviation::after {
  content: "";
  position: absolute;
  top: 0;
  left: 1rem;
  z-index: -3;
  display: block;
  border-right: 2px solid #000000;
  width: 1px;
  height: 100%;
}

.half-overlay {
  position: absolute;
  left: 1rem;
  width: 1px;
  border-right: 2px solid crimson;
  z-index: -1;
}

 /* 下半分赤用 */
.half-overlay.lower {
  bottom: 0;
  height: 50%;
}

 /* 上半分赤用 */
.half-overlay.upper {
  top: 0;
  height: 50%;
}

/* iOS スタイル トグルスイッチ */
.ios-toggle {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: rgb(232, 233, 234);
  cursor: pointer;
  transition: background 0.25s;
  flex-shrink: 0;
}

.ios-toggle--on {
  background: rgb(95, 219, 186);
}

.ios-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.25s;
}

.ios-toggle--on .ios-toggle__thumb {
  transform: translateX(24px);
}

/* ミュートスイッチ行 */
.mute-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 4px;
  gap: 8px;
}

.mute-switch-label {
  font-size: 13px;
  color: #444;
  white-space: nowrap;
}

/* 予約詳細パネル - ステータスラベル */
.location-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 18px;
}

.status-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: normal;
  white-space: nowrap;
}

.status-badge--normal {
  color: rgb(44, 105, 255);
  background-color: rgb(225, 234, 255);
}

.status-badge--abnormal {
  color: rgb(230, 30, 140);
  background-color: rgb(253, 233, 244);
}

.location-reservation-id {
  font-size: 14px;
  color: #333;
}

/* 左ペイン航路図タイムライン */
.routeItem .v-timeline-divider__before {
  background-color: var(--above-color) !important;
}
.routeItem .v-timeline-divider__after {
  background-color: var(--below-color) !important;
}
.routeItem[style*="--above-color: transparent"] .v-timeline-divider__before {
  background-color: transparent !important;
  border-color: transparent !important;
}
.routeItem[style*="--below-color: transparent"] .v-timeline-divider__after {
  background-color: transparent !important;
  border-color: transparent !important;
}
.routeTooltipDot {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid #9e9e9e;
  display: inline-block;
}
.routeItem .v-timeline-divider {
  position: relative;
  height: 100%;
}
.routeItem .v-timeline-divider__dot {
  position: static !important;
  overflow: visible !important;
}
.routeItem .v-timeline-divider__before,
.routeItem .v-timeline-divider__after {
  pointer-events: none;
}
.routeItem {
  position: relative;
}
.routeClickBand {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 48px;
  z-index: 20;
  cursor: pointer;
  background: transparent;
}
.drn_timeline__title {
  font-size: 13px;
  color: #333;
}

/* 予約詳細パネル - 情報行 */
.location-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.location-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-detail-label {
  font-size: 13px;
  font-weight: normal;
  color: rgb(129, 129, 129);
  min-width: 65px;
  flex-shrink: 0;
}

.location-detail-value {
  font-size: 13px;
  color: #333;
}
</style>
<style scoped>
.landmarkNamingField {
  width: 14.642rem!important;
  border: 0!important;
  border-radius: 0!important;
  display: block !important;
  margin-top: 0.5em !important;
  margin-bottom: 0 !important;
}

.c-landmarkFormList {
  padding-left: 0;
}
</style>
