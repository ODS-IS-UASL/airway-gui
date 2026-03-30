<script setup>
// 航路管理者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "../components/navigation/pageNavigation.vue"
import basicInformationSettingAddAirway from "../components/airway/basicInformationSettingAddAirway.vue"
import junctionSettingAddAirway from "../components/airway/junctionSettingAddAirway.vue"
import junctionNameSetting from "../components/airway/junctionNameSettingAddAirway.vue"
import confirmation from "../components/airway/confirmationAddAirway.vue"
import { ref } from "vue"
import { useRouter } from 'vue-router';
import LoadingDialog from '~/components/dialogs/LoadingSpiner.vue'

const step = ref(0)
const stepTitle = ref('乗り入れ航路画定')
const nextButton = ref('高度・幅設定')
const isDialogVisible = ref(false)
// 高度・幅設定画面でのみ使用。それ以外の画面では ture にしておく。
const isJunctionSetting = ref(true)

const purpose = ref('')
const routeName = ref('')
const airwayId = ref('')
const fallToleranceRange = ref('')
const fallToleranceRangeId = ref('')
const corridorData = ref('')
const postJsonData = ref('')
const cookie_role = ref(null)
const role = ref(null)
const junctionSettingKey = ref(0)
const junctionNameSettingKey = ref(0)
const confirmationKey = ref(0)
const conflictAirwaySection = ref('')
const conflictErrorCode = ref('')      // E0001 / E0002 / E0003
const errorSectionIndex = ref(-1)      // マップのエラー強調用
const contactCoordinates = ref(null)   // E0002の接触座標
const createdAt = ref('')
const STATUS = {
  OK: 'OK',
  NG: 'NG',
  CONFLICT: 'CONFLICT'
};
const createStatus = ref(STATUS.OK)
const sourceUaslId = ref('')
const targetUaslId = ref('')
const aircrafts = ref([])       // 複数機体（JSON文字列）の配列
const selectedModels = ref([])  // 表示用のモデル名配列

const rangeData = {
  purpose,
  routeName,
  fallToleranceRange,
  fallToleranceRangeId,
  aircrafts,
  selectedModels,
  corridorData,
  sourceUaslId,
  targetUaslId,
};

const router = useRouter();

const isProcessing = ref(false);
const isLoading = useState('isLoading')// スピナー表示状態
// ローディング解除
isLoading.value = false;

const rolecheck = async () => {
  // ロールチェック
  const ownpage_role = ["1"];
  cookie_role.value = await roleVerification(ownpage_role);
  if (Object.keys(cookie_role).length == 0) {
    console.log(`airwayReservation get role error.`);
    return;
  }
  switch (cookie_role.value.virtual_role) {
    case "1":
      role.value = 1;  // 航路運営者
      break;
    default:
      role.value = null;
      break;
  }
}
if (process.client) {
  rolecheck();
}

const handleBasicInfomationUpdate = (basicInfomation) => {
  purpose.value = basicInfomation.purpose
  routeName.value = basicInfomation.routeName
  fallToleranceRange.value = basicInfomation.fallToleranceRange
  fallToleranceRangeId.value = basicInfomation.fallToleranceRangeId
  aircrafts.value = basicInfomation.aircrafts || []
  selectedModels.value = basicInfomation.selectedModels || []
  sourceUaslId.value = basicInfomation.sourceUaslId
  targetUaslId.value = basicInfomation.targetUaslId
  console.log("rangeData",rangeData);
}

const handleCorridorDataUpdate = (corridorList) => {
  corridorData.value = corridorList  
  console.log("corridorData",corridorData);
  console.log("rangeData",rangeData);
}

const handlerIsJunctionSetting = (b) => {
  console.log(`handlerIsJunctionSetting : ${b}`);
  isJunctionSetting.value = b;
  return;
}

const handleChangedCorridorDataUpdate = (corridorList) => {
  corridorData.value = corridorList  
  console.log("rangeData",rangeData);
}

const handlePostJsonDataUpdate = (jsonData) => {
  postJsonData.value = jsonData
  console.log("postJsonData",postJsonData);
}

const navigate = (next) => {
  const stepNo = ref(next ? step.value + 1 : step.value - 1)
  const errorMessage = ref('')
  // 条件チェック関数
  const checkConditions = (step) => {
    const isInvalid = (value) => value === '' || value === '------------------' || !value;
    switch (step) {
      case 1:
        // ステップ1の条件チェック
        const hasAircrafts = Array.isArray(aircrafts.value) && aircrafts.value.length > 0
        if (isInvalid(routeName.value) ||
            isInvalid(fallToleranceRange.value) ||
            isInvalid(fallToleranceRangeId.value) ||
            isInvalid(targetUaslId.value) ||
            !hasAircrafts) {
          errorMessage.value = 'すべての項目を入力してください。'
          return false
        }
        return true;
      case 2:
         // ステップ2の条件チェック
         if (!isJunctionSetting.value) {
          errorMessage.value = '設定が完了していません。'
          return false
        }
        return true;
      case 3:
        // ステップ3の条件チェック
        let data = corridorData.value.airwayJunctions.find(junction => 
          !junction['airwayJunctionName']
        );
        if (data || !routeName.value) {
          errorMessage.value = 'すべての項目を入力してください。'
          return false
        }
        data = corridorData.value.airwaySections.find(section => 
          !section['airwaySectionName']
        );
        if (data) {
          errorMessage.value = 'すべての項目を入力してください。'
          return false
        }
        return true; 
      default:
        return true;
    }
  }

  if (!checkConditions(stepNo.value)) {
    // 条件が満たされていない場合はエラーメッセージを表示
    alert(errorMessage.value)
    return;
  }
  
  switch (stepNo.value) {
    case -1:
      window.history.back(); // 航路画定詳細画面に戻る
      return
    case 0:
      nextButton.value = '高度・幅設定'
      stepTitle.value = '乗り入れ航路画定'
      break
    case 1:
      nextButton.value = '航路点設定'
      stepTitle.value = '乗り入れ航路画定'
      if (next) {
        corridorData.value = ''
        junctionSettingKey.value = junctionSettingKey.value + 1
      }
      break
    case 2:
      nextButton.value = '画定内容確認'
      stepTitle.value = '乗り入れ航路画定'
      if (next) junctionNameSettingKey.value = junctionNameSettingKey.value + 1
      else {
        // 画定申請画面から戻る時にエラー状態をリセット
        errorSectionIndex.value = -1
        contactCoordinates.value = null
      }
      break
    case 3:
      nextButton.value = '画定申請'
      stepTitle.value = '乗り入れ航路画定'
      if (next) confirmationKey.value = confirmationKey.value + 1
      break
    case 4:
      showModal()
      return
    default:
      return
  }
  step.value = stepNo.value
}

const showModal = async () => {

  // 前回のエラー状態をリセット
  createStatus.value = STATUS.OK;
  conflictErrorCode.value = '';
  conflictAirwaySection.value = '';

  // 画定申請ボタン無効化
  isProcessing.value = true;
  console.log(`画定申請ボタン無効化:${isProcessing.value}`);
  // ローディング開始
  isLoading.value = true;
  console.log(`画定申請ローディング開始:${isLoading.value}`);

  console.log('postJsonData:', postJsonData.value);

  const airwayRes = await $fetch('/api/airway/uasl', { 
    method: 'POST',
    body: postJsonData.value
  });
  console.log(airwayRes)
  if (airwayRes.status === 201) {
    isDialogVisible.value = true;
    console.log('airwayRes:', airwayRes);
  } else {
    console.error(`error: post airway info {status: ${airwayRes.status}}.`);
    if (airwayRes.status == 422) {
      createStatus.value = STATUS.CONFLICT
      const errorCode = airwayRes.data?.details?.error?.code ?? ''
      conflictErrorCode.value = errorCode
      const idx = airwayRes.data?.details?.uaslSectionIndex ?? 0
      errorSectionIndex.value = idx
      contactCoordinates.value = airwayRes.data?.details?.contactCoordinates ?? null
      const uaslSectionNames = postJsonData.value.uaslParts
        .map(part => part.uaslSection?.name)
        .filter(name => name !== undefined);
      conflictAirwaySection.value = uaslSectionNames[idx] ?? `区画 ${idx}`;
    } else {
      createStatus.value = STATUS.NG
    }
    isDialogVisible.value = true;
    isProcessing.value = false;
    console.log(`画定申請ボタン無効化解除:${isProcessing.value}`);
    // ローディング終了
    isLoading.value = false;
    console.log(`画定申請ローディング終了:${isLoading.value}`);
    return;
  }
  createdAt.value = getCurrentDate(); // 航路画定時の生成日時を記録

  airwayId.value = airwayRes.data.uaslId;
  console.log('airwayId:', airwayId.value);

  // 画定申請ボタン無効化解除
  isProcessing.value = false;
  console.log(`画定申請ボタン無効化解除:${isProcessing.value}`);
  // ローディング終了
  isLoading.value = false;
  console.log(`画定申請ローディング終了:${isLoading.value}`);
  return;
};

function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

const closeDialog = () => {
  isDialogVisible.value = false;
}

</script>
<template>
  <ClientOnly>
    <!-- 読み込み中表示スピナー -->
    <LoadingDialog v-model:dialog-visible="isLoading" />
  </ClientOnly>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
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
              title="基本情報選択"
              value="1"
            ></v-stepper-item>
            <v-divider></v-divider>
            <v-stepper-item
              :complete="step > 1"
              title="高度・幅設定"
              value="2"
              ></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
              :complete="step > 2"
              title="航路点設定"
              value="3"
            ></v-stepper-item>
            <v-divider></v-divider>
            <v-stepper-item
              :complete="step > 3"
              title="画定申請"
              value="4"
            ></v-stepper-item>

            <div class="drn_stepper_header__space"> </div> <!-- spacer -->
          </v-stepper-header>

          <v-stepper-window>
            <v-stepper-window-item
            value="1"
            >
              <basicInformationSettingAddAirway :stepNo="1"  @update:basicInfomation="handleBasicInfomationUpdate"/>
            </v-stepper-window-item>

            <v-stepper-window-item
            value="2"
            >
              <!-- 詳細情報 -->
              <junctionSettingAddAirway :stepNo="2" :key="junctionSettingKey" :rangeData="rangeData" @update:corridorData="handleCorridorDataUpdate" @update:junctionSetting="handlerIsJunctionSetting"/>
            </v-stepper-window-item>

            <v-stepper-window-item
            value="3"
            >
              <junctionNameSetting :stepNo="3" :key="junctionNameSettingKey" :rangeData="rangeData" @update:changedCorridorData="handleChangedCorridorDataUpdate"/>
            </v-stepper-window-item>

            <v-stepper-window-item
            value="4"
            >
              <confirmation
                :stepNo="4" 
                :key="confirmationKey"
                :rangeData="rangeData"
                :errorSectionIndex="errorSectionIndex"
                :contactCoordinates="contactCoordinates"
                @update:postJsonData="handlePostJsonDataUpdate"/>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </div>
      <!-- .b-pageContentHasNavigation -->

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
      <div v-if="isDialogVisible" class="overlay"></div>
      <!-- ダイアログ -->
      <dialog class="c-dialog" v-if="isDialogVisible">
        <h2 class="e-dialogTitle" v-if="createStatus === STATUS.OK">航路画定申請 完了</h2>
        <p v-if="createStatus === STATUS.OK">航路画定申請しました</p>
        <table class="c-labeledList" v-if="createStatus === STATUS.OK">
          <tbody>
            <tr class="c-labeledListRow">
              <th class="e-listLabel">航路ID：</th>
              <td class="e-listValue">{{ airwayId }}</td>
            </tr>
            <tr class="c-labeledListRow">
              <th class="e-listLabel">航路名：</th>
              <td class="e-listValue">{{ routeName }}</td>
            </tr>
            <tr class="c-labeledListRow">
              <th class="e-listLabel">申請日時：</th>
              <td class="e-listValue">{{ createdAt }}</td>
            </tr>
          </tbody>
        </table>
        <h2 class="e-dialogTitle" v-if="createStatus === STATUS.NG || createStatus === STATUS.CONFLICT">航路画定申請 失敗</h2>
        <p v-if="createStatus === STATUS.NG">航路画定申請に失敗しました。<br>しばらく時間をあけて再度実行をお願いします。</p>
        <p v-if="createStatus === STATUS.CONFLICT && conflictErrorCode === 'E0001'">航路区画 {{ conflictAirwaySection }} で他航路と干渉しています。</p>
        <p v-if="createStatus === STATUS.CONFLICT && conflictErrorCode === 'E0002'">航路区画 {{ conflictAirwaySection }} が地物・障害物と干渉しています。</p>
        <p v-if="createStatus === STATUS.CONFLICT && conflictErrorCode === 'E0003'">航路区画 {{ conflictAirwaySection }} が最大落下範囲外です。</p>
        <p v-if="createStatus === STATUS.CONFLICT && !['E0001','E0002','E0003'].includes(conflictErrorCode)">航路画定申請に失敗しました。<br>しばらく時間をあけて再度実行をお願いします。</p>
        <ul class="e-buttonGroup">
          <li v-if="createStatus !== STATUS.CONFLICT">
            <a href="/airway" class="e-button-noright">航路画定一覧</a>
          </li>
          <li v-if="createStatus === STATUS.CONFLICT">
            <button class="e-button-noright" @click="closeDialog">OK</button>
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
  width: 80%;
}

.e-pageTitle {
  display: flex;
}

.b-navigation {
  display: flex;
  justify-content: center;
  padding: 0 var(--margin-unit2);
}

</style>
