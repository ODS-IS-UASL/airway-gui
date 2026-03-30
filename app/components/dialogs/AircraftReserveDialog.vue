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
const getListFailedDialogVisible = ref(false) // 一覧取得失敗ダイアログ

// 機体予約情報入力ダイアログ登録・更新削除判別用フラグ
const isUpdate = ref(false)

const isLoading = useState('isLoading')// スピナー表示
const errorDetail = ref('') // エラー詳細
const registrationData = ref()

const emit = defineEmits(['update:dialogVisible'])
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true,
  },
  aircraftId: {
    type: String,
    required: false,
  },
  aircraftName: {
    type: String,
    required: false,
  },
})
const isOpen = ref(props.dialogVisible)

const reserveAircrafts = ref<EventInfo[]>()
const aircraftIdList = ref<string[]>([])
const nowDate = new Date()
let params: any
const receiveAircraftId = ref()
const receiveAircraftName = ref()

const showDialog = async () => {
  receiveAircraftId.value = props.aircraftId
  receiveAircraftName.value = props.aircraftName
  const nowDate = $luxon.now()
  const firstDayOfTheWeek = nowDate.startOf('week') // 予約開始日時を含む週の開始日を取得
  const lastDayOfTheWeek = nowDate.endOf('week') // 予約開始日時を含む週の終了日を取得
  const newDt = lastDayOfTheWeek.plus({ days: 1 }) // 予約開始日時を含む週の終了日の次の日を取得
  const dtToTime = newDt.startOf('day') // 開始時間(00:00)を取得
  const isoFirstDayOfTheWeek = firstDayOfTheWeek.toISO() // 週の開始日をISO形式に変換
  const isoLastDayOfTheWeek = dtToTime.toISO() // 週の終了日をISO形式に変換
  const utcFirstDayOfTheWeek = utils.convertJSTtoUTC(isoFirstDayOfTheWeek)
  const utcLastDayOfTheWeek = utils.convertJSTtoUTC(isoLastDayOfTheWeek)
  params = { aircraftId: props.aircraftId, timeFrom: utcFirstDayOfTheWeek, timeTo: utcLastDayOfTheWeek }
  aircraftIdList.value = []
  // 初期表示処理
  const result = await loadingData()
  reserveAircrafts.value = result
  aircraftIdList.value.push(receiveAircraftId.value)

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

watch(() => props.dialogVisible, (newVal) => {
  isOpen.value = newVal
})
watch(() => isOpen.value, () => {
  emit('update:dialogVisible', isOpen.value)
})

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
  const apiResult = await $fetch('/api/drone/aircraft/reserve/list', { 
    method: 'GET',
    query: params
  });
  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    const { data: dataList } = apiResult.data
    result = dataList.map((data: any) => {
      return {
        id: data.aircraftReservationId,
        reserveTargetId: data.aircraftId,
        name: data.aircraftName,
        reservationTimeFrom: new Date(utils.toFormatJSTtime(data.reservationTimeFrom, constants.format.datetime, 'local')),
        reservationTimeTo: new Date(utils.toFormatJSTtime(data.reservationTimeTo, constants.format.datetime, 'local')),
        isEdit: false,
      }
    })
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    getListFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      errorDetail.value = `機体予約情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      errorDetail.value = `機体予約情報の取得に失敗しました。(エラー詳細：)`
    }
  }
  await loadOff()
  return result
}

// カレンダー日付切り替え時処理
const changeWeek = async (days: { fromTime: string, toTime: string }) => {
  const dt = $luxon.fromISO(days.toTime)
  const newDt = dt.plus({ days: 1 })
  const toTime = newDt.toISO()
  days.fromTime = utils.convertJSTtoUTC(days.fromTime)!
  days.toTime = utils.convertJSTtoUTC(toTime!)!

  // 予約情報一覧取得
  // パラメータに開始日時と終了日時も渡す
  // カレンダーで日時が変更された際に再度取得する
  params = { aircraftId: receiveAircraftId.value, timeFrom: days.fromTime, timeTo: days.toTime }
  reserveAircrafts.value = await loadingData()
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

// カレンダー時間スロット押下時処理
const registReserve = async (data: { fromTime: string, toTime: string, targetId: string }) => {
  registrationData.value = data

  isUpdate.value = false
  aircraftInfoInputDialogVisible.value = true
}

const closeDialog = () => {
  isOpen.value = false
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
        機体予約
      </div>
      <div class="aircraft-name">
        使用機体：[{{ receiveAircraftName }}]
      </div>
      <v-divider />
      <v-card-text>
        <ReservationCalendar
          :events-list="reserveAircrafts"
          :disp-list="aircraftIdList"
          :target-date="nowDate"
          @change-week="changeWeek"
          @regist-reserve="registReserve"
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
        </v-row>
      </v-card-actions>
      <AircraftInfoInputDialog
        v-model:dialog-visible="aircraftInfoInputDialogVisible"
        :registration-data="registrationData"
        :receive-aircraft-id="receiveAircraftId"
        :is-update="isUpdate"
        :aircraft-reservation-list="reserveAircrafts"
        @success="closeDialog"
      />
      <!-- 一覧取得失敗ダイアログ -->
      <CommonDialog
        v-model:dialog-visible="getListFailedDialogVisible"
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
              @click="getListFailedDialogVisible = false"
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
  padding-left: 10px;
  padding-top: 20px;
  font-size: 15px;
  font-weight: bold;
}
</style>
