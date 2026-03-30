<template>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
  <GlobalNavigationSH v-if = "role == 3" />

  <!-- コンテンツ -->
  <main id="main" class="b-pageMain">
   <div class="b-pageContentHasSubMenu">
     <!-- メインコンテンツ -->
     <!-- メインコンテンツ -->
    <div class="b-pageContentHasNavigation">
    <div class="drn_main__app">
    <div variant="flat" class="drn_main__content">
      <!-- ヘッダ -->
      <div class="drn_header">
        <div class="drn_header__item">
          <v-card-title class="drn_header__title">最大落下範囲詳細</v-card-title>
        </div>
      </div>

      <!-- 詳細情報 -->
      <v-card-text class="drn_content">
      <div class="drn_content__body">
        <v-sheet class="drn_content__data">
          <table class="drn_table drn_table--reserve_conf">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">最大落下範囲ID</th>
                <td class="drn_table__data">{{ selectedRouteFid }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">申請日・更新日</th>
                <td class="drn_table__data">{{ application_date }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">最大落下範囲名</th>
                <td class="drn_table__data">{{ name }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">エリア</th>
                <td class="drn_table__data">{{ area }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">系統</th>
                <td class="drn_table__data">{{ typeName }}</td>
              </tr>
              <tr><td class="drn_table__space"></td></tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">地域</th>
                <td class="drn_table__data">{{ regionName }}</td>
              </tr>
            </tbody>
          </table>
        </v-sheet>
        <v-sheet rounded="lg" color="default" class="drn_content__map">
          <MapComponent
            v-if="rangeData"
            :rangeData="rangeData"
            :selectedRouteFid="selectedRouteFid"
          />
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
          <button class="e-button" @click="showConfirmModal">取り下げ・削除</button>
        </li>
      </ul>
    </PageNavigation>
    <!-- オーバーレイ -->
    <div v-if="confirmDialogVisible" class="overlay"></div>
    <!-- ダイアログ -->
    <dialog class="c-dialog" v-if="confirmDialogVisible">
      <h2 class="e-dialogTitle">本当にこの最大落下範囲を削除しますか？</h2>
      <table class="c-labeledList">
        <tbody>
          <tr class="c-labeledListRow">
            <th class="e-listLabel">最大落下範囲ID：</th>
            <td class="e-listValue">{{ selectedRouteFid }}</td>
           </tr>
           <tr class="c-labeledListRow">
             <th class="e-listLabel">最大落下範囲名：</th>
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
            <th class="e-listLabel">最大落下範囲ID：</th>
            <td class="e-listValue">{{ selectedRouteFid }}</td>
           </tr>
           <tr class="c-labeledListRow">
             <th class="e-listLabel">最大落下範囲名：</th>
             <td class="e-listValue">{{ name }}</td>
           </tr>
        </tbody>
      </table>
      <ul class="e-buttonGroup">
        <li>
          <a class="e-button-noright" href="/fallToleranceRange">最大落下範囲一覧へ戻る</a>
        </li>
      </ul>
    </dialog>
   </div>
  </main>
</template>

<script>
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "~/components/navigation/pageNavigation.vue";
import MapComponent from "~/components/map/showFallToleranceRange.vue";

export default {
  
  data() {
    return {
      selectedRouteFid: this.$route.query.fid,
      area: this.$route.query.area,
      application_date: this.$route.query.application_date,
      name: this.$route.query.name,
      cookie_role: null,
      role: null,
      rangeData: null,
      operatorId: null,
      typeName: null,
      regionName: null,
      operatorData: null,
    };
  },
  components: {
    GlobalNavigationRM,
    GlobalNavigationSH,
    PageNavigation,
    MapComponent
  },
  async mounted() {
    const rangeRes = await $fetch('/api/airway/max-fall-range', { 
      method: 'GET',
      query: { businessNumber: localStorage.getItem('uasl:user:parentOperatorId') }
    });
    console.log(rangeRes);
    if (rangeRes.status != 200) {
      console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
      this.rangeData = null;
      return;
    } else {
      this.rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);
    }
    if (this.rangeData && this.rangeData.fallToleranceRanges) {
      // 最大落下範囲を作成したOperatorIdを取得
      for (let i=0; i<this.rangeData.fallToleranceRanges.length; i++) {
        const range = this.rangeData.fallToleranceRanges[i];
        if (range.fallToleranceRangeId == this.selectedRouteFid) {
          this.operatorId = range.airwayOperatorId;
        }
      }
    }

    console.log(`fallToleranceRange operatorId: ${this.operatorId}`);
    // /operator廃止につき事業者情報取得は展進しない


    // 系統
    this.typeName = useRuntimeConfig().public.typeList.find(item => (item.value == this.$route.query.typeId))?.title ?? "Not found";
    // 地域
    this.regionName = useRuntimeConfig().public.regionList.find(item => (item.value == this.$route.query.regionId))?.title ?? "Not found"
  },
  async created() {
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1"];
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
        case "3":
          this.role = 3; // 関係者
          break;
        default:
          this.role = null;
          break;
      }
      console.log(`role:${this.role}`);
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
      deleteFallToleranceRange();
    };
    const message = ref("");
    const deleteFallToleranceRange = async () => {
      /* 最大許容落下範囲情報削除 */
      const route = useRoute();
      const selectedRouteFid = route.query.fid;
      console.log(`selectedRouteFid`);
      console.log(selectedRouteFid);
      const params = {
        maxFallRangeId: selectedRouteFid,
        businessNumber: localStorage.getItem('uasl:user:parentOperatorId')
      }
      const response = await $fetch('/api/airway/max-fall-range', { 
        method: 'DELETE',
        query: params
      });
      console.log(response);
      const status = response.status;
      if (status === 204) {
        message.value = "最大落下範囲の削除に成功しました。";
      } else if (status === 409) {
        message.value = "最大落下範囲の削除に失敗しました。最大落下範囲が既に航路画定に使用されています。";
      } else {
        message.value = "最大落下範囲の削除に失敗しました。";
      }
    };

    return {
      confirmDialogVisible,
      showConfirmModal,
      closeConfirmModal,
      finishDialogVisible,
      showFnishModal,
      deleteFallToleranceRange,
      message,
    };
  },
}

</script>

<style>
</style>