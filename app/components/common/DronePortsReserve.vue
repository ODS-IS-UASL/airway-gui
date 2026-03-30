<script setup lang="ts">
// 共通関数
import { ref } from 'vue'
import { utils } from '~/utils/utils'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'

// カレンダー
import ReservationCalendar from '~/components/calendar/ReservationCalendar.vue'
import calendarDialog from '~/components/dialogs/CalendarDialog.vue'

import PageNavigation from '~/components/navigation/pageNavigation.vue'

definePageMeta({
  layout: 'system-global-navigation',
})

const route = useRoute()
const {
  $luxon,
} = useNuxtApp()

const { getRole } = useCreated()
const { constants } = useMyConstant()
const { codes } = useCode()

// 1週間の日数
const weekDays = 7

// 予約一覧画面からのパラメータ(ドローンポート予約ID)
const paramDronePortReservationId = route.params.id as string

// 予約一覧画面から遷移時に使用する日付格納用
const convertedStartDayTemp = ref()
const convertedEndDayTemp = ref()

// カレンダースロット押下時の時刻の情報を格納する
const calendarDays = ref()

// ドローンポート予約一覧を格納する
const defaultDronePortsReservationList: any[] = []
const dronePortsReservationList = ref<any[]>(defaultDronePortsReservationList)

// ドローンポート名を格納する配列
const defaultDronePortsNameList: DronePortName[] = []
const dronePortsNameList = ref<DronePortName[]>(defaultDronePortsNameList)
const defaultDronePortsIdList: string[] = []
const dronePortsIdList = ref<string[]>(defaultDronePortsIdList)

// 子ダイアログに渡す用の変数
// 登録時
const registrationData = ref()

// 更新削除時
const updateData = ref()

// 重複チェック用詳細情報
const detailData = ref()

// カレンダーの日付切り替えが実行されたか判別するフラグ
const isChangeWeeked = ref(false)

// 子ダイアログ登録・更新削除判別用フラグ
const isUpdate = ref(false)

const isClickEmptySlot = ref(false)

const dialogMessage = ref('')

// ダイアログ表示フラグ
const calendarDialogVisible = ref(false)
const infoListGetFailedDialogVisible = ref(false)
const infoDetailGetFailedDialogVisible = ref(false)
const infoReservationListGetFailedDialogVisible = ref(false)

const isLoading = useState('isLoading')

const defaultCalendarList: any[] = []
const calendarListTemp = ref()
const calendarList = ref<any[]>(defaultCalendarList)

// カレンダーからのemitでもらう日時等の情報
// ドローンポート情報入力ダイアログに渡す値
const registrationList = ref()

// ドローンポート予約詳細格納用
const dronePortReservationDetail = ref()

// カレンダーに渡すtargetDate
const calendarTargetDate = ref()

// 更新用
isLoading.value = true

// 利用するフィルタ
const router = useRouter()

const myRole = ref()
const ownpageRole = ['1', '2']

interface DronePortName {
  isSelected: boolean
  dronePortName: string
  dronePortId: string
}

onBeforeMount(async () => {
  myRole.value = await getRole(ownpageRole) // ロール
})

// データ取得処理(ドローンポート情報詳細取得API)
const loadingPortData = async (params: any) => {
  const apiResult = await $fetch(`/api/drone/droneport/info/detail/${params}`, { 
    method: 'GET',
    query: { isRequiredPriceInfo: false }
  });

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    return apiResult.data
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    infoListGetFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      dialogMessage.value = `離着陸場情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      dialogMessage.value = `離着陸場情報の取得に失敗しました。(エラー詳細：)`
    }
  }
}

// データ取得処理(ドローンポート予約情報一覧取得API)
const loadingReservationListData = async (params: any) => {
  const apiResult = await $fetch(`/api/drone/droneport/reserve/list`, { 
    method: 'GET',
    query: params
  });

  if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
    return apiResult.data
  }
  else {
    // 取得失敗時処理
    const responseBody = apiResult.data
    infoReservationListGetFailedDialogVisible.value = true
    if (responseBody?.errorDetail) {
      dialogMessage.value = `離着陸場予約情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      dialogMessage.value = `離着陸場予約情報の取得に失敗しました。(エラー詳細：)`
    }
    isLoading.value = false
  }
}

// データ取得処理(ドローンポート予約情報詳細取得API)
const loadingReservationDetailData = async (params: any) => {
  const apiResult = await $fetch(`/api/drone/droneport/reserve/detail/${params}`, { 
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
      dialogMessage.value = `離着陸場予約情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
    }
    else {
      dialogMessage.value = `離着陸場予約情報の取得に失敗しました。(エラー詳細：)`
    }
    isLoading.value = false
  }
}

// date型変換用メソッド
const convertDate = (data: string) => {
  let jstDate = ''
  jstDate = utils.convertUTCtoJST(data) as string
  const targetDate = new Date(jstDate)
  return targetDate
}

// ドローンポート情報詳細取得APIから取得した値をカレンダーに渡す用に変換
const convertDronePortDataList = (droneData: DronePortGetByPkResponse | undefined, timeFrom: string) => {
  const timeList = []
  let newList: any = []
  const status = utils.isBlank(droneData?.scheduledStatus) ? droneData?.activeStatus : droneData?.scheduledStatus
  // メンテナンスの場合
  if (Number(status) === codes.activeStatus.maintenance.value) {
    const dtFrom = $luxon.fromISO(droneData!.inactiveTimeFrom)
    const dtTo = $luxon.fromISO(droneData!.inactiveTimeTo)
    const setDtFrom = dtFrom.set(
      {
        hour: 0,
        minute: 0,
        second: 0,
      })
    const setDtTo = dtTo.set(
      {
        hour: 0,
        minute: 0,
        second: 0,
      })
    const diff = setDtTo.diff(setDtFrom, 'days')
    const diffDays = Math.abs(diff.days) // メンテナンス期間の日数を取得
    const paramDtFrom = $luxon.fromISO(timeFrom)
    const paramDtTo = paramDtFrom.endOf('week')
    const keepDatetime = droneData!.inactiveTimeFrom

    // メンテナンス期間の日数分データを作成
    for (let i = 0; i <= diffDays; i++) {
      if (i === 0) {
        const convertData = {
          // 日時をDate型に変換する
          reservationTimeFrom: convertDate(keepDatetime),
          reservationTimeTo: (i === diffDays) ? convertDate(droneData!.inactiveTimeTo) : convertDate(changeDayEnd(keepDatetime)!),
        }
        timeList.push(convertData)
      }
      else {
        const convertData = {
          // 日時をDate型に変換する
          reservationTimeFrom: convertDate(changeNextDayStart(keepDatetime, i)!),
          reservationTimeTo: (i !== diffDays) ? convertDate(changeDayEnd(changeNextDayStart(keepDatetime, i)!)!) : convertDate(droneData!.inactiveTimeTo),
        }
        timeList.push(convertData)
      }
    }
    // 表示する週のデータに絞る
    const list = timeList.filter(x => x.reservationTimeFrom < convertDate(paramDtTo.toISO()!))
    newList = list.map(x => ({
      id: null,
      reserveTargetId: droneData?.dronePortId,
      reservationTimeFrom: x.reservationTimeFrom,
      reservationTimeTo: x.reservationTimeTo,
      name: droneData?.dronePortName,
      isEdit: false,
      status: 'maintenance',
    }))
  }
  // 使用不可の場合
  else if (Number(status) === codes.activeStatus.notAvailable.value) {
    const dtFrom = $luxon.fromISO(droneData!.inactiveTimeFrom)
    const dtTo = dtFrom.endOf('week')
    const setDtFrom = dtFrom.set(
      {
        hour: 0,
        minute: 0,
        second: 0,
      })
    const setDtTo = dtTo.set(
      {
        hour: 0,
        minute: 0,
        second: 0,
      })
    const diff = setDtTo.diff(setDtFrom, 'days')
    const diffDays = diff.days // 使用不可開始日時から週末までの日数を取得
    const paramDtFrom = $luxon.fromISO(timeFrom)
    const paramDtTo = paramDtFrom.endOf('week')
    const setParamDtTo = paramDtTo.set(
      {
        hour: 0,
        minute: 0,
        second: 0,
      })
    const paramDiff = setParamDtTo.diff(setDtTo, 'days')
    const paramDiffDays = paramDiff.days // カレンダー表示週の開始日から使用不可開始日時の週末までの日数を取得
    // 使用不可開始日時から週末までの日数が0の時
    if (diffDays === 0 && paramDiffDays === 0) {
      const convertData = {
        // 日時をDate型に変換する
        reservationTimeFrom: convertDate(droneData!.inactiveTimeFrom),
        reservationTimeTo: convertDate(changeDayEnd(droneData!.inactiveTimeFrom)!),
      }
      timeList.push(convertData)
    }
    // カレンダー表示週の開始日から使用不可開始日時の週末までの日数が0以上の時(一週間全て使用不可)
    else if (0 < paramDiffDays) {
      const keepDatetime = timeFrom
      for (let i = 0; i < weekDays; i++) {
        if (i === 0) {
          const convertData = {
            // 日時をDate型に変換する
            reservationTimeFrom: convertDate(keepDatetime),
            reservationTimeTo: convertDate(changeDayEnd(keepDatetime)!),
          }
          timeList.push(convertData)
        }
        else {
          const convertData = {
            // 日時をDate型に変換する
            reservationTimeFrom: convertDate(changeNextDayStart(keepDatetime, i)!),
            reservationTimeTo: convertDate(changeDayEnd(changeNextDayStart(keepDatetime, i)!)!),
          }
          timeList.push(convertData)
        }
      }
    }
    else {
      const keepDatetime = droneData!.inactiveTimeFrom
      for (let i = 0; i < diffDays; i++) {
        const convertData = {
          // 日時をDate型に変換する
          reservationTimeFrom: (i === 0) ? convertDate(keepDatetime) : convertDate(changeNextDayStart(keepDatetime, i)!),
          reservationTimeTo: (i === 0) ? convertDate(changeDayEnd(keepDatetime)!) : convertDate(changeDayEnd(changeNextDayStart(keepDatetime, i)!)!),
        }
        timeList.push(convertData)
      }
    }
    newList = timeList.map(x => ({
      id: null,
      reserveTargetId: droneData?.dronePortId,
      reservationTimeFrom: x.reservationTimeFrom,
      reservationTimeTo: x.reservationTimeTo,
      name: droneData?.dronePortName,
      isEdit: false,
      status: 'notAvailable',
    }))
  }
  return newList
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

// 次の日かつ開始時刻を取得
const changeNextDayStart = (dateTime: string, index: number) => {
  const dt = $luxon.fromISO(dateTime)
  const newDt = dt.startOf('day')
  const nextDt = newDt.plus({ days: index })
  return nextDt.toISO()
}

// 予約情報一覧取得APIから取得した値をカレンダーに渡す用に変換
const convertDronePortReservationList = (droneData: DronePortReserveGetListResponseRecord | undefined) => {
  const convertData = {
    data: {
      id: droneData!.dronePortReservationId,
      reserveTargetId: droneData!.dronePortId,
      // 日時をDate型に変換する
      reservationTimeFrom: convertDate(droneData!.reservationTimeFrom),
      reservationTimeTo: convertDate(droneData!.reservationTimeTo),
      name: findPortNameById(droneData!.dronePortId),
      isEdit: true,
      status: 'available',
    },
  }
  return convertData
}

// 予約情報一覧取得APIから取得した値をカレンダーに渡す用に変換
const convertDronePortReservationListIsEditFalse = (droneData: DronePortReserveGetListResponseRecord | undefined) => {
  const convertData = {
    data: {
      id: droneData!.dronePortReservationId,
      reserveTargetId: droneData!.dronePortId,
      // 日時をDate型に変換する
      reservationTimeFrom: convertDate(droneData!.reservationTimeFrom),
      reservationTimeTo: convertDate(droneData!.reservationTimeTo),
      name: findPortNameById(droneData!.dronePortId),
      isEdit: false,
      status: 'available',
    },
  }
  return convertData
}

// ドローンポートIDからドローンポート名を検索する
const findPortNameById = (dronePortId: string) => {
  const result = dronePortsNameList.value.find((r: { dronePortId: string }) => r.dronePortId === dronePortId)
  return result?.dronePortName
}

// 登録・更新・削除後処理
// 最新データを取得し、カレンダーに反映する
const afterUpdate = () => {
  if (isChangeWeeked.value) {
    // カレンダーの日付切り替えをしている場合
    changeListAfterUpdate(calendarDays.value)
  }
  else {
    calendarDays.value = { fromTime: convertedStartDayTemp.value, toTime: convertedEndDayTemp.value }
    changeListAfterUpdate(calendarDays.value)
  }
}

// カレンダー日付切り替え時処理
const changeList = async (days: { fromTime: string, toTime: string }) => {
  const dt = $luxon.fromISO(days.toTime)
  const newDt = dt.plus({ days: 1 })
  const toTime = newDt.toISO()
  days.fromTime = utils.convertJSTtoUTC(days.fromTime)!
  days.toTime = utils.convertJSTtoUTC(toTime!)!
  // 変換した日時を保持しておく
  calendarDays.value = { fromTime: days.fromTime, toTime: days.toTime }
  isChangeWeeked.value = true

  // 配列を空にする
  dronePortsReservationList.value = []
  calendarList.value = []

  isLoading.value = true

  let dronePortId

  for (dronePortId of dronePortsIdList.value) {
    // APIに渡すパラメータを設定
    // ドローンポートID・カレンダーから渡される開始日時・終了日時
    const params = { drone_port_id: dronePortId, time_from: days.fromTime, time_to: days.toTime }
    // 予約情報取得
    const result = await loadingReservationListData(params)
    const dronePortsReservationListTemp = result?.data.filter(x => x.reservationActiveFlag === true)
    dronePortsReservationListTemp?.map((element: any) => {
      if (utils.isNullUndefined(paramDronePortReservationId) || element.dronePortReservationId === paramDronePortReservationId) {
        calendarListTemp.value = convertDronePortReservationList(element)
        dronePortsReservationList.value.push(element)
      }
      else {
        calendarListTemp.value = convertDronePortReservationListIsEditFalse(element)
        dronePortsReservationList.value.push(element)
      }
      const dividedReservation = divideReservation(calendarListTemp)

      if (!utils.isNullUndefinedEmptyArray(dividedReservation)) {
        dividedReservation.map(element => (
          calendarList.value.push(element)
        ))
      }
      else {
        calendarList.value.push(calendarListTemp.value.data)
      }
    })
    // 詳細情報取得
    const dronePortDataTemp = await loadingPortData(dronePortId)
    detailData.value = {
      dronePortId: dronePortDataTemp?.dronePortId,
      activeStatus: utils.isBlank(dronePortDataTemp?.scheduledStatus) ? dronePortDataTemp?.activeStatus : dronePortDataTemp?.scheduledStatus,
      inactiveTimeFrom: dronePortDataTemp?.inactiveTimeFrom,
      inactiveTimeTo: dronePortDataTemp?.inactiveTimeTo }
    calendarList.value = calendarList.value.concat(convertDronePortDataList(dronePortDataTemp, params.time_from))
  }
  isLoading.value = false
}

// カレンダー日付を変更せずに登録・更新・削除を行った後に実施される
const changeListAfterUpdate = async (days: { fromTime: any, toTime: any }) => {
  // 配列を空にする
  dronePortsReservationList.value = []
  calendarList.value = []

  isLoading.value = true

  let dronePortId

  for (dronePortId of dronePortsIdList.value) {
    // APIに渡すパラメータを設定
    // ドローンポートID・画面に表示されている開始日時・終了日時
    const params = { drone_port_id: dronePortId, time_from: days.fromTime, time_to: days.toTime }
    // 予約情報取得
    const result = await loadingReservationListData(params)
    const dronePortsReservationListTemp = result?.data.filter(x => x.reservationActiveFlag === true)
    dronePortsReservationListTemp?.map((element: any) => {
      if (utils.isNullUndefined(paramDronePortReservationId) || element.dronePortReservationId === paramDronePortReservationId) {
        calendarListTemp.value = convertDronePortReservationList(element)
        dronePortsReservationList.value.push(element)
      }
      else {
        calendarListTemp.value = convertDronePortReservationListIsEditFalse(element)
        dronePortsReservationList.value.push(element)
      }
      const dividedReservation = divideReservation(calendarListTemp)

      if (!utils.isNullUndefinedEmptyArray(dividedReservation)) {
        dividedReservation.map(element => (
          calendarList.value.push(element)
        ))
      }
      else {
        calendarList.value.push(calendarListTemp.value.data)
      }
    })
    // 詳細情報取得
    const dronePortDataTemp = await loadingPortData(dronePortId)
    detailData.value = {
      dronePortId: dronePortDataTemp?.dronePortId,
      activeStatus: utils.isBlank(dronePortDataTemp?.scheduledStatus) ? dronePortDataTemp?.activeStatus : dronePortDataTemp?.scheduledStatus,
      inactiveTimeFrom: dronePortDataTemp?.inactiveTimeFrom,
      inactiveTimeTo: dronePortDataTemp?.inactiveTimeTo }
    calendarList.value = calendarList.value.concat(convertDronePortDataList(dronePortDataTemp, params.time_from))
  }
  isLoading.value = false
}

// 日をまたぐ予約を分割する
const divideReservation = (calendarListTemp: any) => {
  // 分割した予約を保持する
  const dividedReservation = []
  // 予約開始日時
  const reservationStartDay = calendarListTemp.value.data.reservationTimeFrom.toISOString()
  // 予約終了日時
  const reservationEndDay = calendarListTemp.value.data.reservationTimeTo.toISOString()

  // 予約開始日時 00:00
  const startOfReservationStartDay = changeDayStart(calendarListTemp.value.data.reservationTimeFrom.toISOString())
  // 予約終了日時 00:00
  const startOfReservationEndDay = changeDayStart(calendarListTemp.value.data.reservationTimeTo.toISOString())

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
        dividedReservation.push({ id: calendarListTemp.value.data.id,
          reserveTargetId: calendarListTemp.value.data.reserveTargetId,
          reservationTimeFrom: new Date(endTemp!),
          reservationTimeTo: new Date(reservationEndDay),
          name: calendarListTemp.value.data.name,
          isEdit: calendarListTemp.value.data.isEdit,
          status: calendarListTemp.value.data.status })
      }
      else if (i === 0) {
        // １回目の分割時
        endDtTemp = dtStart.plus({ days: 1 })
        endTemp = endDtTemp.toISO()
        date = new Date(endTemp!)
        dateBefore1minutes = date.setMinutes(date.getMinutes() - 1)

        dividedReservation.push({ id: calendarListTemp.value.data.id,
          reserveTargetId: calendarListTemp.value.data.reserveTargetId,
          reservationTimeFrom: new Date(reservationStartDay),
          reservationTimeTo: new Date(dateBefore1minutes!), // 見かけ上00:00を23:59にする
          name: calendarListTemp.value.data.name,
          isEdit: calendarListTemp.value.data.isEdit,
          status: calendarListTemp.value.data.status })
      }
      else {
        // 初回と最後を除く分割時
        startTemp = endTemp
        startDtTemp = $luxon.fromISO(startTemp!)
        endDtTemp = startDtTemp.plus({ days: 1 })
        endTemp = endDtTemp.toISO()
        date = new Date(endTemp!)
        dateBefore1minutes = date.setMinutes(date.getMinutes() - 1)

        dividedReservation.push({ id: calendarListTemp.value.data.id,
          reserveTargetId: calendarListTemp.value.data.reserveTargetId,
          reservationTimeFrom: new Date(startTemp!),
          reservationTimeTo: new Date(dateBefore1minutes!), // 見かけ上00:00を23:59にする
          name: calendarListTemp.value.data.name,
          isEdit: calendarListTemp.value.data.isEdit,
          status: calendarListTemp.value.data.status })
      }
    }
  }

  return dividedReservation
}

// カレンダー時間スロット押下時処理
const onregistReserve = async (data: { fromTime: string, toTime: string, targetId: string }) => {
  registrationData.value = data
  registrationData.value.reserveId = paramDronePortReservationId
  isUpdate.value = false
  calendarDialogVisible.value = true
  isClickEmptySlot.value = true
}

// カレンダーイベントスロット押下時処理
const onupdateReserve = async (data: { fromTime: string, toTime: string, reserveTargetId: string, reserveId: string }) => {
  registrationList.value = data
  // 詳細取得APIで値を取得する
  isLoading.value = true
  dronePortReservationDetail.value = await loadingReservationDetailData(data.reserveId)
  isLoading.value = false
  registrationList.value.fromTime = dronePortReservationDetail.value.reservationTimeFrom ? utils.convertUTCtoJST(dronePortReservationDetail.value.reservationTimeFrom) : data.fromTime
  registrationList.value.toTime = dronePortReservationDetail.value.reservationTimeTo ? utils.convertUTCtoJST(dronePortReservationDetail.value.reservationTimeTo) : data.toTime
  updateData.value = registrationList.value
  isUpdate.value = true
  calendarDialogVisible.value = true
  isClickEmptySlot.value = false
}

// 初期表示時処理
onMounted(async () => {
  // 予約一覧画面から遷移した場合
  if (!utils.isNullUndefined(paramDronePortReservationId)) {
    // パラメータを設定する
    const params = paramDronePortReservationId
    // 詳細取得APIで値を取得する
    dronePortReservationDetail.value = await loadingReservationDetailData(params)
    console.log(dronePortReservationDetail.value)
    // カレンダーに渡すtargetDateを格納
    calendarTargetDate.value = convertDate(dronePortReservationDetail.value.reservationTimeFrom)

    const dt = $luxon.fromISO(utils.convertUTCtoJST(dronePortReservationDetail.value.reservationTimeFrom)!)
    const monday = dt.set({ weekday: 1 })
    const sunday = dt.set({ weekday: 7 })
    const theNextDayOfSunday = sunday.plus({ day: 1 })
    const mondayObject = $luxon.fromObject({ year: monday.year, month: monday.month, day: monday.day, hour: 0, minute: 0 })
    const sundayObject = $luxon.fromObject({ year: theNextDayOfSunday.year, month: theNextDayOfSunday.month, day: theNextDayOfSunday.day, hour: 0, minute: 0 })
    const isoMonday = mondayObject.toISO()
    const isoSunday = sundayObject.toISO()
    const convertedStartDay = utils.convertJSTtoUTC(isoMonday!)
    const convertedEndDay = utils.convertJSTtoUTC(isoSunday!)

    // 選択したポートの予約情報を基に、開始日時と終了日時を設定

    convertedStartDayTemp.value = convertedStartDay
    convertedEndDayTemp.value = convertedEndDay

    // 予約リスト用の配列に追加する
    dronePortsNameList.value.push({ isSelected: true, dronePortName: dronePortReservationDetail.value.dronePortName, dronePortId: dronePortReservationDetail.value.dronePortId })
    // IDリストにドローンポートIDを追加する
    dronePortsIdList.value.push(dronePortReservationDetail.value.dronePortId)

    let dronePortId

    // 予約情報一覧を取得する
    for (dronePortId of dronePortsIdList.value) {
    // APIに渡すパラメータを設定
      const params = { drone_port_id: dronePortId, time_from: convertedStartDay, time_to: convertedEndDay }
      const result = await loadingReservationListData(params)
      const dronePortsReservationListTemp = result?.data.filter(x => x.reservationActiveFlag === true)
      // 予約一覧で選択したドローンポート予約idの場合isEditをtrueにする
      // それ以外の予約はisEditをfalseにする
      dronePortsReservationListTemp?.map((elem: DronePortReserveGetListResponseRecord) => {
        if (utils.isNullUndefined(paramDronePortReservationId) || elem.dronePortReservationId === paramDronePortReservationId) {
          calendarListTemp.value = convertDronePortReservationList(elem)
          dronePortsReservationList.value.push(elem)
        }
        else {
          calendarListTemp.value = convertDronePortReservationListIsEditFalse(elem)
          dronePortsReservationList.value.push(elem)
        }
        const dividedReservation = divideReservation(calendarListTemp)

        if (!utils.isNullUndefinedEmptyArray(dividedReservation)) {
          dividedReservation.map(element => (
            calendarList.value.push(element)
          ))
        }
        else {
          calendarList.value.push(calendarListTemp.value.data)
        }
      })
      // 詳細情報取得
      const dronePortDataTemp = await loadingPortData(dronePortId)
      detailData.value = {
        dronePortId: dronePortDataTemp?.dronePortId,
        activeStatus: utils.isBlank(dronePortDataTemp?.scheduledStatus) ? dronePortDataTemp?.activeStatus : dronePortDataTemp?.scheduledStatus,
        inactiveTimeFrom: dronePortDataTemp?.inactiveTimeFrom,
        inactiveTimeTo: dronePortDataTemp?.inactiveTimeTo }
      calendarList.value = calendarList.value.concat(convertDronePortDataList(dronePortDataTemp, params.time_from!))
    }
    // 完了後プロパティをFalseに設定
    isLoading.value = false
  }
  else {
    router.back()
  }
})
</script>

<template>
  <div
    class="page-content"
  >
    <div class="b-pageContentHasSubMenu">
      <!-- メインコンテンツ -->
      <div class="b-pageContentHasNavigation">
        <div class="drn_main__app">
          <div class="drn_header">
            <div class="drn_header__item">
              <v-card-title class="drn_header__title">
                離着陸場予約
              </v-card-title>
            </div>
          </div>
          <div class="content-body px-2">
            <v-container fluid>
              <v-row>
                <v-col
                  id="reservationList"
                  cols="3"
                >
                  <div class="border-md">
                    <v-data-table
                      :hide-default-header="true"
                      :hide-default-footer="true"
                      :items="dronePortsNameList"
                      no-data-text="ポート未選択"
                      items-per-page="-1"
                    >
                      <template #[`item.isSelected`]="{ item }">
                        <v-checkbox-btn
                          :id="item.dronePortId"
                          class="forcibly-layout-fix-class"
                          :model-value="item.isSelected"
                          :disabled="true"
                        />
                      </template>
                      <template #[`item.dronePortId`]>
                        <div class="portId" />
                      </template>
                    </v-data-table>
                  </div>
                </v-col>
                <v-col>
                  <v-row>
                    <ReservationCalendar
                      :events-list="calendarList"
                      :disp-list="dronePortsIdList"
                      :target-date="calendarTargetDate"
                      class="calendar"
                      @change-week="changeList"
                      @regist-reserve="onregistReserve"
                      @update-reserve="onupdateReserve"
                    />
                  </v-row>
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
          <calendarDialog
            v-model:dialog-visible="calendarDialogVisible"
            :registration-data="registrationData"
            :update-data="updateData"
            :registration-list-data="dronePortsReservationList"
            :port-name-list="dronePortsNameList"
            :is-update="isUpdate"
            :is-click-empty-slot="isClickEmptySlot"
            :detail-data="detailData"
            @complete="afterUpdate"
          />
          <!-- ドローンポート情報詳細取得失敗モーダルダイアログ -->
          <CommonDialog
            v-model:dialog-visible="infoListGetFailedDialogVisible"
            title="離着陸場情報詳細取得 失敗"
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
                  @click="infoListGetFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- ドローンポート予約情報一覧取得失敗モーダルダイアログ -->
          <CommonDialog
            v-model:dialog-visible="infoReservationListGetFailedDialogVisible"
            title="離着陸場予約情報一覧取得 失敗"
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
                  @click="infoReservationListGetFailedDialogVisible = false"
                />
              </v-row>
            </template>
          </CommonDialog>
          <!-- ドローンポート予約情報詳細取得失敗モーダルダイアログ -->
          <CommonDialog
            v-model:dialog-visible="infoDetailGetFailedDialogVisible"
            title="離着陸場予約情報詳細取得 失敗"
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
                  @click="infoDetailGetFailedDialogVisible = false"
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
/*
.v-data-table :deep(td) {
  display: flex;
  align-items: center;
}
*/
.portId{
  max-width: 0px;
  min-width: 0px;
}
.calendar{
  max-height: 81vh;
  overflow-y: scroll;
  width: 100%;
}
.page-content{
  overflow: hidden;
}
.button-padding{
  padding-top: 4px;
}
#reservationList {
  flex: 0 0 25%;
  max-width: 25%;
  overflow-y: auto;
  max-height: 75.25vh;
}

/** レイアウト合わせ・・・ */
.v-data-table :deep(:not(.forcibly-layout-fix-class *)) {
  all: revert;
}
:global(.v-selection-control__input > .v-icon) {
  opacity: var(--v-medium-emphasis-opacity) !important;
}
</style>

<style>
/** レイアウト合わせ・・・ */
input:disabled {
  cursor: default !important;
}
.v-selection-control__input:hover::before {
  opacity: 0;
}
</style>
