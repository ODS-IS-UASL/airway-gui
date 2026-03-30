<template>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
  <GlobalNavigation v-if = "role == 2" />
  <GlobalNavigationSH v-if = "role == 3" />

  <!-- コンテンツ -->
  <main id="main" class="b-pageMain">
    <div class="b-pageContentHasSubMenu">

    <!-- メインコンテンツ -->
    <div class="b-pageContentHasNavigation">
    <div class="drn_main__app">
    <div variant="flat" class="drn_main__content">
      <!-- ヘッダ -->
      <div class="drn_header">
        <div class="drn_header__item">
          <v-card-title class="drn_header__title">航路画定詳細</v-card-title>
        </div>
      </div>

      <!-- 詳細情報 -->
      <v-card-text class="drn_content">
      <div class="drn_content__body">
        <v-sheet class="drn_content__data">
          <table class="drn_table drn_table--reserve_conf">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路ID</th>
                <td class="drn_table__data">{{ airwayId }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">申請状況</th>
                <td class="drn_table__data">{{ applicationStatus }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">飛行目的</th>
                <td class="drn_table__data">{{ purpose }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">モデル</th>
                <td class="drn_table__data">{{ type }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路</th>
                <td class="drn_table__data">{{ name }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路区画</th>
                <td class="drn_table__data">{{ airwayJunctionRange }}</td>
              </tr>
            </tbody>
          </table>
          <v-divider class="drn_divider"></v-divider>
          <table class="drn_table drn_table--reserve_conf">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路区間</th>
                <td class="drn_table__data">
                  <div class="detail-waypoint-list">
                    <template v-for="(item, index) in combinedSections" :key="index">
                      <div v-if="index % 2 === 0" class="detail-wl-wp">
                        <div class="detail-wl-left">
                          <div class="detail-wl-icon-wrap" v-html="sidebarIcon(item.id)"></div>
                        </div>
                        <span class="detail-wl-wp-name">{{ item.name }}</span>
                      </div>
                      <div v-else class="detail-wl-sec">
                        <div class="detail-wl-left"></div>
                        <span class="detail-wl-sec-name">{{ item.name }}</span>
                      </div>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <v-divider class="drn_divider"></v-divider>
          <table class="drn_table drn_table--reserve_conf">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">総距離</th>
                <td class="drn_table__data">{{ airwayDistance }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">

                <th class="drn_table__label">申請日</th>
                <td class="drn_table__data">{{ create_date }}</td>
              </tr>
            </tbody>
          </table>
        </v-sheet>
        <v-sheet rounded="lg" color="default" class="drn_content__map">
          <MapComponent v-if="airway" :corridorData="airway" />
        </v-sheet>
      </div>
      </v-card-text>
    </div>
    </div>
    </div>

    <!-- ページナビゲーション -->
    <PageNavigation :back="true">
      <ul class="e-buttonGroup">
        <li>
          <button v-if="role == 1" @click="addAirway" class="e-button" >航路追加</button>
        </li>
        <li>
          <button v-if="role == 1" @click="addJunction" class="e-button" >航路点追加</button>
        </li>
        <li>
          <button v-if="role == 1" @click="showConfirmModal" class="e-button">削除</button>
        </li>
      </ul>
      <ul class="e-buttonGroup">
      </ul>
    </PageNavigation>
    <!-- オーバーレイ -->
    <div v-if="confirmDialogVisible" class="overlay"></div>
    <!-- ダイアログ -->
    <dialog class="c-dialog" v-if="confirmDialogVisible">
      <h2 class="e-dialogTitle">本当にこの航路を削除しますか？</h2>
      <table class="c-labeledList">
        <tbody>
          <tr class="c-labeledListRow">
            <th class="e-listLabel">航路ID：</th>
            <td class="e-listValue">{{ airwayId }}</td>
           </tr>
           <tr class="c-labeledListRow">
             <th class="e-listLabel">航路名：</th>
             <td class="e-listValue">{{ name }}</td>
           </tr>
        </tbody>
      </table>
      <ul class="e-buttonGroup">
        <li>
          <button class="e-button-noright" @click="closeConfirmModal">いいえ</button>
        </li>
        <li>
          <button class="e-button-noright" @click="showFnishModal">はい</button>
        </li>
      </ul>
    </dialog>
    <!-- オーバーレイ -->
    <div v-if="finishDialogVisible" class="overlay"></div>
    <!-- ダイアログ -->
    <dialog class="c-dialog" v-if="finishDialogVisible">
      <h2 class="e-dialogTitle">{{ message }}</h2>
      <table class="c-labeledList">
        <tbody>
          <tr class="c-labeledListRow">
            <th class="e-listLabel">航路ID：</th>
            <td class="e-listValue">{{ airwayId }}</td>
           </tr>
           <tr class="c-labeledListRow">
             <th class="e-listLabel">航路名：</th>
             <td class="e-listValue">{{ name }}</td>
           </tr>
        </tbody>
      </table>
      <ul class="e-buttonGroup">
        <li>
          <a class="e-button-noright" href="/airway">航路画定一覧へ戻る</a>
        </li>
      </ul>
    </dialog>
   </div>
  </main>
</template>

<script>
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 運航事業者向けサイドバー
import GlobalNavigation from "~/components/navigation/globalNavigation.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "~/components/navigation/pageNavigation.vue";

// JSON ファイルをインポート
import MapComponent from '@/components/map/showAirwayDetail.vue';

export default {
  components: {
    GlobalNavigationRM,
    GlobalNavigation,
    GlobalNavigationSH,
    PageNavigation,
    MapComponent,
  },
  data() {
    return {
      chartData: '',    
      airwayId: '',
      name: '',
      create_date: '',
      purpose: '',
      droneList: '',
      type: '',
      airwayJunctions: '',
      airwaySections: '',  
      airway: '', 
      airwayDistance: '', 
      airwayJunctionRange: '', 
      sectionRange: '', 
      applicationStatus: '', 
      cookie_role: null,
      role: null,
    };
  },
  computed: {
    corridorId() {
      return this.$route.query.id;
    },
    combinedSections() {
      const points = Array.isArray(this.airwayJunctions) ? this.airwayJunctions : [];
      const sections = Array.isArray(this.airwaySections) ? this.airwaySections : [];
      const maxLength = Math.max(points.length, sections.length);
      const combined = [];
      for (let i = 0; i < maxLength; i++) {
        if (i < points.length) {
          combined.push({ id: i + 1, type: 'point', name: points[i].airwayJunctionName });
        }
        if (i < sections.length) {
          combined.push({ id: i + 1, type: 'section', name: sections[i].airwaySectionName });
        }
      }
      return combined;
    },
  },
  methods: {
    sidebarIcon(number) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 33.818 33.818">
        <circle cx="16.909" cy="16.909" r="14.909" fill="white" stroke="#2C69FF" stroke-width="4"/>
        <text x="16.909" y="22" text-anchor="middle" font-size="16" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700" fill="#2C69FF">${number}</text>
      </svg>`;
    },
    addAirway() {
      const router = useRouter()
      router.push({ path: '/airway/addAirway', query: { id: this.corridorId } })
    },
    addJunction() {
      const router = useRouter()
      router.push({ path: '/airway/addJunction', query: { id: this.corridorId } })
    },
  },
  async created() {
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1","2", "3"];
      this.cookie_role = await roleVerification(ownpage_role);
      if (Object.keys(this.cookie_role).length == 0) {
        console.log(`airwayReservation get role error.`);
        return;
      }
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
    }
  },
  async mounted() {
    try {
      const uaslRes = await $fetch('/api/airway/uasl', { 
        method: 'GET',
        query: { uaslId: [this.corridorId] }
      });
      if (uaslRes.status !== 200) {
        console.error(`error: get uasl info {status: ${uaslRes.status}}.`);
        this.chartData = null;
        return;
      }
      // ここでUASL→airwayに変換
      console.log("uaslRes:", uaslRes);
      this.airwayResData = utils.convertUaslToAirway(uaslRes.data);
      console.log("airwayData:", this.airwayResData);
      this.chartData = useAirwayConvertConnectionOrder(this.airwayResData);

    } catch (error) {
      console.error(`Network request failed: ${error}`);
    }
    
    try {
      const droneRes = await $fetch('/api/airway/aircraft', { 
        method: 'GET'
      });
      console.log(droneRes);
      if (droneRes.status !== 200) {
        console.error(`error: get drone info {status: ${droneRes.status}}.`);
        return;
      }
      const aircraftInfo = droneRes.data.aircraft;
      const airway = this.airwayResData.airway.airways[0];
      this.airwayId = airway.airwayId;
      this.name = airway.airwayName;
      this.create_date = useDateString2(useAirwayGetAirwayApplicationDateFromAirwayId(this.chartData, this.corridorId));
      this.purpose = airway.flightPurpose;
      this.droneList = airway.droneList;
      const droneIdSet = new Set(this.droneList);
      this.type = aircraftInfo
        .filter(a => droneIdSet.has(a["aircraftInfoId"]))
        .map(a => a["name"])
        .join(', ');
      this.airwayJunctions = airway.airwayJunctions;
      this.airwaySections = airway.airwaySections;
      this.airway = airway; 
      this.airwayDistance = useAirwayGetFullDistanceFromAirwayId(this.chartData, this.corridorId) + 'm';
      this.airwayJunctionRange = useAirwayGetCorridorPointRangeFromAirwayIdFullWidth(this.chartData, this.corridorId);
      this.sectionRange = useAirwayGetSectionRangeFromAirwayIdFullWidth(this.chartData, this.corridorId);
      this.applicationStatus = "承認済";
    } catch (error) {
      console.error(`Network request failed: ${error}`);
    }
    
  },
  
  setup() {
    const confirmDialogVisible = ref(false);
    /* 確認モーダルの表示 */
    const showConfirmModal = async () => {
      confirmDialogVisible.value = true;
    };
    /* 確認モーダルの非表示 */
    const closeConfirmModal = async () => {
      confirmDialogVisible.value = false;
    };
    const finishDialogVisible = ref(false);
    /* 終了モーダルの表示 */
    const showFnishModal = async () => {
      closeConfirmModal(); 
      finishDialogVisible.value = true;
      deleteAirway();
    };
    const message = ref("");
    const deleteAirway = async () => {
      /* 航路画定情報削除 */
      const route = useRoute();
      const uaslId = route.query.id;
      try {
        const response = await $fetch(`/api/airway/uasl/${uaslId}`, { 
          method: 'DELETE',
        });
        console.log(response);
        const status = response.status;
        if (status === 204) {
          message.value = "航路の削除に成功しました。";
        } else {
          message.value = "航路の削除に失敗しました。";
        }
      } catch (error) {
        console.error(`Network request failed: ${error}`);
      }
    };

    return {
      confirmDialogVisible,
      showConfirmModal,
      closeConfirmModal,
      finishDialogVisible,
      showFnishModal,
      deleteAirway,
      message,
    };
  },
};
</script>

<style scoped>
.detail-waypoint-list {
  position: relative;
  margin-left: 20px;
}

.detail-waypoint-list::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 12px;
  bottom: 12px;
  width: 14px;
  background: #2C69FF;
}

.detail-waypoint-list::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 12px;
  bottom: 12px;
  width: 8px;
  background: #B1C8FF;
}

.detail-wl-wp {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-wl-sec {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
}

.detail-wl-left {
  width: 24px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-wl-icon-wrap {
  flex-shrink: 0;
  line-height: 0;
  position: relative;
  z-index: 2;
}

.detail-wl-wp-name {
  font-size: 13px;
}

.detail-wl-sec-name {
  font-size: 12px;
  color: #bbb;
}
</style>
