<script setup lang="ts">
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import MapDialog from '~/components/dialogs/MapDialog.vue'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import ReferenceImagePreview from '~/components/register/ReferenceImagePreview.vue'
import { utils } from '~/utils/utils'
import PageNavigation from '~/components/navigation/pageNavigation.vue'
// 料金表管理改修  Start
import PriceInfoManager from '~/components/price/PriceInfoManager.vue'
import { type PriceInfo } from '~/components/price/PriceInfoManager.vue'
import { nanoid } from 'nanoid'
// 料金表管理改修  End

definePageMeta({
  layout: 'system-global-navigation',
})

const {
  $luxon,
} = useNuxtApp()
const { getRole } = useCreated()
const { toFixed, convertCode, blankToHyphen } = useMyFilter()
const route = useRoute()
const router = useRouter()
const dronPortId = route.params.id as string // パラメータ（ドローンポートID）
const { getCodeByType } = useCode()
const isRegister = computed(() => utils.isNullUndefined(dronPortId))
const initialOption = { value: null, title: '' }
const coordinatesDecimal = 7 // 座標桁数（整形用）
// 着陸面対地高度桁数（整形用）
const altDecimal = 2
let isChanged = false // 項目変更フラグ（入力破棄確認チェック用）
let pendingNavigation: ((arg?: boolean) => void) | null = null // ナビゲーションを保持（入力破棄確認用）
const isCorrectNavigation = ref(false) // システムによるナビゲーションの場合は入力破棄確認不要
const isLoading = useState('isLoading')// スピナー表示
isLoading.value = true
const { constants } = useMyConstant()
const { codes } = useCode()
const inactiveTimeFrom = ref()
const inactiveTimeTo = ref()
const aircrafts = ref<Aircraft[]>()
const inputActiveStatusVisible = ref<boolean>(false)
const myRole = ref()
const ownpageRole = ['1']

// 表示用動作状況
const showActiveStatus = ref()
const showScheduledStatus = ref()
const showInactiveTimeFrom = ref()
const showInactiveTimeTo = ref()

// 料金表管理改修  Start
// 料金表情報用
const priceInfos = ref<PriceInfo[]>([])
// 料金表管理改修  End

// 機体の型定義
interface Aircraft {
  aircraftId: string
  aircraftName: string
}

const validForm = ref() // バリデーションチェック用フォームrefs
const validated = ref(false) // バリデーションチェックOKのときtrue

const isDisabledStoredAircraftId = ref(false) // 格納中機体ID非活性フラグ

/** ダイアログ表示フラグ */
const infoGetFailedDialogVisible = ref(false) // 詳細情報取得失敗ダイアログ
const mapDialogVisible = ref(false) // マップダイアログ
const destructionConfirmDialogVisible = ref(false) // 入力破棄確認ダイアログ
const registerConfirmDialogVisible = ref(false) // 登録確認ダイアログ
const registerSuccessDialogVisible = ref(false) // 登録成功ダイアログ
const registerFailedDialogVisible = ref(false) // 登録失敗ダイアログ

const updateConfirmDialogVisible = ref(false) // 更新確認ダイアログ
const updateSuccessDialogVisible = ref(false) // 更新成功ダイアログ
const updateFailedDialogVisible = ref(false) // 更新失敗ダイアログ

const deleteConfirmDialogVisible = ref(false) // 削除確認ダイアログ
const deleteSuccessDialogVisible = ref(false) // 削除成功ダイアログ
const deleteFailedDialogVisible = ref(false) // 削除失敗ダイアログ

const getFailedAircraftListDialogVisible = ref(false) // 機体情報一覧取得失敗ダイアログ

/** ダイアログメッセージ */
const infoGetFailedMsg = ref('')
const registerFailedMsg = ref('')
const updateFailedMsg = ref('')
const deleteFailedMsg = ref('')
const getFailedAircraftListMsg = ref('')

/** フォームデータ */
const formData = ref<Record<string, any>>({
  dronePortId: null, // ドローンポートID
  dronePortName: '', // ドローンポート名
  portType: null, // 離着陸場種類
  storedAircraftId: null, // 格納中機体ID
  address: '', // 設置場所住所
  serialNumber: '', // 製造番号
  lat: null, // 緯度
  lon: null, // 経度
  alt: null, // 着陸面対地高度
  supportDroneType: '', // 対応機体
  dronePortManufacturerId: '', // 離着陸場メーカーID
  visDronePortCompanyId: '', // VIS離着陸場事業者ID
  activeStatus: null, // 動作状況
  imageData: '', // base64Text
  inactiveTimeFrom: null, // 使用不可開始日時
  inactiveTimeTo: null, // 使用不可終了日時
  // 料金表管理改修  Start
  publicFlag: false, // 公開可否フラグ
  priceInfos: [], // 料金表情報
  // 料金表管理改修  End
})
const formSetting = reactive({
  // ラベル名・必須・最大長・セレクトリスト内容・チェックボックス内容設定用
  dronePortId: { label: '離着陸場ID' },
  dronePortName: { label: '離着陸場名', maxLength: '24', required: true },
  portType: { label: '離着陸場種類', options: [initialOption, ...getCodeByType('portType')], required: true },
  storedAircraftId: { label: '格納中機体', required: false },
  address: { label: '設置場所住所', maxLength: '50', required: false },
  serialNumber: { label: '製造番号', maxLength: '20', required: false },
  lat: { label: '緯度', maxLength: '', required: true },
  lon: { label: '経度', maxLength: '', required: true },
  alt: { label: '着陸面対地高度(m)', maxLength: '', required: false },
  supportDroneType: { label: '対応機体', maxLength: '24', required: false },
  dronePortManufacturerId: { label: '離着陸場メーカーID', maxLength: '100', required: true },
  visDronePortCompanyId: { label: 'VIS離着陸場事業者ID', maxLength: '100', required: false },
  activeStatus: { label: '動作状況', options: [initialOption, ...getCodeByType('activeStatus')], required: true },
  scheduledStatus: { label: '予定された動作状況', required: false },
  inactiveTimeFrom: { label: '使用不可開始日時', required: true },
  inactiveTimeTo: { label: '使用不可終了日時', required: true },
  // 料金表管理改修  Start
  publicFlag: { label: '公開可', maxLength: '', required: false },
  // 料金表管理改修  End
})

/** バリデーションチェック */
const requiredValidation = (value: any) => {
  if (utils.isBlank(value)) return '入力必須項目です'
  return !!value || value === 0
}
const latRangeValidation = (value: any) => {
  if (value < -90 || 90 < value) return '-90~90の範囲で入力してください'
  return -90 <= value || value <= 90
}
const lonRangeValidation = (value: any) => {
  if (value < -180 || 180 < value) return '-180~180の範囲で入力してください'
  return -180 <= value || value <= 180
}
const altRangeValidation = (value: any) => {
  if (value < 0 || 100 < value) return '0~100の範囲で入力してください'
  return 0 <= value || value <= 100
}
const timeFromRangeValidation = (value: any) => {
  if (formData.value.activeStatus === codes.activeStatus.notAvailable.value) return true
  if (value > inactiveTimeTo.value) return '使用不可終了日時より前の日時を入力してください'
  return value <= inactiveTimeTo.value
}
const timeToRangeValidation = (value: any) => {
  if (value <= inactiveTimeFrom.value) return '使用不可開始日時より後の日時を入力してください'
  return value > inactiveTimeFrom.value
}

onBeforeMount(async () => {
  myRole.value = await getRole(ownpageRole) // ロール
})

/**
 * 離発着場情報登録
 */
const registerDronePortInfo = async () => {
  try {
    isLoading.value = true
    registerConfirmDialogVisible.value = false
    await toFixedActiveStatusInfo(formData.value.activeStatus)
    formData.value.operatorId = localStorage.getItem('uasl:user:operatorId');
    const response = await $fetch('/api/drone/droneport/info', { 
      method: 'POST',
      body: formData.value
    });
    isLoading.value = false
    if (utils.isNormalStatusResponse(response.status)) {
      registerSuccessDialogVisible.value = true
    }
    else {
      const responseBody = response.data
      if (responseBody?.errorDetail) {
        registerFailedMsg.value = `離着陸場情報の登録に失敗しました。(エラー詳細：${responseBody.errorDetail})`
      }
      else {
        registerFailedMsg.value = `離着陸場情報の登録に失敗しました。(エラー詳細：)`
      }
      registerFailedDialogVisible.value = true
    }
  }
  catch (error) {
    console.error(error)
  }
}
/**
 * 情報更新
 */
const updateDronePortInfo = async () => {
  try {
    isLoading.value = true
    updateConfirmDialogVisible.value = false
    if (!inputActiveStatusVisible.value) {
      if (utils.isBlank(showScheduledStatus.value)) {
        formData.value.activeStatus = showActiveStatus.value
      }
      else {
        formData.value.activeStatus = showScheduledStatus.value
      }
      inactiveTimeFrom.value = showInactiveTimeFrom.value
      inactiveTimeTo.value = showInactiveTimeTo.value
    }
    await toFixedActiveStatusInfo(formData.value.activeStatus)
    formData.value.operatorId = localStorage.getItem('uasl:user:operatorId');
    const response = await $fetch('/api/drone/droneport/info', { 
      method: 'PUT',
      body: formData.value
    });
    isLoading.value = false
    if (utils.isNormalStatusResponse(response.status)) {
      updateSuccessDialogVisible.value = true
    }
    else {
      const responseBody = response.data
      if (responseBody?.errorDetail) {
        updateFailedMsg.value = `離着陸場情報の更新に失敗しました。(エラー詳細：${responseBody.errorDetail})`
      }
      else {
        updateFailedMsg.value = `離着陸場情報の更新に失敗しました。(エラー詳細：)`
      }
      updateFailedDialogVisible.value = true
    }
  }
  catch (error) {
    console.error(error)
  }
}
/**
 * 離発着場情報削除
 */
const deleteDronePortInfo = async () => {
  try {
    isLoading.value = true
    const operatorId = localStorage.getItem('uasl:user:operatorId');
    const response = await $fetch(`/api/drone/droneport/info/${formData.value.dronePortId}`, { 
      method: 'DELETE',
      body: { operatorId: operatorId }
    });
    isLoading.value = false
    if (utils.isNormalStatusResponse(response.status)) {
      deleteSuccessDialogVisible.value = true
    }
    else {
      const responseBody = apiResult.data
      if (responseBody?.errorDetail) {
        deleteFailedMsg.value = `離着陸場情報の削除に失敗しました。(エラー詳細：${responseBody.errorDetail})`
      }
      else {
        deleteFailedMsg.value = `離着陸場情報の削除に失敗しました。(エラー詳細：)`
      }
      deleteFailedDialogVisible.value = true
    }
  }
  catch (error) {
    console.error(error)
  }
}
/**
 * 離発着場詳細情報取得
 */
const getDronePortInfo = async () => {
  if (isRegister.value) return
  try {
    // 料金表管理改修  Start
    const response = await $fetch(`/api/drone/droneport/info/detail/${dronPortId}`, { 
      method: 'GET',
      query: { isRequiredPriceInfo: true }
    });
    // 料金表管理改修  End
    if (utils.isNormalStatusResponse(response.status)) {
      // 更新画面の場合、ドローンポート詳細情報をバインド
      const dronePortInfo = response.data
      formData.value.dronePortId = dronePortInfo.dronePortId
      formData.value.dronePortName = dronePortInfo.dronePortName
      formData.value.address = dronePortInfo.address
      formData.value.manufacturer = dronePortInfo.manufacturer
      formData.value.serialNumber = dronePortInfo.serialNumber
      formData.value.portType = dronePortInfo.portType
      formData.value.visDronePortCompanyId = dronePortInfo.visDronePortCompanyId
      formData.value.storedAircraftId = dronePortInfo.storedAircraftId
      formData.value.lat = utils.isNullUndefined(dronePortInfo.lat) ? null : Number(toFixed(dronePortInfo.lat, coordinatesDecimal))
      formData.value.lon = utils.isNullUndefined(dronePortInfo.lon) ? null : Number(toFixed(dronePortInfo.lon, coordinatesDecimal))
      formData.value.alt = utils.isNullUndefined(dronePortInfo.alt) ? null : Number(toFixed(dronePortInfo.alt, altDecimal))
      formData.value.supportDroneType = dronePortInfo.supportDroneType
      formData.value.activeStatus = null
      inactiveTimeFrom.value = null
      inactiveTimeTo.value = null
      formData.value.imageData = dronePortInfo.imageData
      // 動作状況表示用
      showActiveStatus.value = dronePortInfo.activeStatus
      showScheduledStatus.value = dronePortInfo.scheduledStatus
      showInactiveTimeFrom.value = utils.isNullUndefined(dronePortInfo.inactiveTimeFrom) ? null : utils.toFormatJSTtime(dronePortInfo.inactiveTimeFrom, constants.format.datetimePicker, 'local')
      showInactiveTimeTo.value = utils.isNullUndefined(dronePortInfo.inactiveTimeTo) ? null : utils.toFormatJSTtime(dronePortInfo.inactiveTimeTo, constants.format.datetimePicker, 'local')
      // 料金表管理改修  Start
      // 料金表情報
      formData.value.publicFlag = dronePortInfo.publicFlag
      priceInfos.value = (dronePortInfo.priceInfos ?? [])
      .slice()
      .sort((a: PriceInfo, b: PriceInfo) => Number(a.priority ?? 0) - Number(b.priority ?? 0))
      .map((item: PriceInfo) => ({
        _key: nanoid(),
        priceId: item.priceId,
        price: item.price,
        pricePerUnit: item.pricePerUnit,
        priceType: item.priceType,
        priority: item.priority,
        effectiveStartTime: utils.isNullUndefined(item.effectiveStartTime) ? '' : utils.toFormatJSTtime(item.effectiveStartTime, constants.format.datetimePicker, 'local'),
        effectiveEndTime: utils.isNullUndefined(item.effectiveEndTime) ? '' : utils.toFormatJSTtime(item.effectiveEndTime, constants.format.datetimePicker, 'local'),
        processingType: 2,
      }))
      // 料金表管理改修  End
    }
    else {
      const responseBody = response.data
      infoGetFailedDialogVisible.value = true
      if (responseBody?.errorDetail) {
        infoGetFailedMsg.value = `離着陸場情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
      }
      else {
        infoGetFailedMsg.value = `離着陸場情報の取得に失敗しました。(エラー詳細：)`
      }
    }
  }
  catch (error) {
    console.error(error)
  }
}
/**
 * 項目変更判定
 */
const changeFormData = () => {
  isChanged = true
}

/**
 * 画面遷移時入力破棄確認（画面遷移でトリガー）
 */
onBeforeRouteLeave((to, from, next) => {
  // 登録や更新後の画面遷移では破棄確認モーダルを表示しない
  if (isCorrectNavigation.value) {
    next()
    return
  }

  // 入力が変更されていない場合は破棄確認モーダルを表示しない
  if (isChanged) {
    destructionConfirmDialogVisible.value = true
    // ナビゲートfunctionの保持
    pendingNavigation = next
  }
  else {
    next()
  }
})
/**
 * 入力破棄確認OK
 */
const navigateOk = () => {
  destructionConfirmDialogVisible.value = false
  if (pendingNavigation) {
    // ナビゲーションを実行
    pendingNavigation()
    // 念のためクリア
    pendingNavigation = null
  }
}
/**
 * 入力破棄確認キャンセル
 */
const navigateCancel = () => {
  destructionConfirmDialogVisible.value = false
  if (pendingNavigation !== null) {
    // 保持しているナビゲーションをクリア
    // pendingNavigation = null
    pendingNavigation(false)
  }
}

/**
 * 登録ボタン押下時処理
 */
const onRegisterButtonClick = async () => {
  if (isNaN(formData.value.alt)) {
    formData.value.alt = null
  }
  // バリデーションチェック
  const valid = await validate()
  if (valid) {
    registerConfirmDialogVisible.value = true
  }
}
const validate = async () => {
  const { valid } = await validForm.value.validate()

  return valid
}
/**
 * 更新ボタン押下時処理
 */
const onUpdateButtonClick = async () => {
  if (isNaN(formData.value.alt)) {
    formData.value.alt = null
  }
  // バリデーションチェック
  const valid = await validate()
  if (valid) {
    updateConfirmDialogVisible.value = true
  }
}
// 料金表管理改修  Start
/**
 * 料金表情報を formData に反映する
 */
const onPriceInfosChange = (submitList: any[]) => {
  formData.value.priceInfos = submitList
  changeFormData()
}
// 料金表管理改修  End
/**
 * 削除ボタン押下時処理
 */
const onDeleteButtonClick = () => {
  deleteConfirmDialogVisible.value = true
}
/**
 * 離発着場情報一覧画面へ遷移
 */
const forwardDronePortList = () => {
  isCorrectNavigation.value = true
  router.push({ name: 'dronePort' })
}

/**
 * 地点設定マップ表示から変更された場合の変更イベント発生処理
 */
const forceChangeEvent = () => {
  const inputElement = document.querySelector('.coordinate')
  if (inputElement) {
    // @changeイベントを手動で発火
    const event = new Event('change', { bubbles: true })
    inputElement.dispatchEvent(event)
  }
}

/**
 * 地点設定マップ表示
 */
const displayMapPopup = () => {
  mapDialogVisible.value = true
}
/**
 * 押下座標設定
 */
const updateCoordinates = (coordinates: { lat: number, lon: number }) => {
  formData.value.lat = Number(toFixed(coordinates.lat, coordinatesDecimal))
  formData.value.lon = Number(toFixed(coordinates.lon, coordinatesDecimal))
  forceChangeEvent()
}
/**
 * 緯度整形
 */
const toFixedInputLat = () => {
  if (formData.value.lat > 90) {
    formData.value.lat = 90
  }
  else if (formData.value.lat < -90) {
    formData.value.lat = -90
  }
}
const toFixedLat = () => {
  isChanged = true
  if (formData.value.lat) {
    formData.value.lat = Number(toFixed(formData.value.lat, coordinatesDecimal))
  }
}
/**
 * 経度整形
 */
const toFixedInputLon = () => {
  if (formData.value.lon > 180) {
    formData.value.lon = 180
  }
  else if (formData.value.lon < -180) {
    formData.value.lon = -180
  }
}
const toFixedLon = () => {
  isChanged = true
  if (formData.value.lon) {
    formData.value.lon = Number(toFixed(formData.value.lon, coordinatesDecimal))
  }
}
/**
 * 着陸面対地高度整形
 */
const toFixedInputAlt = () => {
  const inputAlt: string = String(formData.value.alt)
  const numberAlt = parseFloat(inputAlt)
  if (Number.isNaN(numberAlt)) {
    formData.value.alt = NaN
  }
  if (numberAlt > 100) {
    formData.value.alt = 100
  }
  else if (numberAlt < 0) {
    formData.value.alt = 0
  }
}
const toFixedAlt = () => {
  isChanged = true
  if (!utils.isBlank(formData.value.alt) && !isNaN(formData.value.alt)) {
    formData.value.alt = Number(toFixed(formData.value.alt, altDecimal))
  }
  else {
    formData.value.alt = NaN
  }
}

/**
 * 動作状況情報整形
 */
const toFixedActiveStatusInfo = (activeStatus: number) => {
  if (activeStatus === codes.activeStatus.available.value || activeStatus === codes.activeStatus.preparation.value) {
    formData.value.inactiveTimeFrom = null
    formData.value.inactiveTimeTo = null
  }
  if (activeStatus === codes.activeStatus.notAvailable.value) {
    const changeData = $luxon.fromFormat(inactiveTimeFrom.value, constants.format.datetimePicker)
    formData.value.inactiveTimeFrom = utils.convertJSTtoUTC(changeData.toISO()!)
    formData.value.inactiveTimeTo = null
  }
  if (activeStatus === codes.activeStatus.maintenance.value) {
    const changeDataFrom = $luxon.fromFormat(inactiveTimeFrom.value, constants.format.datetimePicker)
    const changeDataTo = $luxon.fromFormat(inactiveTimeTo.value, constants.format.datetimePicker)
    formData.value.inactiveTimeFrom = utils.convertJSTtoUTC(changeDataFrom.toISO()!)
    formData.value.inactiveTimeTo = utils.convertJSTtoUTC(changeDataTo.toISO()!)
  }
}

// データ取得処理
const getAircraftInfo = async () => {
  const apiResult = await $fetch('/api/drone/aircraft/info/list', { 
    method: 'GET',
  });

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    const resultJson = apiResult.data
    const dataList = resultJson.data // 検索結果
    const newDataList = dataList.map((data: any) => {
      return {
        aircraftId: data.aircraftId,
        aircraftName: data.aircraftName,
      }
    })
    aircrafts.value = newDataList
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    getFailedAircraftListDialogVisible.value = true
    if (responseBody?.errorDetail) {
      getFailedAircraftListMsg.value = `機体情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      getFailedAircraftListMsg.value = `機体情報の取得に失敗しました。(エラー詳細：)`
    }
  }
}

/**
 * mounted
 */
onMounted(async () => {
  await getDronePortInfo()
  await getAircraftInfo()
  isLoading.value = false
})

/**
 * watch
 */
watch(() => formData.value.portType, (newVal) => {
  // 離着陸場種類に緊急着陸地点を選択した場合
  if (newVal === 0) {
    formData.value.storedAircraftId = null
    isDisabledStoredAircraftId.value = true
  }
  else {
    isDisabledStoredAircraftId.value = false
  }
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
                {{ `離着陸場情報${isRegister ? '登録' : '更新削除'}` }}
              </v-card-title>
            </div>
          </div>
          <div class="content-body px-7">
            <v-container fluid>
              <v-form
                ref="validForm"
                v-model="validated"
                validate-on="submit"
                class="main-area"
              >
                <v-row>
                  <v-col cols="3">
                    <v-row no-gutters>
                      <v-col>
                        <!-- 離発着場ID -->
                        <label class="form-label">
                          <b>{{ formSetting.dronePortId.label + (isRegister ? '(自動採番)' : '') }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.dronePortId"
                          outlined
                          dense
                          variant="outlined"
                          disabled
                        />
                      </v-col>
                    </v-row>

                    <v-row no-gutters>
                      <v-col>
                        <ReferenceImagePreview
                          v-model="formData.imageData"
                          @change="changeFormData"
                        />
                      </v-col>
                    </v-row>
                  </v-col>
                  <v-col cols="9">
                    <v-row>
                      <v-col cols="4">
                        <!-- 離着陸場名 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.dronePortName.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.dronePortName.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.dronePortName"
                          :maxlength="formSetting.dronePortName.maxLength"
                          outlined
                          dense
                          :rules="formSetting.dronePortName.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 離着陸場種類 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.portType.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.portType.label }}</b>
                        </label>
                        <v-select
                          v-model.number="formData.portType"
                          :items="formSetting.portType.options"
                          item-value="value"
                          item-title="title"
                          :rules="formSetting.portType.required ? [requiredValidation] : []"
                          variant="outlined"
                          @update:model-value="changeFormData"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 格納中機体ID -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.storedAircraftId.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.storedAircraftId.label }}</b>
                        </label>
                        <v-autocomplete
                          v-model="formData.storedAircraftId"
                          :items="aircrafts"
                          :disabled="isDisabledStoredAircraftId"
                          item-title="aircraftName"
                          item-value="aircraftId"
                          variant="outlined"
                          @update:model-value="changeFormData"
                        />
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 設置場所住所 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.address.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.address.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.address"
                          :maxlength="formSetting.address.maxLength"
                          outlined
                          dense
                          :rules="formSetting.address.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 製造番号 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.serialNumber.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.serialNumber.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.serialNumber"
                          :maxlength="formSetting.serialNumber.maxLength"
                          outlined
                          dense
                          :rules="formSetting.serialNumber.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- VIS離着陸場事業者ID -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.visDronePortCompanyId.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.visDronePortCompanyId.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.visDronePortCompanyId"
                          :maxlength="formSetting.visDronePortCompanyId.maxLength"
                          outlined
                          dense
                          :rules="formSetting.visDronePortCompanyId.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 緯度 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.lat.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.lat.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.lat"
                          class="coordinate"
                          type="number"
                          outlined
                          dense
                          :rules="formSetting.lat.required ? [requiredValidation, latRangeValidation] : [latRangeValidation]"
                          variant="outlined"
                          :hide-spin-buttons="true"
                          @input="toFixedInputLat()"
                          @change="toFixedLat()"
                        >
                          <template #prepend>
                            <v-icon
                              size="x-large"
                              icon="mdi-map-marker"
                              @click="displayMapPopup"
                            />
                          </template>
                        </v-text-field>
                      </v-col>
                      <v-col cols="4">
                        <!-- 経度 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.lon.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.lon.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.lon"
                          class="coordinate"
                          type="number"
                          outlined
                          dense
                          :rules="formSetting.lon.required ? [requiredValidation, lonRangeValidation] : [lonRangeValidation]"
                          variant="outlined"
                          :hide-spin-buttons="true"
                          @input="toFixedInputLon()"
                          @change="toFixedLon()"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 着陸面対地高度 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.alt.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.alt.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.alt"
                          type="number"
                          :maxlength="formSetting.alt.maxLength"
                          outlined
                          dense
                          :rules="formSetting.alt.required ? [requiredValidation, altRangeValidation] : [altRangeValidation]"
                          variant="outlined"
                          :hide-spin-buttons="true"
                          @input="toFixedInputAlt()"
                          @change="toFixedAlt()"
                        />
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 対応機体 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.supportDroneType.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.supportDroneType.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.supportDroneType"
                          :maxlength="formSetting.supportDroneType.maxLength"
                          outlined
                          dense
                          :rules="formSetting.supportDroneType.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                      <v-col
                        v-if="isRegister"
                        cols="4"
                      >
                        <!-- 離着陸場メーカーID -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.dronePortManufacturerId.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.dronePortManufacturerId.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.dronePortManufacturerId"
                          :maxlength="formSetting.dronePortManufacturerId.maxLength"
                          outlined
                          dense
                          :rules="formSetting.dronePortManufacturerId.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                      <!-- 料金表管理改修  Start -->
                      <v-col cols="4" style="align-content: center;" class="d-flex">
                        <!-- 公開可否フラグ -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.publicFlag.required"
                            style="color: red"
                          >*</b>
                        </label>
                        <span style="display: flex;">
                          <v-checkbox
                            v-model="formData.publicFlag"
                            hide-details="auto"
                            :label="formSetting.publicFlag.label"
                            class="mx-2"
                            @change="changeFormData"
                          />
                        </span>
                      </v-col>
                      <!-- 料金表管理改修  End -->
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 動作状況 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.activeStatus.required && isRegister"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.activeStatus.label }}</b>
                        </label>
                        <v-spacer />
                        <v-select
                          v-if="isRegister"
                          v-model.number="formData.activeStatus"
                          :items="formSetting.activeStatus.options"
                          item-value="value"
                          item-title="title"
                          :rules="formSetting.activeStatus.required ? [requiredValidation] : []"
                          variant="outlined"
                          @update:model-value="changeFormData"
                        />
                        <v-label
                          v-else
                          class="pa-3"
                          style="font-size: large;opacity: 1;"
                        >
                          {{ convertCode(showActiveStatus, 'activeStatus') }}
                        </v-label>
                      </v-col>
                      <v-col
                        v-if="((formData.activeStatus === codes.activeStatus.notAvailable.value || formData.activeStatus === codes.activeStatus.maintenance.value) && isRegister) || (showActiveStatus === codes.activeStatus.notAvailable.value || showActiveStatus === codes.activeStatus.maintenance.value)"
                        cols="4"
                      >
                        <!-- 使用不可開始日時 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.inactiveTimeFrom.required && isRegister"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.inactiveTimeFrom.label }}</b>
                        </label>
                        <v-spacer />
                        <v-text-field
                          v-if="isRegister"
                          v-model="inactiveTimeFrom"
                          type="datetime-local"
                          :rules="formSetting.inactiveTimeFrom.required ? [requiredValidation, timeFromRangeValidation] : [timeFromRangeValidation]"
                          variant="outlined"
                          @change="changeFormData"
                        />
                        <v-label
                          v-else
                          class="pa-3"
                          style="font-size: large;opacity: 1;"
                        >
                          {{ utils.toFormatJSTtime(showInactiveTimeFrom, constants.format.datetime, 'local') }}
                        </v-label>
                      </v-col>
                      <v-col
                        v-if="(formData.activeStatus === codes.activeStatus.maintenance.value && isRegister) || (showActiveStatus === codes.activeStatus.maintenance.value)"
                        cols="4"
                      >
                        <!-- 使用不可終了日時 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.inactiveTimeTo.required && isRegister"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.inactiveTimeTo.label }}</b>
                        </label>
                        <v-spacer />
                        <v-text-field
                          v-if="isRegister"
                          v-model="inactiveTimeTo"
                          type="datetime-local"
                          :rules="formSetting.inactiveTimeTo.required ? [requiredValidation, timeToRangeValidation] : [timeToRangeValidation]"
                          variant="outlined"
                          @change="changeFormData"
                        />
                        <v-label
                          v-else
                          class="pa-3"
                          style="font-size: large;opacity: 1;"
                        >
                          {{ utils.toFormatJSTtime(showInactiveTimeTo, constants.format.datetime, 'local') }}
                        </v-label>
                      </v-col>
                    </v-row>
                    <v-row v-if="!isRegister">
                      <v-col cols="4">
                        <!-- 予定された動作状況 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.scheduledStatus.required && isRegister"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.scheduledStatus.label }}</b>
                        </label>
                        <v-spacer />
                        <v-label
                          class="pa-3"
                          style="font-size: large;opacity: 1;"
                        >
                          {{ blankToHyphen(convertCode(showScheduledStatus, 'scheduledStatus')) }}
                        </v-label>
                      </v-col>
                      <v-col
                        v-if="showScheduledStatus === codes.activeStatus.notAvailable.value || showScheduledStatus === codes.activeStatus.maintenance.value "
                        cols="4"
                      >
                        <!-- 使用不可開始日時 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.inactiveTimeFrom.required && isRegister"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.inactiveTimeFrom.label }}</b>
                        </label>
                        <v-spacer />
                        <v-label
                          class="pa-3"
                          style="font-size: large;opacity: 1;"
                        >
                          {{ utils.toFormatJSTtime(showInactiveTimeFrom, constants.format.datetime, 'local') }}
                        </v-label>
                      </v-col>
                      <v-col
                        v-if="showScheduledStatus === codes.activeStatus.maintenance.value "
                        cols="4"
                      >
                        <!-- 使用不可終了日時 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.inactiveTimeTo.required && isRegister"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.inactiveTimeTo.label }}</b>
                        </label>
                        <v-spacer />
                        <v-label
                          class="pa-3"
                          style="font-size: large;opacity: 1;"
                        >
                          {{ utils.toFormatJSTtime(showInactiveTimeTo, constants.format.datetime, 'local') }}
                        </v-label>
                      </v-col>
                    </v-row>
                    <v-row v-if="!isRegister">
                      <v-col>
                        <v-row no-gutters>
                          <v-checkbox
                            v-model="inputActiveStatusVisible"
                            class="active-status-change-checkbox pa-2"
                            hide-details
                            density="compact"
                          >
                            <template #label>
                              <b>動作状況を変更する</b>
                            </template>
                          </v-checkbox>
                        </v-row>
                        <v-card
                          v-if="inputActiveStatusVisible"
                          class="active-status-card-position"
                          variant="outlined"
                        >
                          <v-row no-gutters>
                            <v-col
                              cols="4"
                              class="pl-5"
                            >
                              <!-- 動作状況 -->
                              <label class="form-label">
                                <b
                                  v-if="formSetting.activeStatus.required"
                                  style="color: red"
                                >*</b>
                                <b>{{ formSetting.activeStatus.label }}</b>
                              </label>
                              <v-select
                                v-model.number="formData.activeStatus"
                                width="90%"
                                hide-details="auto"
                                :items="formSetting.activeStatus.options"
                                item-value="value"
                                item-title="title"
                                :rules="formSetting.activeStatus.required ? [requiredValidation] : []"
                                variant="outlined"
                                @update:model-value="changeFormData"
                              />
                            </v-col>
                            <v-col
                              v-if="formData.activeStatus === codes.activeStatus.notAvailable.value || formData.activeStatus === codes.activeStatus.maintenance.value"
                              cols="4"
                              class="pl-5"
                            >
                              <!-- 使用不可開始日時 -->
                              <label class="form-label">
                                <b
                                  v-if="formSetting.inactiveTimeFrom.required"
                                  style="color: red"
                                >*</b>
                                <b>{{ formSetting.inactiveTimeFrom.label }}</b>
                              </label>
                              <v-text-field
                                v-model="inactiveTimeFrom"
                                width="90%"
                                hide-details="auto"
                                type="datetime-local"
                                :rules="formSetting.inactiveTimeFrom.required ? [requiredValidation, timeFromRangeValidation] : [timeFromRangeValidation]"
                                variant="outlined"
                                @change="changeFormData"
                              />
                            </v-col>
                            <v-col
                              v-if="formData.activeStatus === codes.activeStatus.maintenance.value"
                              cols="4"
                              class="pl-5"
                            >
                              <!-- 使用不可終了日時 -->
                              <label class="form-label">
                                <b
                                  v-if="formSetting.inactiveTimeTo.required"
                                  style="color: red"
                                >*</b>
                                <b>{{ formSetting.inactiveTimeTo.label }}</b>
                              </label>
                              <v-text-field
                                v-model="inactiveTimeTo"
                                width="90%"
                                hide-details="auto"
                                type="datetime-local"
                                :rules="formSetting.inactiveTimeTo.required ? [requiredValidation, timeToRangeValidation] : [timeToRangeValidation]"
                                variant="outlined"
                                @change="changeFormData"
                              />
                            </v-col>
                          </v-row>
                        </v-card>
                      </v-col>
                    </v-row>
                    <!-- 料金表管理改修  Start -->
                    <PriceInfoManager
                      v-model="priceInfos"
                      :resource-type="2"
                      @change="onPriceInfosChange"
                    />
                    <!-- 料金表管理改修  End -->
                  </v-col>
                </v-row>
              </v-form>
            </v-container>
          </div>
          <!-- ページナビゲーション -->
          <PageNavigation
            :back="true"
            style="position: fixed;bottom: 0px;"
          >
            <ul
              class="e-buttonGroup"
              style="padding-right: 71px;"
            >
              <li v-if="isRegister">
                <button
                  class="e-button"
                  @click="onRegisterButtonClick"
                >
                  新規登録
                </button>
              </li>
              <li v-if="!isRegister">
                <button
                  class="e-button"
                  @click="onUpdateButtonClick"
                >
                  更新
                </button>
              </li>
              <li v-if="!isRegister">
                <button
                  class="e-button"
                  style="background-color: red !important;"
                  @click="onDeleteButtonClick"
                >
                  削除
                </button>
              </li>
            </ul>
          </PageNavigation>
          <!-- 詳細情報取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="infoGetFailedDialogVisible"
            title="離着陸場情報詳細取得 失敗"
            :message="infoGetFailedMsg"
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
                  @click="infoGetFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 地図ダイアログ -->
          <MapDialog
            v-model:dialog-visible="mapDialogVisible"
            :move-marker="true"
            :lat="formData.lat"
            :lon="formData.lon"
            @update-coordinates="updateCoordinates"
          />
          <!-- 入力破棄確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="destructionConfirmDialogVisible"
            title="入力した内容は破棄されます。"
            message="ページを「離着陸場情報一覧」へ移動してよろしいですか"
            :dialog-type="constants.dialogType.confirm"
            @ok="navigateOk"
            @cancel="navigateCancel"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="いいえ"
                  @click="navigateCancel"
                />
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="はい"
                  @click="navigateOk"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 登録画面ダイアログ START -->
          <!-- 登録確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="registerConfirmDialogVisible"
            title="離着陸場登録"
            message="入力した内容で離着陸場情報を登録してよろしいですか"
            :dialog-type="constants.dialogType.confirm"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="いいえ"
                  @click="registerConfirmDialogVisible = false"
                />
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="はい"
                  @click="registerDronePortInfo"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 登録完了ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="registerSuccessDialogVisible"
            title="離着陸場登録 完了"
            message="離着陸場情報の登録が完了しました"
            :dialog-type="constants.dialogType.info"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="閉じる"
                  @click="forwardDronePortList"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 登録失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="registerFailedDialogVisible"
            title="離着陸場登録 失敗"
            :message="registerFailedMsg"
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
                  @click="registerFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 登録画面ダイアログ END -->
          <!-- 更新画面ダイアログ START -->
          <!-- 更新確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="updateConfirmDialogVisible"
            title="離着陸場更新"
            message="入力した内容で離着陸場情報を更新してよろしいですか"
            :dialog-type="constants.dialogType.confirm"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="いいえ"
                  @click="updateConfirmDialogVisible = false"
                />
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="はい"
                  @click="updateDronePortInfo"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 更新完了ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="updateSuccessDialogVisible"
            title="離着陸場更新 完了"
            message="離着陸場情報の更新が完了しました"
            :dialog-type="constants.dialogType.info"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="閉じる"
                  @click="forwardDronePortList"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 更新失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="updateFailedDialogVisible"
            title="離着陸場更新 失敗"
            :message="updateFailedMsg"
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
                  @click="updateFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 更新画面ダイアログ END -->
          <!-- 削除画面ダイアログ START -->
          <!-- 削除確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="deleteConfirmDialogVisible"
            title="離着陸場削除"
            message="離着陸場情報を削除してよろしいですか"
            :dialog-type="constants.dialogType.confirm"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="いいえ"
                  @click="deleteConfirmDialogVisible = false"
                />
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="はい"
                  @click="deleteDronePortInfo"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 削除完了ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="deleteSuccessDialogVisible"
            title="離着陸場削除 完了"
            message="離着陸場情報の削除が完了しました"
            :dialog-type="constants.dialogType.info"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="閉じる"
                  @click="forwardDronePortList"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 削除失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="deleteFailedDialogVisible"
            title="離着陸場削除 失敗"
            :message="deleteFailedMsg"
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
                  @click="deleteFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 削除画面ダイアログ END -->
          <!-- 機体一覧取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="getFailedAircraftListDialogVisible"
            title="機体情報一覧取得 失敗"
            :message="getFailedAircraftListMsg"
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
                  @click="getFailedAircraftListDialogVisible = false"
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
input[type='number'] {
  text-align: right;
}
input[type='datetime-local']  {
  display: block
}
.active-status-card-position{
  padding: 55px 55px 30px 55px;
  position: relative;
  top: -50px;
  min-height: 150px;
}
.active-status-change-checkbox{
  position: relative;
  z-index: 1;
}
</style>
