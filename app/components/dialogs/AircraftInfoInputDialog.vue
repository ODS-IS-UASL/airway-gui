<script setup lang="ts">
import CommonDialog from '~/components/dialogs/CommonDialog.vue'

const {
  $luxon,
} = useNuxtApp()
const { constants } = useMyConstant()

const isLoading = useState('isLoading')// スピナー表示

/** ダイアログ表示フラグ */
const registerConfirmDialogVisible = ref(false) // 登録確認ダイアログ
const registerSuccessDialogVisible = ref(false) // 登録成功ダイアログ
const registerFailedDialogVisible = ref(false) // 登録失敗ダイアログ

const deleteConfirmDialogVisible = ref(false) // 削除確認ダイアログ
const deleteSuccessDialogVisible = ref(false) // 削除成功ダイアログ
const deleteFailedDialogVisible = ref(false) // 削除失敗ダイアログ

const updateConfirmDialogVisible = ref(false) // 更新確認ダイアログ
const updateSuccessDialogVisible = ref(false) // 更新成功ダイアログ
const updateFailedDialogVisible = ref(false) // 更新失敗ダイアログ

const errorDetail = ref('') // エラー詳細
const dialogMessage = ref('') // ダイアログメッセージ格納用
const dialogBodyText = ref('') // ダイアログテキスト格納用

// 開始時刻格納用
const reserveTimeFrom = ref('')
// 終了時刻格納用
const reserveTimeTo = ref('')

// 開始日付格納用
const startDate = ref('')
// 終了日付格納用
const endDate = ref('')

// 開始時刻格納用(削除時のメッセージ用)
const deleteReserveTimeFrom = ref('')
// 終了時刻格納用(削除時のメッセージ用)
const deleteReserveTimeTo = ref('')
// 開始日格納用(削除時のメッセージ用)
const deleteReserveDateFrom = ref('')
// 終了日格納用(削除時のメッセージ用)
const deleteReserveDateTo = ref('')

/**
   * 機体予約情報登録格納用
   */
const registration = ref<Record<string, any>>({
  aircraftReservationId: null, // 機体予約ID
  aircraftId: null, // 機体ID
  reservationTimeFrom: '', // 予約開始日時
  reservationTimeTo: '', // 予約終了日時
})

// 登録ボタン活性フラグ
const isRegister = ref(true)

const validForm = ref() // バリデーションチェック用フォームrefs

const formSetting = {
  // ラベル名・必須・最大長・セレクトリスト内容・チェックボックス内容設定用
  reserveTimeFrom: { label: '予約開始日時', required: true },
  reserveTimeTo: { label: '予約終了日時', required: true },
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
  isUpdate: {
    // 登録か更新かを判別するフラグ
    // 登録画面はfalse,更新削除画面はtrue
    type: Boolean,
    required: false,
    default: false,
  },
  isNew: {
    // 押下したセルが空かデータ有かを判別するフラグ
    // データ有はfalse,空はtrue
    type: Boolean,
    required: false,
    default: false,
  },
  reserveId: {
    type: String,
    required: false,
    default: '',
  },
  receiveAircraftId: {
    type: String,
    required: false,
  },
  aircraftReservationList: {
    type: Array as PropType<any[]>,
    default: () => [{
      id: '',
      isEdit: '',
      name: '',
      reservationTimeFrom: '',
      reservationTimeto: '',
      reserveTargetId: '',
    },
    ],
    required: false,
  },
})

const emit = defineEmits(['update:dialogVisible', 'success'])

const isOpen = ref(props.dialogVisible)
watch(() => props.dialogVisible, (newVal) => {
  isOpen.value = newVal
})
watch(() => isOpen.value, () => {
  emit('update:dialogVisible', isOpen.value)
})

// 時間スロットが押された際に、子ダイアログに値を設定
watch(() => props.registrationData, () => {
  const dtFrom = $luxon.fromISO(props.registrationData?.fromTime)
  const dtTo = $luxon.fromISO(props.registrationData?.toTime)
  startDate.value = dtFrom.toFormat(constants.format.datePicker)
  endDate.value = dtTo.toFormat(constants.format.datePicker)
  reserveTimeFrom.value = dtFrom.toFormat(constants.format.time)
})

// 時間スロットが押された際に、子ダイアログに値を設定
watch(() => props.updateData, () => {
  const dtFrom = $luxon.fromISO(props.updateData?.fromTime)
  const dtTo = $luxon.fromISO(props.updateData?.toTime)
  startDate.value = dtFrom.toFormat(constants.format.datePicker)
  endDate.value = dtTo.toFormat(constants.format.datePicker)
  reserveTimeFrom.value = dtFrom.toFormat(constants.format.time)
  reserveTimeTo.value = dtTo.toFormat(constants.format.time)
  deleteReserveDateFrom.value = dtFrom.toFormat(constants.format.datePicker)
  deleteReserveDateTo.value = dtTo.toFormat(constants.format.datePicker)
  deleteReserveTimeFrom.value = dtFrom.toFormat(constants.format.time)
  deleteReserveTimeTo.value = dtTo.toFormat(constants.format.time)
})

const closeDialog = async () => {
  isRegister.value = true
  reserveTimeTo.value = ''
}

/** バリデーションチェック
 * 必須チェック
 * 入力チェック(予約開始時間 < 予約終了時間)
*/
const requiredValidation = (value: any) => {
  if (utils.isBlank(value)) return '入力必須項目です'
  return !!value || value === 0
}
const startTimeRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(startDate.value, value)! > utils.createDateIsoAndTimefromUTCISOTime(endDate.value, reserveTimeTo.value)!) return '終了時間以前の時間を入力してください'
  return !!value || value === 0
}
const endTimeRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(endDate.value, value)! <= utils.createDateIsoAndTimefromUTCISOTime(startDate.value, reserveTimeFrom.value)!) return '開始時間以後の時間を入力してください'
  return !!value || value === 0
}
const startDateRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(value, reserveTimeFrom.value)! > utils.createDateIsoAndTimefromUTCISOTime(endDate.value, reserveTimeTo.value)!) return '終了時間以前の時間を入力してください'
  return value <= endDate.value
}
const endDateRangeValidation = (value: any) => {
  if (utils.createDateIsoAndTimefromUTCISOTime(value, reserveTimeTo.value)! <= utils.createDateIsoAndTimefromUTCISOTime(startDate.value, reserveTimeFrom.value)!) return '開始時間以後の時間を入力してください'
  return value >= startDate.value
}
const duplicationReservationValidation = (value: any) => {
  if (checkDupulicationOfReservation(startDate.value, endDate.value, reserveTimeFrom.value, reserveTimeTo.value)) return 'この時間は予約済みです。開始または終了時間を変更してください'
  return !!value || value === 0
}

// 開始時刻または終了時刻が他の予約と重複しているかをチェックする
// 重複している場合:true
// 重複していない場合:false
const checkDupulicationOfReservation = (calendarStartDateTime: string, calendarEndDateTime: string, inputStartTime: string, inputEndTime: string) => {
  // ダイアログで選択した開始時刻とカレンダーからの日時を基に日付生成
  const inputStartDate = $luxon.fromISO(convertTimeForApi(calendarStartDateTime, inputStartTime)!)
  const inputEndDate = $luxon.fromISO(convertTimeForApi(calendarEndDateTime, inputEndTime)!)

  let otherReservationList
  // 機体ID、その日の日付を基に予約一覧を取得する
  /**
   * 以下の予約を取得する
   *  ・予約のうち、その予約期間内に入力した開始日時が存在する予約
   *  ・予約のうち、その予約期間内に入力した終了日時が存在する予約
   *  ・予約のうち、その予約期間が、入力した開始日時と終了日時の期間内に存在する予約
   */
  if (props.isUpdate) {
    // 更新の場合ドローンポート予約IDと一致する予約は取得対象から除外する
    otherReservationList = props.aircraftReservationList.filter(value => (($luxon.fromISO(value.reservationTimeFrom.toISOString()) <= inputStartDate && inputStartDate < $luxon.fromISO(value.reservationTimeTo.toISOString()))
      || ($luxon.fromISO(value.reservationTimeFrom.toISOString()) < inputEndDate && inputEndDate <= $luxon.fromISO(value.reservationTimeTo.toISOString()))
      || (inputStartDate < $luxon.fromISO(value.reservationTimeFrom.toISOString()) && $luxon.fromISO(value.reservationTimeTo.toISOString()) < inputEndDate)) && value.reserveTargetId === props.receiveAircraftId && value.id !== props.reserveId)
  }
  else {
    otherReservationList = props.aircraftReservationList.filter(value => (($luxon.fromISO(value.reservationTimeFrom.toISOString()) <= inputStartDate && inputStartDate < $luxon.fromISO(value.reservationTimeTo.toISOString()))
      || ($luxon.fromISO(value.reservationTimeFrom.toISOString()) < inputEndDate && inputEndDate <= $luxon.fromISO(value.reservationTimeTo.toISOString()))
      || (inputStartDate < $luxon.fromISO(value.reservationTimeFrom.toISOString()) && $luxon.fromISO(value.reservationTimeTo.toISOString()) < inputEndDate)) && value.reserveTargetId === props.receiveAircraftId)
  }

  // 重複する予約が存在する場合true
  if (otherReservationList.length !== 0) {
    return true
  }
  return false
}

// 表示用の値をAPIに渡す用に変換
const convertTimeForApi = (time: string, targetTime: string) => {
  return utils.createDateIsoAndTimefromUTCISOTime(time, targetTime)
}

// 予約ボタン押下時
const handleRegister = async () => {
  // バリデーションチェック
  const valid = await validate()
  if (valid) {
    registration.value.aircraftId = props.receiveAircraftId
    registration.value.reservationTimeFrom = reserveTimeFrom.value
    registration.value.reservationTimeTo = reserveTimeTo.value
    registerConfirm()
  }
}

// 更新ボタン押下時
const handleUpdate = async () => {
  // バリデーションチェック
  const valid = await validate()
  if (valid) {
    if (props.isNew) {
      registration.value.aircraftReservationId = props.reserveId
      registration.value.aircraftId = props.receiveAircraftId
    }
    else {
      registration.value.aircraftReservationId = props.updateData?.reserveId
      registration.value.aircraftId = props.updateData?.reserveTargetId
    }
    registration.value.reservationTimeFrom = reserveTimeFrom.value
    registration.value.reservationTimeTo = reserveTimeTo.value
    updateConfirm()
  }
}

// 削除ボタン押下時
const handleDelete = () => {
  deleteConfirm()
}

// 閉じるボタン押下時
const handleClose = () => {
  isOpen.value = false
  emit('update:dialogVisible', isOpen.value)
  reserveTimeTo.value = ''
}

// 予約確認ダイアログ表示
const registerConfirm = () => {
  dialogMessage.value = '下記内容で予約してよろしいですか'
  dialogBodyText.value = `${convertTimeForDialogMessage(startDate.value, reserveTimeFrom.value)} ～${convertTimeForDialogMessage(endDate.value, reserveTimeTo.value)}`
  registerConfirmDialogVisible.value = true
}

// 予約更新確認ダイアログ表示
const updateConfirm = () => {
  dialogMessage.value = '下記内容で予約情報を更新してよろしいですか'
  dialogBodyText.value = `${convertTimeForDialogMessage(startDate.value, reserveTimeFrom.value)} ～${convertTimeForDialogMessage(endDate.value, reserveTimeTo.value)}`
  updateConfirmDialogVisible.value = true
}

// 予約削除確認ダイアログ表示
const deleteConfirm = () => {
  dialogMessage.value = '下記の予約情報を削除してよろしいですか'
  dialogBodyText.value = `${convertTimeForDialogMessage(deleteReserveDateFrom.value, deleteReserveTimeFrom.value)} ～${convertTimeForDialogMessage(deleteReserveDateTo.value, deleteReserveTimeTo.value)}`
  deleteConfirmDialogVisible.value = true
}

// バリデーションチェック
const validate = async () => {
  const { valid } = await validForm.value.validate()
  return valid
}

/**
 * 機体予約情報登録
 */
const registerAircraftReserveInfo = async () => {
  isLoading.value = true
  registerConfirmDialogVisible.value = false

  // 入力した予約開始時間と終了時間をISO形式に変換
  const regReserveTimeFrom = utils.createDateIsoAndTimefromUTCISOTime(startDate.value, reserveTimeFrom.value)
  const regReserveTimeTo = utils.createDateIsoAndTimefromUTCISOTime(endDate.value, reserveTimeTo.value)
  registration.value.reservationTimeFrom = regReserveTimeFrom
  registration.value.reservationTimeTo = regReserveTimeTo
  registration.value.aircraftReservationId = utils.isNullUndefined(registration.value.aircraftReservationId) ? null : registration.value.aircraftReservationId
  // 機体予約情報登録API
  registration.value.operatorId = localStorage.getItem('uasl:user:operatorId');
  const apiResult = await $fetch(`/api/drone/aircraft/reserve`, { 
    method: 'POST',
    body: registration.value
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    // APIの返り値が正常の場合
    // 予約完了ダイアログの表示
    registerSuccessDialogVisible.value = true
  }
  else {
    // APIの返り値が異常の場合
    // 予約失敗ダイアログの表示
    const responseBody = apiResult.data
    registerFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体の予約に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体の予約に失敗しました。(エラー詳細：)`
    }
  }
  isLoading.value = false
}

/**
 * 機体予約情報更新
 */
const updateAircraftReserveInfo = async () => {
  isLoading.value = true
  updateConfirmDialogVisible.value = false
  let regReserveTimeFrom
  let regReserveTimeTo
  // 選択した日付を取得
  if (props.isNew) {
    // 入力した予約開始時間と終了時間をISO形式に変換
    regReserveTimeFrom = utils.createDateIsoAndTimefromUTCISOTime(startDate.value, reserveTimeFrom.value)
    regReserveTimeTo = utils.createDateIsoAndTimefromUTCISOTime(endDate.value, reserveTimeTo.value)
  }
  else {
    regReserveTimeFrom = utils.createDateIsoAndTimefromUTCISOTime(startDate.value, reserveTimeFrom.value)
    regReserveTimeTo = utils.createDateIsoAndTimefromUTCISOTime(endDate.value, reserveTimeTo.value)
  }
  registration.value.reservationTimeFrom = regReserveTimeFrom
  registration.value.reservationTimeTo = regReserveTimeTo
  // 機体予約情報更新API
  registration.value.operatorId = localStorage.getItem('uasl:user:operatorId');
  const apiResult = await $fetch(`/api/drone/aircraft/reserve`, { 
    method: 'PUT',
    body: registration.value
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    // APIの返り値が正常の場合
    // 機体予約更新完了ダイアログの表示
    updateSuccessDialogVisible.value = true
  }
  else {
    // APIの返り値が異常の場合
    // 機体予約更新失敗ダイアログの表示
    const responseBody = apiResult.data
    updateFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約情報の更新に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約情報の更新に失敗しました。(エラー詳細：)`
    }
  }
  isLoading.value = false
}

/**
 * 機体予約情報削除
 */
const deleteAircraftReserveInfo = async () => {
  isLoading.value = true
  deleteConfirmDialogVisible.value = false
  // 機体予約情報削除API
  const apiResult = await $fetch(`/api/drone/aircraft/reserve/${props.reserveId}`, { 
    method: 'DELETE',
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    // APIの返り値が正常の場合
    // 機体予約削除完了ダイアログの表示
    deleteSuccessDialogVisible.value = true
  }
  else {
    // APIの返り値が異常の場合
    // 機体予約削除失敗ダイアログの表示
    const responseBody = apiResult.data
    deleteFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約情報の削除に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約情報の削除に失敗しました。(エラー詳細：)`
    }
  }
  isLoading.value = false
}

// 入力チェック
const inputCheck = () => {
  // 開始時間と終了時間が未入力の場合、予約ボタン非活性
  if (!utils.isBlank(reserveTimeFrom.value) && !utils.isBlank(reserveTimeTo.value) && !utils.isBlank(startDate.value) && !utils.isBlank(endDate.value)) {
    isRegister.value = false
  }
}
// 予約完了ダイアログのOKボタン押下時
const registerSuccessDialogOk = () => {
  reserveTimeTo.value = ''
  isOpen.value = false
  emit('success')
}

// 機体予約更新完了ダイアログのOKボタン押下時
const updateSuccessDialogOk = () => {
  isOpen.value = false
  emit('success')
}

// 機体予約削除完了ダイアログのOKボタン押下時
const deleteSuccessDialogOk = () => {
  isOpen.value = false
  emit('success')
}

// ダイアログメッセージ用に日時を変換する
const convertTimeForDialogMessage = (date: string, time: string) => {
  const utcIsoDate = utils.createDateIsoAndTimefromUTCISOTime(date, time)
  const jtcDateTime = utils.convertUTCtoJSTDateTime(utcIsoDate!)
  return jtcDateTime?.toFormat(constants.format.datetime)
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    persistent
    no-click-animation
    max-width="500px"
    @after-leave="closeDialog"
  >
    <v-card>
      <div class="title">
        機体予約情報入力
      </div>
      <v-card-text>
        <v-form
          ref="validForm"
          validate-on="submit"
        >
          <v-row>
            <v-col class="d-flex align-center justify-start">
              <label class="form-label">
                <b
                  v-if="formSetting.reserveTimeFrom.required"
                  style="color: red"
                >*</b>
                <b>{{ formSetting.reserveTimeFrom.label }}</b>
              </label>
            </v-col>
            <v-col
              align-self="center"
            >
              <v-text-field
                v-model="startDate"
                type="date"
                hide-details="auto"
                :rules="reserveTimeTo ? [requiredValidation, startDateRangeValidation, duplicationReservationValidation] : []"
                @change="inputCheck"
              />
            </v-col>
            <v-col
              align-self="center"
              cols="3"
            >
              <v-text-field
                v-model="reserveTimeFrom"
                type="time"
                hide-details="auto"
                :rules="reserveTimeTo ? [requiredValidation, startTimeRangeValidation, duplicationReservationValidation] : []"
                @change="inputCheck"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col class="d-flex align-center justify-start">
              <label class="form-label">
                <b
                  v-if="formSetting.reserveTimeTo.required"
                  style="color: red"
                >*</b>
                <b>{{ formSetting.reserveTimeTo.label }}</b>
              </label>
            </v-col>
            <v-col
              align-self="center"
            >
              <v-text-field
                v-model="endDate"
                type="date"
                hide-details="auto"
                :rules="reserveTimeTo ? [requiredValidation, endDateRangeValidation, duplicationReservationValidation] : []"
                @change="inputCheck"
              />
            </v-col>
            <v-col
              align-self="center"
              cols="3"
            >
              <v-text-field
                v-model="reserveTimeTo"
                type="time"
                hide-details="auto"
                :rules="reserveTimeTo ? [requiredValidation, endTimeRangeValidation, duplicationReservationValidation] : [requiredValidation]"
                @change="inputCheck"
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
            class="e-button-back"
            @click="handleClose"
          >
            閉じる
          </button>
          <template v-if="isUpdate">
            <div style="display:flex">
              <button
                v-if="!isNew"
                class="e-button"
                style="background-color: red"
                @click="handleDelete"
              >
                削除
              </button>
              <div class="px-1" />
              <button
                class="e-button"
                @click="handleUpdate"
              >
                更新
              </button>
            </div>
          </template>
          <template v-else>
            <button
              class="e-button"
              :disabled="isRegister"
              @click="handleRegister"
            >
              予約
            </button>
          </template>
        </v-row>
      </v-card-actions>
    </v-card>
    <!-- 機体情報予約確認モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="registerConfirmDialogVisible"
      title="機体予約"
      :message="dialogMessage"
      :dialog-type="constants.dialogType.confirm"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogBodyText }}
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
            @click="registerConfirmDialogVisible = false"
          />
          <v-btn
            class="mx-2 dialog-button"
            variant="outlined"
            rounded="0"
            size="large"
            text="はい"
            @click="registerAircraftReserveInfo"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 機体予約完了モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="registerSuccessDialogVisible"
      title="機体予約 完了"
      message="機体予約が完了しました"
      :dialog-type="constants.dialogType.info"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogBodyText }}
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
            @click="registerSuccessDialogOk"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 機体予約失敗モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="registerFailedDialogVisible"
      title="機体予約 失敗"
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
    <!-- 機体予約更新確認モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="updateConfirmDialogVisible"
      title="機体予約更新"
      :message="dialogMessage"
      :dialog-type="constants.dialogType.confirm"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogBodyText }}
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
            @click="updateAircraftReserveInfo"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 機体予約更新完了モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="updateSuccessDialogVisible"
      title="機体予約更新 完了"
      message="機体予約情報の更新が完了しました"
      :dialog-type="constants.dialogType.info"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogBodyText }}
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
            @click="updateSuccessDialogOk"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 機体予約更新失敗モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="updateFailedDialogVisible"
      title="機体予約更新 失敗"
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
    <!-- 機体予約削除確認モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="deleteConfirmDialogVisible"
      title="機体予約削除"
      :message="dialogMessage"
      :dialog-type="constants.dialogType.confirm"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogBodyText }}
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
            @click="deleteConfirmDialogVisible = false"
          />
          <v-btn
            class="mx-2 dialog-button"
            variant="outlined"
            rounded="0"
            size="large"
            text="はい"
            @click="deleteAircraftReserveInfo"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 機体予約削除完了モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="deleteSuccessDialogVisible"
      title="機体予約削除 完了"
      message="機体予約情報の削除が完了しました"
      :dialog-type="constants.dialogType.info"
    >
      <template #customDialogBodyText>
        <div class="info-area">
          <v-row no-gutters>
            <span class="info-label">
              予約日時：
            </span>
            <span class="info-value">
              {{ dialogBodyText }}
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
            text="機体予約一覧"
            @click="deleteSuccessDialogOk"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 機体予約削除失敗モーダルダイアログ -->
    <CommonDialog
      v-model:dialog-visible="deleteFailedDialogVisible"
      title="機体予約削除 失敗"
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
  </v-dialog>
</template>

<style scoped>
.title{
  font-size: 15px;
  font-weight: bold;
  padding-left: 10px;
  padding-top: 10px;
}
</style>
