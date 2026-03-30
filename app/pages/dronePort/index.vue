<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MapDialog from '~/components/dialogs/MapDialog.vue'
import MapRectangleSelectionDialog from '~/components/dialogs/MapRectangleSelectionDialog.vue'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import { utils } from '~/utils/utils'
import LocationDisplayMap from '~/components/common/LocationDisplayMap.vue'
import TablePaging from '~/components/common/TablePaging.vue'
import ListViewPreView from '~/components/common/ListViewPreView.vue'
import SearchOption from '~/components/common/SearchOption.vue'
import PageNavigation from '~/components/navigation/pageNavigation.vue'

definePageMeta({
  layout: 'system-global-navigation',
})

const { getRole } = useCreated()
const isLoading = useState('isLoading')
const isMounted = ref(false)

// 利用するフィルタ
const router = useRouter()
const { convertCode, toFixed, extractionMakerId } = useMyFilter()
const { getCodeByType } = useCode()

const { constants } = useMyConstant()
const myRole = ref()
const ownpageRole = ['1', '2', '3']

const mapDialogVisible = ref(false)
const installationLocationDialogVisible = ref(false)
const commonDialogVisible = ref(false)
const getByPkFailedDialogVisible = ref(false) // 詳細取得失敗ダイアログ
const errorMessage = ref('')
const coordinatesDecimal = 7 // 座標桁数（整形用）
// 着陸面対地高度桁数（成型用）
const altDecimal = 2

const dronePorts = ref<DronePort[]>()

const displayFormat = ref('listView')

const formData = ref({
  dronePortName: null, // 離着陸場名
  address: null, // 設置場所住所
  // manufacturer: null, // 製造メーカー
  serialNumber: null, // 製造番号
  portType: [], // 離着陸場種類
  minLat: null as number | null, // 最小緯度(南側)
  minLon: null as number | null, // 最小経度(西側)
  maxLat: null as number | null, // 最大緯度(北側)
  maxLon: null as number | null, // 最大経度(東側)
  supportDroneType: null, // 対応機体
  activeStatus: [], // 動作状況
})

/* ページング部品の値（検索にも使用） */
const lastPage = ref(0) // ページ総数 // サーバーサイドデータ
const totalItems = ref(0) // データ総数 // サーバーサイドデータ
const currentPage = ref(0) // 現在のページ // クライアントサイドデータ // クライアントで操作してページが変わるごとに取得API
const perPage = 20 // 一ページ当たりの表示件数 // クライアントサイドデータ // 固定
const totalVisible = 7 // ページングの表示数 // クライアントサイドデータ // 固定

// 離着陸場の型定義
interface DronePort {
  dronePortId: string
  dronePortName: string
  address: string
  manufacturer: string
  serialNumber: string
  portType: number
  installationLocation: string
  alt: number
  supportDroneType: number
  activeStatus: number
  scheduledStatus: number
  status: string
  lat: number
  lon: number
  dronePortManufacturerId: any
  visDronePortCompanyId: any
  storedAircraftId: any
  // 料金表管理改修  Start
  priceInfos: any
  // 料金表管理改修  End
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
  nextTick(async () => {
    isMounted.value = true
  })
})

const loadOn = () => {
  isLoading.value = true
}

const loadOff = () => {
  isLoading.value = false
}

const mapLon = ref(0)
const mapLat = ref(0)

// 検索パラメータ
let params: { [key: string]: any } = {}

// 検索ボタン押下処理
const searchData = async () => {
  params = {}
  // 離着陸場名
  if (!utils.isBlank(formData.value.dronePortName)) {
    params.dronePortName = formData.value.dronePortName
  }
  // 設置場所住所
  if (!utils.isBlank(formData.value.address)) {
    params.address = formData.value.address
  }
  // 製造番号
  if (!utils.isBlank(formData.value.serialNumber)) {
    params.serialNumber = formData.value.serialNumber
  }
  // 離着陸場種類
  if (!utils.isNullUndefinedEmptyArray(formData.value.portType)) {
    params.portType = formData.value.portType.join(',')
  }
  // 最大最小緯度経度
  if (
    !utils.isNullUndefined(formData.value.minLat)
    && !utils.isNullUndefined(formData.value.minLon)
    && !utils.isNullUndefined(formData.value.maxLat)
    && !utils.isNullUndefined(formData.value.maxLon)
  ) {
    params.minLat = formData.value.minLat
    params.minLon = formData.value.minLon
    params.maxLat = formData.value.maxLat
    params.maxLon = formData.value.maxLon
  }
  // 対応機体
  if (!utils.isBlank(formData.value.supportDroneType)) {
    params.supportDroneType = formData.value.supportDroneType
  }
  // 動作状況
  if (!utils.isNullUndefinedEmptyArray(formData.value.activeStatus)) {
    params.activeStatus = formData.value.activeStatus.join(',')
  }

  // 一ページ当たりの表示件数
  params.perPage = perPage
  // 一ページ目を表示
  params.page = 1

  await loadingData()
}

/**
 * ページ変更
 */
const searchPageData = async (page: number) => {
  // 選択したページ
  params.page = page

  await loadingData()
}

/**
 * 検索条件リセット
 */
const clearSearchCriteria = () => {
  formData.value = {
    dronePortName: null, // 離着陸場名
    address: null, // 設置場所住所
    // manufacturer: null, // 製造メーカー
    serialNumber: null, // 製造番号
    portType: [], // 離着陸場種類
    minLat: null, // 最小緯度(南側)
    minLon: null, // 最小経度(西側)
    maxLat: null, // 最大緯度(北側)
    maxLon: null, // 最大経度(東側)
    supportDroneType: null, // 対応機体
    activeStatus: [], // 動作状況
  }
}

// 離発着場情報登録画面遷移
const goDronePortRegister = () => {
  router.push({ name: 'dronePort-register' })
}

// 離発着場情報更新削除画面遷移
const goDronePortUpdater = (id: string) => {
  router.push({ name: 'dronePort-edit-id', params: { id: id } })
}

// ヘッダーの設定
const dronePortheaders = [
  {
    // 離着陸場ID
    title: convertCode('dronePortId', 'dronPortsHeaders'),
    value: 'dronePortId',
  },
  /*
  {
    // 離着陸場種別
    title: convertCode('dronePortType', 'dronPortsHeaders'),
    value: 'dronePortType',
  },
  */
  {
    // 離着陸場名
    title: convertCode('dronePortName', 'dronPortsHeaders'),
    value: 'dronePortName',
  },
  {
    // 設置場所住所
    title: convertCode('address', 'dronPortsHeaders'),
    value: 'address',
  },
  /*
  {
    // 製造メーカー
    title: convertCode('manufacturer', 'dronPortsHeaders'),
    value: 'manufacturer',
  },
*/
  {
    // 製造番号
    title: convertCode('serialNumber', 'dronPortsHeaders'),
    value: 'serialNumber',
  },
  {
    // 離着陸場メーカーID
    title: convertCode('dronePortManufacturerId', 'dronPortsHeaders'),
    value: 'dronePortManufacturerId',
  },
  {
    // 離着陸場種類
    title: convertCode('portType', 'dronPortsHeaders'),
    value: 'portType',
  },
  {
    // VIS離着陸場事業者ID
    title: convertCode('visDronePortCompanyId', 'dronPortsHeaders'),
    value: 'visDronePortCompanyId',
  },
  {
    // 格納中機体ID
    title: convertCode('storedAircraftId', 'dronPortsHeaders'),
    value: 'storedAircraftId',
  },
  {
    // 着陸面対地高度
    title: convertCode('alt', 'dronPortsHeaders'),
    value: 'alt',
  },
  {
    // 対応機体
    title: convertCode('supportDroneType', 'dronPortsHeaders'),
    value: 'supportDroneType',
  },
  {
    // 動作状況
    title: convertCode('activeStatus', 'dronPortsHeaders'),
    value: 'activeStatus',
  },
  {
    // 動作予約状況
    title: convertCode('scheduledStatus', 'dronPortsHeaders'),
    value: 'scheduledStatus',
  },
  {
    // 設置場所
    title: convertCode('installationLocation', 'dronPortsHeaders'),
    value: 'installationLocation',
  },
  {
    // ステータス
    title: convertCode('status', 'dronPortsHeaders'),
    value: 'status',
  },
]

// ダイアログポップアップ処理
const displayMapPopup = (lat: number, lon: number) => {
  mapLat.value = toFixed(lat, coordinatesDecimal)
  mapLon.value = toFixed(lon, coordinatesDecimal)
  mapDialogVisible.value = true
}

// データ取得処理
const loadingData = async () => {
  // spinerOn
  await loadOn()
  const apiResult = await $fetch('/api/drone/droneport/info/list', { 
    method: 'GET',
    query: params
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    const resultJson = apiResult.data
    const dataList = resultJson.data // 検索結果
    lastPage.value = Number(resultJson.lastPage) // 最終ページ
    totalItems.value = Number(resultJson.total) // 取得データ総件数
    currentPage.value = Number(resultJson.currentPage) // 現在のページ
    const newDataList = dataList.map((data: any) => {
      return {
        dronePortId: data.dronePortId,
        dronePortName: data.dronePortName,
        address: data.address,
        manufacturer: data.manufacturer,
        serialNumber: data.serialNumber,
        portType: convertCode(data.portType, 'portType'),
        installationLocation: '',
        alt: data.alt ? toFixed(data.alt, altDecimal) : '',
        supportDroneType: data.supportDroneType,
        activeStatus: convertDispActiveStatus(data.activeStatus, data.inactiveTimeFrom, data.inactiveTimeTo) as any,
        scheduledStatus: convertDispScheduledStatus(data.scheduledStatus, data.inactiveTimeFrom, data.inactiveTimeTo) as any,
        status: '',
        lat: data.lat,
        lon: data.lon,
        imageData: data.imageData,
        storedAircraftId: data.storedAircraftId, // 格納中機体ID
        dronePortManufacturerId: extractionMakerId(data.dronePortId), // 離着陸場メーカーID
        visDronePortCompanyId: data.visDronePortCompanyId, // VIS離着陸場事業者ID
        // 料金表管理改修  Start
        priceInfos: (data.priceInfos ?? []).slice().sort((a: any, b: any) => Number(a.priority ?? 0) - Number(b.priority ?? 0)),
        // 料金表管理改修  End
      }
    })
    dronePorts.value = newDataList
  }
  else {
    // 取得失敗時処理
    commonDialogVisible.value = true
    if (apiResult?.data?.errorDetail) {
      errorMessage.value = `離着陸場一覧情報の取得に失敗しました。(エラー詳細：${apiResult.data.errorDetail})`
    }
    else {
      errorMessage.value = `離着陸場一覧情報の取得に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
}

// データ取得処理(離着陸場情報詳細取得API)
const loadingDetailData = async (params: any) => {
  // 料金表管理改修  Start
  const apiResult = await $fetch(`/api/drone/droneport/info/detail/${params}`, { 
    method: 'GET',
    query: { isRequiredPriceInfo: true }
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
      errorMessage.value = `離着陸場情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorMessage.value = `離着陸場情報の取得に失敗しました。(エラー詳細：`
    }
  }
}

// 設置場所検索条件設定
const updateBounds = async (north: number, east: number, south: number, west: number) => {
  formData.value.maxLat = utils.isNullUndefined(north) ? null : Number(toFixed(north, coordinatesDecimal))
  formData.value.minLat = utils.isNullUndefined(south) ? null : Number(toFixed(south, coordinatesDecimal))
  formData.value.maxLon = utils.isNullUndefined(east) ? null : Number(toFixed(east, coordinatesDecimal))
  formData.value.minLon = utils.isNullUndefined(west) ? null : Number(toFixed(west, coordinatesDecimal))
}

// 動作状況画面表示用変換処理
const convertDispActiveStatus = (activeStatus: string, inactiveTimeFrom: string, inactiveTimeTo: string) => {
  const dispInactiveTimeFrom = utils.toFormatJSTtime(inactiveTimeFrom, constants.format.datetime, 'local')
  const dispInactiveTimeTo = utils.toFormatJSTtime(inactiveTimeTo, constants.format.datetime, 'local')
  switch (Number(activeStatus)) {
    case 1:
      return [`${convertCode(activeStatus, 'activeStatus')}`]
    case 2:
      return [`${convertCode(activeStatus, 'activeStatus')}`]
    case 3:
      return [`${convertCode(activeStatus, 'activeStatus')}`, `(${dispInactiveTimeFrom}～)`]
    case 4:
      return [`${convertCode(activeStatus, 'activeStatus')}`, `(${dispInactiveTimeFrom}～${dispInactiveTimeTo})`]
    default:
      return ['使用可']
  }
}

// 動作予約状況画面表示用変換処理
const convertDispScheduledStatus = (scheduledStatus: number, inactiveTimeFrom: string, inactiveTimeTo: string) => {
  const dispInactiveTimeFrom = utils.toFormatJSTtime(inactiveTimeFrom, constants.format.datetime, 'local')
  const dispInactiveTimeTo = utils.toFormatJSTtime(inactiveTimeTo, constants.format.datetime, 'local')
  switch (scheduledStatus) {
    case 3:
      return [`${convertCode(scheduledStatus, 'scheduledStatus')}`, `(${dispInactiveTimeFrom}～)`]
    case 4:
      return [`${convertCode(scheduledStatus, 'scheduledStatus')}`, `(${dispInactiveTimeFrom}～${dispInactiveTimeTo})`]
    default:
      return ['-']
  }
}

/**
 * 行選択
 */
const selectedRow = ref<any>(null)
const onRowClick = async (event: any, row: any) => {
  if (!utils.isNullUndefined(selectedRow.value) && selectedRow.value?.dronePortId === row.dronePortId) {
    // 既に選択されている行を再押下で選択解除
    selectedRow.value = null
    return
  }
  selectedRow.value = row
  const detailData = await loadingDetailData(row.dronePortId)
  selectedRow.value.imageData = detailData?.imageData
  // 料金表管理改修  Start
  selectedRow.value.priceInfos = (detailData?.priceInfos ?? []).slice().sort((a: any, b: any) => Number(a.priority ?? 0) - Number(b.priority ?? 0));
  // 料金表管理改修  End
  await loadOff()
}
/**
 * を入力してください。
 */
const nyuryokuShiteKudasai = (item: string) => {
  return `${item}を入力してください。`
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
                離着陸場情報一覧
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
                      cols="5"
                    >
                      <label class="form-label">
                        <b>離着陸場名</b>
                      </label>
                      <v-text-field
                        v-model="formData.dronePortName"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="24"
                        :placeholder="nyuryokuShiteKudasai('離着陸場名')"
                        hide-details
                      />
                    </v-col>
                    <v-col
                      cols="7"
                    >
                      <label class="form-label">
                        <b>設置場所住所</b>
                      </label>
                      <v-text-field
                        v-model="formData.address"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="50"
                        :placeholder="nyuryokuShiteKudasai('設置場所住所')"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>
                      <v-row>
                        <v-col>
                          <label class="form-label justify-center">
                            <b>設置場所範囲</b>
                            <span
                              class="link-button pl-7"
                              style="color: blue"
                              @click="installationLocationDialogVisible=true"
                            >地図から範囲選択</span>
                          </label>
                          <div class="d-flex pt-2">
                            <v-text-field
                              v-model.number="formData.minLon"
                              outlined
                              dense
                              variant="outlined"
                              label="最小経度（西）"
                              hide-details
                              readonly
                              tabindex="-1"
                              style="pointer-events:none"
                              class="pr-1"
                            />
                            <v-text-field
                              v-model.number="formData.maxLon"
                              outlined
                              dense
                              variant="outlined"
                              label="最大経度（東）"
                              hide-details
                              readonly
                              tabindex="-1"
                              style="pointer-events:none"
                              class="pr-1"
                            />
                            <v-text-field
                              v-model.number="formData.minLat"
                              outlined
                              dense
                              variant="outlined"
                              label="最小緯度（南）"
                              hide-details
                              readonly
                              tabindex="-1"
                              style="pointer-events:none"
                              class="pr-1"
                            />
                            <v-text-field
                              v-model.number="formData.maxLat"
                              outlined
                              dense
                              variant="outlined"
                              label="最大緯度（北）"
                              hide-details
                              readonly
                              tabindex="-1"
                              style="pointer-events:none"
                            />
                          </div>
                        </v-col>
                        <v-col cols="4">
                          <label class="form-label">
                            <b>離着陸場種類</b>
                          </label>
                          <v-row
                            no-gutters
                          >
                            <v-col cols="auto">
                              <v-row no-gutters>
                                <v-col
                                  v-for="item in [...getCodeByType('portType')]"
                                  :key="item.value"
                                  class="pr-2"
                                  cols="auto"
                                >
                                  <v-checkbox
                                    v-model="formData.portType"
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
                          </v-row>
                        </v-col>
                      </v-row>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="3">
                      <label class="form-label">
                        <b>製造番号</b>
                      </label>
                      <v-text-field
                        v-model="formData.serialNumber"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="20"
                        :placeholder="nyuryokuShiteKudasai('製造番号')"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="4">
                      <label class="form-label">
                        <b>対応機体</b>
                      </label>
                      <v-text-field
                        v-model="formData.supportDroneType"
                        outlined
                        dense
                        variant="outlined"
                        maxlength="24"
                        :placeholder="nyuryokuShiteKudasai('対応機体')"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="4">
                      <label class="form-label">
                        <b>動作状況</b>
                      </label>
                      <v-row no-gutters>
                        <v-col cols="auto">
                          <v-row no-gutters>
                            <v-col
                              v-for="item in [...getCodeByType('activeStatus')]"
                              :key="item.value"
                              class="pr-2"
                              cols="auto"
                            >
                              <v-checkbox
                                v-model="formData.activeStatus"
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
                      </v-row>
                    </v-col>
                  </v-row>
                </template>
              </SearchOption>
              <ListViewPreView v-model:display-format="displayFormat" />
            </div>
          </div>
          <div class="px-2 content-body">
            <v-container :fluid="Boolean(true)">
              <v-row no-gutters>
                <!-- リストビュープレビューで大きさ切り替え -->
                <v-col :cols="displayFormat === 'listView' ? 12 : 6">
                  <v-card-text class="drn_content">
                    <div class="drn_content__body">
                      <v-sheet class="drn_content__data">
                        <div class="drn_list">
                          <div class="drn_list__body">
                            <v-data-table
                              :headers="dronePortheaders"
                              :items="dronePorts"
                              :items-per-page="perPage"
                              :items-length="totalItems"
                              item-value="id"
                              item-key="id"
                              fixed-header
                              fixed-footer
                              density="comfortable"
                              class="drn_list__table drone-data-table"
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
                                  :class="{ drn_table__selected: selectedRow?.dronePortId === item?.dronePortId }"
                                  @click="onRowClick(item, item)"
                                >
                                  <td :class="{ drn_table__selected_first_td: selectedRow?.dronePortId === item?.dronePortId }">
                                    {{ item?.dronePortId }}
                                  </td>
                                  <td>{{ item?.dronePortName }}</td>
                                  <td>{{ item?.address }}</td>
                                  <td>{{ item?.serialNumber }}</td>
                                  <td>{{ item?.dronePortManufacturerId }}</td>
                                  <td>{{ item?.portType }}</td>
                                  <td>{{ item?.visDronePortCompanyId }}</td>
                                  <td>{{ item?.storedAircraftId }}</td>
                                  <td>{{ item?.alt }}</td>
                                  <td>{{ item?.supportDroneType }}</td>
                                  <td>
                                    <div
                                      v-for="activeStatus in item.activeStatus"
                                      :key="activeStatus"
                                    >
                                      <div>{{ activeStatus }}</div>
                                    </div>
                                  </td>
                                  <td>
                                    <div
                                      v-for="activeStatus in item.scheduledStatus"
                                      :key="activeStatus"
                                    >
                                      <div>{{ activeStatus }}</div>
                                    </div>
                                  </td>
                                  <td>
                                    <v-btn
                                      color="indigo"
                                      variant="text"
                                      @click.stop="displayMapPopup(item.lat, item.lon)"
                                    >
                                      表示
                                    </v-btn>
                                  </td>
                                  <td>
                                    <v-btn
                                      color="indigo"
                                      variant="text"
                                      :disabled="myRole !== 1"
                                      @click.stop="goDronePortUpdater(item.dronePortId)"
                                    >
                                      更新
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
                        離着陸場ID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.dronePortId }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        離着陸場名
                      </v-col>
                      <v-col>
                        {{ selectedRow?.dronePortName }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        設置場所住所
                      </v-col>
                      <v-col>
                        {{ selectedRow?.address }}
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
                        {{ selectedRow?.serialNumber }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        離着陸場メーカーID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.dronePortManufacturerId }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        離着陸場種類
                      </v-col>
                      <v-col>
                        {{ selectedRow?.portType }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        VIS離着陸場事業者ID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.visDronePortCompanyId }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        格納中機体ID
                      </v-col>
                      <v-col>
                        {{ selectedRow?.storedAircraftId }}
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
                        着陸面対地高度(m)
                      </v-col>
                      <v-col>
                        {{ selectedRow?.alt }}
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        動作状況
                      </v-col>
                      <v-col>
                        <template
                          v-for="item in selectedRow?.activeStatus"
                          :key="item"
                        >
                          <div>{{ item }}</div>
                        </template>
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        動作予約状況
                      </v-col>
                      <v-col>
                        <template
                          v-for="item in selectedRow?.scheduledStatus"
                          :key="item"
                        >
                          <div>{{ item }}</div>
                        </template>
                      </v-col>
                    </v-row>
                    <v-divider class="border-opacity-25 my-5" />
                    <v-row>
                      <v-col
                        cols="4"
                        class="font-weight-bold"
                      >
                        離着陸場画像
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
                        離着陸場位置
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
                    <!-- 料金表管理改修  End -->
                  </v-card>
                </v-col>
              </v-row>
            </v-container>
          </div>
          <!-- ページナビゲーション -->
          <PageNavigation
            :back="false"
            style="position: fixed;bottom: 0px;right: -17px"
          >
            <ul class="e-buttonGroup">
              <li v-if="myRole === 1">
                <button
                  href="/airway/newAirway"
                  class="e-button"
                  @click="goDronePortRegister"
                >
                  新規登録
                </button>
              </li>
            </ul>
          </PageNavigation>
          <!-- 検索条件設置場所選択 -->
          <MapRectangleSelectionDialog
            v-model:dialog-visible="installationLocationDialogVisible"
            title="範囲選択"
            :west="formData.minLon"
            :south="formData.minLat"
            :east="formData.maxLon"
            :north="formData.maxLat"
            @update-bounds="updateBounds"
          />
          <MapDialog
            v-model:dialog-visible="mapDialogVisible"
            :lon="Number(mapLon)"
            :lat="Number(mapLat)"
            :reset-zoom="true"
          />
          <CommonDialog
            v-model:dialog-visible="commonDialogVisible"
            title="離着陸場情報一覧取得 失敗"
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
            title="離着陸場情報詳細取得 失敗"
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
/* 検索欄のアイコン表示 */
.serachIcon {
  display: grid;
  place-items: center;
}
/*ヘッダーを中央揃え*/
.drone-data-table :deep(.v-data-table-header__content) {
  justify-content: left;
}

/* 9列目（着陸面対地高度） */
.drone-data-table :deep(tr td:nth-child(9)) {
  text-align: right;
}

.drone-data-table :deep(th:nth-child(1)) {
  min-width: 190px;
}
.drone-data-table :deep(th:nth-child(2)) {
  min-width: 181px;
}
.drone-data-table :deep(th:nth-child(3)) {
  min-width: 190px;
}
.drone-data-table :deep(th:nth-child(4)) {
  min-width: 150px;
}
.drone-data-table :deep(th:nth-child(5)) {
  min-width: 200px;
}
.drone-data-table :deep(th:nth-child(6)) {
  min-width: 110px;
}
.drone-data-table :deep(th:nth-child(7)) {
  min-width: 200px;
}
.drone-data-table :deep(th:nth-child(8)) {
  min-width: 190px;
}
.drone-data-table :deep(th:nth-child(9)) {
  min-width: 110px;
}
.drone-data-table :deep(th:nth-child(10)) {
  min-width: 180px;
}
.drone-data-table :deep(th:nth-child(11)) {
  min-width: 110px;
}
.drone-data-table :deep(th:nth-child(12)) {
  min-width: 110px;
}
.drone-data-table :deep(th:nth-child(13)) {
  min-width: 110px;
}
.drone-data-table :deep(th:nth-child(14)) {
  min-width: 110px;
}

/* ステータス欄固定スタイル */
.drone-data-table :deep(th:nth-child(13)) {
  text-align: center;
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 100px;
  background-color: white;
  max-width: 100px;
  min-width: 100px;
}

.drone-data-table :deep(th:nth-child(14)) {
  text-align: center;
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 0px;
  background-color: white;
  max-width: 100px;
  min-width: 100px;
}
.drone-data-table :deep(tr td:nth-child(13)) {
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 100px;
  background-color: white;
  transition: background-color 0s;
  max-width: 100px;
  min-width: 100px;
}
.drone-data-table :deep(tr td:nth-child(14)) {
  position: sticky !important;
  position: -webkit-sticky !important;
  right: 0px;
  background-color: white;
  transition: background-color 0s;
  max-width: 100px;
  min-width: 100px;
}
.v-data-table {
  white-space: nowrap;
}
.drone-data-table {
  height: 77dvh;
}
.v-data-table >>> .drn_table__selected td:nth-child(13) {
  background-color: rgba(229,237,255);
}
.v-data-table >>> .drn_table__selected td:nth-child(14) {
  background-color: rgba(229,237,255);
}
.drn_content {
  padding: 0 !important;
}
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
