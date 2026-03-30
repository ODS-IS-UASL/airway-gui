<script>
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 運航事業者向けサイドバー
import GlobalNavigation from "~/components/navigation/globalNavigation.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import AirwayStatus from "~/components/map/airwayStatus.vue";

export default {
  components: {
    GlobalNavigationRM,
    GlobalNavigation,
    GlobalNavigationSH,
    AirwayStatus
  },
  data() {
    return {
      cookie_role: null,
      role: null,
      airwayId: null,
    }
  },
  async created() {
    if (process.client) {
      // クエリパラメータから選択航路IDを取得
      const route = useRoute();
      this.airwayId = route.query.airwayId ?? null;
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
}
</script>

<template>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
  <GlobalNavigation v-if = "role == 2" />
  <GlobalNavigationSH v-if = "role == 3" />

  <!-- コンテンツ -->
  <main id="main" class="b-pageMain">
    <!-- ページ情報 -->
    <h1 class="u-invisible">運航状況</h1>

    <!-- 全画面マップ -->
    <AirwayStatus :role="role" :cookie_role="cookie_role" :airwayId="airwayId"/>
  </main>
</template>
