<script setup lang="ts">
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import ReferenceImagePreview from '~/components/register/ReferenceImagePreview.vue'
import MapDialog from '~/components/dialogs/MapDialog.vue'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import PageNavigation from '~/components/navigation/pageNavigation.vue'
// 料金表管理改修  Start
import PriceInfoManager from '~/components/price/PriceInfoManager.vue'
import { type PriceInfo } from '~/components/price/PriceInfoManager.vue'
import { nanoid } from 'nanoid'
import PayloadInfoDialog, { type PayloadInfo } from '~/components/dialogs/PayloadInfoDialog.vue'
// 料金表管理改修  End

definePageMeta({
  layout: 'system-global-navigation',
})

const { getRole } = useCreated()
const { toFixed } = useMyFilter()
const route = useRoute()
const router = useRouter()
const aircraftId = route.params.id as string // パラメータ（機体ID）
const { getCodeByType } = useCode()
const isRegister = computed(() => utils.isNullUndefined(aircraftId))
const initialOption = { value: null, title: '' }
const coordinatesDecimal = 7 // 座標桁数（整形用）
const maxTakeoffWeightDecimal = 3 // 最大離陸重量桁数（整形用）
const bodyWeightDecimal = 3 // 重量桁数（整形用）
const maxFlightSpeedDecimal = 0 // 最大速度桁数（整形用）
const maxFlightTimeDecimal = 0 // 最大飛行時間桁数（整形用）
const { constants } = useMyConstant()
const myRole = ref()
const ownpageRole = ['1']

const isLoading = useState('isLoading')// スピナー表示

let isChanged = false // 項目変更フラグ（入力破棄確認チェック用）
let pendingNavigation: ((arg?: boolean) => void) | null = null // ナビゲーションを保持（入力破棄確認用）
const isCorrectNavigation = ref(false) // システムによるナビゲーションの場合は入力破棄確認不要
const validForm = ref() // バリデーションチェック用フォームrefs
const validated = ref(false) // バリデーションチェックOKのときtrue
const errorDetail = ref('') // エラー詳細

/** ダイアログ表示フラグ */
const destructionConfirmDialogVisible = ref(false) // 入力破棄確認ダイアログ
const getFailedDialogVisible = ref(false) // 詳細取得失敗ダイアログ
const mapDialogVisible = ref(false) // マップダイアログ
const registerConfirmDialogVisible = ref(false) // 登録確認ダイアログ
const registerSuccessDialogVisible = ref(false) // 登録成功ダイアログ
const registerFailedDialogVisible = ref(false) // 登録失敗ダイアログ
const updateConfirmDialogVisible = ref(false) // 更新確認ダイアログ
const updateSuccessDialogVisible = ref(false) // 更新成功ダイアログ
const updateFailedDialogVisible = ref(false) // 更新失敗ダイアログ
const deleteConfirmDialogVisible = ref(false) // 削除確認ダイアログ
const deleteSuccessDialogVisible = ref(false) // 削除成功ダイアログ
const deleteFailedDialogVisible = ref(false) // 削除失敗ダイアログ

// 料金表管理改修  Start
// 機体候補リスト用
const aircraftList = ref<any[]>([])
type Aircraft = {
  maker: string
  modelNumber: string
  name: string
  type: string
  ip: string
  length: number
  weight: number
  maximumTakeoffWeight: number
  maximumFlightTime: number
  deviationRange: number
  fallingModel: string
}

// 料金表情報用
const priceInfos = ref<PriceInfo[]>([])

// 添付ファイル情報用
interface FileInfo {
  _key: string
  fileId: string | null
  fileLogicalName: string
  filePhysicalName: string
  fileData: string
  processingType?: number
}
const fileInfos = ref<FileInfo[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

// ペイロード情報用
const payloadInfos = ref<PayloadInfo[]>([])
const payloadDialogVisible = ref(false)
const payloadIsViewMode = ref<true | false>(false)
const payloadDialogInitialData = ref<PayloadInfo | null>(null)
const payloadDialogIndex = ref<number | null>(null)
// 料金表管理改修  End

/** フォームデータ */
const formData = ref<Record<string, any>>({
  aircraftId: null, // 機体ID
  aircraftName: '', // 機体名
  manufacturer: '', // 製造メーカー
  manufacturingNumber: '', // 製造番号
  aircraftType: null, // 機体の種類
  maxTakeoffWeight: null, // 最大離陸重量
  bodyWeight: null, // 重量(kg)
  maxFlightSpeed: null, // 最大速度(km/h)
  maxFlightTime: null, // 最大飛行時間
  certification: false, // 機体認証の有無
  dipsRegistrationCode: '', // DIPS登録記号
  lat: null, // 緯度
  lon: null, // 経度
  ownerType: null, // 機体所有種別
  ownerId: null, // 所有者ID
  imageData: '', // base64Text
  // 料金表管理改修  Start
  modelNumber: '', // 型式番号
  publicFlag: false, // 公開可否フラグ
  priceInfos: [], // 料金表情報
  fileInfos: [], // 添付ファイル情報
  payloadInfos: [], // ペイロード情報
  // 料金表管理改修  End
})

const formSetting = {
  // ラベル名・必須・最大長・セレクトリスト内容・チェックボックス内容設定用
  aircraftId: { label: '機体ID' },
  aircraftName: { label: '機体名', maxLength: '24', required: true },
  manufacturer: { label: '製造メーカー', maxLength: '200', required: false },
  manufacturingNumber: { label: '製造番号', maxLength: '20', required: false },
  aircraftType: { label: '機体の種類', options: [initialOption, ...getCodeByType('aircraftType')], required: false },
  maxTakeoffWeight: { label: '最大離陸重量(kg)', maxLength: '8', required: false },
  bodyWeight: { label: '重量(kg)', maxLength: '8', required: false },
  maxFlightSpeed: { label: '最大速度(km/h)', maxLength: '4', required: false },
  maxFlightTime: { label: '最大飛行時間(分)', maxLength: '4', required: false },
  dipsRegistrationCode: { label: 'DIPS登録記号', maxLength: '12', required: false },
  // 機体の緯度·経度を必須項目とする調整 start
  lat: { label: '機体位置(緯度)', maxLength: '12', required: true },
  lon: { label: '機体位置(経度)', maxLength: '12', required: true },
  // 機体の緯度·経度を必須項目とする調整 end
  ownerType: { label: '機体所有種別', options: [initialOption, ...getCodeByType('ownerType')], required: true },
  ownerId: { label: '所有者ID', maxLength: '36', required: false },
  // 料金表管理改修  Start
  modelNumber: { label: '型式番号', maxLength: '200', required: false },
  publicFlag: { label: '公開可', maxLength: '', required: false },
  // 料金表管理改修  End
  certification: { label: '機体認証の有無', maxLength: '', required: false },
}

// 料金表管理改修  Start
/**
 * 料金表情報を formData に反映する
 */
const onPriceInfosChange = (submitList: any[]) => {
  formData.value.priceInfos = submitList
  changeFormData()
}
/**
 * 削除ボタン押下時の処理（添付ファイル行削除）
 * @param index 行番号
 */
const removeFileRow = (index: number) => {
  if (fileInfos.value[index].fileId) {
    fileInfos.value[index].processingType = 3;
    fileInfos.value[index].fileLogicalName = '';
    fileInfos.value[index].filePhysicalName = '';
    fileInfos.value[index].fileData = '';
  } else {
    fileInfos.value.splice(index, 1)
  }
  changeFormData()
}
/**
 * 添付ファイル情報・ペイロード情報を formData に反映する
 */
const formDataEdit = () => {
  
  // 添付ファイル情報を formData に設定
  formData.value.fileInfos = fileInfos.value
  .filter(item => item.processingType !== 2)
  .map(({ _key, ...rest }: FileInfo) => rest)

  // ペイロード情報を formData に設定
  formData.value.payloadInfos = payloadInfos.value.map(item => {
    if (item.processingType === 2 && item.fileData === '') {
      const { fileData, ...rest } = item
      return rest
    }
    return item
  })
}
/**
 * 添付ファイルを追加ボタン押下時の処理
 * @param index 行番号
 */
const openFileDialog = () => {
  if (fileInput.value) {
    // v-file-inputクリック時のイベントを起こす
    fileInput.value.click()
  }
}
/**
 * ファイル選択時の処理
 * @param event ファイル選択イベント
 * @param index 行番号
 */
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]

  // 1GB を超える場合は処理しない
  if (file.size > constants.file.maxSize) {
    if (input) input.value = ''
    return
  }

  // 拡張子を除いた論理名
  const fileLogicalName = file.name.replace(/\.[^/.]+$/, '')
  // 拡張子含む物理名
  const filePhysicalName = file.name
  if (fileLogicalName.length > constants.file.maxLength.fileLogicalName) {
    // 補足資料名称(ファイル論理名) maxLength 超過
    if (input) input.value = ''
    return
  }

  if (filePhysicalName.length > constants.file.maxLength.filePhysicalName) {
    // ファイル物理名 maxLength 超過
    if (input) input.value = ''
    return
  }

  const newFileInfo = {
    _key: nanoid(),
    fileId: null,
    fileLogicalName: fileLogicalName,
    filePhysicalName: filePhysicalName,
    fileData: '',
    processingType: 1,
  }

  const reader = new FileReader()
  reader.onload = () => {
    newFileInfo.fileData = reader.result as string
  }
  reader.readAsDataURL(file)

  fileInfos.value.push(newFileInfo)
  input.value = ''
  changeFormData()
}

/**
 * ペイロード情報追加ダイアログを開く
 */
const openPayloadDialogForAdd = () => {
  payloadDialogInitialData.value = null
  payloadDialogVisible.value = true
  payloadDialogIndex.value = null
}

/**
 * ペイロード情報更新ダイアログを開く
 * @param index ペイロード情報のインデックス
 */
const openPayloadDialogForUpdate = (index: number) => {
  payloadDialogInitialData.value = { ...payloadInfos.value[index] }
  payloadDialogVisible.value = true
  payloadDialogIndex.value = index
}

/**
 * ペイロード情報登録・更新処理
 * @param payload ペイロード情報
 */
const onPayloadRegister = (payload: PayloadInfo) => {
  if (payloadDialogIndex.value === null) {
    // 新規登録
    payloadInfos.value.push(payload)
  } else {
    // 更新
    payloadInfos.value[payloadDialogIndex.value] = payload
  }
  changeFormData()
}
/**
 * 削除ボタン押下時の処理（ペイロード行削除）
 * @param index 行番号
 */
const removePayloadRow = (index: number) => {
  if (payloadInfos.value[index].payloadId) {
    payloadInfos.value[index].processingType = 3;
    payloadInfos.value[index].payloadName = '';
    payloadInfos.value[index].payloadDetailText = '';
    payloadInfos.value[index].imageData = '';
    payloadInfos.value[index].filePhysicalName = '';
    payloadInfos.value[index].fileData = '';
  } else {
    payloadInfos.value.splice(index, 1)
  }
  changeFormData()
}
/**
 * 機体情報候補リストの取得
 * - メーカー／型式番号のプルダウン生成元データ
 */
const loadAircraftOptions = async () => {
  // 機体情報候補リストの取得APIを呼び出し
  const apiResult = await $fetch('/api/airway/aircraft', { 
    method: 'GET'
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    const { aircraft } = apiResult.data

    aircraftList.value = aircraft
  } else {
    const responseBody = apiResult.data
    getFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体情報候補リストの取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体情報候補リストの取得に失敗しました。(エラー詳細：)`
    }
  }
}
/**
 * 製造メーカー選択用オプション
 */
const manufacturerOptions = computed(() => {
  return [
    // 初期の空選択肢
    initialOption,
    // 機体情報候補リストから製造メーカー名を抽出し、重複を除外
    ...Array.from(
      new Set(aircraftList.value.map((item: { maker: string }) => item.maker))
    ).map((maker: string) => ({
      value: maker,
      title: maker,
    })),
  ]
})
/**
 * 型式番号選択用オプション
 */
const modelNumberOptions = computed(() => {
  return [
    // 初期の空選択肢
    initialOption,

    // 製造メーカーに応じて型式番号を抽出
    ...Array.from(
      new Set(
        aircraftList.value
          // 選択されたメーカーでフィルタ
          .filter((item: { maker: string }) => {
            if (!formData.value.manufacturer) return true
            return item.maker === formData.value.manufacturer
          })
          // 型式番号を取得
          .map((item: { modelNumber: string }) => item.modelNumber)
      )
    ).map((modelNumber: string) => ({
      value: modelNumber,
      title: modelNumber,
    })),
  ]
})

/**
 * 製造メーカー変更イベント
 *  型式番号の選択肢を絞り込むため、製造メーカー変更時に型式番号の値をクリアする
 */
const changeManufacturer = () => {
  changeFormData()
  const currentModel = formData.value.modelNumber
  if (!currentModel) return

  const isValid = aircraftList.value.some(
    (item: { maker: string; modelNumber: string }) =>
      item.maker === formData.value.manufacturer &&
      item.modelNumber === currentModel
  )

  if (!isValid) {
    formData.value.modelNumber = ''
  }
}
// 料金表管理改修  End

onBeforeMount(async () => {
  myRole.value = await getRole(ownpageRole) // ロール
})

onMounted(async () => {
  await getAircraftInfo()
  // 料金表管理改修  Start
  await loadAircraftOptions()
  // 料金表管理改修  End
})

const loadOn = () => {
  isLoading.value = true
}

const loadOff = () => {
  isLoading.value = false
}

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

/**
 * 機体情報詳細取得
 */
const getAircraftInfo = async () => {
  // spinerOn
  await loadOn()
  if (isRegister.value) {
    await loadOff()
    return
  }
  // 料金表管理改修  Start
  const apiResult = await $fetch(`/api/drone/aircraft/info/detail/${aircraftId}`, { 
    method: 'GET',
    query: {
      isRequiredPriceInfo: true,
      isRequiredPayloadInfo: true,
    }
  });
  // 料金表管理改修  End
  if (utils.isNormalStatusResponse(apiResult.status)) {
    const aircraftInfo = apiResult.data
    // 更新画面の場合、取得した機体情報をバインド
    formData.value.aircraftId = aircraftInfo.aircraftId
    formData.value.aircraftName = aircraftInfo.aircraftName
    formData.value.manufacturer = aircraftInfo.manufacturer
    formData.value.manufacturingNumber = aircraftInfo.manufacturingNumber
    formData.value.aircraftType = aircraftInfo.aircraftType
    formData.value.maxTakeoffWeight = utils.isNullUndefined(aircraftInfo.maxTakeoffWeight) ? null : Number(toFixed(aircraftInfo.maxTakeoffWeight, maxTakeoffWeightDecimal))
    formData.value.bodyWeight = utils.isNullUndefined(aircraftInfo.bodyWeight) ? null : Number(toFixed(aircraftInfo.bodyWeight, bodyWeightDecimal))
    formData.value.maxFlightSpeed = aircraftInfo.maxFlightSpeed
    formData.value.maxFlightTime = aircraftInfo.maxFlightTime
    formData.value.dipsRegistrationCode = aircraftInfo.dipsRegistrationCode
    formData.value.lat = utils.isNullUndefined(aircraftInfo.lat) ? null : Number(toFixed(aircraftInfo.lat, coordinatesDecimal))
    formData.value.lon = utils.isNullUndefined(aircraftInfo.lon) ? null : Number(toFixed(aircraftInfo.lon, coordinatesDecimal))
    formData.value.ownerType = aircraftInfo.ownerType
    formData.value.ownerId = aircraftInfo.ownerId
    formData.value.certification = aircraftInfo.certification
    formData.value.imageData = aircraftInfo.imageData
    // 料金表管理改修  Start
    formData.value.publicFlag = aircraftInfo.publicFlag
    formData.value.modelNumber = aircraftInfo.modelNumber
    // 料金表情報
    priceInfos.value = (aircraftInfo.priceInfos ?? [])
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
    // 添付ファイル情報
    fileInfos.value = (aircraftInfo.fileInfos ?? []).map((item: FileInfo) => ({
      ...item,
      _key: nanoid(),
      processingType: 2,
    }))
    // ペイロード情報
    payloadInfos.value = (aircraftInfo.payloadInfos ?? []).map((item: PayloadInfo) => ({
      ...item,
      processingType: 2,
    }))
    // 料金表管理改修  End
  }
  else {
    const responseBody = apiResult.data
    getFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体情報の取得に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
}

/**
 * 機体情報登録
 */
const registerAircraftInfo = async () => {
  // spinerOn
  await loadOn()
  registerConfirmDialogVisible.value = false
  formData.value.ownerId = utils.isBlank(formData.value.ownerId) ? null : formData.value.ownerId
  const apiResult = await $fetch('/api/drone/aircraft/info', { 
    method: 'POST',
    body: formData.value
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    registerSuccessDialogVisible.value = true
  }
  else {
    const responseBody = apiResult.data
    registerFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体情報の登録に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体情報の登録に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
}

/**
 * 機体情報更新
 */
const updateAircraftInfo = async () => {
  // spinerOn
  await loadOn()
  updateConfirmDialogVisible.value = false
  formData.value.ownerId = utils.isBlank(formData.value.ownerId) ? null : formData.value.ownerId
  const apiResult = await $fetch('/api/drone/aircraft/info', { 
    method: 'PUT',
    body: formData.value
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    updateSuccessDialogVisible.value = true
  }
  else {
    const responseBody = apiResult.data
    updateFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体情報の更新に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体情報の更新に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
}

/**
 * 機体情報削除
 */
const deleteAircraftInfo = async () => {
  // spinerOn
  await loadOn()
  deleteConfirmDialogVisible.value = false
  const apiResult = await $fetch(`/api/drone/aircraft/info/${aircraftId}`, { 
    method: 'DELETE',
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    deleteSuccessDialogVisible.value = true
  }
  else {
    const responseBody = apiResult.data
    deleteFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体情報の削除に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体情報の削除に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
}

/**
 * 新規登録ボタン押下時処理
 */
const onRegisterButtonClick = async () => {
  if (isNaN(formData.value.maxTakeoffWeight)) {
    formData.value.maxTakeoffWeight = null
  }
  if (isNaN(formData.value.bodyWeight)) {
    formData.value.bodyWeight = null
  }
  if (isNaN(formData.value.maxFlightSpeed)) {
    formData.value.maxFlightSpeed = null
  }
  if (isNaN(formData.value.maxFlightTime)) {
    formData.value.maxFlightTime = null
  }
  // 料金表管理改修  Start
  if (utils.isNullUndefined(formData.value.manufacturer)) {
    formData.value.manufacturer = ''
  }
  if (utils.isNullUndefined(formData.value.modelNumber)) {
    formData.value.modelNumber = ''
  }
  // 添付ファイル情報・ペイロード情報を formData に反映する
  formDataEdit()
  // 料金表管理改修  End
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
  if (isNaN(formData.value.maxTakeoffWeight)) {
    formData.value.maxTakeoffWeight = null
  }
  if (isNaN(formData.value.bodyWeight)) {
    formData.value.bodyWeight = null
  }
  if (isNaN(formData.value.maxFlightSpeed)) {
    formData.value.maxFlightSpeed = null
  }
  if (isNaN(formData.value.maxFlightTime)) {
    formData.value.maxFlightTime = null
  }
  // 料金表管理改修  Start
  if (utils.isNullUndefined(formData.value.manufacturer)) {
    formData.value.manufacturer = ''
  }
  if (utils.isNullUndefined(formData.value.modelNumber)) {
    formData.value.modelNumber = ''
  }
  // 添付ファイル情報・ペイロード情報を formData に反映する
  formDataEdit()
  // 料金表管理改修  End
  // バリデーションチェック
  const valid = await validate()
  if (valid) {
    updateConfirmDialogVisible.value = true
  }
}

/**
 * 削除ボタン押下時処理
 */
const onDeleteButtonClick = async () => {
  deleteConfirmDialogVisible.value = true
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
 * 機体情報一覧画面へ遷移
 */
const forwardAircraftList = () => {
  isCorrectNavigation.value = true
  router.push({ name: 'drone' })
}

/**
 * 項目変更判定
 */
const changeFormData = () => {
  isChanged = true
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
  if (!utils.isBlank(formData.value.lat)) {
    formData.value.lat = Number(toFixed(formData.value.lat, coordinatesDecimal))
  }
  else {
    formData.value.lat = null
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
  if (!utils.isBlank(formData.value.lon)) {
    formData.value.lon = Number(toFixed(formData.value.lon, coordinatesDecimal))
  }
  else {
    formData.value.lon = null
  }
}

/**
 * 最大離陸重量整形
 */
// @input
const toFixedInputMaxTakeoffWeight = () => {
  const inputMaxTakeoffWeight: string = String(formData.value.maxTakeoffWeight)
  const numberMaxTakeoffWeight = parseFloat(inputMaxTakeoffWeight)
  if (Number.isNaN(numberMaxTakeoffWeight)) {
    formData.value.maxTakeoffWeight = NaN
  }
  if (numberMaxTakeoffWeight > 1000) {
    formData.value.maxTakeoffWeight = 1000
  }
  else if (numberMaxTakeoffWeight < 0) {
    formData.value.maxTakeoffWeight = 0
  }
}
// @change
const toFixedMaxTakeoffWeight = () => {
  isChanged = true
  if (!utils.isBlank(formData.value.maxTakeoffWeight) && !isNaN(formData.value.maxTakeoffWeight)) {
    formData.value.maxTakeoffWeight = Number(toFixed(formData.value.maxTakeoffWeight, maxTakeoffWeightDecimal))
  }
  else {
    formData.value.maxTakeoffWeight = NaN
  }
}

/**
 * 重量整形
 */
const toFixedInputBodyWeight = () => {
  const inputBodyWeight: string = String(formData.value.bodyWeight)
  const numberBodyWeight = parseFloat(inputBodyWeight)
  if (Number.isNaN(numberBodyWeight)) {
    formData.value.bodyWeight = NaN
  }
  if (numberBodyWeight > 1000) {
    formData.value.bodyWeight = 1000
  }
  else if (numberBodyWeight < 0) {
    formData.value.bodyWeight = 0
  }
}
const toFixedBodyWeight = () => {
  isChanged = true
  if (!utils.isBlank(formData.value.bodyWeight) && !isNaN(formData.value.bodyWeight)) {
    formData.value.bodyWeight = Number(toFixed(formData.value.bodyWeight, bodyWeightDecimal))
  }
  else {
    formData.value.bodyWeight = NaN
  }
}

/**
 * 最大速度整形
 */
const toFixedInputMaxFlightSpeed = () => {
  const inputMaxFlightSpeed: string = String(formData.value.maxFlightSpeed)
  const numberMaxFlightSpeed = parseFloat(inputMaxFlightSpeed)
  if (Number.isNaN(numberMaxFlightSpeed)) {
    formData.value.maxFlightSpeed = NaN
  }
  if (numberMaxFlightSpeed > 1000) {
    formData.value.maxFlightSpeed = 1000
  }
  else if (numberMaxFlightSpeed < 0) {
    formData.value.maxFlightSpeed = 0
  }
}
const toFixedMaxFlightSpeed = () => {
  isChanged = true
  if (!utils.isBlank(formData.value.maxFlightSpeed) && !isNaN(formData.value.maxFlightSpeed)) {
    formData.value.maxFlightSpeed = Number(toFixed(formData.value.maxFlightSpeed, maxFlightSpeedDecimal))
  }
  else {
    formData.value.maxFlightSpeed = NaN
  }
}

/**
 * 最大飛行時間整形
 */
const toFixedInputMaxFlightTime = () => {
  const inputMaxFlightTime: string = String(formData.value.maxFlightTime)
  const numberMaxFlightTime = parseFloat(inputMaxFlightTime)
  if (Number.isNaN(numberMaxFlightTime)) {
    formData.value.maxFlightTime = NaN
  }
  if (numberMaxFlightTime > 1000) {
    formData.value.maxFlightTime = 1000
  }
  else if (numberMaxFlightTime < 0) {
    formData.value.maxFlightTime = 0
  }
}
const toFixedMaxFlightTime = () => {
  isChanged = true
  if (!utils.isBlank(formData.value.maxFlightTime) && !isNaN(formData.value.maxFlightTime)) {
    formData.value.maxFlightTime = Number(toFixed(formData.value.maxFlightTime, maxFlightTimeDecimal))
  }
  else {
    formData.value.maxFlightTime = NaN
  }
}
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
                {{ `機体情報${isRegister ? '登録' : '更新削除'}` }}
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
                        <!-- 機体ID -->
                        <label class="form-label">
                          <b>{{ formSetting.aircraftId.label + (isRegister ? '(自動採番)' : '') }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.aircraftId"
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
                        <!-- 機体名 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.aircraftName.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.aircraftName.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.aircraftName"
                          :maxlength="formSetting.aircraftName.maxLength"
                          outlined
                          dense
                          :rules="formSetting.aircraftName.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 製造メーカー -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.manufacturer.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.manufacturer.label }}</b>
                        </label>
                        <!-- 料金表管理改修  Start -->
                        <v-select
                          v-model="formData.manufacturer"
                          :items="manufacturerOptions"
                          item-value="value"
                          item-title="title"
                          :rules="formSetting.manufacturer.required ? [requiredValidation] : []"
                          variant="outlined"
                          @update:model-value="changeManufacturer"
                        />
                        <!-- 料金表管理改修  End -->
                      </v-col>
                      <v-col cols="4">
                        <!-- 製造番号 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.manufacturingNumber.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.manufacturingNumber.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.manufacturingNumber"
                          :maxlength="formSetting.manufacturingNumber.maxLength"
                          outlined
                          dense
                          :rules="formSetting.manufacturingNumber.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 機体の種類 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.aircraftType.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.aircraftType.label }}</b>
                        </label>
                        <v-select
                          v-model="formData.aircraftType"
                          :items="formSetting.aircraftType.options"
                          item-value="value"
                          item-title="title"
                          :rules="formSetting.aircraftType.required ? [requiredValidation] : []"
                          variant="outlined"
                          @update:model-value="changeFormData"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 最大離陸重量 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.maxTakeoffWeight.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.maxTakeoffWeight.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.maxTakeoffWeight"
                          type="number"
                          :maxlength="formSetting.maxTakeoffWeight.maxLength"
                          outlined
                          dense
                          :hide-spin-buttons="true"
                          :rules="formSetting.maxTakeoffWeight.required ? [requiredValidation] : []"
                          variant="outlined"
                          @input="toFixedInputMaxTakeoffWeight()"
                          @change="toFixedMaxTakeoffWeight()"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 重量 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.bodyWeight.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.bodyWeight.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.bodyWeight"
                          type="number"
                          :maxlength="formSetting.bodyWeight.maxLength"
                          outlined
                          dense
                          :hide-spin-buttons="true"
                          :rules="formSetting.bodyWeight.required ? [requiredValidation] : []"
                          variant="outlined"
                          @input="toFixedInputBodyWeight()"
                          @change="toFixedBodyWeight()"
                        />
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 最大速度 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.maxFlightSpeed.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.maxFlightSpeed.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.maxFlightSpeed"
                          type="number"
                          :maxlength="formSetting.maxFlightSpeed.maxLength"
                          outlined
                          dense
                          :hide-spin-buttons="true"
                          :rules="formSetting.maxFlightSpeed.required ? [requiredValidation] : []"
                          variant="outlined"
                          @input="toFixedInputMaxFlightSpeed()"
                          @change="toFixedMaxFlightSpeed()"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- 最大飛行時間 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.maxFlightTime.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.maxFlightTime.label }}</b>
                        </label>
                        <v-text-field
                          v-model.number="formData.maxFlightTime"
                          type="number"
                          :maxlength="formSetting.maxFlightTime.maxLength"
                          outlined
                          dense
                          :hide-spin-buttons="true"
                          :rules="formSetting.maxFlightTime.required ? [requiredValidation] : []"
                          variant="outlined"
                          @input="toFixedInputMaxFlightTime()"
                          @change="toFixedMaxFlightTime()"
                        />
                      </v-col>
                      <v-col cols="4">
                        <!-- DIPS登録記号 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.dipsRegistrationCode.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.dipsRegistrationCode.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.dipsRegistrationCode"
                          :maxlength="formSetting.dipsRegistrationCode.maxLength"
                          outlined
                          dense
                          :rules="formSetting.dipsRegistrationCode.required ? [requiredValidation] : []"
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
                        <!--  機体の緯度·経度を必須項目とする調整 start -->
                        <v-text-field
                          v-model.number="formData.lat"
                          class="coordinate"
                          type="number"
                          outlined
                          dense
                          :hide-spin-buttons="true"
                          :rules="formSetting.lat.required ? [requiredValidation, latRangeValidation] : [latRangeValidation]"
                          variant="outlined"
                          @input="toFixedInputLat()"
                          @change="toFixedLat()"
                        >
                        <!--  機体の緯度·経度を必須項目とする調整 end -->
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
                        <!--  機体の緯度·経度を必須項目とする調整 start -->
                        <v-text-field
                          v-model.number="formData.lon"
                          class="coordinate"
                          type="number"
                          outlined
                          dense
                          :hide-spin-buttons="true"
                          :rules="formSetting.lon.required ? [requiredValidation, lonRangeValidation] : [lonRangeValidation]"
                          variant="outlined"
                          @input="toFixedInputLon()"
                          @change="toFixedLon()"
                        />
                        <!--  機体の緯度·経度を必須項目とする調整 end -->
                      </v-col>
                      <v-col cols="4">
                        <!-- 機体所有種別 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.ownerType.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.ownerType.label }}</b>
                        </label>
                        <v-select
                          v-model="formData.ownerType"
                          :items="formSetting.ownerType.options"
                          item-value="value"
                          item-title="title"
                          :rules="formSetting.ownerType.required ? [requiredValidation] : []"
                          variant="outlined"
                          @update:model-value="changeFormData"
                        />
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="4">
                        <!-- 所有者ID -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.ownerId.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.ownerId.label }}</b>
                        </label>
                        <v-text-field
                          v-model="formData.ownerId"
                          :maxlength="formSetting.ownerId.maxLength"
                          outlined
                          dense
                          :rules="formSetting.ownerId.required ? [requiredValidation] : []"
                          variant="outlined"
                          @change="changeFormData"
                        />
                      </v-col>

                      <!-- 料金表管理改修  Start -->
                      <v-col cols="4">
                        <!-- 型式番号 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.modelNumber.required"
                            style="color: red"
                          >*</b>
                          <b>{{ formSetting.modelNumber.label }}</b>
                        </label>
                        
                        <v-select
                          v-model="formData.modelNumber"
                          :items="modelNumberOptions"
                          item-value="value"
                          item-title="title"
                          :rules="formSetting.modelNumber.required ? [requiredValidation] : []"
                          variant="outlined"
                          @update:model-value="changeFormData"
                        />
                      </v-col>
                      <!-- 料金表管理改修  End -->

                      <v-col
                        cols="4"
                        style="align-content: center;"
                        class="d-flex"
                      >
                        <!-- 機体認証の有無 -->
                        <label class="form-label">
                          <b
                            v-if="formSetting.certification.required"
                            style="color: red"
                          >*</b>
                        </label>
                        <span style="display: flex;">
                          <v-checkbox
                            v-model="formData.certification"
                            hide-details="auto"
                            :label="formSetting.certification.label"
                            class="mx-2"
                            @change="changeFormData"
                          />
                        </span>
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
                    </v-row>
                    
                    <!-- 料金表管理改修  Start -->
                    <PriceInfoManager
                      v-model="priceInfos"
                      :resource-type="1"
                      @change="onPriceInfosChange"
                    />

                    <!-- 補足資料 -->
                    <v-row no-gutters align="center" class="price-block" :class="priceInfos.filter(x => x.processingType !== 3).length === 0 ? 'mt-4' : ''">
                      <v-col class="d-flex align-center">
                        <div>
                          <div class="price-title pa-2 ml-4 font-weight-black v-label">
                            <b>補足資料</b>
                          </div>
                          <span class="ml-4">飛行許可·申請時に必要な資料を追加してください</span>
                        </div>

                        <v-spacer />

                        <v-btn
                          variant="outlined"
                          class="e-button-add-row mr-2"
                          rounded="pill"
                          @click="openFileDialog"
                          :disabled="fileInfos.filter(x => x.processingType !== 3).length >= 100"
                        >
                          添付ファイルを追加
                        </v-btn>
                      </v-col>
                    </v-row>
                    <v-row no-gutters class="mt-2 ml-4" v-if="fileInfos.some(x => x.processingType !== 3)">

                      <v-chip-group
                        multiple
                        column
                        v-for="(item, index) in fileInfos"
                        :key="item._key"
                      >
                        <v-chip
                          v-if="item.processingType !== 3"
                          closable
                          variant="flat"
                          rounded="0"
                          close-icon="mdi-close"
                          @click:close="removeFileRow(index)"
                          @click="useRestApiFileDownloadFile(formData.aircraftId, item.fileId)"
                          class="ma-1 file-payload-chip"
                        >
                          <div :class="item.fileId ? 'link-chip' : ''">{{ item.fileLogicalName }}</div>
                        </v-chip>
                      </v-chip-group>
                    </v-row>
                    <v-file-input
                      ref="fileInput"
                      class="d-none"
                      :accept="constants.file.allowedTypes.join(',')"
                      @change="onFileChange"
                    />

                    <!-- ペイロード情報追加 -->
                    <v-row no-gutters align="center" class="price-block mt-4">
                      <v-col>
                        <div class="price-title pa-2 ml-4 font-weight-black v-label">
                          <b>ペイロード情報追加</b>
                        </div>
                      </v-col>

                      <v-col class="text-right pr-2">
                        <v-btn
                          variant="outlined"
                          class="e-button-add-row"
                          rounded="pill"
                          @click="openPayloadDialogForAdd"
                          :disabled="payloadInfos.filter(x => x.processingType !== 3).length >= 20"
                        >
                          ペイロード情報を追加
                        </v-btn>
                      </v-col>
                    </v-row>
                    <v-row no-gutters class="mt-2 ml-4">
                      <v-chip
                        v-for="(item, index) in payloadInfos"
                        :key="index"
                        class="ma-1 file-payload-chip"
                        closable
                        variant="flat"
                        rounded="0"
                        close-icon="mdi-close"
                        @click="openPayloadDialogForUpdate(index)"
                        @click:close="removePayloadRow(index)"
                      >
                        <div class="link-chip">{{ item.payloadName }}</div>
                      </v-chip>
                    </v-row>
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
          <!-- 入力破棄確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="destructionConfirmDialogVisible"
            title="入力した内容は破棄されます。"
            message="ページを「機体情報一覧」へ移動してよろしいですか"
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
          <!-- 詳細取得失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="getFailedDialogVisible"
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
                  @click="getFailedDialogVisible = false"
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
          <!-- 料金表管理改修  Start -->
          <!-- ペイロード情報ダイアログ -->
          <PayloadInfoDialog
            v-model:dialog-visible="payloadDialogVisible"
            :is-view-mode="payloadIsViewMode"
            :initial-payload="payloadDialogInitialData"
            @register="onPayloadRegister"
          />
          <!-- 料金表管理改修  End -->
          <!-- 登録確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="registerConfirmDialogVisible"
            title="機体登録"
            message="入力した内容で機体情報を登録してよろしいですか"
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
                  @click="registerAircraftInfo"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 登録完了ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="registerSuccessDialogVisible"
            title="機体登録 完了"
            message="機体情報の登録が完了しました"
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
                  @click="forwardAircraftList"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 登録失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="registerFailedDialogVisible"
            title="機体登録 失敗"
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
                  @click="registerFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 更新確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="updateConfirmDialogVisible"
            title="機体更新"
            message="入力した内容で機体情報を更新してよろしいですか"
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
                  @click="updateAircraftInfo"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 更新完了ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="updateSuccessDialogVisible"
            title="機体更新 完了"
            message="機体情報の更新が完了しました"
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
                  @click="forwardAircraftList"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 更新失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="updateFailedDialogVisible"
            title="機体更新 失敗"
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
                  @click="updateFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 削除確認ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="deleteConfirmDialogVisible"
            title="機体削除"
            message="機体情報を削除してよろしいですか"
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
                  @click="deleteAircraftInfo"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 削除完了ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="deleteSuccessDialogVisible"
            title="機体削除 完了"
            message="機体情報の削除が完了しました"
            :dialog-type="constants.dialogType.info"
            @ok="forwardAircraftList"
          >
            <template #customDialogButton>
              <v-row>
                <v-btn
                  class="mx-2 dialog-button"
                  variant="outlined"
                  rounded="0"
                  size="large"
                  text="閉じる"
                  @click="forwardAircraftList"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- 削除失敗ダイアログ -->
          <CommonDialog
            v-model:dialog-visible="deleteFailedDialogVisible"
            title="機体削除 失敗"
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
                  @click="deleteFailedDialogVisible = false"
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

/* 料金表管理改修  Start */
.file-payload-chip{
  background: #d6eeeb;
  color: #4281c5;
  cursor: default;
  height: auto !important;
  min-height: 30px !important;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
  line-height: 1.4;
  max-width: 100%;
}
.link-chip{
  text-decoration: underline;
  cursor: pointer;
}
/* 料金表管理改修  End */
</style>
