<script setup lang="ts">
import AircraftInfoInputDialog from './AircraftInfoInputDialog.vue'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
// カレンダー
import ReservationCalendar from '~/components/calendar/ReservationCalendar.vue'
import type { EventInfo } from '~/components/calendar/ReservationCalendar.vue'

const {
  $luxon,
} = useNuxtApp()
const { constants } = useMyConstant()

/** ダイアログ表示フラグ */
const aircraftInfoInputDialogVisible = ref(false) // 機体情報入力ダイアログ
const getFailedAircraftInfoDialogVisible = ref(false) // 機体予約情報取得失敗ダイアログ
const infoDetailGetFailedDialogVisible = ref(false) // 機体予約詳細情報取得失敗ダイアログ

const isLoading = useState('isLoading')// スピナー表示
// 機体予約情報入力ダイアログ登録・更新削除判別用フラグ
const isUpdate = ref(false)
// 押下セル判別用フラグ(空orデータ有)
const isNew = ref(false)

// 機体予約詳細情報格納用
const AircfaftReservationDetail = ref()

const errorDetail = ref('') // エラー詳細
const registrationData = ref()
const updateData = ref()

const emit = defineEmits(['update:dialogVisible', 'complete'])
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true,
  },
  selectId: {
    type: String,
    required: true,
  },
  selectReserveName: {
    type: String,
    required: true,
  },
  selectReserveId: {
    type: String,
    required: true,
  },
  selectReserveTime: {
    type: String,
    required: true,
  },
})
const isOpen = ref(props.dialogVisible)

const reserveAircrafts = ref<EventInfo[]>()
const aircraftIdList = ref<string[]>([])
const nowDate = ref(new Date())
const reserveId = ref()
const aircraftId = ref()
const aircraftName = ref()

watch(() => props.dialogVisible, (newVal) => {
  isOpen.value = newVal
})
watch(() => isOpen.value, () => {
  emit('update:dialogVisible', isOpen.value)
})
// 機体予約情報一覧画面で選択した予約日付を取得する
watch(() => props.selectReserveTime, (newVal) => {
  nowDate.value = new Date(newVal)
})
// 機体予約情報一覧画面で選択した機体予約IDを取得する
watch(() => props.selectReserveId, (newVal) => {
  reserveId.value = newVal
})
const showDialog = async () => {
  aircraftIdList.value = []
  aircraftId.value = props.selectId
  aircraftName.value = props.selectReserveName
  // 初期表示処理
  const result = await loadingData()
  await loadOff()
  reserveAircrafts.value = result

  // 日を跨ぐ予約を分割する
  let dividedReservation
  const reserveAircraftsTemp: EventInfo[] | undefined = []
  reserveAircrafts.value.map((reservation) => {
    dividedReservation = divideReservation(reservation)
    if (dividedReservation.length !== 0) {
      dividedReservation.forEach((element) => {
        reserveAircraftsTemp.push(element)
      })
    }
    else {
      reserveAircraftsTemp.push(reservation)
    }
  })
  reserveAircrafts.value = reserveAircraftsTemp
}

const loadOn = () => {
  isLoading.value = true
}

const loadOff = () => {
  isLoading.value = false
}

// データ取得処理
const loadingData = async () => {
  // spinerOn
  await loadOn()
  let result: EventInfo[] = []
  const getByPkResult = await $fetch(`/api/drone/aircraft/reserve/detail/${reserveId.value}`, { 
    method: 'GET',
  });
  if (utils.isNormalStatusResponse(getByPkResult.status)) {
    // 取得成功時処理
    const aircraftReserveInfo = getByPkResult.data // 詳細取得処理で取得した機体予約情報
    const startDate = aircraftReserveInfo.reservationTimeFrom // 予約開始日時
    const isoStartDate = $luxon.fromISO(startDate) // 予約開始日時(ISO形式)
    const firstDayOfTheWeek = isoStartDate.startOf('week') // 予約開始日時を含む週の開始日を取得
    const lastDayOfTheWeek = isoStartDate.endOf('week') // 予約開始日時を含む週の終了日を取得
    const newDt = lastDayOfTheWeek.plus({ days: 1 }) // 予約開始日時を含む週の終了日の次の日を取得
    const dtToTime = newDt.startOf('day') // 開始時間(00:00)を取得
    const isoFirstDayOfTheWeek = firstDayOfTheWeek.toISO() // 週の開始日をISO形式に変換
    const isoLastDayOfTheWeek = dtToTime.toISO() // 週の終了日をISO形式に変換
    const utcFirstDayOfTheWeek = utils.convertJSTtoUTC(isoFirstDayOfTheWeek!)
    const utcLastDayOfTheWeek = utils.convertJSTtoUTC(isoLastDayOfTheWeek!)
    aircraftIdList.value.push(aircraftId.value)
    const params: AircraftReserveGetListRequestQueryParams = { aircraftId: aircraftId.value, timeFrom: utcFirstDayOfTheWeek, timeTo: utcLastDayOfTheWeek }
    const getListResult = await $fetch('/api/drone/aircraft/reserve/list', { 
      method: 'GET',
      query: params
    });
    if (utils.isNormalStatusResponse(getListResult.status)) {
      const { data: dataList } = getListResult.data
      result = dataList.map((data: any) => {
        return {
          id: data.aircraftReservationId,
          reserveTargetId: data.aircraftId,
          name: data.aircraftName,
          reservationTimeFrom: new Date(utils.toFormatJSTtime(data.reservationTimeFrom, constants.format.datetime, 'local')),
          reservationTimeTo: new Date(utils.toFormatJSTtime(data.reservationTimeTo, constants.format.datetime, 'local')),
          isEdit: data.aircraftReservationId === reserveId.value,
        }
      })
    }
    else {
    // 取得失敗時処理
      const responseBody = getListResult.data
      getFailedAircraftInfoDialogVisible.value = true
      if (responseBody?.errorDetail) {
        errorDetail.value = `機体予約情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
      }
      else {
        errorDetail.value = `機体予約情報の取得に失敗しました。(エラー詳細：)`
      }
    }
  }
  else {
    // 取得失敗時処理
    const responseBody = getByPkResult.data
    infoDetailGetFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約詳細情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約詳細情報の取得に失敗しました。(エラー詳細：)`
    }
  }
  return result
}

// データ取得処理(機体予約情報詳細取得API)
const loadingReservationDetailData = async (params: any) => {
  const apiResult = await $fetch(`/api/drone/aircraft/reserve/detail/${params}`, { 
    method: 'GET',
  });

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    return apiResult.data
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    infoDetailGetFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約詳細情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約詳細情報の取得に失敗しました。(エラー詳細：)`
    }
    isLoading.value = false
  }
}

// カレンダー日付切り替え時処理
const changeWeek = async (days: { fromTime: string, toTime: string }) => {
  // spinerOn
  await loadOn()
  const dt = $luxon.fromISO(days.toTime)
  const newDt = dt.plus({ days: 1 })
  const toTime = newDt.toISO()
  days.fromTime = utils.convertJSTtoUTC(days.fromTime)!
  days.toTime = utils.convertJSTtoUTC(toTime!)!

  // 予約情報一覧取得
  // パラメータに開始日時と終了日時も渡す
  // カレンダーで日時が変更された際に再度取得する
  let result: EventInfo[] = []
  const params = { aircraftId: aircraftId.value, timeFrom: days.fromTime, timeTo: days.toTime }
  const getListResult = await $fetch('/api/drone/aircraft/reserve/list', { 
    method: 'GET',
    query: params
  });
  if (utils.isNormalStatusResponse(getListResult.status)) {
    const { data: dataList } = getListResult.data
    result = dataList.map((data: any) => {
      return {
        id: data.aircraftReservationId,
        reserveTargetId: data.aircraftId,
        name: data.aircraftName,
        reservationTimeFrom: new Date(utils.toFormatJSTtime(data.reservationTimeFrom, constants.format.datetime, 'local')),
        reservationTimeTo: new Date(utils.toFormatJSTtime(data.reservationTimeTo, constants.format.datetime, 'local')),
        isEdit: data.aircraftReservationId === reserveId.value,
      }
    })
  }
  else {
    // 取得失敗時処理
    const responseBody = getListResult.data
    getFailedAircraftInfoDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約情報の取得に失敗しました。(エラー詳細：)`
    }
  }
  reserveAircrafts.value = result

  // 日を跨ぐ予約を分割する
  let dividedReservation
  const reserveAircraftsTemp: EventInfo[] | undefined = []
  reserveAircrafts.value.map((reservation) => {
    dividedReservation = divideReservation(reservation)
    if (dividedReservation.length !== 0) {
      dividedReservation.forEach((element) => {
        reserveAircraftsTemp.push(element)
      })
    }
    else {
      reserveAircraftsTemp.push(reservation)
    }
  })
  reserveAircrafts.value = reserveAircraftsTemp
  await loadOff()
}

// カレンダー時間スロット押下時処理
const registReserve = async (data: { fromTime: string, toTime: string, targetId: string }) => {
  registrationData.value = data

  isUpdate.value = true
  isNew.value = true
  aircraftInfoInputDialogVisible.value = true
}

// カレンダー時間スロット押下時処理
const updateReserve = async (data: { fromTime: string, toTime: string, reserveTargetId: string, reserveId: string }) => {
  // 詳細取得APIで値を取得する
  await loadOn()
  AircfaftReservationDetail.value = await loadingReservationDetailData(data.reserveId)
  await loadOff()
  updateData.value = data
  if (AircfaftReservationDetail.value) {
    updateData.value.fromTime = utils.convertUTCtoJST(AircfaftReservationDetail.value.reservationTimeFrom)
    updateData.value.toTime = utils.convertUTCtoJST(AircfaftReservationDetail.value.reservationTimeTo)
  }

  isUpdate.value = true
  isNew.value = false
  aircraftInfoInputDialogVisible.value = true
}

const closeDialog = () => {
  isOpen.value = false
  emit('complete')
}

// 日をまたぐ予約を分割する
const divideReservation = (calendarListTemp: any) => {
  // 分割した予約を保持する
  const dividedReservation = []
  // 予約開始日時
  const reservationStartDay = calendarListTemp.reservationTimeFrom.toISOString()
  // 予約終了日時
  const reservationEndDay = calendarListTemp.reservationTimeTo.toISOString()

  // 予約開始日時 00:00
  const startOfReservationStartDay = changeDayStart(calendarListTemp.reservationTimeFrom.toISOString())
  // 予約終了日時 00:00
  const startOfReservationEndDay = changeDayStart(calendarListTemp.reservationTimeTo.toISOString())

  const dtStart = $luxon.fromISO(startOfReservationStartDay!) // 予約開始日時の00:00をdatetime型にする
  const dtEnd = $luxon.fromISO(startOfReservationEndDay!) // 予約終了日時の00:00をdatetime型にする

  const diff = dtEnd.diff(dtStart, 'days')
  const diffDays = Math.abs(diff.days) // 予約期間の日数を取得

  let startTemp // 分割時の予約開始日時(ISO)
  let startDtTemp // 分割時の予約開始日時(Datetime型)
  let endTemp // 分割時の予約終了日時(ISO)
  let endDtTemp // 分割時の予約終了日時(Datetime型)
  let date: Date
  let dateBefore1minutes

  if (diffDays) {
    for (let i = 0; i <= diffDays; i++) {
      // 日付を足す際はluxonにする
      // devidedReservationにはisostringをdate型で渡す

      // ここで分割を実施する
      if (i === diffDays) {
        // 最終分割時
        dividedReservation.push({ id: calendarListTemp.id,
          reserveTargetId: calendarListTemp.reserveTargetId,
          reservationTimeFrom: new Date(endTemp!),
          reservationTimeTo: new Date(reservationEndDay),
          name: calendarListTemp.name,
          isEdit: calendarListTemp.isEdit,
          status: '' })
      }
      else if (i === 0) {
        // １回目の分割時
        endDtTemp = dtStart.plus({ days: 1 })
        endTemp = endDtTemp.toISO()
        date = new Date(endTemp!)
        dateBefore1minutes = date.setMinutes(date.getMinutes() - 1)

        dividedReservation.push({ id: calendarListTemp.id,
          reserveTargetId: calendarListTemp.reserveTargetId,
          reservationTimeFrom: new Date(reservationStartDay),
          reservationTimeTo: new Date(dateBefore1minutes!), // 見かけ上00:00を23:59にする
          name: calendarListTemp.name,
          isEdit: calendarListTemp.isEdit,
          status: '' })
      }
      else {
        // 初回と最後を除く分割時
        startTemp = endTemp
        startDtTemp = $luxon.fromISO(startTemp!)
        endDtTemp = startDtTemp.plus({ days: 1 })
        endTemp = endDtTemp.toISO()
        date = new Date(endTemp!)
        dateBefore1minutes = date.setMinutes(date.getMinutes() - 1)

        dividedReservation.push({ id: calendarListTemp.id,
          reserveTargetId: calendarListTemp.reserveTargetId,
          reservationTimeFrom: new Date(startTemp!),
          reservationTimeTo: new Date(dateBefore1minutes!), // 見かけ上00:00を23:59にする
          name: calendarListTemp.name,
          isEdit: calendarListTemp.isEdit,
          status: '' })
      }
    }
  }

  return dividedReservation
}

// 日の開始日時を取得
const changeDayStart = (dateTime: string) => {
  const dt = $luxon.fromISO(dateTime)
  const newDt = dt.startOf('day')
  return newDt.toISO()
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    persistent
    no-click-animation
    scrollable
    width="70%"
    height="90%"
    @after-enter="showDialog"
  >
    <v-card>
      <div class="title">
        機体予約更新削除
      </div>
      <div class="aircraft-name">
        使用機体：[{{ aircraftName }}]
      </div>
      <v-divider />
      <v-card-text>
        <ReservationCalendar
          :events-list="reserveAircrafts"
          :disp-list="aircraftIdList"
          :target-date="nowDate"
          @change-week="changeWeek"
          @regist-reserve="registReserve"
          @update-reserve="updateReserve"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="mt-2 mb-2">
        <v-row
          justify="space-between"
          class="px-2"
        >
          <button
            class="e-button-back"
            @click="isOpen = false"
          >
            閉じる
          </button>
          <div />
        </v-row>
      </v-card-actions>
      <AircraftInfoInputDialog
        v-model:dialog-visible="aircraftInfoInputDialogVisible"
        :registration-data="registrationData"
        :update-data="updateData"
        :reserve-id="reserveId"
        :receive-aircraft-id="aircraftId"
        :is-update="isUpdate"
        :is-new="isNew"
        :aircraft-reservation-list="reserveAircrafts"
        @success="closeDialog"
      />
      <!-- 予約情報取得失敗ダイアログ -->
      <CommonDialog
        v-model:dialog-visible="getFailedAircraftInfoDialogVisible"
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
              @click="getFailedAircraftInfoDialogVisible = false"
            />
          </v-row>
        </template>
      </CommonDialog>
      <!-- 予約詳細情報取得失敗ダイアログ -->
      <CommonDialog
        v-model:dialog-visible="infoDetailGetFailedDialogVisible"
        title="機体予約情報詳細取得 失敗"
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
              @click="infoDetailGetFailedDialogVisible = false"
            />
          </v-row>
        </template>
      </CommonDialog>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.title{
  font-size: 20px;
  font-weight: bold;
  padding-left: 10px;
  padding-top: 10px;
}
.aircraft-name{
  padding-left: 20px;
  padding-top: 20px;
  font-size: 15px;
  font-weight: bold;
}
</style>
