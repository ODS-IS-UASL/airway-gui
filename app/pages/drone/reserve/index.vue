<script setup lang="ts">
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import type { CommonResponse } from '~/composables/types/aircraftApi'
import AircraftReserveEdit from '~/components/dialogs/AircraftReserveEditDialog.vue'
import LocationDisplayMap from '~/components/common/LocationDisplayMap.vue'
import TablePaging from '~/components/common/TablePaging.vue'
import ListViewPreView from '~/components/common/ListViewPreView.vue'
import SearchOption from '~/components/common/SearchOption.vue'
import PageNavigation from '~/components/navigation/pageNavigation.vue'

definePageMeta({
  layout: 'system-global-navigation',
})

const { getRole } = useCreated()
const isLoading = useState('isLoading') // スピナー表示
const isMounted = ref(false)
const { constants } = useMyConstant()
const myRole = ref()
const ownpageRole = ['1', '2', '3']

// 利用するフィルタ
// const router = useRouter()

const { $luxon } = useNuxtApp()

type paramsType = {
  [key: string]: any
}
let params: paramsType = {}

// 選択ボタン押下行の機体ID
const selectId = ref('')
// 選択ボタン押下行の機体名
const selectReserveName = ref('')
// 選択ボタン押下行の機体予約ID
const selectReserveId = ref('')
// 選択ボタン押下行の機体予約時間
const selectReserveTime = ref('')

// 検索条件
const aircraftName = ref('')
const reserveDatetimeFrom = ref('')
const reserveDatetimeTo = ref('')

/* ページング部品の値（検索にも使用） */
const lastPage = ref(0) // ページ総数 // サーバーサイドデータ
const totalItems = ref(0) // データ総数 // サーバーサイドデータ
const currentPage = ref(0) // 現在のページ // クライアントサイドデータ // クライアントで操作してページが変わるごとに取得API
const perPage = 20 // 一ページ当たりの表示件数 // クライアントサイドデータ // 固定
const totalVisible = 7 // ページングの表示数 // クライアントサイドデータ // 固定

/** ダイアログ表示フラグ */
const aircraftReserveEditDialogVisible = ref(false) // 機体予約更新削除画面(ダイアログ)
const getFailedDialogVisible = ref(false) // 一覧取得失敗ダイアログ
const getByPkFailedDialogVisible = ref(false) // 詳細取得失敗ダイアログ

const reserveAircraftList = ref<reserveAircraft[]>()
const errorDetail = ref('') // エラー詳細

const displayFormat = ref('listView')

// 機体予約情報の型定義
interface reserveAircraft {
  aircraftId: string
  aircraftName: string
  reservationTime: string
  aircraftReservationId: string
  paramReserveDatetime: string
  operatorId: string
}

onBeforeMount(async () => {
  myRole.value = await getRole(ownpageRole) // ロール
})

onMounted(async () => {
  // 一ページ当たりの表示件数
  params.perPage = perPage
  // 一ページ目を表示
  params.page = 1
  await loadingData()
  // 完了後プロパティをFalseに設定
  isLoading.value = false
  isMounted.value = true
})

const loadOn = () => {
  isLoading.value = true
}

const loadOff = () => {
  isLoading.value = false
}

// 検索ボタン押下処理
const onSearchButtonClick = async () => {
  params = {
    // 入力が存在したパラメータのみ出力
    ...(!utils.isBlank(aircraftName.value) && { aircraftName: aircraftName.value }),
    ...(!utils.isBlank(reserveDatetimeFrom.value) && { timeFrom: utils.convertJSTtoUTC(changeDayStart(reserveDatetimeFrom.value)!) }),
    ...(!utils.isBlank(reserveDatetimeTo.value) && { timeTo: utils.convertJSTtoUTC(changeDayEnd(reserveDatetimeTo.value)!) }),
  }
  // 一ページ当たりの表示件数
  params.perPage = perPage
  // 一ページ目を表示
  params.page = 1

  await loadingData()
}

// データ取得処理
const loadingData = async () => {
  // spinerOn
  await loadOn()
  const apiResult = await $fetch('/api/drone/aircraft/reserve/list', { 
    method: 'GET',
    query: params
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    const resultJson = apiResult.data
    const dataList = resultJson.data // 検索結果
    lastPage.value = resultJson.lastPage // 最終ページ
    totalItems.value = resultJson.total // 取得データ総件数
    currentPage.value = resultJson.currentPage // 現在のページ
    const newDataList = dataList.map((data: any) => {
      return {
        paramReserveDatetime: data.reservationTimeFrom,
        reservationTime: changeDatetimeFormat(data.reservationTimeFrom, data.reservationTimeTo),
        aircraftId: data.aircraftId,
        aircraftName: data.aircraftName,
        aircraftReservationId: data.aircraftReservationId,
        operatorId: data.operatorId,
      }
    })
    reserveAircraftList.value = newDataList
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    getFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約情報一覧の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約情報一覧の取得に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
}

// データ取得処理(機体情報詳細取得API)
const loadingDetailData = async (params: any) => {
  const apiResult = await $fetch(`/api/drone/aircraft/info/detail/${params}`, { 
    method: 'GET',
    query: {
      isRequiredPriceInfo: false,
      isRequiredPayloadInfo: false,
    }
  });

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    return apiResult.data
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    getByPkFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体情報の取得に失敗しました。(エラー詳細：)`
    }
  }
}

// 時間フォーマット(yyyy/MM/dd HH:mm～yyyy/MM/dd HH:mm)に変換する
const changeDatetimeFormat = (datetimeFrom: any, datetimeTo: any) => {
  const dtFrom = utils.toFormatJSTtime(datetimeFrom, constants.format.datetime, 'local')
  const dtTo = utils.toFormatJSTtime(datetimeTo, constants.format.datetime, 'local')
  const formatDatetime = `${dtFrom}～${dtTo}`
  return formatDatetime
}

// 日の終了日時を取得
const changeDayEnd = (dateTime: string) => {
  const dt = $luxon.fromISO(dateTime)
  const newDt = dt.endOf('day')
  return newDt.toISO()
}

// 日の開始日時を取得
const changeDayStart = (dateTime: string) => {
  const dt = $luxon.fromISO(dateTime)
  const newDt = dt.startOf('day')
  return newDt.toISO()
}

// 機体予約情報更新削除画面表示
const goReserveAircraftUpdater = (id: string, name: string, time: string, reserveId: string) => {
  selectId.value = id
  selectReserveName.value = name
  selectReserveId.value = reserveId
  selectReserveTime.value = time
  // 機体予約更新削除画面(ダイアログ)表示
  aircraftReserveEditDialogVisible.value = true
}

// 更新・削除完了時処理
const afterUpdate = () => {
  aircraftName.value = ''
  reserveDatetimeFrom.value = ''
  reserveDatetimeTo.value = ''
  onSearchButtonClick()
}

// 検索条件リセットボタン押下処理
const onSearchConditionsResetButtonClick = () => {
  aircraftName.value = ''
  reserveDatetimeFrom.value = ''
  reserveDatetimeTo.value = ''
}

/**
 * ページ変更
 */
const searchPageData = async (page: number) => {
  // 選択したページ
  params.page = page

  await loadingData()
}

// テーブルヘッダー
const headers = [
  {
    title: '予約日時',
    value: 'reservationTime',
  },
  {
    title: '機体ID',
    value: 'aircraftId',
  },
  {
    title: '機体名',
    value: 'aircraftName',
  },
  {
    title: 'オペレータID',
    value: 'operatorId',
  },
  {
    title: '予約変更',
    value: 'changeReserve',
  },
]

/**
 * 行選択
 */
const selectedRow = ref<any>(null)
const onRowClick = async (event: any, row: any) => {
  if (!utils.isNullUndefined(selectedRow.value) && selectedRow.value?.aircraftReservationId === row.aircraftReservationId) {
    // 既に選択されている行を再押下で選択解除
    selectedRow.value = null
    return
  }
  selectedRow.value = row
  const detailData = await loadingDetailData(row.aircraftId)
  selectedRow.value.imageData = detailData?.imageData
  selectedRow.value.lat = detailData?.lat
  selectedRow.value.lon = detailData?.lon
  await loadOff()
}
</script>

<template>
  <div
    v-if="isMounted"
    class="page-content data-table-content"
  >
    <div class="b-pageContentHasSubMenu">
      <!-- メインコンテンツ -->
      <div class="b-pageContentHasNavigation">
        <div class="drn_main__app">
          <div class="drn_header">
            <div class="drn_header__item">
              <v-card-title class="drn_header__title">
                機体予約一覧
              </v-card-title>
            </div>
            <div class="drn_header__action">
              <SearchOption
                @search-button-click="onSearchButtonClick"
                @reset-button-click="onSearchConditionsResetButtonClick"
              >
                <template #searchContents>
                  <v-row justify="center">
                    <v-col
                      class="pr-8"
                      cols="4"
                    >
                      <label class="form-label">
                        <b>機体名</b>
                      </label>
                      <v-text-field
                        v-model="aircraftName"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="24"
                        placeholder="機体名を入力してください。"
                        hide-details
                      />
                    </v-col>
                    <v-col
                      class="pr-8"
                      cols="4"
                    >
                      <label class="form-label">
                        <b>予約開始日</b>
                      </label>
                      <v-text-field
                        v-model="reserveDatetimeFrom"
                        type="date"
                        outlined
                        dense
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="4">
                      <label class="form-label">
                        <b>予約終了日</b>
                      </label>
                      <v-text-field
                        v-model="reserveDatetimeTo"
                        type="date"
                        outlined
                        dense
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </template>
              </SearchOption>
              <ListViewPreView v-model:display-format="displayFormat" />
            </div>
          </div>
          <div class="content-body px-2">
            <v-container fluid>
              <v-row no-gutters>
                <!-- リストビュープレビューで大きさ切り替え -->
                <v-col :cols="displayFormat === 'listView' ? 12 : 6">
                  <v-card-text class="drn_content">
                    <div class="drn_content__body">
                      <v-sheet class="drn_content__data">
                        <div class="drn_list">
                          <div class="drn_list__body">
                            <v-data-table
                              :headers="headers"
                              :items="reserveAircraftList"
                              :items-per-page="perPage"
                              :items-length="totalItems"
                              item-value="id"
                              item-key="id"
                              fixed-header
                              fixed-footer
                              density="comfortable"
                              class="drn_list__table aircraft-reserve-list"
                            >
                              <template #bottom>
                                <TablePaging
                                  :current-page="currentPage"
                                  :total-visible="totalVisible"
                                  :last-page="lastPage"
                                  :total-items="totalItems"
                                  :per-page="perPage"
                                  @update-page="searchPageData"
                                />
                              </template>
                              <template #body="{ items }">
                                <tr
                                  v-for="(item, index) in items"
                                  :key="index"
                                  :class="{ drn_table__selected: selectedRow?.aircraftReservationId === item?.aircraftReservationId }"
                                  @click="onRowClick(item, item)"
                                >
                                  <td :class="{ drn_table__selected_first_td: selectedRow?.aircraftReservationId === item?.aircraftReservationId }">
                                    {{ item?.reservationTime }}
                                  </td>
                                  <td>{{ item?.aircraftId }}</td>
                                  <td>{{ item?.aircraftName }}</td>
                                  <td>{{ item?.operatorId }}</td>
                                  <td>
                                    <v-btn
                                      color="indigo"
                                      variant="text"
                                      :disabled="myRole === 3"
                                      @click.stop="goReserveAircraftUpdater(item.aircraftId, item.aircraftName, item.paramReserveDatetime, item.aircraftReservationId)"
                                    >
                                      選択
                                    </v-btn>
                                  </td>
                                </tr>
                              </template>
                            </v-data-table>
                          </div>
                        </div>
                      </v-sheet>
                    </div>
                  </v-card-text>
                </v-col>
                <!-- プレビュー表示 -->
                <v-col
                  v-show="displayFormat !== 'listView'"
                  class="pl-5"
                >
                  <v-card
                    class="mx-auto pa-2 aircraft-reserve-list text-h6"
                    style="height: 77dvh; width: 100%; border: 1px solid #000000; box-sizing: border-box; overflow-y: auto"
                    elevation="0"
                    rounded="0"
                  >
                    <v-row class="pt-5">
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        予約日時
                      </v-col>
                      <v-col>
                        {{ selectedRow?.reservationTime }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体ID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.aircraftId }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体名
                      </v-col>
                      <v-col>
                        {{ selectedRow?.aircraftName }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        オペレータID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.operatorId }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row class="pb-5">
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体画像
                      </v-col>
                      <v-col>
                        <v-card
                          v-if="selectedRow?.imageData"
                          height="32vh"
                          width="16vw"
                        >
                          <v-img
                            :src="selectedRow?.imageData"
                            height="100%"
                            width="100%"
                          />
                        </v-card>
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体位置
                      </v-col>
                      <v-col>
                        <v-card
                          v-show="selectedRow?.lat && selectedRow?.lon && displayFormat !== 'listView'"
                          height="40vh"
                          width="27vw"
                        >
                          <LocationDisplayMap
                            :lat="selectedRow?.lat"
                            :lon="selectedRow?.lon"
                            :visible="displayFormat !== 'listView'"
                          />
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-col>
              </v-row>
            </v-container>
          </div>
          <!-- ページナビゲーション -->
          <PageNavigation
            :back="true"
            style="position: fixed;bottom: 0"
          >
            <ul class="e-buttonGroup" />
          </PageNavigation>
          <AircraftReserveEdit
            v-model:dialog-visible="aircraftReserveEditDialogVisible"
            :select-id="selectId"
            :select-reserve-name="selectReserveName"
            :select-reserve-id="selectReserveId"
            :select-reserve-time="selectReserveTime"
            @complete="afterUpdate"
          />
          <!-- 一覧取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="getFailedDialogVisible"
            title="機体予約情報一覧取得 失敗"
            :message="errorDetail"
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
                  @click="getFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 詳細取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="getByPkFailedDialogVisible"
            title="機体情報詳細取得 失敗"
            :message="errorDetail"
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
                  @click="getByPkFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ステータス欄固定する*/
.aircraft-reserve-list :deep(th:nth-child(5)) {
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 0px;
  background-color: white;
  /* 予約変更は非表示にする start */
  display: none;
  /* 予約変更は非表示にする end */
}

.aircraft-reserve-list >>> tr td:nth-child(5) {
  text-align: center;
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 0px;
  background-color: white;
  transition: background-color 0s;
  /* 予約変更は非表示にする start */
  display: none;
  /* 予約変更は非表示にする end */
}
.aircraft-reserve-list {
  height: 77dvh;
}
.v-data-table >>> .drn_table__selected td:nth-child(5) {
  background-color: rgba(229,237,255);
}
.drn_content {
  padding: 0 !important;
}
.v-data-table {
  white-space: nowrap;
}
</style>

<style>
input[type='date'] {
  display: block;
}

.v-data-table table {
  border-collapse: unset;
}
.v-data-table tr {
  transition: background-color 0s;
}
.v-table tbody .v-data-table__td {
  cursor: auto !important;
  max-width: 9999999999999999999999999999px !important;
}
.v-table thead .v-data-table__th {
  max-width: 9999999999999999999999999999px !important;
}
</style>
