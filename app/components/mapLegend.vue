
<template>
  <dl>
    <div v-if="showFlag" class="legend-window" @click="changeFlag">
      <dt style="font-weight: 800;">凡例</dt>
      <dd>
        <ul>
          <li class="e-legend-drawn">
            <img
              src="../assets/css/img/dummyImg/dummy_legendIcon_drawn.svg"
              alt="アイコン決定後記述..."
            />ドローン
          </li>
          <li class="e-legend-drawn">
            <img
              src="../assets/css/img/dummyImg/dummy_legendIcon_port.svg"
              alt="アイコン決定後記述..."
            />離着陸場
          </li>
          <li class="e-legend-drawnPort">
            <img
              src="../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg"
              alt="アイコン決定後記述..."
            />航路点
          </li>
          <li class="e-legend-wayPoint">
            <img
              src="../assets/css/img/dummyImg/dummy_legendIcon_route.svg"
              alt="アイコン決定後記述..."
            />航路
          </li>
          <li class="e-legend-route">
            <img
              src="../assets/css/img/dummyImg/dummy_legendIcon_routesection.svg"
              alt="アイコン決定後記述..."
            />最大落下範囲
          </li>
        </ul>
        <ul class="legend-category">
          <li>降水量</li>
          <li class="e-legend-rain">
            <span class="little-rain-box"></span>~ 2mm
          </li>
          <li class="e-legend-rain">
            <span class="middle-rain-box"></span>2mm ~ 4mm
          </li>
          <li class="e-legend-rain">
            <span class="hard-rain-box"></span>4mm ~
          </li>
        </ul>
        <ul class="legend-category">
          <li>風速</li>
          <li class="e-legend-wind">
            <div class="vector">
              <span class="blue-arrow">➤</span>
              <span>~ 5m/s</span>
            </div>
          </li>
          <li class="e-legend-wind">
            <div class="vector">
              <span class="yellow-arrow">➤</span>
              <span>5m/s ~ 8m/s</span>
            </div>
          </li>
          <li class="e-legend-wind">
            <div class="vector">
              <span class="red-arrow">➤</span>
              <span>8m/s ~</span>
            </div>
          </li>
        </ul>
      </dd>
    </div>
    <div v-if="!showFlag" class="legend-window-collapse" @click="changeFlag">
      <p>?</p>
    </div>
  </dl>
</template>

<script setup>
import { ref } from 'vue';

const showFlag = ref(true);
const changeFlag = () => {
  showFlag.value = showFlag.value == true ? false : true;
  console.log(showFlag.value);
}

</script>

<style>
.legend-window {
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0px;
  padding: 10px 0px 10px 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #000000;
  background-color: #FFFFFF;
  width: 150px;
}

.legend-window-collapse {
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0px;
  padding: 0px 0px 0px 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #000000;
  background-color: #FFFFFF;
  width: 30px;
}

.e-legend-drawn
.e-legend-drawn,
.e-legend-drawnPort,
.e-legend-wayPoint,
.e-legend-route,
.e-legend-rain,
.e-legend-wind {
  display: flex;
  align-items: center;
  margin-bottom: 8px; /* アイテム間の間隔 */
}

/* 色付きの四角形 */
.little-rain-box,
.middle-rain-box,
.hard-rain-box
{
  display: inline-block;
  width: 15px;
  /* 四角形の幅を指定 */
  height: 15px;
  /* ここで四角形の高さを指定 */
  margin-right: 0.5em;
  /* チェックボックスと四角形の間に隙間を追加 */
  border-radius: 3px;
  background-color: rgb(0, 0, 255);
  /* 四角形の角を少し丸める */
}

.little-rain-box {
  background-color: rgba(0, 0, 255, 0.5);
}

.middle-rain-box {
  background-color: rgba(255, 255, 0, 0.5);
}

.hard-rain-box {
  background-color: rgb(255, 0, 0, 0.5);
}


.vector {
  display: flex;
  align-items: center;  /* 矢印とテキストを横並びに */
}

.blue-arrow, 
.yellow-arrow,
.red-arrow{
  margin-right: 5px;  /* 矢印とテキストの間にスペース */
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  display: flex;
  font-size: 20px;
  text-align: center;
  opacity:0.6;
  -webkit-text-stroke: 2px #000000;
}

.blue-arrow {
  color: #0000FF;
}

.yellow-arrow {
  color: #FFFF00;
}

.red-arrow {
  color: #FF0000;
}
</style>