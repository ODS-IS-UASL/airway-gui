<template>
  <div class="chart-container">
    <div class="chart-body">
      <div class="chart">
        <div v-if="isLoading" class="chart-loading">データを取得中です…</div>
        <Line v-else ref="chartRef" :data="graphData" :options="chartOptions" style="width: 100%; height: 100%;"/>
      </div>
      <div class="chart-legend">
        <span class="chart-legend-dash"></span>
        <span class="chart-legend-text">高度150m（高度は目安です）</span>
      </div>
    </div>
  </div>
</template>

<script>
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement, Filler } from 'chart.js';
import { ref, onMounted, nextTick } from 'vue';
import * as turf from "@turf/turf";

ChartJS.register(LineElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PointElement, Filler);

const parallelogramPlugin = {
  id: 'parallelogramPlugin',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const coordinatesList = chart.options.coordinatesList || [];
    const bldgList = chart.options.bldgList || [];
    coordinatesList.forEach((coordinates) => {
      const [coord1, coord2, coord3, coord4] = coordinates;
      const x1 = xScale.getPixelForValue(coord1[0]);
      const y1 = yScale.getPixelForValue(coord1[1]);
      const x2 = xScale.getPixelForValue(coord2[0]);
      const y2 = yScale.getPixelForValue(coord2[1]);
      const x3 = xScale.getPixelForValue(coord3[0]);
      const y3 = yScale.getPixelForValue(coord3[1]);
      const x4 = xScale.getPixelForValue(coord4[0]);
      const y4 = yScale.getPixelForValue(coord4[1]);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "#2c69ff";
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fillStyle = '#b1c8ff';  // 塗りつぶしの色
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    bldgList.forEach((bldg) => {
      const [bldgX0, height0, altitude0] = bldg[0];
      const [bldgX1, height1, altitude1] = bldg[1];
      const x0 = xScale.getPixelForValue(bldgX0);
      const y0 = yScale.getPixelForValue(altitude0);
      const x1 = xScale.getPixelForValue(bldgX0);
      const y1 = yScale.getPixelForValue(height0 + altitude0);
      const x2 = xScale.getPixelForValue(bldgX1);
      const y2 = yScale.getPixelForValue(height1 + altitude1);
      const x3 = xScale.getPixelForValue(bldgX1);
      const y3 = yScale.getPixelForValue(altitude1);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "#2c69ff";
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fillStyle = '#b1c8ff';  // 塗りつぶしの色
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 航路点アイコン（非アクティブ：白背景・青框・青テキスト）
    const R = 12;
    const junctionList = (chart.data && chart.data.junctionList) || (chart.options && chart.options.junctionList) || [];
    junctionList.forEach((junc) => {
      const cx = xScale.getPixelForValue(junc.x);
      const cy = yScale.getPixelForValue(junc.y);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = '#2C69FF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#2C69FF';
      ctx.font = 'bold 11px "Meiryo UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(junc.label), cx, cy);
      ctx.restore();
    });
  }
};

export default {
  props: {
    corridorData: {
      type: Object,
      required: true,
    }
  },
  components: {
    Line,
  },
  setup(props) {
    let graphData = ref({
      labels: [],
      datasets: [
        {
          label: 'Sample Line Graph',
          data: [],
          borderColor: '#000000',
          borderWidth: 2,
          fill: false,
        },
      ],
    });

    let chartOptions = ref({
      responsive: true,
      layout: { padding: { top: 30, left: 16, right: 16 } },
      plugins: {
        tooltip: { enabled: true },
        legend: { display: false },
      },
      scales: {
        x: {
          type: 'linear',
          display: false,
        },
        y: {
          type: 'linear',
          display: false,
          min: 0,
        },
      },
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          radius: 0,
        },
      },
    });

    let chartRef = ref(null);
    const isLoading = ref(true);

    // 平行四辺形のプラグインを登録
    ChartJS.register(parallelogramPlugin);

    const geoJsonBldg = ref(null);
    const loadGeoJson = async () => {
      try {
        let jsonFile = await fetch('/geojson/bldg_533877.geojson'); // ゼンリン地物情報未契約の場合は使用不可、コンテナ内からファイルを削除する
        if (!jsonFile.ok) {
          throw Error('ファイルの読み込みに失敗しました');
        }
        geoJsonBldg.value = await jsonFile.json();
      } catch(err) {
        console.error(err)
        geoJsonBldg.value = {};
      }
    }

    // データ取得とグラフ描画のロジック
    onMounted(async () => {
      if (process.client) {
        let all_coordinates = [];
        let distance = 0;
        let center_line = []; // [経度、緯度、最大高度、最低高度]が複数含まれるリスト (中心線)
        let left_line = []; // [経度、緯度]が複数含まれるリスト (進行方向に見て左の線)
        let right_line = []; // [経度、緯度]が複数含まれるリスト (進行方向に見て右の線)

        // 地物情報をロード
        await loadGeoJson();

        // 座標を抽出
        props.corridorData.airwayJunctions.forEach((junction) => {
          all_coordinates.push(junction.airways[0].airway.geometry.coordinates);
        })

        const plotData = ref([]);
        const junctionList = [];
        let maxXValue = 0;
        let maxYValue = 0;

        // 距離を計算し、航路の中心線、左端をつないだ線、右端をつないだ線の座標を取得
        for (let i = 0; i < all_coordinates.length - 1; i++) {
          let x0 = (all_coordinates[i][0][0] + all_coordinates[i][2][0]) / 2;
          let y0 = (all_coordinates[i][0][1] + all_coordinates[i][2][1]) / 2;
          var tmpAltitude = await useGeoJsonGetSingleAltitude(x0, y0); // 航路点直下の標高を取得
          let highBefore = all_coordinates[i][0][2] + tmpAltitude;
          let lowBefore = all_coordinates[i][1][2] + tmpAltitude;
          maxYValue = Math.max(maxYValue, highBefore); // Y軸の最大値を更新

          let x1 = (all_coordinates[i + 1][0][0] + all_coordinates[i + 1][2][0]) / 2;
          let y1 = (all_coordinates[i + 1][0][1] + all_coordinates[i + 1][2][1]) / 2;
          var tmpAltitude = await useGeoJsonGetSingleAltitude(x1, y1); // 航路点直下の標高を取得
          let highAfter = all_coordinates[i + 1][0][2] + tmpAltitude;
          let lowAfter = all_coordinates[i + 1][1][2] + tmpAltitude;          
          maxYValue = Math.max(maxYValue, highAfter); // Y軸の最大値を更新

          let center_line_elem = [x0, y0];
          let left_line_elem = [all_coordinates[i][0][0], all_coordinates[i][0][1]];
          let right_line_elem = [all_coordinates[i][2][0], all_coordinates[i][2][1]];
          center_line.push(center_line_elem);
          left_line.push(left_line_elem);
          right_line.push(right_line_elem);
          const point0 = turf.point([x0, y0]);
          const point1 = turf.point([x1, y1]);
          const afterDistance = turf.distance(point0, point1) * 1000;
          if (i === 0) junctionList.push({ x: distance, y: (highBefore + lowBefore) / 2, label: 1 });
          junctionList.push({ x: distance + afterDistance, y: (highAfter + lowAfter) / 2, label: i + 2 });
          if (i == all_coordinates.length - 2) {
            let center_line_elem = [x1, y1];
            let left_line_elem = [all_coordinates[i + 1][0][0], all_coordinates[i + 1][0][1]];
            let right_line_elem = [all_coordinates[i + 1][2][0], all_coordinates[i + 1][2][1]];
            center_line.push(center_line_elem);
            left_line.push(left_line_elem);
            right_line.push(right_line_elem)
          }

          const points = [
            [distance, lowBefore],
            [distance, highBefore],
            [distance + afterDistance, highAfter],
            [distance + afterDistance, lowAfter],
          ];
          maxXValue = Math.max(maxXValue, distance + afterDistance); // X軸の最大値を更新
          plotData.value.push(points);

          distance += afterDistance;
        };

        /* 航路下の標高を取得 */
        const altitudeX = [];
        const altitudeY = [];
        const altitudeYCenter = [];
        const altitudeYLeft = [];
        const altitudeYRight = [];
        let tmpDistance = 0;  
        let divideNum = 10;  

        // 中心線
        for (let i = 0; i < center_line.length - 1; i++) {
          let line = turf.lineString([center_line[i], center_line[i + 1]]);
          var tmpPoint1 = turf.point(center_line[i]);
          var tmpPoint2 = turf.point(center_line[i + 1]);
          var lineDistance = turf.distance(tmpPoint1, tmpPoint2);
          for (let j = 0; j < divideNum + 1; j++) {
            let tmpPoint = turf.along(line, j * lineDistance / divideNum, {units: 'kilometers'});
            let tmpAltitude = await useGeoJsonGetSingleAltitude(tmpPoint.geometry.coordinates[0], tmpPoint.geometry.coordinates[1]);
            altitudeX.push(j * lineDistance / divideNum * 1000 + tmpDistance);
            altitudeYCenter.push(tmpAltitude);
          }
          tmpDistance += lineDistance * 1000;
        }

        // 左の線
        for (let i = 0; i < left_line.length - 1; i++) {
          let line = turf.lineString([left_line[i], left_line[i + 1]]);
          var tmpPoint1 = turf.point(left_line[i]);
          var tmpPoint2 = turf.point(left_line[i + 1]);
          var lineDistance = turf.distance(tmpPoint1, tmpPoint2);
          for (let j = 0; j < divideNum + 1; j++) {
            let tmpPoint = turf.along(line, j * lineDistance / divideNum, {units: 'kilometers'});
            let tmpAltitude = await useGeoJsonGetSingleAltitude(tmpPoint.geometry.coordinates[0], tmpPoint.geometry.coordinates[1]);
            altitudeYLeft.push(tmpAltitude);
          }
        }

        // 右の線
        for (let i = 0; i < right_line.length - 1; i++) {
          let line = turf.lineString([right_line[i], right_line[i + 1]]);
          var tmpPoint1 = turf.point(right_line[i]);
          var tmpPoint2 = turf.point(right_line[i + 1]);
          var lineDistance = turf.distance(tmpPoint1, tmpPoint2);
          for (let j = 0; j < divideNum + 1; j++) {
            let tmpPoint = turf.along(line, j * lineDistance / divideNum, {units: 'kilometers'});
            let tmpAltitude = await useGeoJsonGetSingleAltitude(tmpPoint.geometry.coordinates[0], tmpPoint.geometry.coordinates[1]);
            altitudeYRight.push(tmpAltitude);
          }
        }

        // 中心線、左の線、右の線のうち、最大標高を採用
        for (let i = 0; i < altitudeYCenter.length; i++) {
          const tmpMaxY = Math.max(altitudeYCenter[i], altitudeYLeft[i], altitudeYRight[i]);
          altitudeY.push(tmpMaxY);
        }

        let minAltitudeY = altitudeY[0];
        altitudeY.forEach((altY) => {
          if (altY < minAltitudeY) {
            minAltitudeY = altY;
          }
        })
        
        // 地上150mの線
        let altitudeY150 = [];
        altitudeY.forEach((alt) => {
          altitudeY150.push(alt + 150);
          if (alt + 150 > maxYValue) {
            maxYValue = alt + 150;
          }
        })

        // 航路の真下に存在する地物を確認
        let preDistance = 0;
        let bldgPointList = [];
        const bldgFeatures = geoJsonBldg.value.features || [];
        for (let i = 0; i < center_line.length - 1; i++) {
          let polygon = turf.polygon([[
            left_line[i],
            left_line[i + 1],
            right_line[i + 1],
            right_line[i],
            left_line[i],
          ]])
          let centerPointStart = turf.point([center_line[i][0], center_line[i][1]]);
          let centerPointEnd = turf.point([center_line[i + 1][0], center_line[i + 1][1]]);
          let centerLine = turf.lineString([[center_line[i][0], center_line[i][1]], [center_line[i + 1][0], center_line[i + 1][1]]]);
          for (let j = 0; j < bldgFeatures.length; j++) {
            let innerPointList = [];
            let feature = bldgFeatures[j];
            let pointNum = feature.geometry.coordinates[0].length;
            for (let k = 0; k < pointNum; k++) {
              // 建造物の頂点を一個ずつ見ていく
              let bldgPoint = [feature.geometry.coordinates[0][k][0], feature.geometry.coordinates[0][k][1]];
              let pointInPolygon = turf.booleanPointInPolygon(bldgPoint, polygon);
              if (pointInPolygon) {
                // 航路の真下に存在する頂点
                let tmpAltitude = await useGeoJsonGetSingleAltitude(bldgPoint[0], bldgPoint[1]);
                let nearestPoint = turf.nearestPointOnLine(centerLine, turf.point(bldgPoint));
                let pointOnCenter = turf.point(nearestPoint.geometry.coordinates);
                let tmpX = turf.distance(centerPointStart, pointOnCenter) * 1000 + preDistance;
                innerPointList.push([tmpX, feature.properties.measuredHeight, tmpAltitude]);
              }
            }
            if (innerPointList.length == 0) {
              // 航路の真下に一点も存在しない
              continue;
            }
            if (innerPointList.length != pointNum) {
              // 建造物が航路からはみ出ている
              for (let k = 0; k < pointNum - 1; k++) {
                let tmpLine = turf.lineString([
                  [feature.geometry.coordinates[0][k][0], feature.geometry.coordinates[0][k][1]],
                  [feature.geometry.coordinates[0][k + 1][0], feature.geometry.coordinates[0][k + 1][1]]
                ]);
                let intersects = turf.lineIntersect(tmpLine, polygon);
                if (intersects.features.length > 0) {
                  for (let l = 0; l < intersects.features.length; l++) {
                    let intersectPoint = [intersects.features[l].geometry.coordinates[0], intersects.features[l].geometry.coordinates[1]];
                    let tmpAltitude = await useGeoJsonGetSingleAltitude(intersectPoint[0], intersectPoint[1]);
                    let nearestPoint = turf.nearestPointOnLine(centerLine, turf.point(intersectPoint));
                    let pointOnCenter = turf.point(nearestPoint.geometry.coordinates);
                    let tmpX = turf.distance(centerPointStart, pointOnCenter) * 1000 + preDistance;
                    innerPointList.push([tmpX, feature.properties.measuredHeight, tmpAltitude]);
                  }
                }
              }
            }

            // 中心点からの距離が最短と最長の点だけ採用
            let minX = innerPointList[0];
            let maxX = innerPointList[0];
            for (let k = 0; k < innerPointList.length; k++) {
              if (innerPointList[k][0] < minX[0]) {
                minX = innerPointList[k];
              }
              if (innerPointList[k][0] > maxX[0]) {
                maxX = innerPointList[k];
              }
            }
            bldgPointList.push([minX, maxX]);
          }
          preDistance = turf.distance(centerPointStart, centerPointEnd) * 1000;
        }
        console.log(bldgPointList);

        bldgPointList.forEach((bldg) => {
          if (bldg[0][2] < minAltitudeY) {
            minAltitudeY = bldg[0][2];
          }
          if (bldg[1][2] < minAltitudeY) {
            minAltitudeY = bldg[1][2];
          }
        })

        let datasets = [
          {
            label: 'Altitude',
            data: altitudeY,
            borderColor: 'rgb(83, 90, 110)',
            borderWidth: 2,
            backgroundColor: 'rgb(83, 90, 110)',
            fill: true,
          },
          {
            label: '高度150m（高度は目安です）',
            data: altitudeY150,
            borderColor: '#F16682',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
          },
        ];

        graphData.value = {
          labels: altitudeX,
          datasets: datasets,
          junctionList: junctionList,
        };

        // 最大値と座標リストでchartOptionsを更新
        chartOptions.value = {
          ...chartOptions.value,
          layout: { padding: { top: 30, left: 16, right: 16 } },
          scales: {
            x: {
              ...chartOptions.value.scales.x, // 既存の設定を保持
              max: maxXValue, // X軸の最大値を更新
            },
            y: {
              ...chartOptions.value.scales.y, // 既存の設定を保持
              max: maxYValue,
              min: minAltitudeY
            },
          },
          coordinatesList: plotData.value,
          bldgList: bldgPointList,
          junctionList: junctionList,
        };

        // VueがDOMの更新を終えた後にグラフを更新する
        nextTick(() => {
          if (chartRef.value && chartRef.value.chart) {
            chartRef.value.chart.update();
          }
          isLoading.value = false;
        });
      }
    });

    return {
      graphData,
      chartOptions,
      chartRef,
      isLoading,
    };
  },
};
</script>

<style scoped>
.chart-container {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.chart-altitude-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  color: #555;
  flex-shrink: 0;
  align-self: center;
}

.chart-body {
  flex: 1;
  min-width: 0;
}

.chart {
  width: 100%;
  height: 180px;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgb(241, 242, 245);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-loading {
  font-size: 12px;
  color: #888;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding-left: 2px;
}

.chart-legend-dash {
  display: inline-block;
  width: 24px;
  border-top: 2px dashed #F16682;
  flex-shrink: 0;
}

.chart-legend-text {
  font-size: 11px;
  color: #555;
}
</style>
