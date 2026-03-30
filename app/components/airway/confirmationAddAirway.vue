<template>
  <!-- 詳細情報 -->
  <v-card-text class="drn_content">
    <div class="drn_content__body">

      <!-- 左カラム：リスト -->
      <v-sheet class="drn_content__data">
        <div class="drn_form__header">
          <div class="drn_form__title">画定申請 確認</div>
        </div>

        <div class="detailList">
          <table class="info-table">
            <tr>
              <td class="drn_situation__label">航路名</td>
              <td class="drn_situation__data">{{ routeName }}</td>
            </tr>
            <tr>
              <td class="drn_situation__label">モデル名</td>
              <td class="drn_situation__data">{{ joinedType }}</td>
            </tr>
            <tr>
              <td class="drn_situation__label">最大落下範囲</td>
              <td class="drn_situation__data">{{ fallToleranceRangeName }}</td>
            </tr>
            <tr>
              <td class="drn_situation__label">航路運営会社</td>
              <td v-if="cookie_role" class="drn_situation__data">{{ airwayOperator }}</td>
            </tr>
            <tr>
              <td class="drn_situation__label">画定日</td>
              <td class="drn_situation__data">{{ determinationDate }}</td>
            </tr>
          </table>
          <!-- 高度グラフ -->
          <table class="info-table info-table--chart">
            <tr>
              <td class="drn_situation__label">高度</td>
              <td><ChartComponent v-if="parsedcorridorData" :corridorData="parsedcorridorData" /></td>
            </tr>
          </table>
          <!-- 総距離 -->
          <table class="info-table">
            <tr>
              <td class="drn_situation__label">総距離</td>
              <td class="drn_situation__data">{{ airwayDistance }}</td>
            </tr>
          </table>
          <!-- 区間 -->
          <table class="info-table info-table--section">
            <tr>
              <td class="drn_situation__label wl-vcenter-label">区間</td>
              <td class="drn_situation__data">
                <div class="waypoint-list">
                  <template v-for="(item, index) in combinedList" :key="index">
                    <div v-if="index % 2 === 0" class="wl-wp">
                      <div class="wl-left">
                        <div class="wl-icon-wrap" v-html="sidebarIcon(item.id)"></div>
                      </div>
                      <span class="wl-wp-name">{{ item.name }}</span>
                    </div>
                    <div v-else class="wl-sec">
                      <div class="wl-left"></div>
                      <span class="wl-sec-name">{{ item.name }}</span>
                    </div>
                  </template>
                </div>
              </td>
            </tr>
          </table>
        </div>
        <!-- .detailList -->
      </v-sheet>
      <!-- .drn_content__data -->

      <!-- 右カラム：マッププレビュー -->
      <v-sheet rounded="lg" color="default" class="drn_content__map--scroll">
        <MapComponent :key="mapKey" :corridorData="parsedcorridorData" :message="fallToleranceRangeId" :source="sourceMarkerCoords" :target="targetMarkerCoords" class="confirmationMap" :stepNo="stepNo" :errorSectionIndex="errorSectionIndex" :contactCoordinates="contactCoordinates"/>
      </v-sheet>
      <!-- drn_content__map -->

    </div>
    <!-- .drn_content__body -->
  </v-card-text>
  <!-- .drn_content -->
</template>

<script>
import MapComponent from '@/components/map/showAddAirwayConfirmation.vue';
import ChartComponent from '@/components/chart/airwaySideViewBeforeCreate.vue';
import { ref } from "vue";
import { useRoute } from "vue-router"

export default {
  components: {
    MapComponent,
    ChartComponent,
  },
  props: [
    "rangeData",
    'stepNo',
    'errorSectionIndex',
    'contactCoordinates',
  ],
  data() {
    return {
      fallToleranceRangeId: this.rangeData.fallToleranceRangeId,
      stepNo: this.stepNo,
      errorSectionIndex: this.errorSectionIndex ?? -1,
      contactCoordinates: this.contactCoordinates ?? null,
      sourceMarkerCoords: this.rangeData.corridorData.value.sourceMarkerCoords,
      targetMarkerCoords: this.rangeData.corridorData.value.targetMarkerCoords,
      mapKey: 0,
    };
  },
  async created() {
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1","2","3"];
      this.cookie_role = await roleVerification(ownpage_role);
      if (Object.keys(this.cookie_role).length == 0) {
        console.log(`airwayReservation get role error.`);
        return;
      }
      console.log(`virtual_role:${this.cookie_role.virtual_role}`);
      switch (this.cookie_role.virtual_role) {
        case "1":
          this.role = 1;  // 航路運営者
          break;
        case "2":
          this.role = 2;  // 運航事業者
          break;
        case "3":
          this.role = 3; // 関係者
          break;
        default:
          this.role = null;
          break;
      }
      //console.log(`role:${this.role}`);
    }
  },
  async setup(props, { emit }) {
    const purpose = props.rangeData.purpose;
    const routeName = props.rangeData.routeName;
    const fallToleranceRangeId = props.rangeData.fallToleranceRangeId;
    const sourceUaslId = props.rangeData.sourceUaslId;
    const targetUaslId = props.rangeData.targetUaslId;
    const corridorData = props.rangeData.corridorData;
    const selectedModels = props.rangeData.selectedModels;

    const parsedcorridorData = corridorData.value;
    console.log(parsedcorridorData);

    const id = parsedcorridorData.airwayId
    const airwayData = {
        airway: {
            airways: [parsedcorridorData]
        }
    };

    const airwayDistance = useAirwayGetFullDistanceFromAirwayId(airwayData, id) + 'm';
    const airwayJunctionRange = useAirwayGetCorridorPointRangeFromAirwayIdFullWidth(airwayData, id);
    const cookie_role = ref(null);
    const role = ref(null);
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1","2","3"];
      cookie_role.value = await roleVerification(ownpage_role);
      if (Object.keys(cookie_role).length == 0) {
        console.log(`airwayReservation get role error.`);
        return;
      }
      console.log(`virtual_role:${cookie_role.value.virtual_role}`);
      switch (cookie_role.value.virtual_role) {
        case "1":
          role.value = 1;  // 航路運営者
          break;
        case "2":
          role.value = 2;  // 運航事業者
          break;
        case "3":
          role.value = 3; // 関係者
          break;
        default:
          role.value = null;
          break;
      }
      console.log(`role:${role.value}`);
    }
    const airwayOperator = cookie_role.value.operatorName;
    console.log(airwayOperator);

    const fallToleranceRangeName = props.rangeData.fallToleranceRange;
    const determinationDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

    let postJsonDataTmp = {
      "airwayDeterminationId": parsedcorridorData.determination_id,
      "airwayName": parsedcorridorData.airwayName,
      "flightPurpose": parsedcorridorData.flightPurpose,
      "airwayParts": [],
    };
    let souceUaslPoint;
    let targetUaslPoint;

    for (let i = 0; i < parsedcorridorData.airwayJunctions.length; i++) {
      let despersionNode = {};
      let airwayJunction = {};
      let airwaySection = {};
      if (i === 0) {
        souceUaslPoint = parsedcorridorData.airwayJunctions[i].airwayJunctionId;
      } else if (i === parsedcorridorData.airwayJunctions.length-1) {
        targetUaslPoint = parsedcorridorData.airwayJunctions[i].airwayJunctionId;
      }
      if (!(i === 0 || i === parsedcorridorData.airwayJunctions.length-1)) {
        // 接続元・接続先は despersionNode 不要
        despersionNode = {
          name: parsedcorridorData.despersion_nodes[i-1].name,
          geometry: {
            coordinates: parsedcorridorData.despersion_nodes[i-1].geometry.coordinates,
            type: 'LineString'
          },
          feasibleVolSeamId: parsedcorridorData.despersion_nodes[i-1].feasibleVolSeamId
        }
      }
      airwayJunction = [{
          name: parsedcorridorData.airwayJunctions[i].airwayJunctionName,
          geometry: {
            coordinates: [parsedcorridorData.airwayJunctions[i].airways[0].airway.geometry.coordinates],
            type: 'Polygon'
          },
          deviationGeometry: {
            coordinates: [parsedcorridorData.airwayJunctions[i].airways[0].deviation.geometry.coordinates],
            type: 'Polygon'
          }
        }]
        // 新規航路改修用 start
        if (parsedcorridorData.airwayJunctions[i].hasOwnProperty("externalGuarantee")) {
          airwayJunction[0]["externalGuarantee"] = parsedcorridorData.airwayJunctions[i].externalGuarantee;
        }

        if (parsedcorridorData.airwayJunctions[i].hasOwnProperty("externalSystemInfo")) {
          airwayJunction[0]["externalSystemInfo"] = parsedcorridorData.airwayJunctions[i].externalSystemInfo;
        }
        // 新規航路改修用 end

      if (i !== 0) {
        airwaySection = { name: parsedcorridorData.airwaySections[i-1].airwaySectionName }
      }
      let airwayPart = {
        despersionNode: despersionNode,
        airwayJunction: airwayJunction,
        airwaySection: airwaySection,
      }
      postJsonDataTmp.airwayParts.push(airwayPart);
    }
    const postJsonData = convertAirwayToUaslAddAirway(souceUaslPoint, postJsonDataTmp, targetUaslPoint);
    console.log("postJsonData",postJsonData);
    emit('update:postJsonData', postJsonData);

    return {
      //showModal,
      airwayDistance,
      airwayJunctionRange,
      airwayOperator,
      fallToleranceRangeName,
      determinationDate,

      purpose,
      routeName,
      fallToleranceRangeId,
      corridorData,
      parsedcorridorData,
      selectedModels,

      cookie_role,
      role,
    };
  },
  methods: {
    sidebarIcon(number) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 33.818 33.818">
        <circle cx="16.909" cy="16.909" r="14.909" fill="white" stroke="#2C69FF" stroke-width="4"/>
        <text x="16.909" y="22" text-anchor="middle" font-size="16" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700" fill="#2C69FF">${number}</text>
      </svg>`;
    },
  },
  computed: {
    combinedList() {
      const points = this.parsedcorridorData.airwayJunctions || [];
      const sections = this.parsedcorridorData.airwaySections || [];
      const maxLength = Math.max(points.length, sections.length);
      const combined = [];

      for (let i = 0; i < maxLength; i++) {
        if (i < points.length) {
          //combined.push({ type: 'c-landMarkNameField', name: points[i].airwayJunctionName });
          combined.push({ id: i+1, type: 'c-landMarkNameField', name: points[i].airwayJunctionName });
        }
        if (i < sections.length) {
          //combined.push({ type: 'c-sectionNameField', name: sections[i].airwaySectionName });
          combined.push({ id: i+1, type: 'c-sectionNameField', name: sections[i].airwaySectionName });
        }
      }
      return combined;
    },
    joinedType() {
      return this.selectedModels.join();
    },
  },
  watch: {
    errorSectionIndex(newVal) {
      this.errorSectionIndex = newVal ?? -1;
      this.mapKey += 1;
    },
    contactCoordinates(newVal) {
      this.contactCoordinates = newVal ?? null;
      this.mapKey += 1;
    },
  },
}

</script>

<style scoped>

.b-twoColumn {
  grid-template-columns: 40% 60%;
}

div#content.b-twoColumn.landmarkFormList {
  grid-template-columns: 100% 0%;
}

.confirmationMap {
 height: 690px !important;
}

#map {
  height: 100%!important;
}

.detailList {
  height: 690px;
  overflow-y: scroll;
}

.detailList::-webkit-scrollbar {
  width: 8px;
  background: white;
}

.detailList::-webkit-scrollbar-thumb {
  background-color: #999999;
  border-radius: 5px;
}

.info-table {
  width: 100%;
  margin: 4px 0;
  font-size: 14px;
  border-spacing: 8px 0px;
  border-collapse: separate;
}

.info-table td:first-child {
  width: 30%;
  font-weight: bold;
  text-align: left;
  white-space: nowrap;
}

.info-table--chart td:first-child,
.info-table--section td:first-child {
  width: 1%;
}

.info-table td {
  padding: 3px;
  vertical-align: top;
}

.wl-vcenter-label {
  vertical-align: top;
  padding-top: 6px;
}

.waypoint-list {
  position: relative;
  margin-left: 20px;
}

.waypoint-list::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 12px;
  bottom: 12px;
  width: 14px;
  background: #2C69FF;
}

.waypoint-list::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 12px;
  bottom: 12px;
  width: 8px;
  background: #B1C8FF;
}

.wl-wp {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wl-sec {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
}

.wl-left {
  width: 24px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.wl-icon-wrap {
  flex-shrink: 0;
  line-height: 0;
  position: relative;
  z-index: 2;
}

.wl-wp-name {
  font-size: 13px;
}

.wl-sec-name {
  font-size: 12px;
  color: #bbb;
}
</style>
