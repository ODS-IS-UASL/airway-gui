<script setup>
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "../components/navigation/pageNavigation.vue"
import basicInformationSetting from "../components/fallToleranceRange/basicInformationSetting.vue"
import rangeSetting from "../components/fallToleranceRange/rangeSetting.vue"
import confirmation from "../components/fallToleranceRange/confirmation.vue"
import { ref, onBeforeMount } from "vue"
import { useRouter } from 'vue-router';
import LoadingDialog from '~/components/dialogs/LoadingSpiner.vue'

const step = ref(0)
const stepTitle = ref('新規最大落下範囲')
const nextButton = ref('範囲設定')
const isDialogVisible = ref(false)
const rangeName = ref('')
const typeId = ref('')
const regionId = ref('')
const areaName = ref('')
const areaInfo= ref({})
const markerList = ref([]);
const markerCount = ref(0)
const createdAt = ref(new Date().toLocaleDateString('ja-JP'))
const STATUS = {
  OK: 'OK',
  NG: 'NG',
};
const createStatus = ref(STATUS.OK)
const rangeData = {
  areaInfo,
  rangeName,
  typeId,
  regionId,
  areaName,
  markerList,
  markerCount,
};
const fallToleranceRangeId = ref(0)
const router = useRouter();
const cookie_role = ref(null);
const role = ref(null);
const rangeSettingKey = ref(0);
const confirmationKey = ref(0);
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
  console.log(`virtual_role:${cookie_role.value.virtual_role}`);
  switch (cookie_role.value.virtual_role) {
    case "1":
      role.value = 1;  // 航路運営者
      break;
    case "3":
      role.value = 3; // 関係者
      break;
    default:
      role.value = null;
      break;
  }
  console.log(`role:${role.value}`);
}
if (process.client) {
  rolecheck();
}

const handlePlaceUpdate = (place) => {
  console.log(areaName.value)
  rangeName.value = place.rangeName
  typeId.value = place.typeId
  regionId.value = place.regionId
  areaName.value = place.areaName
  areaInfo.value = place.areaInfo
}

const handleMarkerUpdate = (marker) => {
  markerList.value = marker  // マーカーを追加
  markerCount.value = marker.length - 1
}
  
const navigate = (next) => {
  const stepNo = ref(next ? step.value + 1 : step.value - 1)
  const errorMessage = ref('')
  const checkConditions = (step) => {
    switch (step) {
      case 0:
        return true
      case 1:
        // ステップ1の条件チェック
        if (!(rangeName.value) ||
            !(typeId.value) ||
            !(regionId.value) ||
            !(areaName.value)) {
          errorMessage.value = 'すべての項目を入力してください。'
          return false
        }
        return true;
      case 2:
        // ステップ2の条件チェック
        if (!(markerList.value) ||
            !(markerCount.value)) {
          errorMessage.value = '区画を作成してください。'
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
      console.log(stepNo.value)
      router.push('/fallToleranceRange');
      return
    case 0:
      nextButton.value = '範囲設定へ'
      stepTitle.value = '新規最大落下範囲'
      break
    case 1:
      nextButton.value = '申請内容確認'
      stepTitle.value = '新規最大落下範囲'
      if (next) {
        rangeData.markerList.value = []
        rangeData.markerCount.value = 0
        rangeSettingKey.value = rangeSettingKey.value + 1
      }
      break
    case 2:
      nextButton.value = '最大落下範囲申請'
      stepTitle.value = '最大落下範囲'
      if (next) confirmationKey.value = confirmationKey.value + 1
      break
    case 3:
      showModal()
      return
    default:
      return
  }
  step.value = stepNo.value
}

const generateJson = () => {
  let new_markerList = [];
  markerList.value.forEach((coord) => {
    new_markerList.push([coord[1], coord[0]]);
  })
  return {
    "name": rangeName.value,
    "areaName": areaName.value,
    "typeId": typeId.value,
    "regionId": regionId.value,
    "uaslOperatorId": cookie_role.value.operatorId,
    "geometry": {
      "type": "Polygon",
      "coordinates": [new_markerList]
    },
    "businessNumber": localStorage.getItem('uasl:user:parentOperatorId'),
  };
};
const showModal = async () => {

  // 最大落下範囲申請ボタン無効化
  isProcessing.value = true;
  console.log(`最大落下範囲申請ボタン無効化:${isProcessing.value}`);
  // ローディング開始
  isLoading.value = true;
  console.log(`最大落下範囲申請ローディング開始:${isLoading.value}`);

  const rangeBody = generateJson();
  const rangeRes = await $fetch('/api/airway/max-fall-range', { 
    method: 'POST',
    body: rangeBody
  });
  console.log(rangeRes);
  if (rangeRes.status == 201) {
    isDialogVisible.value = true;
    fallToleranceRangeId.value = rangeRes.data.maxFallRangeId
    createdAt.value = useDateString1(rangeRes.data.createdAt)
    // 画定申請ボタン無効化解除
    isProcessing.value = false;
    console.log(`最大落下範囲申請ボタン無効化解除:${isProcessing.value}`);
    // ローディング終了
    isLoading.value = false;
    console.log(`最大落下範囲申請ローディング終了:${isLoading.value}`);
  } else {
    createStatus.value = STATUS.NG
    isDialogVisible.value = true;
    console.error(`error: post fall tolerance range info {status: ${rangeRes.status}}.`);
    // 画定申請ボタン無効化解除
    isProcessing.value = false;
    console.log(`最大落下範囲申請ボタン無効化解除:${isProcessing.value}`);
    // ローディング終了
    isLoading.value = false;
    console.log(`最大落下範囲申請ローディング終了:${isLoading.value}`);
    return;
  }
};
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

            <!-- ヘッダ -->
            <div class="drn_header">
              <div class="drn_header__item">
                <v-card-title class="drn_header__title">{{ stepTitle }}</v-card-title>
              </div>
            </div>

            <v-stepper-item
            :complete="step > 0"
            title="名称・エリア選択"
            value="1"
            ></v-stepper-item>
            <v-divider></v-divider>
            <v-stepper-item
            :complete="step > 1"
            title="範囲設定"
            value="2"
            ></v-stepper-item>
            <v-divider></v-divider>
            <v-stepper-item
            :complete="step > 2"
            title="最大落下範囲申請"
            value="3"
            ></v-stepper-item>

            <div class="drn_stepper_header__space"> </div> <!-- spacer -->
          </v-stepper-header>

          <v-stepper-window>
            <v-stepper-window-item
            value="1"
            >
              <basicInformationSetting :stepNo="1" @update:place="handlePlaceUpdate"/>
            </v-stepper-window-item>

            <v-stepper-window-item
            value="2"
            >
              <!-- 詳細情報 -->
              <rangeSetting :stepNo="2" :key="rangeSettingKey" :rangeData="rangeData" @update:marker="handleMarkerUpdate"/>
            </v-stepper-window-item>

            <v-stepper-window-item
            value="3"
            >
              <confirmation :stepNo="3" :key="confirmationKey" :rangeData="rangeData" />
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
      <div v-if="isDialogVisible" class="overlay"></div>
      <!-- ダイアログ -->
      <dialog class="c-dialog" v-if="isDialogVisible">
        <h2 class="e-dialogTitle" v-if="createStatus === STATUS.OK">最大落下範囲申請 完了</h2>
        <p v-if="createStatus === STATUS.OK">最大落下範囲申請しました</p>
        <table class="c-labeledList" v-if="createStatus === STATUS.OK">
          <tbody>
            <tr class="c-labeledListRow">
              <th class="e-listLabel">最大落下範囲ID：</th>
              <td class="e-listValue">{{ fallToleranceRangeId }}</td>
            </tr>
            <tr class="c-labeledListRow">
              <th class="e-listLabel">最大落下範囲名：</th>
              <td class="e-listValue">{{ rangeName }}</td>
            </tr>
            <tr class="c-labeledListRow">
              <th class="e-listLabel">申請日時：</th>
              <td class="e-listValue">{{ createdAt }}</td>
            </tr>
          </tbody>
        </table>
        <h2 class="e-dialogTitle" v-if="createStatus === STATUS.NG">最大落下範囲申請 失敗</h2>
        <p v-if="createStatus === STATUS.NG">最大落下範囲申請に失敗しました。<br>しばらく時間をあけて再度実行をお願いします。</p>
        <ul class="e-buttonGroup">
          <li v-if="createStatus === STATUS.OK">
            <a href="/fallToleranceRange/newFallToleranceRange" class="e-button-noright">続けて最大落下範囲</a>
          </li>
          <li>
            <a href="/fallToleranceRange" class="e-button-noright">最大落下範囲一覧</a>
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
</style>
