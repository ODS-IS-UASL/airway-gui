<script setup lang="ts">
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import DronePortMap from '~/components/common/DronePortMap.vue'
import { utils } from '~/utils/utils'
// import { LatLngBounds } from 'leaflet' // SSR leaflet不可
import PageNavigation from '~/components/navigation/pageNavigation.vue'

definePageMeta({
  layout: 'system-global-navigation',
})

const { getRole } = useCreated()
const { toFixed } = useMyFilter()
const { constants } = useMyConstant()
const isLoading = useState('isLoading')// スピナー表示
const coordinatesDecimal = 7 // 座標桁数（整形用）
isLoading.value = true
const myRole = ref()
const ownpageRole = ['1', '2', '3']

/** ダイアログ表示フラグ */
const commonDialogVisible = ref(false) // ドローンポート一覧情報取得失敗ダイアログ
const commonDialogMessage = ref('')

const dronePortDisplayFlg = ref(true) // ドローンポート表示切替
const emergencyLandingSitesDisplayFlg = ref(true) // 緊急着陸地点表示切替
const preparationDisplayFlg = ref(true) // 準備中表示切替
const notAvailableDisplayFlg = ref(true) // 使用不可表示切替
const maintenanceDisplayFlg = ref(true) // メンテナンス中表示切替
// const buttonAreaOpen = ref(false) // 地図上画面遷移ボタン表示切替
const dronePortsInfo = ref([{ lat: 0, lon: 0, dronePortId: '' }])

/** 地図 */
const baseMaxLat = Number(toFixed(useRuntimeConfig().public.selectMaxLat, coordinatesDecimal))
const baseMinLat = Number(toFixed(useRuntimeConfig().public.selectMinLat, coordinatesDecimal))
const baseMaxLon = Number(toFixed(useRuntimeConfig().public.selectMaxLon, coordinatesDecimal))
const baseMinLon = Number(toFixed(useRuntimeConfig().public.selectMinLon, coordinatesDecimal))
let apiParams = { maxLat: baseMaxLat, minLat: baseMinLat, maxLon: baseMaxLon, minLon: baseMinLon }
/**
 * ドローンポート情報一覧取得
 */
const getDoronePortInfoList = async () => {
  try {
    const apiResult = await $fetch('/api/drone/droneport/info/list', { 
      method: 'GET',
      query: apiParams
    });
    if (utils.isNormalStatusResponse(apiResult.status)) {
      // 取得成功時処理
      const { data: dataList } = apiResult.data
      dronePortsInfo.value = dataList
    }
    else {
      // 取得失敗時処理
      const responseBody = apiResult.data
      commonDialogVisible.value = true
      if (responseBody?.errorDetail) {
        commonDialogMessage.value = `離着陸場一覧情報の取得に失敗しました。(エラー詳細：${apiResult.data.errorDetail})`
      }
      else {
        commonDialogMessage.value = `離着陸場一覧情報の取得に失敗しました。(エラー詳細：)`
      }
    }
  }
  catch (error) {
    console.log(error)
  }
}

/**
 * 地図コンポーネントの表示位置変更イベント
 */
const updateBounds = async (north: number, east: number, south: number, west: number) => {
  // 変更後の座標でドローンポート情報一覧取得APIを実行する
  apiParams = { maxLat: north, minLat: south, maxLon: east, minLon: west }
  await getDoronePortInfoList()
}

onBeforeMount(async () => {
  myRole.value = await getRole(ownpageRole) // ロール
})

/**
 * mounted
 */
onMounted(async () => {
  isLoading.value = false
})
</script>

<template>
  <div class="page-content">
    <div class="b-pageContentHasSubMenu">
      <!-- メインコンテンツ -->
      <div class="b-pageContentHasNavigation">
        <div class="drn_main__app">
          <div class="drn_header">
            <div class="drn_header__item">
              <v-card-title class="drn_header__title">
                離着陸場位置表示
              </v-card-title>
            </div>
          </div>
          <div class="px-2">
            <v-container
              fluid
              style="height: 100%"
              class="pb-1"
            >
              <v-row>
                <v-col>
                  <DronePortMap
                    v-model:drone-port-visible="dronePortDisplayFlg"
                    v-model:emergency-landing-sites-visible="emergencyLandingSitesDisplayFlg"
                    v-model:preparation-visible="preparationDisplayFlg"
                    v-model:not-available-visible="notAvailableDisplayFlg"
                    v-model:maintenance-visible="maintenanceDisplayFlg"
                    :drone-ports-list="dronePortsInfo"
                    :drone-port-popup="true"
                    @update-bounds="updateBounds"
                  >
                    <template #bindPopup />
                    <template #customControlTL>
                      <div
                        class="leaflet-control leaflet-bar"
                        style="background-color: white; padding: 8px;font-size: 15px;"
                      >
                        <h3>表示切替</h3>
                        <v-checkbox
                          v-model="dronePortDisplayFlg"
                          color="primary"
                          hide-details
                          label="離着陸場"
                          class="custom-toggled-label"
                          density="compact"
                        />
                        <v-checkbox
                          v-model="emergencyLandingSitesDisplayFlg"
                          color="primary"
                          hide-details
                          label="緊急着陸場"
                          class="custom-toggled-label"
                          density="compact"
                        />
                        <br>
                        <h4>動作状況</h4>
                        <v-checkbox
                          v-model="preparationDisplayFlg"
                          color="primary"
                          hide-details
                          label="準備中"
                          class="custom-toggled-label"
                          density="compact"
                        />
                        <v-checkbox
                          v-model="notAvailableDisplayFlg"
                          color="primary"
                          hide-details
                          label="使用不可"
                          class="custom-toggled-label"
                          density="compact"
                        />
                        <v-checkbox
                          v-model="maintenanceDisplayFlg"
                          color="primary"
                          hide-details
                          label="メンテナンス中"
                          class="custom-toggled-label"
                          density="compact"
                        />
                      </div>
                    </template>
                  </DronePortMap>
                </v-col>
              </v-row>
            </v-container>
          </div>
          <!-- ページナビゲーション -->
          <PageNavigation
            :back="true"
            style="position: fixed;bottom: 0px;"
          >
            <ul class="e-buttonGroup" />
          </PageNavigation>
          <!-- 一覧情報取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="commonDialogVisible"
            title="離着陸場情報一覧取得 失敗"
            :message="commonDialogMessage"
            :dialog-type="constants.dialogType.error"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="閉じる"
                  @click="commonDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.custom-toggled-label .v-label {
  opacity: 1.0 !important;
  color: black;
  font-weight: bold;
}
.accordion-content {
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 8px;
}
.custom-btn {
  min-width: 230px;
}
</style>
