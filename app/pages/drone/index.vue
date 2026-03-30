<script setup lang="ts">
// 共通関数
import { ref } from 'vue'
import { utils } from '~/utils/utils'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import AircraftReserve from '~/components/dialogs/AircraftReserveDialog.vue'
import AircraftMap from '~/components/dialogs/AircraftMap.vue'
import LocationDisplayMap from '~/components/common/LocationDisplayMap.vue'
import TablePaging from '~/components/common/TablePaging.vue'
import ListViewPreView from '~/components/common/ListViewPreView.vue'
import SearchOption from '~/components/common/SearchOption.vue'
import PageNavigation from '~/components/navigation/pageNavigation.vue'
// 料金表管理改修  Start
import PayloadInfoDialog, { type PayloadInfo } from '~/components/dialogs/PayloadInfoDialog.vue'
// 料金表管理改修  End

const { getRole } = useCreated()
definePageMeta({
  layout: 'system-global-navigation',
})

const aircrafts = ref<Aircraft[]>()
type paramsType = {
  [key: string]: any
}
let params: paramsType = {}
const errorMessage = ref('')

const commonDialogVisible = ref(false)
const getByPkFailedDialogVisible = ref(false)
const aircraftMapDialogVisible = ref(false)
const locationMaplat = ref()
const locationMapLon = ref()
const locationMapImage = ref()

const displayFormat = ref('listView')

interface Aircraft {
  aircraftId: any
  aircraftName: any
  manufacturer: any
  manufacturingNumber: any
  aircraftType: any
  maxTakeoffWeight: any
  bodyWeight: any
  maxFlightSpeed: any
  maxFlightTime: any
  certification: any
  dipsRegistrationCode: any
  ownerType: any
  ownerId: any
  location: any
  status: any
  reservation: any
  lat: number
  lon: number
  imageData: string
  // 料金表管理改修  Start
  priceInfos: any
  fileInfos: any
  payloadInfos: any
  // 料金表管理改修  End
}

const isLoading = useState('isLoading')
const isMounted = ref(false)

const { constants } = useMyConstant()
const myRole = ref()
const ownpageRole = ['1', '2', '3']

const aircraftReserveDialogVisible = ref(false)
onBeforeMount(async () => {
  myRole.value = await getRole(ownpageRole) // ロール
})

// 更新用
isLoading.value = true

// 利用するフィルタ
const { convertCode } = useMyFilter()
const { toFixed } = useMyFilter()
const { getCodeByType } = useCode()
const { separateNumber } = useMyFilter()
const router = useRouter()
// 入力フォームの値格納用
const formData = ref({
  aircraftName: null, // 機体名
  manufacturer: null, // 製造メーカー
  manufacturingNumber: null, // 製造番号
  aircraftType: [], // 機体の種類
  certification: null as boolean | null, // 機体認証の有無
  dipsRegistrationCode: null, // DIPS登録記号
  ownerType: [], // 機体所有種別
  ownerId: null, // 所有者ID
  // minLat: null, // 最小緯度(南側)
  // minLon: null, // 最小経度(西側)
  // maxLat: null, // 最大緯度(北側)
  // maxLon: null, // 最大経度(東側)
  // perPage: null, // 1ページ当たりの件数
  // page: null, // 現在ページ番号
})

/* ページング部品の値（検索にも使用） */
const lastPage = ref(0) // ページ総数 // サーバーサイドデータ
const totalItems = ref(0) // データ総数 // サーバーサイドデータ
const currentPage = ref(0) // 現在のページ // クライアントサイドデータ // クライアントで操作してページが変わるごとに取得API
const perPage = 20 // 一ページ当たりの表示件数 // クライアントサイドデータ // 固定
const totalVisible = 7 // ページングの表示数 // クライアントサイドデータ // 固定

// データ取得処理
const loadingData = async () => {
  let apiResult
  if (params) {
    apiResult = await $fetch('/api/drone/aircraft/info/list', { 
      method: 'GET',
      query: params
    });
  }
  else {
    apiResult = await $fetch('/api/drone/aircraft/info/list', { 
      method: 'GET',
    });
  }

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    const resultJson = apiResult.data
    const dataList = resultJson.data // 検索結果
    lastPage.value = Number(resultJson.lastPage) // 最終ページ
    totalItems.value = Number(resultJson.total) // 取得データ総件数
    currentPage.value = Number(resultJson.currentPage) // 現在のページ
    const newDataList = dataList.map((data: any) => {
      return {
        aircraftId: data.aircraftId,
        aircraftName: data.aircraftName,
        manufacturer: data.manufacturer,
        manufacturingNumber: data.manufacturingNumber,
        aircraftType: data.aircraftType ? convertCode(data.aircraftType, 'aircraftType') : '',
        maxTakeoffWeight: data.maxTakeoffWeight ? separateNumber(toFixed(data.maxTakeoffWeight, 3)) : '',
        bodyWeight: data.bodyWeight ? separateNumber(toFixed(data.bodyWeight, 3)) : '',
        maxFlightSpeed: data.maxFlightSpeed ? separateNumber(toFixed(data.maxFlightSpeed, 3)) : '',
        maxFlightTime: data.maxFlightTime ? separateNumber(toFixed(data.maxFlightTime, 3)) : '',
        certification: convertCode(data.certification, 'sensor'),
        dipsRegistrationCode: data.dipsRegistrationCode,
        ownerType: data.ownerType ? convertCode(data.ownerType, 'ownerType') : '',
        ownerId: data.ownerId,
        location: '',
        status: '',
        reservation: '',
        lat: data.lat,
        lon: data.lon,
        imageData: data.imageData,
        // 料金表管理改修  Start
        modelNumber: data.modelNumber,
        priceInfos: (data.priceInfos ?? []).slice().sort((a: any, b: any) => Number(a.priority ?? 0) - Number(b.priority ?? 0)),
        fileInfos: data.fileInfos,
        payloadInfos: data.payloadInfos,
        // 料金表管理改修  End
      }
    })

    // updateKensuHyouji() // 件数表示テキスト更新
    return newDataList
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    commonDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorMessage.value = `機体情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorMessage.value = `機体情報の取得に失敗しました。(エラー詳細：)`
    }
  }
  return aircrafts.value // 正常系の場合早期リターン
}

// データ取得処理(機体情報詳細取得API)
const loadingDetailData = async (params: any) => {
  // 料金表管理改修  Start
  const apiResult = await $fetch(`/api/drone/aircraft/info/detail/${params}`, { 
    method: 'GET',
    query: {
      isRequiredPriceInfo: true,
      isRequiredPayloadInfo: true,
    }
  });
  // 料金表管理改修  End

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    return apiResult.data
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    getByPkFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorMessage.value = `機体情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorMessage.value = `機体情報の取得に失敗しました。(エラー詳細：)`
    }
  }
}

onMounted(async () => {
  // 一ページ当たりの表示件数
  params.perPage = perPage
  // 一ページ目を表示
  params.page = 1
  // 初期表示処理
  aircrafts.value = await loadingData()
  // 完了後プロパティをFalseに設定
  isLoading.value = false
  isMounted.value = true
})

// 機体予約一覧ボタン押下処理
const goAircraftBookingList = () => {
  // Sprint1で画面未作成
  const isLoading = useState('isLoading')
  isLoading.value = true
  router.push({
    name: 'drone-reserve',
  })
}

// 新規機体登録ボタン押下処理
const goAircraftRegister = () => {
  const isLoading = useState('isLoading')
  isLoading.value = true
  router.push({
    name: 'drone-register',
  })
}

// 表示ボタン押下処理
const goAircraftMap = (item: any) => {
  locationMaplat.value = item.lat
  locationMapLon.value = item.lon
  locationMapImage.value = item.imageData
  aircraftMapDialogVisible.value = true
}

// 更新ボタン押下処理
const goAircraftEdit = (item: { aircraftId: any }) => {
  const isLoading = useState('isLoading')
  isLoading.value = true
  router.push({
    name: 'drone-edit-id',
    params: { id: item.aircraftId },
  })
}
const aircraftId = ref()
const aircraftName = ref()
// 予約ボタン押下処理
const goAircraftBook = (item: { aircraftId: any, aircraftName: any }) => {
  aircraftId.value = item.aircraftId
  aircraftName.value = item.aircraftName
  aircraftReserveDialogVisible.value = true
}

// 検索ボタン押下処理
const searchData = async () => {
  isLoading.value = true
  // ダイアログを非表示にする
  commonDialogVisible.value = false
  params = {}
  // 機体名
  if (!utils.isBlank(formData.value.aircraftName)) {
    params.aircraftName = formData.value.aircraftName
  }
  // 製造メーカー
  if (!utils.isBlank(formData.value.manufacturer)) {
    params.manufacturer = formData.value.manufacturer
  }
  // 製造番号
  if (!utils.isBlank(formData.value.manufacturingNumber)) {
    params.manufacturingNumber = formData.value.manufacturingNumber
  }
  // 機体の種類
  if (!utils.isNullUndefinedEmptyArray(formData.value.aircraftType)) {
    params.aircraftType = formData.value.aircraftType.join(',')
  }
  // 機体認証の有無
  if (!utils.isNullUndefined(formData.value.certification)) {
    params.certification = formData.value.certification
  }
  // DIPS登録記号
  if (!utils.isBlank(formData.value.dipsRegistrationCode)) {
    params.dipsRegistrationCode = formData.value.dipsRegistrationCode
  }
  // 機体所有種別
  if (!utils.isNullUndefinedEmptyArray(formData.value.ownerType)) {
    params.ownerType = formData.value.ownerType.join(',')
  }
  // 所有者ID
  if (!utils.isBlank(formData.value.ownerId)) {
    params.ownerId = formData.value.ownerId
  }

  // 一ページ当たりの表示件数
  params.perPage = perPage
  // 一ページ目を表示
  params.page = 1

  aircrafts.value = await loadingData()
  isLoading.value = false
}
/**
 * ページ変更
 */
const searchPageData = async (page: number) => {
  isLoading.value = true
  commonDialogVisible.value = false

  // 選択したページ
  params.page = page

  aircrafts.value = await loadingData()
  isLoading.value = false
}
/**
 * 検索条件リセット
 */
const clearSearchCriteria = () => {
  formData.value = {
    aircraftName: null, // 機体名
    manufacturer: null, // 製造メーカー
    manufacturingNumber: null, // 製造番号
    aircraftType: [], // 機体の種類
    certification: null as boolean | null, // 機体認証の有無
    dipsRegistrationCode: null, // DIPS登録記号
    ownerType: [], // 機体所有種別
    ownerId: null, // 所有者ID
    // minLat: null, // 最小緯度(南側)
    // minLon: null, // 最小経度(西側)
    // maxLat: null, // 最大緯度(北側)
    // maxLon: null, // 最大経度(東側)
    // perPage: null, // 1ページ当たりの件数
    // page: null, // 現在ページ番号
  }
}

// テーブルヘッダー
const headerss = [
  {
    title: '機体ID',
    value: 'aircraftId',
  },
  {
    title: '機体名',
    value: 'aircraftName',
  },
  {
    title: '製造メーカー',
    value: 'manufacturer',
  },
  {
    title: '製造番号',
    value: 'manufacturingNumber',
  },
  {
    title: '機体の種類',
    value: 'aircraftType',
  },
  {
    title: '最大離陸重量(kg)',
    value: 'maxTakeoffWeight',
  },
  {
    title: '重量(kg)',
    value: 'bodyWeight',
  },
  {
    title: '最大速度(km/h)',
    value: 'maxFlightSpeed',
  },
  {
    title: '最大飛行可能時間(分)',
    value: 'maxFlightTime',
  },
  {
    title: '機体認証の有無',
    value: 'certification',
  },
  {
    title: 'DIPS登録記号',
    value: 'dipsRegistrationCode',
  },
  {
    title: '機体所有種別',
    value: 'ownerType',
  },
  {
    title: '所有者ID',
    value: 'ownerId',
  },
  {
    title: '場所',
    value: 'location',
  },
  {
    title: 'ステータス',
    value: 'status',
    width: '100px',
  },
  {
    title: '予約',
    value: 'reservation',
    width: '100px',
  },
]

/**
 * 行選択
 */
const selectedRow = ref<any>(null)
const onRowClick = async (event: any, row: any) => {
  if (!utils.isNullUndefined(selectedRow.value) && selectedRow.value?.aircraftId === row.aircraftId) {
    // 既に選択されている行を再押下で選択解除
    selectedRow.value = null
    return
  }
  selectedRow.value = row
  const detailData = await loadingDetailData(row.aircraftId)
  selectedRow.value.imageData = detailData?.imageData
  // 料金表管理改修  Start
  selectedRow.value.priceInfos = (detailData?.priceInfos ?? []).slice().sort((a: any, b: any) => Number(a.priority ?? 0) - Number(b.priority ?? 0));
  selectedRow.value.fileInfos = detailData?.fileInfos;
  selectedRow.value.payloadInfos = detailData?.payloadInfos;
  // 料金表管理改修  End
  isLoading.value = false
}

/**
 * 検索ボックス-"機体認証の有無"ラジオボタン再押下で選択解除
 */
const certificationSelection = (value: boolean) => {
  if (formData.value.certification === value) {
    formData.value.certification = null
  }
}
/**
 * を入力してください。
 */
const nyuryokuShiteKudasai = (item: string) => {
  return `${item}を入力してください。`
}

// 料金表管理改修  Start
// ペイロード情報用
const payloadDialogVisible = ref(false)
const payloadIsViewMode = ref<true | false>(true)
const payloadDialogInitialData = ref<PayloadInfo | null>(null)
  
/**
 * ペイロード情報ダイアログを開く
 * @param payload ペイロード情報
 */
const openPayloadDialog = (payload: PayloadInfo) => {
  payloadDialogInitialData.value = payload
  payloadDialogVisible.value = true
}
// 料金表管理改修  End
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
                機体情報一覧
              </v-card-title>
            </div>
            <div class="drn_header__action">
              <SearchOption
                @search-button-click="searchData"
                @reset-button-click="clearSearchCriteria"
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
                        v-model="formData.aircraftName"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="24"
                        :placeholder="nyuryokuShiteKudasai('機体名')"
                        hide-details
                      />
                    </v-col>
                    <v-col
                      class="pr-8"
                      cols="4"
                    >
                      <label class="form-label">
                        <b>製造メーカー</b>
                      </label>
                      <v-text-field
                        v-model="formData.manufacturer"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="24"
                        :placeholder="nyuryokuShiteKudasai('製造メーカー')"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="4">
                      <label class="form-label">
                        <b>製造番号</b>
                      </label>
                      <v-text-field
                        v-model="formData.manufacturingNumber"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="20"
                        :placeholder="nyuryokuShiteKudasai('製造番号')"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                  <v-row justify="space-between">
                    <v-col cols="7">
                      <label class="form-label">
                        <b>機体の種類</b>
                      </label>
                      <v-row no-gutters>
                        <v-col
                          v-for="item in [...getCodeByType('aircraftType')]"
                          :key="item.value"
                          class="pr-2"
                          cols="auto"
                        >
                          <v-checkbox
                            v-model="formData.aircraftType"
                            :value="item.value"
                            :label="item.title"
                            density="compact"
                            hide-details
                          >
                            <template #label>
                              <div class="font-weight-light">
                                {{ item.title }}
                              </div>
                            </template>
                          </v-checkbox>
                        </v-col>
                      </v-row>
                    </v-col>
                    <v-col cols="4">
                      <label class="form-label">
                        <b>機体認証の有無</b>
                      </label>
                      <v-row no-gutters>
                        <v-col cols="auto">
                          <v-radio-group
                            v-model="formData.certification"
                            inline
                            true-icon="mdi-checkbox-marked"
                            false-icon="mdi-checkbox-blank-outline"
                            hide-details
                          >
                            <v-radio
                              v-for="item in [...getCodeByType('sensor')]"
                              :key="item.value"
                              :value="item.value"
                              class="pr-2"
                              @click="certificationSelection(item.value)"
                            >
                              <template #label>
                                <div class="font-weight-light">
                                  {{ item.title }}
                                </div>
                              </template>
                            </v-radio>
                          </v-radio-group>
                        </v-col>
                      </v-row>
                    </v-col>
                  </v-row>
                  <v-row justify="center">
                    <v-col
                      class="pr-8"
                      cols="4"
                    >
                      <label class="form-label">
                        <b>DIPS登録記号</b>
                      </label>
                      <v-text-field
                        v-model="formData.dipsRegistrationCode"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="12"
                        :placeholder="nyuryokuShiteKudasai('DIPS登録記号')"
                        hide-details
                      />
                    </v-col>
                    <v-col
                      class="pr-8"
                      cols="4"
                    >
                      <label class="form-label">
                        <b>機体所有種別</b>
                      </label>
                      <v-row no-gutters>
                        <v-col
                          v-for="item in [...getCodeByType('ownerType')]"
                          :key="item.value"
                          class="pr-2"
                          cols="auto"
                        >
                          <v-checkbox
                            v-model="formData.ownerType"
                            :value="item.value"
                            :label="item.title"
                            hide-details
                          >
                            <template #label>
                              <div class="font-weight-light">
                                {{ item.title }}
                              </div>
                            </template>
                          </v-checkbox>
                        </v-col>
                      </v-row>
                    </v-col>
                    <v-col cols="4">
                      <label class="form-label">
                        <b>所有者ID</b>
                      </label>
                      <v-text-field
                        v-model="formData.ownerId"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="36"
                        hide-details
                        :placeholder="nyuryokuShiteKudasai('所有者ID')"
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
                  <!-- 2024年11月8日:v-data-tableタグのクラスにc-tableContainerを追加 -->
                  <!-- 2024年11月8日:v-data-tableのheightを設定 -->
                  <!-- v-data-table-serverはレイアウト合わせのCSSが適用されなくなるため棄却（ヘッダーの区切り） -->
                  <v-card-text class="drn_content">
                    <div class="drn_content__body">
                      <v-sheet class="drn_content__data">
                        <div class="drn_list">
                          <div class="drn_list__body">
                            <v-data-table
                              :headers="headerss"
                              :items="aircrafts"
                              :items-per-page="perPage"
                              :items-length="totalItems"
                              item-value="id"
                              item-key="id"
                              fixed-header
                              fixed-footer
                              density="comfortable"
                              class="drn_list__table aircraft-data-table"
                            >
                              <template #bottom>
                                <!-- ページング部品位置ソースが更新されたら対応 -->
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
                                  :class="{ drn_table__selected: selectedRow?.aircraftId === item?.aircraftId }"
                                  @click="onRowClick(item, item)"
                                >
                                  <td :class="{ drn_table__selected_first_td: selectedRow?.aircraftId === item?.aircraftId }">
                                    {{ item?.aircraftId }}
                                  </td>
                                  <td>{{ item?.aircraftName }}</td>
                                  <td>{{ item?.manufacturer }}</td>
                                  <td>{{ item?.manufacturingNumber }}</td>
                                  <td>{{ item?.aircraftType }}</td>
                                  <td>{{ item?.maxTakeoffWeight }}</td>
                                  <td>{{ item?.bodyWeight }}</td>
                                  <td>{{ item?.maxFlightSpeed }}</td>
                                  <td>{{ item?.maxFlightTime }}</td>
                                  <td>{{ item?.certification }}</td>
                                  <td>{{ item?.dipsRegistrationCode }}</td>
                                  <td>{{ item?.ownerType }}</td>
                                  <td>{{ item?.ownerId }}</td>
                                  <td>
                                    <v-btn
                                      :disabled="utils.isNullUndefined(item.lat) || utils.isNullUndefined(item.lon)"
                                      color="indigo"
                                      variant="text"
                                      style="height:100%;"
                                      @click.stop="goAircraftMap(item as any)"
                                    >
                                      表示
                                    </v-btn>
                                  </td>
                                  <td>
                                    <v-btn
                                      color="indigo"
                                      variant="text"
                                      :disabled="myRole !== 1"
                                      style="height:100%;"
                                      @click.stop="goAircraftEdit(item as any)"
                                    >
                                      更新
                                    </v-btn>
                                  </td>
                                  <td>
                                    <v-btn
                                      color="indigo"
                                      variant="text"
                                      :disabled="myRole === 3"
                                      style="height:100%;"
                                      @click.stop="goAircraftBook(item as any)"
                                    >
                                      予約
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
                    class="mx-auto pa-2 aircraft-data-table text-h6"
                    style="height: 77dvh; width: 100%; border: 1px solid #000000; box-sizing: border-box; overflow-y: auto"
                    elevation="0"
                    rounded="0"
                  >
                    <v-row class="pt-5">
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
                        製造メーカー
                      </v-col>
                      <v-col>
                        {{ selectedRow?.manufacturer }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        製造番号
                      </v-col>
                      <v-col>
                        {{ selectedRow?.manufacturingNumber }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体の種類
                      </v-col>
                      <v-col>
                        {{ selectedRow?.aircraftType }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        最大離陸重量(kg)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.maxTakeoffWeight }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        重量(kg)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.bodyWeight }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        最大速度(km/h)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.maxFlightSpeed }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        最大飛行可能時間(分)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.maxFlightTime }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        DIPS登録記号
                      </v-col>
                      <v-col>
                        {{ selectedRow?.dipsRegistrationCode }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        位置情報(緯度)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.lat }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        位置情報(経度)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.lon }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体所有種別
                      </v-col>
                      <v-col>
                        {{ selectedRow?.ownerType }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        所有者ID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.ownerId }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        機体認証の有無
                      </v-col>
                      <v-col>
                        {{ selectedRow?.certification }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
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
                    <v-row class="pb-5">
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

                    <!-- 料金表管理改修  Start -->
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col cols="4" class="font-weight-bold">
                        型式番号
                      </v-col>
                      <v-col>
                        {{ selectedRow?.modelNumber }}
                      </v-col>
                    </v-row>

                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col cols="4" class="font-weight-bold">
                        料金表管理
                      </v-col>
                    </v-row>

                    <template v-for="(priceInfo, index) in selectedRow?.priceInfos" :key="priceInfo.priceId ?? index">
                      <!-- 料金単価(円) -->
                      <v-row no-gutters>
                        <v-col cols="4" />
                        <v-col cols="3">料金単価(円)</v-col>
                        <v-col>{{ utils.formatPrice(priceInfo.price) }}</v-col>
                      </v-row>

                      <!-- 料金タイプ -->
                      <v-row no-gutters>
                        <v-col cols="4" />
                        <v-col cols="3">料金タイプ</v-col>
                        <v-col>{{ convertCode(priceInfo.priceType, 'priceType') }}</v-col>
                      </v-row>

                      <!-- 時間単位 -->
                      <v-row no-gutters>
                        <v-col cols="4" />
                        <v-col cols="3">時間単位</v-col>
                        <v-col>{{ priceInfo.pricePerUnit }}</v-col>
                      </v-row>

                      <!-- 適用開始日時 -->
                      <v-row no-gutters>
                        <v-col cols="4" />
                        <v-col cols="3">適用開始日時</v-col>
                        <v-col>{{ utils.toFormatJSTtime(priceInfo.effectiveStartTime, constants.format.datetimeWithSeconds, 'local') }}</v-col>
                      </v-row>

                      <!-- 適用終了日時 -->
                      <v-row no-gutters>
                        <v-col cols="4" />
                        <v-col cols="3">適用終了日時</v-col>
                        <v-col>{{ utils.toFormatJSTtime(priceInfo.effectiveEndTime, constants.format.datetimeWithSeconds, 'local') }}</v-col>
                      </v-row>

                      <v-row
                        v-if="index !== selectedRow!.priceInfos!.length - 1"
                        no-gutters
                        class="my-5"
                      >
                        <v-col cols="4" />
                        <v-col>
                          <v-divider class="border-opacity-25" />
                        </v-col>
                      </v-row>
                    </template>

                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        補足資料
                      </v-col>
                      <v-col>
                        <template v-for="(fileInfo, index) in selectedRow?.fileInfos" :key="fileInfo.fileId ?? index">
                          <a class="d-block" @click="useRestApiFileDownloadFile(selectedRow?.aircraftId, fileInfo.fileId)">
                            {{ fileInfo.fileLogicalName }}
                          </a>
                        </template>
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        ペイロード情報
                      </v-col>
                      <v-col>
                        <template v-for="(payloadInfo, index) in selectedRow?.payloadInfos" :key="payloadInfo.payloadId ?? index">
                          <a class="d-block" @click="openPayloadDialog(payloadInfo)">{{ payloadInfo.payloadName }}</a>
                        </template>
                      </v-col>
                    </v-row>
                    <!-- 料金表管理改修  End -->
                  </v-card>
                </v-col>
              </v-row>
            </v-container>
          </div>
          <!-- 料金表管理改修  Start -->
          <!-- ペイロード情報ダイアログ -->
          <PayloadInfoDialog
            v-model:dialog-visible="payloadDialogVisible"
            :is-view-mode="payloadIsViewMode"
            :initial-payload="payloadDialogInitialData"
          />
          <!-- 料金表管理改修  End -->
          <!-- ページナビゲーション -->
          <PageNavigation
            :back="false"
            style="position: fixed;bottom: 0px;right: -17px"
          >
            <ul class="e-buttonGroup">
              <li>
                <button
                  class="e-button"
                  @click="goAircraftBookingList"
                >
                  機体予約一覧
                </button>
              </li>
              <li v-if="myRole === 1">
                <button
                  class="e-button"
                  @click="goAircraftRegister"
                >
                  新規登録
                </button>
              </li>
            </ul>
          </PageNavigation>
          <AircraftReserve
            v-model:dialog-visible="aircraftReserveDialogVisible"
            :aircraft-id="aircraftId"
            :aircraft-name="aircraftName"
          />
          <AircraftMap
            v-model:dialog-visible="aircraftMapDialogVisible"
            :lat="locationMaplat"
            :lon="locationMapLon"
            :base64-image="locationMapImage"
          />
          <CommonDialog
            v-model:dialog-visible="commonDialogVisible"
            title="機体情報一覧取得 失敗"
            :message="errorMessage"
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
          <!-- 詳細取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="getByPkFailedDialogVisible"
            title="機体情報詳細取得 失敗"
            :message="errorMessage"
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
.link-button {
  color: #000000;
  text-decoration: underline;
}
.link-button:hover {
  color: #000000;
  text-decoration: auto;
  cursor: pointer;
}
.v-radio-group :deep(.v-label) {
  opacity: 1 !important;
}

.v-data-table {
  white-space: nowrap;
}

#list-table {
  overflow: auto;
  display: block;
}
/*ヘッダーを中央揃え*/
/*
.aircraft-data-table :deep(.v-data-table-header__content) {
  justify-content: left;
}
*/
.aircraft-data-table {
  height: 77dvh;
}

/*数値項目を右寄せにする*/
.aircraft-data-table >>> tr td:nth-child(6) {
  text-align: right;
}

.aircraft-data-table >>> th:nth-child(6) {
  text-align: right;
}

.aircraft-data-table >>> tr td:nth-child(7) {
  text-align: right;
}

.aircraft-data-table >>> th:nth-child(7) {
  text-align: right;
}

.aircraft-data-table >>> tr td:nth-child(8) {
  text-align: right;
}

.aircraft-data-table >>> th:nth-child(8) {
  text-align: right;
}

.aircraft-data-table >>> tr td:nth-child(9) {
  text-align: right;
}

.aircraft-data-table >>> th:nth-child(9) {
  text-align: right;
}

/* ステータス欄固定する*/
.aircraft-data-table :deep(th:nth-child(14)) {
  position: sticky !important;
  position: -webkit-sticky !important;
  /* 予約は非表示にする start */
  right: 100px;
  /* 予約は非表示にする end */
  background-color: white;
}

.aircraft-data-table >>> tr td:nth-child(14) {
  text-align: center;
  position: sticky !important;
  position: -webkit-sticky !important;
  /* 予約は非表示にする start */
  right: 100px;
  /* 予約は非表示にする end */
  background-color: white;
  transition: background-color 0s;
}

.aircraft-data-table >>> th:nth-child(15) {
  position: sticky !important;
  position: -webkit-sticky !important;
  /* 予約は非表示にする start */
  right: 0px;
  /* 予約は非表示にする end */
  background-color: white;
  max-width: 100px;
  min-width: 100px;
}

.aircraft-data-table >>> tr td:nth-child(15) {
  text-align: center;
  position: sticky !important;
  position: -webkit-sticky !important;
  /* 予約は非表示にする start */
  right: 0px;
  /* 予約は非表示にする end */
  background-color: white;
  transition: background-color 0s;
  max-width: 100px;
  min-width: 100px;
}

.aircraft-data-table >>> th:nth-child(16) {
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 0px;
  background-color: white;
  max-width: 100px;
  min-width: 100px;
  /* 予約は非表示にする start */
  display: none;
  /* 予約は非表示にする end */
}

.aircraft-data-table >>> tr td:nth-child(16) {
  text-align: center;
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 0px;
  background-color: white;
  transition: background-color 0s;
  max-width: 100px;
  min-width: 100px;
  /* 予約は非表示にする start */
  display: none;
  /* 予約は非表示にする end */
}

div:has(.locationSearch) {
  min-width: 30%;
}
/*
.v-data-table >>> .drn_table__selected td:nth-child(1) {
  border-left: 4px solid rgba(var(--v-theme-sky))!important;
}
*/
.v-data-table >>> .drn_table__selected td:nth-child(14) {
  background-color: rgba(229,237,255);
}
.v-data-table >>> .drn_table__selected td:nth-child(15) {
  background-color: rgba(229,237,255);
}
.v-data-table >>> .drn_table__selected td:nth-child(16) {
  background-color: rgba(229,237,255);
}
.drn_content {
  padding: 0 !important;
}
/* 料金表管理改修  Start */
.d-block {
  cursor: pointer;
}
/* 料金表管理改修  End */
</style>

<style>
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
