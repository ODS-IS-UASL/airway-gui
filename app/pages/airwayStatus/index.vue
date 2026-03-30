<template>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
  <GlobalNavigation v-if = "role == 2" />
  <GlobalNavigationSH v-if = "role == 3" />

  <!-- コンテンツ -->
  <main id="main" class="b-pageMain">
    <div class="b-pageContentHasSubMenu">
      <div class="b-pageContentHasNavigation b-pageContentHasNavigation--fill">
        <!-- テーブル -->
        <AirwayStatusItemList
          :reservationData="reservationData || { result: [] }"
          :airwayData="airwayData"
          :airwayDataLoading="airwayDataLoading"
          :reservationLoading="reservationLoading"
          :ownDataReady="ownDataReady"
        />
      </div>
      <!-- ページナビゲーション -->
      <PageNavigation :back="true">
      </PageNavigation>
    </div>
  </main>
</template>

<script>
import AirwayStatusItemList from '@/components/AirwayStatusItemList.vue';
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 運航事業者向けサイドバー
import GlobalNavigation from "~/components/navigation/globalNavigation.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "~/components/navigation/pageNavigation.vue";

export default {
  components: {
    AirwayStatusItemList,
    GlobalNavigationRM,
    GlobalNavigation,
    GlobalNavigationSH,
    PageNavigation
  },
  setup() {
    const { airwayData, ownDataReady, airwayDataLoading, startLoading } = useAirwayReservationLoader();
    return { airwayData, ownDataReady, airwayDataLoading, startLoading };
  },
  data() {
    return {
      reservationData: null,
      reservationLoading: true,
      cookie_role: null,
      role: null,
      parentOperatorId: null,
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
      console.log(`role:${this.role}`);
    }
  },
  async mounted() {
    if (typeof window !== 'undefined') {
      this.parentOperatorId = localStorage.getItem('uasl:user:parentOperatorId');
    }

    // role が確定したら実行（created() が非同期のため watch で待機）
    var unwatch = this.$watch('role', async () => {
      if (this.role !== null) {
        let lastPage = 1;
        let currentPage = 1;
        let tmpReservationData = null;
        let reservationUrl = '';

        switch (this.role) {
          case 2:
          case 3:
            reservationUrl = `/api/reservation/operator/${this.parentOperatorId}/uaslReservations`;
            break;
          case 1:
            reservationUrl = `/api/reservation/admin/uaslReservations`;
            break;
          default:
            console.log("error: get airway reservation info (permision denied.)");
            this.reservationData = {};
            return;
        }

        let reservationRes = await $fetch(reservationUrl, { method: 'GET' });
        if (reservationRes.status !== 200) {
          console.error(`error: get airway reservation info {status: ${reservationRes.status}}.`);
          this.reservationData = {};
          return;
        }

        reservationRes.data = utils.convertUaslToAirwayReservation(reservationRes.data);
        tmpReservationData = reservationRes.data;
        currentPage = 1;
        lastPage = reservationRes.data.lastPage;

        while (currentPage < lastPage) {
          currentPage++;
          let reservationRes2 = await $fetch(reservationUrl, { method: 'GET', query: { page: currentPage } });
          if (reservationRes2.status !== 200) {
            console.error(`error: get airway reservation info {status: ${reservationRes2.status}}.`);
            this.reservationData = {};
            return;
          }
          reservationRes2.data = utils.convertUaslToAirwayReservation(reservationRes2.data);
          reservationRes2.data.result.forEach((reservation) => {
            tmpReservationData.result.push(reservation);
          });
        }

        // requestId で重複排除（adminエンドポイントは同一 requestId が複数返ることがある）
        const uniqueMap = new Map(tmpReservationData.result.map((r) => [r.requestId, r]));
        this.reservationData = { ...tmpReservationData, result: Array.from(uniqueMap.values()) };
        this.reservationLoading = false;

        // Stage2・Stage3 は useAirwayReservationLoader で管理
        await this.startLoading(this.reservationData);

        unwatch();
      }
    });
  },
};
</script>