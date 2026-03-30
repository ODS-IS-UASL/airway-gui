<script setup>
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 運航事業者向けサイドバー
import GlobalNavigation from "~/components/navigation/globalNavigation.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "../components/navigation/pageNavigation.vue"
import airwaySetting from "../components/airwayReservation/airwaySetting.vue"
import datetimeSetting from "../components/airwayReservation/datetimeSetting.vue"
import confirmation from "../components/airwayReservation/confirmation.vue"
import { roleVerification } from '~/composables/useRole.js'
import { ref } from "vue"
import { useRouter } from 'vue-router';
import LoadingDialog from '~/components/dialogs/LoadingSpiner.vue'

const step = ref(0)
const stepTitle = ref('航路予約')
const nextButton = ref('日時選択')
const isDialogVisible = ref(false)
const isPendingDialogVisible = ref(false)

const aircraftId = ref('')
const aircraftRemoteId = ref('')
const airwayId = ref('')
const purpose = ref([])
const pathSets = ref([])
const type = ref('')
const aircraftInfo = ref('')
const aircraftInfoId = ref('')
const airwayName = ref('')
const junctionList = ref([])
const section = ref('')
const departurePort = ref('')
const arrivalPort = ref('')
const departurePortId = ref('')
const arrivalPortId = ref('')
const departurePortDegrees = ref('')
const arrivalPortDegrees = ref('')
const datetime = ref('')
const departureDatetime = ref('')
const arrivalDatetime = ref('')
const departure = ref('')
const arrival = ref('')
const postJsonData = ref('')
const postConformityAssessmentJsonData = ref('');
const postLinkageJsonData = ref('')
const cookie_role = ref(null)
const role = ref(null)
const requestId = ref('')
const reservationOk = ref(true)
const datetimeSettingKey = ref(0)
const confirmationKey = ref(0)
const isEndIdFirst = ref(false)
const isPortNeeded = ref(true)
const isAircraftNeeded = ref(true)
const isAircraftBringIn = ref(false)
const departureAirwayId = ref('---')
const arrivalAirwayId = ref('---')
const departureAirwayName = ref('---')
const arrivalAirwayName = ref('---')
const totalAmount = ref(0)
const sectionIds  = ref('')
const rangeData = {
  aircraftId,
  aircraftRemoteId,
  airwayId,
  purpose,
  type,
  aircraftInfo,
  aircraftInfoId,
  airwayName,
  junctionList,
  section,
  departurePort,
  arrivalPort,
  departurePortId,
  arrivalPortId,
  departurePortDegrees,
  arrivalPortDegrees,
  datetime,
  departureDatetime,
  departure,
  arrivalDatetime,
  arrival,
  postJsonData,
  isEndIdFirst,
  isPortNeeded,
  isAircraftNeeded,
  isAircraftBringIn,
  departureAirwayId,
  arrivalAirwayId,
  departureAirwayName,
  arrivalAirwayName,
  sectionIds,
};
const router = useRouter();
const isProcessing = ref(false);
const isLoading = useState('isLoading')// スピナー表示状態
// ローディング解除
isLoading.value = false;

const rolecheck = async () => {
  // ロールチェック
  const ownpage_role = ["2"];
  cookie_role.value = await roleVerification(ownpage_role);
  if (Object.keys(cookie_role).length == 0) {
    console.error(`airwayReservation get role error.`);
    return;
  }
  switch (cookie_role.value.virtual_role) {
    case "2":
      role.value = 2;  // 運航事業者
      break;
    default:
      role.value = null;
      break;
  }
  console.log(`virtual_role: ${cookie_role.value.virtual_role}, role: ${role.value}`);
}
if (process.client) {
  console.log(`process.client: ${process.client}`);
  rolecheck();
}

const handleAirwayDataUpdate = (airway) => {
  aircraftId.value = airway.aircraftId
  aircraftRemoteId.value = airway.aircraftRemoteId ?? ''
  airwayId.value = airway.airwayId
  purpose.value = airway.purpose
  pathSets.value = airway.pathSets ?? []
  type.value = airway.type
  aircraftInfo.value = airway.aircraftInfo
  aircraftInfoId.value = airway.aircraftInfoId
  airwayName.value = airway.airwayName
  section.value = airway.section
  departurePort.value = airway.departurePort
  arrivalPort.value = airway.arrivalPort
  departurePortId.value = airway.departurePortId
  arrivalPortId.value = airway.arrivalPortId
  junctionList.value = airway.junctionList
  departurePortDegrees.value = airway.departurePortDegrees
  arrivalPortDegrees.value = airway.arrivalPortDegrees
  isEndIdFirst.value = airway.isEndIdFirst
  isPortNeeded.value = airway.isPortNeeded ?? true
  isAircraftNeeded.value = airway.isAircraftNeeded ?? true
  isAircraftBringIn.value = airway.isAircraftBringIn ?? false
  departureAirwayId.value = airway.departureAirwayId ?? airway.airwayId ?? '---'
  arrivalAirwayId.value = airway.arrivalAirwayId ?? '---'
  departureAirwayName.value = airway.departureAirwayName ?? airway.airwayName ?? '---'
  arrivalAirwayName.value = airway.arrivalAirwayName ?? '---'
  sectionIds.value = airway.sectionIds
}

const handleDatetimeUpdate = (departureDate, departureTime, arrivalDate, arrivalTime) => {
  datetime.value = departureDate
  departureDatetime.value = departureDate
  departure.value = departureTime
  arrivalDatetime.value = arrivalDate
  arrival.value = arrivalTime
}

const handlePostJsonDataUpdate = (jsonData) => {
  postJsonData.value = jsonData;
  
  postConformityAssessmentJsonData.value = postJsonData.value.uaslSections.map(section => ({
    "airwaySectionId": section.uaslSectionId,
    "startAt": section.startAt,
    "endAt": section.endAt,
    "aircraftInfo": aircraftInfo.value,
  }));
  postLinkageJsonData.value = {
    "airwayReservationId": '',
      "uasId": {
      "registrationId": aircraftId.value,
      },
    "aircraftInfoId": aircraftInfoId.value,
  };
}

const handleRequestIdUpdate = (pendingId, amount) => {
  requestId.value = pendingId;
  isPendingDialogVisible.value = !pendingId;
  totalAmount.value = amount;
  // ローディング終了（成功・失敗問わず常に実行）
  isLoading.value = false;
  console.log(`予約仮押さえローディング終了:${isLoading.value}`);
  if(!isPendingDialogVisible.value) {
    // 予約申請ボタン無効化解除（仮押さえ成功時のみ）
    isProcessing.value = false;
    console.log(`予約申請ボタン無効化解除:${isProcessing.value}`);
  }
}

const airwayData = ref({})

const navigate = async (next) => {   // ← async にする
  const stepNo = ref(next ? step.value + 1 : step.value - 1)
  const errorMessage = ref('')

  const hasValidSections = () => {
    if (!section.value || typeof section.value !== 'string') return false
    const parts = section.value.split(',')
    return parts.every(s => s && s !== '---')
  }

  const isInvalid = (value) => {
    if (value == null) return true
    if (typeof value === 'string') return value.trim() === '' || value === '---'
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }

  const checkConditions = async (stepToCheck) => {
    switch (stepToCheck) {
      case 0:
        return true

      case 1: {
        try {
          const uaslRes = await $fetch('/api/airway/uasl', { 
            method: 'GET',
            query: { all: true }
          });
          if (uaslRes.status !== 200) {
            console.error(`error: get uasl info {status: ${uaslRes.status}}.`)
            airwayData.value = {}
            return false
          }

          const uaslResData = utils.convertUaslToAirway(uaslRes.data)
          airwayData.value = useAirwayConvertConnectionOrder(uaslResData)

        } catch (e) {
          console.error(e)
          airwayData.value = {}
          return false
        }

        let invalid = false
        let invalidAirwaySelection  = false

        // 常時必須
        if (isInvalid(airwayId.value)) invalid = true
        if (!hasValidSections()) invalid = true
        // 全セットで飛行目的が選択済みか確認
        if (pathSets.value.length === 0 || pathSets.value.some(s => !s?.purpose || s.purpose === '---')) invalid = true
        
        if (!invalid) {
          // airwayData.value.airway.airways[].airwayId を全部取り出す
          const availableAirwayIds = (airwayData.value?.airway?.airways ?? [])
            .map(a => a?.airwayId)
            .filter(Boolean)
            
            // airwayId.value(配列) のどれか1つでも availableAirwayIds に含まれていればOK
            const selectedIds = Array.isArray(airwayId.value) ? airwayId.value : [airwayId.value]
          const found = selectedIds.some(id => availableAirwayIds.includes(id))
          
          if (!found) invalidAirwaySelection = true
        }
        
        // 離着陸場（必要時のみ）
        if (isPortNeeded.value) {
          if (isInvalid(departurePort.value) || isInvalid(arrivalPort.value)) invalid = true
          if (isInvalid(departurePortId.value) || isInvalid(arrivalPortId.value)) invalid = true
        }

        // aircraftInfoId は持ち込みでも必須（＝ maker/model 選択必須）
        if (isInvalid(aircraftInfoId.value) || isInvalid(aircraftInfo.value)) invalid = true;
        
        if (!isAircraftBringIn.value) {
          // 登録機体：vehicleId必須
          if (isInvalid(aircraftId.value)) invalid = true;
        } else {
          // 持ち込み：vehicleId不要、registrationId(=リモートID)も任意なのでチェックしない
        }

        if (invalid) {
          errorMessage.value = 'すべての項目を入力してください。'
          return false
        }
        if (invalidAirwaySelection) {
          errorMessage.value = '自社航路を含めてください。'
          return false
        }
        return true
      }

      case 2:
        if (isInvalid(datetime.value) ||
            isInvalid(departureDatetime.value) ||
            isInvalid(departure.value) ||
            isInvalid(arrivalDatetime.value) ||
            isInvalid(arrival.value)) {
          errorMessage.value = '日時を選択してください。'
          return false
        }
        return true

      default:
        return true
    }
  }

  // ← ここも await する
  if (!await checkConditions(stepNo.value)) {
    alert(errorMessage.value)
    return
  }


  switch (stepNo.value) {
    case -1:
      console.log(stepNo.value)
      router.push('/airwayReservation');
      return
    case 0:
      nextButton.value = '日時選択'
      stepTitle.value = '航路予約'
      break
    case 1:
      nextButton.value = '予約確認'
      stepTitle.value = '航路予約'
      if (next) {
        datetime.value = ''
        departure.value = ''
        arrival.value = ''
        datetimeSettingKey.value = datetimeSettingKey.value + 1
      }
      break
    case 2:
      nextButton.value = '予約申請'
      stepTitle.value = '航路予約'
      if (next) confirmationKey.value = confirmationKey.value + 1
      showConfirm()
      break
    case 3:
      showModal()
      return
    default:
      return
  }
  step.value = stepNo.value
}
const showConfirm = async () => {
  // 確認画面初期表示
  try {
    // 予約申請ボタン無効化
    isProcessing.value = true;
    console.log(`予約申請ボタン無効化:${isProcessing.value}`);
    // ローディング開始
    isLoading.value = true;
    console.log(`予約仮押さえローディング開始:${isLoading.value}`);
  } catch (error) {
    console.error(error);
    reservationOk.value = false;
  } // end of 確認画面初期表示
}
const showModal = async () => {

  // 予約正常系
  try {
    // 予約申請ボタン無効化
    isProcessing.value = true;
    console.log(`予約申請ボタン無効化:${isProcessing.value}`);
    // ローディング開始
    isLoading.value = true;
    console.log(`予約申請ローディング開始:${isLoading.value}`);

    // 4. 航路予約（画定）
    const reservationConfirmRes = await $fetch(`/api/reservation/uaslReservations/${requestId.value}/confirm`, { 
      method: 'PUT',
      body: {}
    });
    if (reservationConfirmRes.status !== 200) {
      throw new Error(`4. failed to post airway confirmReservation info, status: ${reservationConfirmRes.status}`);
    }
    requestId.value = reservationConfirmRes.data.requestId;
    console.log("4. airway confirmReservation OK");
  } catch (error) {
    console.error(error);
    reservationOk.value = false;
  } // end of 予約正常系

  // 予約申請ボタン無効化解除
  isProcessing.value = false;
  console.log(`予約申請ボタン無効化解除:${isProcessing.value}`);
  // ローディング終了
  isLoading.value = false;
  console.log(`予約申請ローディング終了:${isLoading.value}`);
  // ここまで来たら、ダイアログを表示
  isDialogVisible.value = true;
};


</script>

<template>
    <ClientOnly>
      <!-- 読み込み中表示スピナー -->
      <LoadingDialog v-model:dialog-visible="isLoading" />
    </ClientOnly>
    <!-- グローバルナビゲーション -->
    <GlobalNavigationRM v-if = "role == 1"/>
    <GlobalNavigation v-if = "role == 2" />
    <GlobalNavigationSH v-if = "role == 3" />

    <!-- コンテンツ -->
    <main id="main" class="b-pageMain">
      <div class="b-pageContentHasSubMenu">

        <!-- メインコンテンツ -->
        <div class="b-pageContentHasNavigation">

          <v-stepper v-model="step">
            <v-stepper-header>

              <div class="drn_header">
                <div class="drn_header__item">
                  <v-card-title class="drn_header__title">{{ stepTitle }}</v-card-title>
                </div>
              </div>

              <v-stepper-item
              :complete="step > 0"
              title="航路選択"
              value="1"
              ></v-stepper-item>
              <v-divider></v-divider>

              <v-stepper-item
              :complete="step > 1"
              title="日時選択"
              value="2"
              ></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
              :complete="step > 2"
              title="予約内容確認"
              value="3"
              ></v-stepper-item>

              <div class="drn_stepper_header__space"> </div> <!-- spacer -->
            </v-stepper-header>

            <v-stepper-window>
              <v-stepper-window-item
              value="1"
              >
                <airwaySetting :stepNo="1" @update:airway="handleAirwayDataUpdate"/>
              </v-stepper-window-item>
              <v-stepper-window-item
              value="2"
              >
                <datetimeSetting :key="datetimeSettingKey" :rangeData="rangeData" @update:datetime="handleDatetimeUpdate"/>
              </v-stepper-window-item>
              <v-stepper-window-item
              value="3"
              >
                <confirmation :stepNo="3" :key="confirmationKey" :rangeData="rangeData" :roleData="cookie_role" @update:postJsonData="handlePostJsonDataUpdate" @update:requestId="handleRequestIdUpdate"/>
              </v-stepper-window-item>
            </v-stepper-window>
          </v-stepper>
        </div>
        <!-- ページナビゲーション -->
        <PageNavigation :back="false">
          <ul class="e-buttonGroup">
            <li>
              <button @click="navigate(true)" class="e-button" :disabled="isProcessing">{{ nextButton }}</button>
            </li>
          </ul>
          <ul  class="e-buttonGroup">
            <li>
              <button class="e-button-back" @click="navigate(false)">戻る</button>
            </li>
          </ul>
        </PageNavigation> 
        <!-- オーバーレイ -->
        <div v-if="isDialogVisible || isPendingDialogVisible" class="overlay"></div>
        <!-- ダイアログ -->
        <dialog class="c-dialog" v-if="isDialogVisible || isPendingDialogVisible">
          <!-- 航路予約に成功した場合 -->
          <h2 class="e-dialogTitle" v-if="reservationOk && isDialogVisible">航路予約完了</h2>
          <p v-if="reservationOk && isDialogVisible">航路予約を完了しました</p>
          <table class="drn_table drn_table--reserve_conf" v-if="reservationOk && isDialogVisible">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">予約番号：</th>
                <td class="drn_table__data">{{ requestId }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路：</th>
                <td class="drn_table__data">{{ airwayName.join(',') }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路発着日時：</th>
                <td class="drn_table__data">
                  <time>{{ departureDatetime }}</time>&nbsp;
                  <time>{{ departure }}</time>
                  <span class="e-waveLine">から</span>
                  <time>{{ arrivalDatetime }}</time>&nbsp;
                  <time>{{ arrival }}</time>
                </td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">料金</th>
                <td class="drn_table__data">{{ totalAmount }} 円</td>
              </tr>
            </tbody>
          </table>
          <!-- 航路予約に失敗した場合 -->
          <h2 class="e-dialogTitle" v-if="!reservationOk && isDialogVisible">航路予約失敗</h2>
          <p v-if="!reservationOk && isDialogVisible">航路予約に失敗しました。<br>しばらく時間をあけて再度実行をお願いします。</p>
          <!-- 航路予約仮押さえに失敗した場合 -->
          <h2 class="e-dialogTitle" v-if="isPendingDialogVisible">航路予約仮押さえ失敗</h2>
          <p v-if="isPendingDialogVisible">航路予約の仮押さえに失敗しました。<br>しばらく時間をあけて再度実行をお願いします。</p>
          <!-- 航路予約の成否に関わらず共通 -->
          <ul class="e-buttonGroup">
            <li v-if="reservationOk && isDialogVisible">
              <a href="/airwayReservation/newReservation" class="e-button-noright">続けて航路予約</a>
            </li>
            <li>
              <a href="/airwayReservation" class="e-button-noright">航路予約一覧</a>
            </li>
          </ul>
        </dialog>
      </div>
    </main>
</template>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* 黒で透過 */
  z-index: 999; /* ダイアログの下に表示 */
}

.c-dialog {
  z-index: 1000; /* オーバーレイの上に表示 */
  position: fixed;
  height: 60%;
  min-height: 8rem;
  width: 80%;
}

/* Vuetify ステッパーの余白・影を除去して表示領域を最大化 */
:deep(.v-stepper.v-sheet) {
  box-shadow: none !important;
}

:deep(.v-stepper-window) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

:deep(.v-stepper-window-item) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
