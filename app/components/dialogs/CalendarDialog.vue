<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import { utils } from '~/utils/utils'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'

const { getCodeByType } = useCode()

// 利用するフィルタ
const { convertCode } = useMyFilter()

const { constants } = useMyConstant()

const isLoading = useState('isLoading')

const {
  $luxon,
} = useNuxtApp()

const updateConfirmDialogVisible = ref(false) // 更新確認ダイアログ
const updateSuccessDialogVisible = ref(false) // 更新成功ダイアログ
const updateFailedDialogVisible = ref(false) // 更新失敗ダイアログ

// ダイアログメッセージ格納用
const dialogMessage = ref('')
const dialogReserveTimeText = ref('') // ダイアログテキスト格納用（予約日時）
const dialogDronePortNameText = ref('') // ダイアログテキスト格納用（離着陸場名）
const dialogUsageTypeText = ref('') // ダイアログテキスト格納用（利用形態）

// props用インターフェース
interface DronePortInfo {
  isSelected: boolean
  dronePortName: string
  dronePortId: string
}

// カレンダーからemitされる値を受け取るprops
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true,
  },
  // 登録用データ
  registrationData: {
    type: Object,
    required: false,
  },
  // 更新削除用データ
  updateData: {
    type: Object,
    required: false,
  },
  // 本画面で取得した予約情報一覧
  registrationListData: {
    type: Array as PropType<any[]>,
    default: () => [{
      aircraftId: '',
      aircfaftName: '',
      dronePortId: '',
      dronePortName: '',
      dronePortReservationId: '',
      reservationTimeFrom: '',
      reservationTimeto: '',
      routeReservationId: '',
      usageType: Number(),
    },
    ],
    required: false,
  },
  // 画面左に表示するポート名の配列
  portNameList: {
    type: Array as PropType<DronePortInfo[]>,
    default: () => [{
      isSelected: '',
      dronePortName: '',
      dronePortId: '',
    },
    ],
    required: false,
  },
  isUpdate: {
    // 登録か更新かを判別するフラグ
    // 登録はfalse,更新削除はtrue
    type: Boolean,
    required: false,
    default: false,
  },
  isClickEmptySlot: {
  // 空のスロットを押下したかを判別するフラグ
    type: Boolean,
    required: false,
    default: false,
  },
  // 重複チェック用詳細情報
  detailData: {
    type: Object,
    required: false,
  },
})

/**
   * ドローンポート予約情報更新APIに渡す値を格納する変数
   */
const update = ref<Record<string, any>>({
  dronePortReservationId: '', // ドローンポート予約ID
  dronePortId: '', // ドローンポートID
  aircraftId: '', // 使用機体ID
  routeReservationId: '', // 紐付け航路ID
  usageType: '', // 利用形態
  reservationTimeFrom: '', // 予約開始日時
  reservationTimeTo: '', // 予約終了日時
})

const emit = defineEmits(['update:dialogVisible', 'update', 'complete', 'changed'])
const isOpen = ref(props.dialogVisible)
watch(() => props.dialogVisible, (newVal) => {
  isOpen.value = newVal
})
watch(() => isOpen.value, () => {
  emit('update:dialogVisible', isOpen.value)
})

const handleClose = () => {
  isOpen.value = false
  emit('update:dialogVisible', isOpen.value)
}

const handleUpdate = async () => {
  // バリデーションチェック
  const valid = await validate()
  if (valid) {
    if (!props.isClickEmptySlot) {
      update.value.dronePortReservationId = props.updateData?.reserveId
      update.value.dronePortId = portId.value
      // 使用機体IDを一覧データから持ってくる
      const aircraftIdTemp = getAircraftIdById(props.updateData?.reserveId)
      update.value.aircraftId = utils.isNullUndefined(aircraftIdTemp) ? null : aircraftIdTemp
      const routeReservationIdTemp = getRouteReservationIdById(props.updateData?.reserveId)
      update.value.routeReservationId = utils.isNullUndefined(routeReservationIdTemp) ? null : routeReservationIdTemp
      update.value.usageType = usageType.value
      // 時間をUTCに変換する
      update.value.reservationTimeFrom = convertTimeForApi(startDate.value, start_Time.value)
      update.value.reservationTimeTo = convertTimeForApi(endDate.value, end_Time.value)
      updateConfirm()
    }
    else {
      update.value.dronePortReservationId = props.registrationData?.reserveId
      update.value.dronePortId = portId.value
      // 使用機体IDを一覧データから持ってくる
      const aircraftIdTemp = getAircraftIdById(props.registrationData?.reserveId)
      update.value.aircraftId = utils.isNullUndefined(aircraftIdTemp) ? null : aircraftIdTemp
      const routeReservationIdTemp = getRouteReservationIdById(props.registrationData?.reserveId)
      update.value.routeReservationId = utils.isNullUndefined(routeReservationIdTemp) ? null : routeReservationIdTemp
      update.value.usageType = usageType.value
      // 時間をUTCに変換する
      update.value.reservationTimeFrom = convertTimeForApi(startDate.value, start_Time.value)
      update.value.reservationTimeTo = convertTimeForApi(endDate.value, end_Time.value)
      updateConfirm()
    }
  }
}

// 更新用機体ID取得処理
const getAircraftIdById = (dronePortReservationId: string) => {
  const result = props.registrationListData.find(r => r.dronePortReservationId === dronePortReservationId)
  return result?.aircraftId
}

// 航路予約ID取得処理
const getRouteReservationIdById = (dronePortReservationId: string) => {
  const result = props.registrationListData.find(r => r.dronePortReservationId === dronePortReservationId)
  return result?.routeReservationId
}

// ISO8601形式を表示用に変換
const convertTimeForDialog = (time: string) => {
  const result = utils.toFormatJSTtime(time)
  return result
}

// 表示用の値をAPIに渡す用に変換
const convertTimeForApi = (time: string, targetTime: string) => {
  return utils.createDateIsoAndTimefromUTCISOTime(time, targetTime)
}

// ダイアログメッセージ用に日時を変換する
const convertTimeForDialogMessage = (date: string, time: string) => {
  const utcIsoDate = utils.createDateIsoAndTimefromUTCISOTime(date, time)
  const jtcDateTime = utils.convertUTCtoJSTDateTime(utcIsoDate!)
  return jtcDateTime?.toFormat(constants.format.datetime)
}

// ドローンポートIDからドローンポート名を検索する
const findPortNameById = (dronePortId: string) => {
  const result = props.portNameList.find(r => r.dronePortId === dronePortId)
  return result?.dronePortName
}

// 開始時刻または終了時刻が他の予約と重複しているかをチェックする
// 重複している場合:true
// 重複していない場合:false
const checkDupulicationOfReservation = (calendarStartDateTime: string, calendarEndDateTime: string, inputStartTime: string, inputEndTime: string) => {
  // ダイアログで選択した開始時刻とカレンダーからの日時を基に日付生成
  const inputStartDate = $luxon.fromISO(convertTimeForApi(calendarStartDateTime, inputStartTime)!)
  const inputEndDate = $luxon.fromISO(convertTimeForApi(calendarEndDateTime, inputEndTime)!)

  // 検索対象のドローンポートID
  const dronePortId = portId.value
  // 予約を更新する場合、ドローンポート予約IDを取得
  const dronePortReservationId = props.updateData ? props.updateData?.reserveId : ''

  let otherReservationList
  // ドローンポートID、その日の日付を基に予約一覧を取得する
  /**
   * 以下の予約を取得する
   *  ・予約のうち、その予約期間内に入力した開始日時が存在する予約
   *  ・予約のうち、その予約期間内に入力した終了日時が存在する予約
   *  ・予約のうち、その予約期間が、入力した開始日時と終了日時の期間内に存在する予約
   */
  if (props.isUpdate) {
    // 更新の場合ドローンポート予約IDと一致する予約は取得対象から除外する
    otherReservationList = props.registrationListData.filter(value => (($luxon.fromISO(value.reservationTimeFrom) <= inputStartDate && inputStartDate < $luxon.fromISO(value.reservationTimeTo))
      || ($luxon.fromISO(value.reservationTimeFrom) < inputEndDate && inputEndDate <= $luxon.fromISO(value.reservationTimeTo))
      || (inputStartDate < $luxon.fromISO(value.reservationTimeFrom) && $luxon.fromISO(value.reservationTimeTo) < inputEndDate)) && value.dronePortId === dronePortId && value.dronePortReservationId !== dronePortReservationId)
  }
  else {
    otherReservationList = props.registrationListData.filter(value => (($luxon.fromISO(value.reservationTimeFrom) <= inputStartDate && inputStartDate < $luxon.fromISO(value.reservationTimeTo))
      || ($luxon.fromISO(value.reservationTimeFrom) < inputEndDate && inputEndDate <= $luxon.fromISO(value.reservationTimeTo))
      || (inputStartDate < $luxon.fromISO(value.reservationTimeFrom) && $luxon.fromISO(value.reservationTimeTo) < inputEndDate)) && value.dronePortId === dronePortId)
  }

  // 重複する予約が存在する場合true
  if (otherReservationList.length !== 0) {
    return true
  }

  if (props.detailData?.activeStatus === 3 && props.detailData.dronePortId === dronePortId) {
    if ($luxon.fromISO(props.detailData.inactiveTimeFrom) < inputStartDate || $luxon.fromISO(props.detailData.inactiveTimeFrom) < inputEndDate) return true
  }
  else if (props.detailData?.activeStatus === 4 && props.detailData.dronePortId === dronePortId) {
    if ($luxon.fromISO(props.detailData.inactiveTimeFrom) < inputEndDate && inputEndDate < $luxon.fromISO(props.detailData.inactiveTimeTo)) return true
    else if (inputStartDate <= $luxon.fromISO(props.detailData.inactiveTimeFrom) && $luxon.fromISO(props.detailData.inactiveTimeTo) <= inputEndDate) return true
    else if ($luxon.fromISO(props.detailData.inactiveTimeFrom) < inputStartDate && inputStartDate < $luxon.fromISO(props.detailData.inactiveTimeTo)) return true
  }
  return false
}

// 使用形態を取得する
// 上記の一覧データを検索し、予約idと一致するものの使用形態を取得
const findUsageTypeById = (dronePortReservationId: string) => {
  const result = props.registrationListData.find(r => r.dronePortReservationId === dronePortReservationId)
  return result?.usageType
}

// 開始時刻格納用
const start_Time = ref('')
// 終了時刻格納用
const end_Time = ref('')

// 開始日付格納用
const startDate = ref('')
// 終了日付格納用
const endDate = ref('')

// 時間スロットが押された際に、子ダイアログに値を設定
watch(() => props.registrationData, () => {
  startDate.value = extractingDate(props.registrationData?.fromTime)
  endDate.value = extractingDate(props.registrationData?.toTime)
  start_Time.value = convertTimeForDialog(props.registrationData?.fromTime)
  end_Time.value = ''
  portId.value = props.registrationData?.targetId
  usageType.value = findUsageTypeById(props.registrationData?.reserveId)
})

// イベントスロットが押された際に、子ダイアログに値を設定
// 予約一覧画面から遷移時、時間スロットを押下した場合、ここに値が設定される
watch(() => props.updateData, () => {
  startDate.value = extractingDate(props.updateData?.fromTime)
  endDate.value = extractingDate(props.updateData?.toTime)
  start_Time.value = convertTimeForDialog(props.updateData?.fromTime)
  end_Time.value = convertTimeForDialog(props.updateData?.toTime)
  portId.value = props.updateData?.reserveTargetId
  usageType.value = findUsageTypeById(props.updateData?.reserveId)
})

// 予約一覧画面から遷移時に空の時間スロットが押下された際、終了時刻を空とする
watch(() => props.isClickEmptySlot, () => {
  if (props.isClickEmptySlot) {
    end_Time.value = ''
  }
})

// 利用形態格納用
const usageType = ref()

// ダイアログで選択したドローンポート名のドローンポートIDを格納する
const portId = ref()

const validForm = ref() // バリデーションチェック用フォームrefs
const validated = ref(false) // バリデーションチェックOKのときtrue

/** バリデーションチェック
 * ここで不正な予約をチェックする
 * 例：終了時刻が開始時刻より前でないかチェック・重複予約チェック
*/
const requiredValidation = (value: any) => {
  if (utils.isBlank(value)) return '入力必須項目です'
  return !!value || value === 0
}
const startTimeRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(startDate.value, value)! > utils.createDateIsoAndTimefromUTCISOTime(endDate.value, end_Time.value)!) return '終了日時以前の日時を入力してください'
  return !!value || value === 0
}
const endTimeRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(endDate.value, value)! <= utils.createDateIsoAndTimefromUTCISOTime(startDate.value, start_Time.value)!) return '開始日時以後の日時を入力してください'
  return !!value || value === 0
}
const startDateRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(value, start_Time.value)! > utils.createDateIsoAndTimefromUTCISOTime(endDate.value, end_Time.value)!) return '終了日時以前の日時を入力してください'
  return value <= endDate.value
}
const endDateRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(value, end_Time.value)! <= utils.createDateIsoAndTimefromUTCISOTime(startDate.value, start_Time.value)!) return '開始日時以後の日時を入力してください'
  return value >= startDate.value
}
const duplicationReservationValidation = (value: any) => {
  if (checkDupulicationOfReservation(startDate.value, endDate.value, start_Time.value, end_Time.value)) return 'この時間は予約済みです。開始または終了日時を変更してください'
  return !!value || value === 0
}

const validate = async () => {
  const { valid } = await validForm.value.validate()

  return valid
}

const formSetting = {
  // ラベル名・必須・最大長・セレクトリスト内容・チェックボックス内容設定用
  portName: { label: '', required: true },
  start: { label: '', required: true },
  end: { label: '', required: true },
  startDate: { label: '', required: true },
  endDate: { label: '', required: true },
  usage: { label: '', required: true },
}

// 更新確認ダイアログ表示
const updateConfirm = () => {
  dialogMessage.value = '下記内容で予約してよろしいですか'
  dialogDronePortNameText.value = `${findPortNameById(portId.value)}`
  dialogReserveTimeText.value = `${convertTimeForDialogMessage(startDate.value, start_Time.value)} ～${convertTimeForDialogMessage(endDate.value, end_Time.value)}`
  dialogUsageTypeText.value = `${convertCode(usageType.value, 'usageTypeOfPort')}`
  updateConfirmDialogVisible.value = true
}

// 離発着場予約情報更新
const updateReservationData = async () => {
  isLoading.value = true
  update.value.operatorId = localStorage.getItem('uasl:user:operatorId');
  const response = await $fetch(`/api/drone/droneport/reserve`, { 
    method: 'PUT',
    body: update.value
  });
  isLoading.value = false

  if (utils.isNormalStatusResponse(response.status)) {
    dialogMessage.value = '離着陸場予約情報の更新が完了しました。'
    updateSuccessDialogVisible.value = true
  }
  else {
    const responseBody = response.data
    if (responseBody?.errorDetail) {
      dialogMessage.value = `離着陸場予約情報の更新に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      dialogMessage.value = `離着陸場予約情報の更新に失敗しました。(エラー詳細：)`
    }
    updateFailedDialogVisible.value = true
  }
}

// ダイアログを閉じる
const closeCalendarDialog = () => {
  updateSuccessDialogVisible.value = false
  updateConfirmDialogVisible.value = false
  isOpen.value = false
  // indexにemitして、予約情報一覧取得
  emit('complete')
}

// 日時から日付部分を抽出する
const extractingDate = (dateTime: any) => {
  const date = $luxon.fromISO(dateTime)
  const formatDate = date.toFormat(constants.format.datePicker)
  return formatDate
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    persistent
    no-click-animation
    max-width="500px"
  >
    <v-card>
      <div class="title">
        離着陸場予約情報入力
      </div>
      <v-card-text>
        <v-form
          ref="validForm"
          v-model="validated"
          validate-on="submit"
        >
          <v-row>
            <v-col
              cols="4"
              class="d-flex align-center justify-start"
            >
              <label class="form-label">
                <b
                  v-if="formSetting.portName.required"
                  style="color: red"
                >*</b>
                <b>離着陸場名</b>
              </label>
            </v-col>
            <v-col>
              <v-select
                v-model="portId"
                hide-details="auto"
                :items="props.portNameList"
                item-title="dronePortName"
                item-value="dronePortId"
                :rules="formSetting.portName.required ? [requiredValidation] : []"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="4"
              class="d-flex align-center justify-start"
            >
              <label class="form-label">
                <b
                  v-if="formSetting.start.required"
                  style="color: red"
                >*</b>
                <b>予約開始日時</b>
              </label>
            </v-col>
            <v-col>
              <v-row>
                <v-col align-self="center">
                  <v-text-field
                    v-model="startDate"
                    type="date"
                    hide-details="auto"
                    :rules="end_Time ? [requiredValidation, startDateRangeValidation, duplicationReservationValidation] : []"
                  />
                </v-col>
                <v-col
                  align-self="center"
                  cols="5"
                >
                  <v-text-field
                    v-model="start_Time"
                    type="time"
                    hide-details="auto"
                    :rules="end_Time ? [requiredValidation, startTimeRangeValidation, duplicationReservationValidation] : []"
                  />
                </v-col>
              </v-row>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="4"
              class="d-flex align-center justify-start"
            >
              <label class="form-label">
                <b
                  v-if="formSetting.end.required"
                  style="color: red"
                >*</b>
                <b>予約終了日時</b>
              </label>
            </v-col>
            <v-col>
              <v-row>
                <v-col align-self="center">
                  <v-text-field
                    v-model="endDate"
                    type="date"
                    hide-details="auto"
                    :rules="end_Time ? [requiredValidation, endDateRangeValidation, duplicationReservationValidation] : []"
                  />
                </v-col>
                <v-col
                  align-self="center"
                  cols="5"
                >
                  <v-text-field
                    v-model="end_Time"
                    type="time"
                    hide-details="auto"
                    :rules="end_Time ? [requiredValidation, endTimeRangeValidation, duplicationReservationValidation] : [requiredValidation]"
                  />
                </v-col>
              </v-row>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="4"
              class="d-flex align-center justify-start"
            >
              <label class="form-label">
                <b
                  v-if="formSetting.usage.required"
                  style="color: red"
                >*</b>
                <b>利用形態</b>
              </label>
            </v-col>
            <v-col>
              <v-select
                v-model="usageType"
                hide-details="auto"
                :items="getCodeByType('usageTypeOfPort')"
                :rules="formSetting.usage.required ? [requiredValidation] : []"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-row
          no-gutters
          justify="space-between"
          class="px-2"
        >
          <button
            class="mx-1 e-button-back"
            @click="handleClose"
          >
            閉じる
          </button>
          <button
            class="mx-1 e-button"
            @click="handleUpdate"
          >
            更新
          </button>
        </v-row>
      </v-card-actions>
    </v-card>
    <!-- ドローンポート予約更新確認モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="updateConfirmDialogVisible"
      title="離着陸場予約更新"
      :message="dialogMessage"
      :dialog-type="constants.dialogType.confirm"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              離着陸場名：
            </span>
            <span class="info-value">
              {{ dialogDronePortNameText }}
            </span>
          </v-row>
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogReserveTimeText }}
            </span>
          </v-row>
          <v-row no-gutters>
            <span class="info-label">
              利用形態：
            </span>
            <span class="info-value">
              {{ dialogUsageTypeText }}
            </span>
          </v-row>
        </div>
      </template>
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
            @click="updateReservationData"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- ドローンポート予約更新完了モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="updateSuccessDialogVisible"
      title="離着陸場予約 完了"
      :message="dialogMessage"
      :dialog-type="constants.dialogType.info"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              離着陸場名：
            </span>
            <span class="info-value">
              {{ dialogDronePortNameText }}
            </span>
          </v-row>
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogReserveTimeText }}
            </span>
          </v-row>
          <v-row no-gutters>
            <span class="info-label">
              利用形態：
            </span>
            <span class="info-value">
              {{ dialogUsageTypeText }}
            </span>
          </v-row>
        </div>
      </template>
      <template #customDialogButton>
        <v-row>
          <v-btn
            class="mx-2 dialog-button"
            variant="outlined"
            rounded="0"
            size="large"
            text="閉じる"
            @click="closeCalendarDialog"
          />
        </v-row>
      </template>
    </CommonDialog>

    <!-- ドローンポート予約更新失敗モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="updateFailedDialogVisible"
      title="離着陸場予約更新 失敗"
      :message="dialogMessage"
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
  </v-dialog>
</template>

<style scoped>
.title{
  font-size: 15px;
  font-weight: bold;
  padding-left: 10px;
  padding-top: 10px;
}

.reserveDate{
  text-align: end;
}
</style>
