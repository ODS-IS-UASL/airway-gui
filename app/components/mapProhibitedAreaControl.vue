<template>
  <div class="prohibited-control">
    <img src="../assets/css/img/dummyImg/svg_landmark.svg" alt="アイコン決定後記述..." />
    <span>禁止エリア</span>
    <!-- 表示される追加の div -->
    <div class="extra-info">
      禁止エリア
      <dd>
        <ul>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkAirport" @change="handleCheckboxChange" />
              <span class="airport-box"></span>
              空港など周辺空域
            </label>
          </li>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkPersons" @change="handleCheckboxChange" />
              <span class="persons-box"></span>
              人口集中地区
            </label>
          </li>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkEmergency" @change="handleCheckboxChange" />
              <span class="emergency-box"></span>
              緊急用務空域
            </label>
          </li>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkMannedMachine" @change="handleCheckboxChange" />
              <span class="manned-box"></span>
              有人機発着陸エリア
            </label>
          </li>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkRemote" @change="handleCheckboxChange" />
              <span class="remote-box"></span>
              リモートID特定区域
            </label>
          </li>
        </ul>
      </dd>
      小型無人機等飛行禁止法
      <dd>
        <ul>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkRedzone" @change="handleCheckboxChange" />
              <span class="redzone-box"></span>
              レッドゾーン
            </label>
          </li>
          <li class="indented">
            <label>
              <input type="checkbox" v-model="chkYellowzone" @change="handleCheckboxChange" />
              <span class="yellowzone-box"></span>
              イエローゾーン
            </label>
          </li>
        </ul>
      </dd>
      <dd>
        <ul>
          <li>
            <label>
              <input type="checkbox" v-model="chkOther1" @change="handleCheckboxChange" />
              その他1
            </label>
          </li>
          <li>
            <label>
              <input type="checkbox" v-model="chkOther2" @change="handleCheckboxChange" />
              その他2
            </label>
          </li>
        </ul>
      </dd>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

// 親から地図情報を受け取る
const props = defineProps({
  map: {
    type: Object,
    required: false,
  },
  map_moveend: {
    type: Boolean,
    required: true,
  },
});

// チェックボックスの状態を保持するための変数
const chkAirport = ref(false);
const chkPersons = ref(false);
const chkRedzone = ref(false);
const chkYellowzone = ref(false);
const chkRemote = ref(false);
const chkMannedMachine = ref(false);
const chkEmergency = ref(false);
const chkOther1 = ref(false);
const chkOther2 = ref(false);
let L; // Leafletライブラリのインスタンス
let polygonLayers = []; // ポリゴンを格納する配列
let circleLayers = []; // 円を格納する配列

const chkAirportOptions = {
  color: "#96ebb0",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#96ebb0",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkPersonsOptions = {
  color: "#ffb6ef",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#ffb6ef",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkRedzoneOptions = {
  color: "#ec5784",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#ec5784",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkYellowOptions = {
  color: "#dfe081",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#dfe081",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkRemoteOptions = {
  color: "#90e1f0",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#90e1f0",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkMannedMachineOptions = {
  color: "#7c91ee",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#7c91ee",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkEmergencyOptions = {
  color: "#f1b46d",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#f1b46d",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkOther1Options = {
  color: "#9c9c99",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#9c9c99",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const chkOther2Options = {
  color: "#353533",      // 境界線の色
  weight: 2,             // 境界線の太さ
  opacity: 0.7,          // 境界線の透過度
  fillColor: "#353533",  // ポリゴン内部の色
  fillOpacity: 0.2       // ポリゴン内部の透過度
};

const PolygonOptionsArray = [
  null,
  chkAirportOptions,
  chkPersonsOptions,
  null,
  null,
  chkRedzoneOptions,
  chkYellowOptions,
  chkRemoteOptions,
  chkMannedMachineOptions,
  chkEmergencyOptions,
  chkOther1Options,
  chkOther2Options
];

const checkProhibitedType = async (type) => {
  let isView = false;
  switch (type) {
    case 1: // 空港等の周辺空域
      isView = chkAirport.value;
      break;
    case 2: // 人口集中地区 
      isView = chkPersons.value;
      break;
    case 5: // レッドゾーン
      isView = chkRedzone.value;
      break;
    case 6: // イエローゾーン
      isView = chkYellowzone.value;
      break;
    case 7: // 条例等で定めるエリア
      isView = chkRemote.value;
      break;
    case 8: // 有人機離着陸エリア
      isView = chkMannedMachine.value;
      break;
    case 9: // 緊急時用務空域
      isView = chkEmergency.value;
      break;
    case 10: // その他1
      isView = chkOther1.value;
      return;
    case 11: // その他2
      isView = chkOther2.value;
      return;
    default:
      break;
  }
  return isView
}

const resetPolygons = () => {
  // polygonLayers 配列に格納されたすべてのポリゴンを地図から削除
  polygonLayers.forEach(polygon => {
    props.map.removeLayer(polygon);
  });

  // 配列を空にして、メモリを解放
  polygonLayers = [];

  // circleLayers 配列に格納されたすべての円を地図から削除
  circleLayers.forEach(circle => {
    props.map.removeLayer(circle);
  });

  // 配列を空にして、メモリを解放
  circleLayers = [];

};

// APIリクエストのための関数を作成
const sendApiRequest = async (coordinates) => {
  await resetPolygons();

  // チェックボックスに1つもチェックが入っていない場合、RESTを送信しない
  if (!chkAirport.value && !chkPersons.value && !chkRedzone.value && !chkYellowzone.value &&
    !chkRemote.value && !chkMannedMachine.value && !chkEmergency.value && !chkOther1.value && !chkOther2.value) {
    return;
  }

  const today = new Date();

  // 年、月、日を取得
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため +1
  const day = String(today.getDate()).padStart(2, '0'); // 2桁で表示

  const formattedDate = `${year}${month}${day}`;

  const body = {
    "features": {
      "coordinates": coordinates,
    },
    "startTime": `${formattedDate} 0000`,
  };

  try {
    if (!process.client) {
      return;
    }
    const response = await $fetch('/api/misc/flightProhibitedAreaReceiver', { 
      method: 'POST',
      body: body
    });
    if (Object.keys(response).length === 0) {
      alert("飛行禁止エリア表示を利用するためにはDIPSログインを行ってください。");
      // 何回も出てしまうので、チェックボックスはすべてfalseにする
      chkAirport.value = false;
      chkPersons.value = false;
      chkRedzone.value = false;
      chkYellowzone.value = false;
      chkRemote.value = false;
      chkMannedMachine.value = false;
      chkEmergency.value = false;
      chkOther1.value = false;
      chkOther2.value = false;
      return;
    }
    if (response.status !== 200) {
      return false;
    }

    // クライアントサイドでのみ Leaflet を使う処理を行う
    if (props.map) {
      for (let i = 0; i < response.data.totalCount; i++) {
        const typeId = response.data.flightProhibitedAreaInfo[i].flightProhibitedAreaTypeId;
        if (!await checkProhibitedType(typeId)) {
          continue;
        }
        if (response.data.flightProhibitedAreaInfo[i].range.type === "Polygon") {
          // 座標の緯度経度を入れ替え
          const swappedCoordinates = response.data.flightProhibitedAreaInfo[i].range.coordinates.map(([lng, lat]) => [lat, lng]);

          // ポリゴンを地図に追加
          const polygon = L.polygon(swappedCoordinates, PolygonOptionsArray[typeId])
            .addTo(props.map);
          polygonLayers.push(polygon); // 配列にポリゴンを格納
        } else if (response.data.flightProhibitedAreaInfo[i].range.type === "Circle") {
          // 座標の緯度経度を入れ替え
          const center = response.data.flightProhibitedAreaInfo[i].range.center[0];
          const swappedCoordinates = [center[1], center[0]];
          let option = PolygonOptionsArray[typeId];
          option.radius = response.data.flightProhibitedAreaInfo[i].range.radius; // 半径 (メートル単位) 

          const circle = L.circle(swappedCoordinates, option)
            .addTo(props.map);  // 地図に円を追加
          circleLayers.push(circle); // 配列に円を格納
        } else {
        }
      }
    }
  } catch (error) {
    console.error('API request failed:', error);
    return false;
  }
};

// チェックボックスが変更されたときの処理
const handleCheckboxChange = async () => {
  const map = props.map;

  if (map) {
    // 地図の範囲を取得
    const bounds = map.getBounds();
    const northWest = bounds.getNorthWest();  // 左上の座標
    const southEast = bounds.getSouthEast(); // 右下の座標

    const upper = northWest.lat;  // 上
    const left = northWest.lng;   // 左
    const lower = southEast.lat; // 下
    const right = southEast.lng; // 右

    // 座標情報をAPIに送信
    const coordinates = [
      [left, upper],
      [right, upper],
      [right, lower],
      [left, lower]
    ];

    await sendApiRequest(coordinates); // APIリクエストを送信
  }
};

// 地図移動ハンドラ
watch(() => props.map_moveend, async (newData) => {
  if (newData) {
    // 地図の左上の座標を取得
    const bounds = props.map.getBounds();
    const northWest = bounds.getNorthWest();  // 左上の座標
    const southEast = bounds.getSouthEast(); // 右下の座標

    const upper = northWest.lat;  // 上
    const left = northWest.lng;   // 左
    const lower = southEast.lat; // 下
    const right = southEast.lng; // 右

    // 座標情報をAPIに送信
    const coordinates = [
      [left, upper],
      [right, upper],
      [right, lower],
      [left, lower]
    ];

    await sendApiRequest(coordinates); // APIリクエストを送信
  }
});

// onMountedでmap関連の処理を行う
onMounted(async () => {
  if (process.client) {  // process.client を使用して、ブラウザ上のみ実行
    const map = props.map;
    // Leaflet モジュールを非同期でインポート
    const leafletModule = await import('leaflet');
    L = leafletModule.default;
  }
});
</script>

<style>
.prohibited-control {
  font-size: 0.8rem;
  line-height: 1.5em;
  margin-bottom: 10px;
  padding: 5px 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #000000;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  width: 120px;
  height: 30px;
  position: relative;
  /* 子要素の絶対位置を制御するために親に position: relative を追加 */
}

/* 禁止エリア以外のチェックボックスに左インデントを追加 */
.indented {
  padding-left: 1.5em;
  /* インデント幅を広げる */
}

.prohibited-control img {
  margin-right: 8px;
  width: 16px;
}

.prohibited-control span {
  white-space: nowrap;
}

/* 最初は隠れている extra-info */
.extra-info {
  position: absolute;
  top: 0%;
  /* 親要素の高さの中央に垂直揃え */
  left: -170%;
  /* 親要素の左側に表示、必要に応じて調整 */
  transform: translateY(0%);
  /* 垂直方向の中央揃え */
  width: 200px;
  /* 幅を広げる（ここを調整） */
  background-color: #FFFFFF;
  border: 1px solid #ccc;
  padding: 10px;
  /* 余白を広げて内容にスペースを与える */
  display: none;
  /* 初期状態では非表示 */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* prohibited-control にカーソルが乗ったときに extra-info を表示 */
.prohibited-control:hover .extra-info {
  display: block;
  /* 表示する */
}

/* チェックボックスのサイズ調整 */
input[type="checkbox"] {
  vertical-align: middle;
  /* チェックボックスをラベルの中央に揃える */
  margin-right: 0.5em;
  /* チェックボックスとラベルの間に隙間を追加 */
}

/* チェックボックスとラベルの間にスペースを追加 */
label {
  font-size: 0.8rem;
  /* ラベルのフォントサイズ調整 */
  color: #333;
  /* ラベルの文字色 */
  display: inline-flex;
  /* ラベル内の要素をインラインで整列 */
  align-items: center;
  /* ラベル内の要素を縦方向に中央揃え */
}

/* 色付きの四角形 */
.airport-box,
.persons-box,
.redzone-box,
.yellowzone-box,
.remote-box,
.manned-box,
.emergency-box {
  display: inline-block;
  width: 15px;
  /* 四角形の幅を指定 */
  height: 15px;
  /* ここで四角形の高さを指定 */
  margin-right: 0.5em;
  /* チェックボックスと四角形の間に隙間を追加 */
  border-radius: 3px;
  /* 四角形の角を少し丸める */
}

.airport-box {
  background-color: #96ebb0;
}

.persons-box {
  background-color: #ffb6ef;
}

.emergency-box {
  background-color: #f1b46d;
}

.manned-box {
  background-color: #7c91ee;
}

.remote-box {
  background-color: #90e1f0;
}


.redzone-box {
  background-color: #ec5784;
}

.yellowzone-box {
  background-color: #dfe081;
}
</style>
