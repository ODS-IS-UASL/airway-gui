<script setup>
/**
 * 新規最大落下範囲設定
 * 範囲設定
 */
import CreateFallToleranceRange from "~/components/map/createFallToleranceRange.vue";
</script>

<template>
  <div class="drn_form__header">
    <div class="drn_form__title">範囲設定</div>
  </div>

  <!-- 設定済み情報 -->
  <dl class="c-configuredInfomationInWizard">
    <div>
      <dt class="e-configuredInformationTitle">名称：</dt>
      <dd class="e-configuredInformationValue">{{ rangeName }}</dd>
    </div>
    <div>
      <dt class="e-configuredInformationTitle">エリア：</dt>
      <dd class="e-configuredInformationValue">{{ areaName }}</dd>
    </div>
  </dl>

  <!-- 詳細情報 -->
  <div id="content" class="b-routeCutPlaneSetting">
    <h2 class="u-invisible">最大落下範囲設定</h2>
    <CreateFallToleranceRange :stepNo="stepNo" :area="areaName" :areaInfo="rangeData.areaInfo" @markerClosed="handleMarkerAdded" />
  </div>
</template>

<script>
export default {
  props: ['rangeData', 'stepNo'],
  data() {
    return {
      areaInfo: this.rangeData.areaInfo,
      rangeName: this.rangeData.rangeName,
      areaName: this.rangeData.areaName,
      markerList: [],
      markerCount:0,
      stepNo: this.stepNo,
    };
  },
  methods: {
    handleMarkerAdded(marker) {
      this.markerList = marker;  // マーカーを追加
      this.markerCount = this.markerList.length-1;
      console.log(this.markerList);
      this.$emit('update:marker', this.markerList);
    },
  }
}
</script>

<style scoped>
</style>