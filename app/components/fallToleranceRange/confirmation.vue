<script setup>
import ShowFallToleranceRange from "~/components/map/showFallToleranceRange.vue"

const props = defineProps({
  rangeData: {
    type: Object,
    default: () => ({
      areaInfo: [],
      rangeName: '',
      areaName: '',
      markerList: [],
      markerCount: 0,  // default の markerCount を明示
    }),
    required: true  // 全てのプロパティが必須であることを表す
  },
  stepNo: {
    type: String,
    required: true,
  }
});

const cookie_role = ref(null);
const role = ref(null);
const stepNo = ref(props.stepNo);

const rolecheck = async () => {
  // ロールチェック
  const ownpage_role = ["1"];
  cookie_role.value = await roleVerification(ownpage_role);
  if (Object.keys(cookie_role).length == 0) {
    console.log(`fallToleranceRange confirmation get role error.`);
    return;
  }
  switch (cookie_role.value.virtual_role) {
    case "1":
      role.value = 1;  // 航路運営者
      break;
    default:
      role.value = null;
      break;
  }
}
if (process.client) {
  rolecheck();
}
console.log(props.rangeData)
</script>

<template>
  <!-- ヘッダ -->
  <div class="drn_form__header">
    <div class="drn_form__title">申請内容確認</div>
  </div>

  <!-- 詳細情報 -->
  <v-card-text class="drn_content">
    <!-- 左カラム：リスト -->
    <div class="drn_content__body">
      <v-sheet class="drn_content__data">
        <table class="drn_table drn_table--reserve_conf">
          <tbody>
            <tr class="drn_table__row">
              <th class="drn_table__label">最大落下範囲</th>
              <td class="drn_table__data">{{ rangeData.rangeName }}</td>
            </tr>
            <tr class="drn_table__row">
              <th class="drn_table__label">エリア</th>
              <td class="drn_table__data">{{ rangeData.areaName }}</td>
            </tr>
            <tr class="drn_table__row">
              <th class="drn_table__label">航路運営者</th>
              <td v-if="cookie_role" class="drn_table__data">{{ cookie_role.operatorName }}</td>
            </tr>
            <tr class="drn_table__row">
              <th class="drn_table__label">系統</th>
              <td class="drn_table__data">{{ useRuntimeConfig().public.typeList.find(item => (item.value == rangeData.typeId.value))?.title ?? "Not found" }}</td>
            </tr>
            <tr class="drn_table__row">
              <th class="drn_table__label">地域</th>
              <td class="drn_table__data">{{ useRuntimeConfig().public.regionList.find(item => (item.value == rangeData.regionId.value))?.title ?? "Not found" }}</td>
            </tr>
          </tbody>
        </table>
      </v-sheet>
      <!-- 右カラム：マッププレビュー -->
      <v-sheet rounded="lg" color="default" class="drn_content__map">
        <showFallToleranceRange :stepNo="stepNo" class="area2" style="height:75dvh" :markerList="rangeData.markerList"/>
      </v-sheet>
    </div>
    <!-- .drn_content__body -->
  </v-card-text>
</template>

<style scoped>
.area2{
  grid-area: area2;
}
</style>