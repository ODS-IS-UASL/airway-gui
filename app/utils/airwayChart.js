import * as turf from "@turf/turf";
import { Chart } from 'chart.js';

const rangeErrorMsg = "範囲内で設定してください。";
const elevationsErrorMsg = "標高と重なっています。";
const featuresErrorMsg = "地物と重なっています。";
const fallToleranceRangeErrorMsg = "最大落下範囲外です。";
const multiErrorMsg = "既存の航路と干渉しています。";
const rectTooSmallErrorMsg = "矩形が小さすぎます。";

/* ドラッグアンドドロップで描いた矩形の頂点計算(矩形の描き方によって頂点が変わるため)
 * @param x1 ドラッグアンドドロップで描いた矩形の左上X座標
 * @param y1 ドラッグアンドドロップで描いた矩形の左上Y座標
 * @param x2 ドラッグアンドドロップで描いた矩形の右下X座標
 * @param y2 ドラッグアンドドロップで描いた矩形の右下Y座標
 * @returns topLeft 矩形の左上座標
 * @returns topRight 矩形の右上座標
 * @returns bottomLeft 矩形の左下座標
 * @returns bottomRight 矩形の右下座標
 */
const calculateVertices = (x1, y1, x2, y2) => {
  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectWidth = Math.abs(x1 - x2);
  const rectHeight = Math.abs(y1 - y2);
  return {
    topLeft: { x: rectX, y: rectY + rectHeight },
    topRight: { x: rectX + rectWidth, y: rectY + rectHeight },
    bottomLeft: { x: rectX, y: rectY },
    bottomRight: { x: rectX + rectWidth, y: rectY }
  };
};

/* 座標がポリゴン内にあるかどうか
 * @param coordsList 座標リスト
 * @param polyList ポリゴンのリスト
 * @returns ポリゴン内に座標リストの座標があれば true, そうでなければ false
 */
const isPointInPolygon = (coordsList, polyList) => {
  const poly = turf.polygon([polyList]);
  for (let i = 0; i < coordsList.length; i++) {
    const b = turf.booleanPointInPolygon(turf.point(coordsList[i]), poly);
    if (b === true) {
      return true;
    }
  }
  return false;
};

/* ドラッグアンドドロップで描いた四角形の座標が逸脱範囲内にあるかどうか
 * @param coords 座標リスト
 * @param topLeftX 矩形の左上座標X
 * @param topLeftY 矩形の左上座標Y
 * @param topRightX 矩形の右上座標X
 * @param topRightY 矩形の右上座標Y
 * @param bottomLeftX 矩形の左下座標X
 * @param bottomLeftY 矩形の左下座標Y
 * @param bottomRightX 矩形の右下座標X
 * @param bottomRightY 矩形の右下座標Y
 * @returns 矩形の辺が点線と交差、またはいずれかの角がポリゴン外にあれば true, そうでなければ false
 */
const isInDeviationRange = (coords, topLeftX, topLeftY, topRightX, topRightY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY) => {
  // --- 判定1: 矩形の辺と放物線が交差しているか ---
  const parabolaLine = turf.lineString(coords);
  const rectEdges = [
    turf.lineString([[topLeftX,     topLeftY],    [topRightX,    topRightY]]),    // 上辺
    turf.lineString([[topRightX,    topRightY],   [bottomRightX, bottomRightY]]), // 右辺
    turf.lineString([[bottomRightX, bottomRightY],[bottomLeftX,  bottomLeftY]]),  // 下辺
    turf.lineString([[bottomLeftX,  bottomLeftY], [topLeftX,     topLeftY]]),     // 左辺
  ];
  for (const edge of rectEdges) {
    if (turf.lineIntersect(edge, parabolaLine).features.length > 0) {
      return true;
    }
  }

  // --- 判定2: 4角のいずれかが放物線ポリゴンの外にあるか ---
  const coordsCopy = [...coords];
  const firstElement = coordsCopy[0];
  const lastElement = coordsCopy[coordsCopy.length - 1];
  // 最後の点から minY まで垂直に降ろしてから閉じる（斜め線による誤判定を防ぐ）
  if (lastElement[1] !== firstElement[1]) {
    coordsCopy.push([lastElement[0], firstElement[1]]);
  }
  if (!(coordsCopy[coordsCopy.length - 1][0] === firstElement[0] && coordsCopy[coordsCopy.length - 1][1] === firstElement[1])) {
    coordsCopy.push([firstElement[0], firstElement[1]]);
  }
  const polyParabolaCoords = turf.polygon([coordsCopy]);
  const corners = [
    turf.point([topLeftX,     topLeftY]),
    turf.point([topRightX,    topRightY]),
    turf.point([bottomLeftX,  bottomLeftY]),
    turf.point([bottomRightX, bottomRightY]),
  ];
  for (const pt of corners) {
    if (!turf.booleanPointInPolygon(pt, polyParabolaCoords)) {
      return true;
    }
  }

  return false;
};

/* 標高内にドラッグアンドドロップで描いた四角形の座標があるかどうか
 * @param geoInfo 座標リスト
 * @param bottomLeftX 矩形の左下座標X
 * @param bottomRightX 矩形の右下座標Y
 * @param bottomLeftY 矩形の左下座標Y
 * @returns 矩形の下辺が標高内にあれば true, そうでなければ false
 */
const isInElevation = (geoInfo, bottomLeftX, bottomRightX, bottomLeftY) => {
  const elevations = geoInfo['X'].map((value, index) => [value, geoInfo['altitudeY'][index]]);
  const elevationsLastElement = elevations[elevations.length - 1];
  // 標高を囲み、始点・終点を一致させる
  elevations.push([elevationsLastElement[0], 0]);
  elevations.push([0, 0]);
  elevations.unshift([0, 0]);
  // 四角形の下辺の座標作成
  // 下辺のみ確認すれば問題ないはず
  // x座標を整数で埋める
  const xStart = Math.ceil(bottomLeftX); // 次の整数に切り上げ
  const xEnd = Math.floor(bottomRightX);    // 小数点を切り捨て
  let bottom = [];
  // xの値を範囲内で増加させながら新たな座標を生成する
  for (let x = xStart; x <= xEnd; x++) {
      // y座標は、2つの始点と終点で一定なので、任意のy座標を利用
      bottom.push([x, bottomLeftY]);
  }
  const isBottomElevations = isPointInPolygon(bottom, elevations);
  if (isBottomElevations === true) {
    return true;
  }
  return false;
};

/* 地物内にドラッグアンドドロップで描いた四角形の座標があるかどうかを確認
 * @param geoInfo 座標リスト
 * @param bottomLeftX 矩形の左下座標X
 * @param bottomRightX 矩形の右下座標Y
 * @param bottomLeftY 矩形の左下座標Y
 * @returns 矩形の下辺が地物内にあれば true, そうでなければ false
 */
const isInFeatures = (geoInfo, bottomLeftX, bottomRightX, bottomLeftY) => {
  const features = geoInfo['X'].map((value, index) => [value, geoInfo['bldgY'][index]]);
  const featuresLastElement = features[features.length - 1];
  // 地物を囲み、始点・終点を一致させる
  features.push([featuresLastElement[0], 0]);
  features.push([0, 0]);
  features.unshift([0, 0]);
  // 四角形の下辺の座標作成
  // 下辺のみ確認すれば問題ないはず
  // x座標を整数で埋める
  const xStart = Math.ceil(bottomLeftX); // 次の整数に切り上げ
  const xEnd = Math.floor(bottomRightX);    // 小数点を切り捨て
  let bottom = [];
  // xの値を範囲内で増加させながら新たな座標を生成する
  for (let x = xStart; x <= xEnd; x++) {
      // y座標は、2つの始点と終点で一定なので、任意のy座標を利用
      bottom.push([x, bottomLeftY]);
  }
  const isBottomFeatures = isPointInPolygon(bottom, features);
  if (isBottomFeatures === true) {
    return true;
  }
  return false;
};

/* 矩形座標を結んだ線が最大落下範囲と交わっているかを確認
 * @param prevCoords ひとつ前の座標
 * @param curCoords 現在の座標
 * @param maxFallRangeCoords 最大落下範囲の座標
 * @returns 矩形座標を結んだ線が最大落下範囲と交わっていれば true, そうでなければ false
 */
const isCrossfallToleranceRange = (prevCoords, curCoords, maxFallRangeCoords) => {
  if (prevCoords.length > 0) { // 初回航路点作成時はチェックしない
    // 矩形座標を結んだ線がクロスしているかをチェック
    let lineChecked1;
    let lineChecked2;
    lineChecked1 = turf.lineString([[prevCoords[0][1], prevCoords[0][0]], [curCoords[0][1], curCoords[0][0]]]);
    lineChecked2 = turf.lineString([[prevCoords[1][1], prevCoords[1][0]], [curCoords[1][1], curCoords[1][0]]]);
    let tmpIntersect = turf.lineIntersect(lineChecked1, lineChecked2);
    if (tmpIntersect.features.length > 0) { // ラインがクロスしている場合はクロスしないようにラインを作成する
      console.log(`line cross`);
      lineChecked1 = turf.lineString([[prevCoords[0][1], prevCoords[0][0]], [curCoords[1][1], curCoords[1][0]]]);
      lineChecked2 = turf.lineString([[prevCoords[1][1], prevCoords[1][0]], [curCoords[0][1], curCoords[0][0]]]);
    }
    for (let j =0; j < maxFallRangeCoords.length - 1; j++) {
      let fallToleranceRangeLine = turf.lineString([
        [maxFallRangeCoords[j][1], maxFallRangeCoords[j][0]],
        [maxFallRangeCoords[j + 1][1], maxFallRangeCoords[j + 1][0]]
      ]);
      let tmp1 = turf.lineIntersect(lineChecked1, fallToleranceRangeLine);
      let tmp2 = turf.lineIntersect(lineChecked2, fallToleranceRangeLine);
      if (tmp1.features.length > 0 || tmp2.features.length > 0) {
        return true;
      }
    }
  }
  return false;
}

/* 矩形が登録済み航路の逸脱範囲と重なるケース、または包含するケースをチェック
 * @param polygon ランドマークの座標リスト
 * @param volTest ランドマークの座標リスト
 * @param terrainCoords 現在描画しているランドマークの座標
 * @param dist 落下節の長さ
 * @returns 矩形が逸脱範囲と重なる、または包含する場合は true, そうでなければ false
 */
const isExistingAirwaysIntersectOrContains = (polygon, volTest, dist) => {
  const volLines = [];
  for (let i=0; i<volTest.length; i++) {
    for (let j=0; j<volTest[i].length-1; j++) {
      const x1 = volTest[i][j].x
      const y1 = volTest[i][j].y
      const x2 = volTest[i][j+1].x
      const y2 = volTest[i][j+1].y
      const line = turf.lineString([
        [x1, y1],
        [x2, y2]
      ]);
      volLines.push(line);
    }
  }

  for (let i=0; i<volLines.length; i++) {
    const intersection = turf.lineIntersect(volLines[i], polygon);
    const isContained = turf.booleanContains(polygon, volLines[i]);
    if (intersection.features.length > 0 || isContained) {
      console.log(intersection.features.length, isContained)
      return true;
    }
  }
}

/* 矩形が下部の高度リストと重なるケース、または包含するケースをチェック
 * @param polygon 矩形のポリゴン
 * @param terrainCoords 下部の高度リスト
 * @param dist 落下節の長さ
 * @returns 矩形が下部の高度リストと重なる、または包含する場合は true, そうでなければ false
 */
const isAltitudeListIntersectOrContains = (polygon, terrainCoords, dist) => {
  const terrainLines = [];
  const terrainLists = [];
  for (let i=0; i<terrainCoords.length; i++) {
    const x = terrainCoords[i][0]
    const y = terrainCoords[i][1]
    terrainLists.push([x, y]);
  }
  // X座標の昇順にソート
  terrainLists.sort((a, b) => a[0] - b[0])
  terrainLists.unshift([0,0]);
  terrainLists.push([Math.floor(dist),0]);
  terrainLists.push([0,0]);
  const terrainPolygon = turf.polygon([
    terrainLists
  ])
  // ポリゴン内に含まれるかどうか
  const isContained = turf.booleanContains(terrainPolygon, polygon);
  if (isContained) {
    console.log("矩形が高度リスト内に含まれています。")
    return true;
  }

  // ポリゴンと交差するかどうか
  for (let i=0; i<terrainLists.length-1; i++) {
    const x1 = terrainLists[i][0]
    const y1 = terrainLists[i][1]
    const x2 = terrainLists[i+1][0]
    const y2 = terrainLists[i+1][1]
    const line = turf.lineString([
      [x1, y1],
      [x2, y2]
    ]);
    terrainLines.push(line);
  }
  for (let i=0; i<terrainLines.length; i++) {
    const intersection = turf.lineIntersect(terrainLines[i], polygon);
    if (intersection.features.length > 0) {
      console.log("矩形が高度リストと重なっています。")
      return true;
    }
  }
  return false;
}

/* 2点間を結ぶ線上の地点の緯度・経度を計算
 * @param dist 落下節の長さ
 * @param topLeftX 矩形の左上座標X
 * @param topRightX 矩形の右上座標X
 * @param topLeftY 矩形の左上座標Y
 * @param bottomLeftY 矩形の左下座標Y
 * @param intersections 落下節と最大落下範囲の交点座標
 * @param airwayMargin マージン
 * @returns 座標
 */
export const interpolateLatLng = (dist, topLeftX, topRightX, topLeftY, bottomLeftY, intersections, airwayMargin=10) => {
  const t1 = Math.round(topLeftX) / dist;
  const lat1 = intersections[0][0] + (intersections[1][0] - intersections[0][0]) * t1;
  const lng1 = intersections[0][1] + (intersections[1][1] - intersections[0][1]) * t1;
  const lat1Airway = lat1 + (intersections[1][0] - intersections[0][0]) * airwayMargin / dist;
  const lng1Airway = lng1 + (intersections[1][1] - intersections[0][1]) * airwayMargin / dist;

  const t2 = Math.round(topRightX) / dist;
  const lat2 = intersections[0][0] + (intersections[1][0] - intersections[0][0]) * t2;
  const lng2 = intersections[0][1] + (intersections[1][1] - intersections[0][1]) * t2;
  const lat2Airway = lat2 - (intersections[1][0] - intersections[0][0]) * airwayMargin / dist;
  const lng2Airway = lng2 - (intersections[1][1] - intersections[0][1]) * airwayMargin / dist;

  // 航路情報の高さは標高
  const topHeight = Math.round(topLeftY);
  const bottomHeight = Math.round(bottomLeftY);
  return {
    lat1,
    lng1,
    lat1Airway,
    lng1Airway,
    lat2,
    lng2,
    lat2Airway,
    lng2Airway,
    topHeight,
    bottomHeight
  }
}

export function createLineChart(canvas, geoInfo, dist, maxParabolaHeight, chartMarginY=5, plugins = []) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: geoInfo['X'],
      datasets: [
        {
          label: '標高',
          data: geoInfo['altitudeY'],
          tension: 0,
          borderColor: 'rgb(83, 90, 110)',
          backgroundColor: 'rgb(83, 90, 110)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: '地物',
          data: geoInfo['bldgY'],
          tension: 0,
          borderColor: 'rgb(83, 90, 110)',
          backgroundColor: 'rgb(83, 90, 110)',
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      layout: {
        padding: {
          top: 25,
          left: 20,
          bottom: 5,
          right: 30
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: Math.floor(dist),
          ticks: {
            callback: function(value, index, ticks) {
              if (!Number.isInteger(value)) return '';
              // 最後のティックにのみ (m) を付加
              if (index === ticks.length - 1) return value + ' (m)';
              return value;
            },
            stepSize: 100,
          }
        },
        y: {
          type: "linear",
          beginAtZero: false,
          min: Math.floor(geoInfo['minAltitude'] ?? 0), // Y軸最小値（標高最小値）
          max: Math.floor(maxParabolaHeight) + chartMarginY, // Y軸最大
          title: {
            display: false,
          },
          ticks: {
            callback: function(value, index, ticks) {
              if (Number.isInteger(value)) return value;
              return '';
            },
            stepSize: 100 // 目盛り間隔
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      elements: {
        line: { tension: 0.4 }, // 曲線の角度
        point: {
          radius: 0, // プロットを非表示にする
          backgroundColor: '#42A5F5', // 背景色
          borderColor: '#42A5F5', // 枠線色
        },
      },
    },
    plugins
  });
}

export function createChartWindowDom(LandmarkIndex, options = {}) {
  const showCancelButton = options.showCancelButton !== undefined ? options.showCancelButton : true;
  const elements = {};

  // Roboto フォントをCDNから動的に読み込む (未追加の場合のみ)
  if (!document.getElementById('roboto-font-link')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'roboto-font-link';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap';
    document.head.appendChild(fontLink);
  }

  // 親コンテナ (flexbox column レイアウト)
  elements.container = L.DomUtil.create('div', 'custom-control');
  elements.container.style.position = 'absolute';
  elements.container.style.fontFamily = "'Roboto', sans-serif";
  elements.container.style.left = '10px';
  elements.container.style.bottom = '30px';
  elements.container.style.width = '50dvh';
  elements.container.style.height = '65dvh';
  elements.container.style.backgroundColor = '#FFFFFF';
  elements.container.style.border = '1px solid #cccccc';
  elements.container.style.borderRadius = '12px';
  elements.container.style.overflow = 'hidden';
  elements.container.style.display = 'flex';
  elements.container.style.flexDirection = 'column';
  elements.container.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
  elements.container.id = "div1";
  L.DomEvent.disableClickPropagation(elements.container);

  // 設定部分 (アイコン + 入力テキスト + ×ボタン) ← 1行目
  elements.LDN_Setting = document.createElement('div');
  elements.LDN_Setting.setAttribute("class", "LDN_Setting");
  elements.LDN_Setting.id = "LDN_Setting";
  elements.LDN_Setting.style.display = 'flex';
  elements.LDN_Setting.style.flexShrink = '0';
  elements.LDN_Setting.style.alignItems = 'center';
  elements.LDN_Setting.style.paddingLeft = '16px';
  elements.LDN_Setting.style.paddingRight = '8px';
  elements.LDN_Setting.style.paddingTop = '16px';
  elements.container.appendChild(elements.LDN_Setting);

  // LandmarkNumber SVG/icon 生成
  let iconSizeW = 33.818;
  let iconSizeH = 33.818;
  const svgText = svgTemplateNumber(LandmarkIndex, iconSizeW, iconSizeH);
  const domParser = new DOMParser();
  const parsedSVGDoc = domParser.parseFromString(svgText, 'image/svg+xml');
  const LandmarkSVG = parsedSVGDoc.childNodes[0];
  LandmarkSVG.style.flexShrink = '0';
  const LDN_Setting = elements.LDN_Setting;
  LDN_Setting.appendChild(LandmarkSVG);

  // 航路点名 input (幅広く・プレースホルダあり)
  const input_LDN = document.createElement('input');
  input_LDN.setAttribute("type", "text");
  input_LDN.id = "LandMarkName";
  input_LDN.setAttribute("maxlength", "200");
  input_LDN.setAttribute("placeholder", "航路点名を入力してください");
  input_LDN.style.border = '1px solid #ccc';
  input_LDN.style.borderRadius = '6px';
  input_LDN.style.flex = '1';
  input_LDN.style.minWidth = '0';
  input_LDN.style.marginLeft = '8px';
  input_LDN.style.padding = '2px 4px';
  LDN_Setting.appendChild(input_LDN);
  elements.inputElement = input_LDN; // 直接参照を保持

  // ×ボタン (アイコン+入力行の右端)
  elements.cancelButton = document.createElement('button');
  elements.cancelButton.textContent = '×';
  elements.cancelButton.type = 'button';
  elements.cancelButton.style.background = 'none';
  elements.cancelButton.style.border = 'none';
  elements.cancelButton.style.fontSize = '1.2rem';
  elements.cancelButton.style.cursor = 'pointer';
  elements.cancelButton.style.color = '#666';
  elements.cancelButton.style.lineHeight = '1';
  elements.cancelButton.style.padding = '0 6px';
  elements.cancelButton.style.marginLeft = '8px';
  elements.cancelButton.style.flexShrink = '0';
  elements.cancelButton.style.alignSelf = 'center';
  elements.cancelButton.title = 'キャンセル';
  if (!showCancelButton) {
    elements.cancelButton.style.display = 'none';
  }
  LDN_Setting.appendChild(elements.cancelButton);

  // キャプションブロック
  const captionBlock = document.createElement('div');
  captionBlock.style.flexShrink = '0';
  captionBlock.style.margin = '6px 16px 2px 16px';
  elements.container.appendChild(captionBlock);

  // キャプション「高度・幅設定」(大きく太字)
  elements.chartlabel = document.createElement('div');
  elements.chartlabel.style.display = 'flex';
  elements.chartlabel.style.alignItems = 'center';
  elements.chartlabel.style.gap = '4px';
  captionBlock.appendChild(elements.chartlabel);

  const captionTitle = document.createElement('span');
  captionTitle.innerText = '高度・幅設定';
  captionTitle.style.fontSize = '1rem';
  captionTitle.style.fontWeight = '700';
  captionTitle.style.fontFamily = "'Roboto', sans-serif";
  elements.chartlabel.appendChild(captionTitle);

  // エラーメッセージ
  elements.errorMsg = document.createElement('span');
  elements.errorMsg.textContent = '';
  elements.errorMsg.style.marginLeft = '2px';
  elements.errorMsg.style.color = 'red';
  elements.errorMsg.style.fontSize = '0.75rem';
  elements.chartlabel.appendChild(elements.errorMsg);

  // 説明文
  const captionDesc = document.createElement('div');
  captionDesc.innerText = '「矩形」を調整し、航路の高度と幅を設定してください。';
  captionDesc.style.fontSize = '0.72rem';
  captionDesc.style.color = '#888';
  captionDesc.style.marginTop = '1px';
  captionDesc.style.fontFamily = "'Roboto', sans-serif";
  captionBlock.appendChild(captionDesc);

  // チャートCanvas ラッパー (flex:1 で残り高さを占有)
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.flex = '1';
  canvasWrapper.style.minHeight = '0';
  canvasWrapper.style.padding = '0 10px';
  canvasWrapper.style.position = 'relative';
  elements.container.appendChild(canvasWrapper);

  // チャート用Canvas
  elements.chartCanvas = document.createElement('canvas');
  canvasWrapper.appendChild(elements.chartCanvas);

  // 保存ボタン行 (右寄せ)
  const saveButtonRow = document.createElement('div');
  saveButtonRow.style.display = 'flex';
  saveButtonRow.style.justifyContent = 'flex-end';
  saveButtonRow.style.padding = '0 10px 6px 10px';
  saveButtonRow.style.flexShrink = '0';
  elements.container.appendChild(saveButtonRow);

  // 保存ボタン
  elements.saveButton = document.createElement('button');
  elements.saveButton.textContent = '保存';
  elements.saveButton.type = 'button';
  elements.saveButton.style.width = '34%';
  elements.saveButton.style.padding = '4px 0';
  elements.saveButton.style.backgroundColor = 'white';
  elements.saveButton.style.color = '#333';
  elements.saveButton.style.border = '1px solid #bbb';
  elements.saveButton.style.borderRadius = '999px';
  elements.saveButton.style.cursor = 'pointer';
  elements.saveButton.style.fontSize = '0.9rem';
  elements.saveButton.style.textAlign = 'center';
  saveButtonRow.appendChild(elements.saveButton);

  return elements;
}

// 航路の矩形を作成できる範囲
export function createFlightAreaPlugin({ dist, maxParabolaHeight, parabolaList, chartMarginY=5, chartMinY=0 }) {
  // Y軸の表示域: [chartMinY, maxParabolaHeight + chartMarginY]
  const yRange = maxParabolaHeight + chartMarginY - chartMinY;
  const toPixelY = (bottom, diffY, dataY) =>
    bottom - ((dataY - chartMinY) / yRange * diffY);

  return {
    id: "flightAreaPlugin",
    // グラフエリアの背景を塗りつぶす (地形・放物線より後ろ)
    beforeDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const { left, right, top, bottom } = chartArea;
      ctx.save();
      ctx.fillStyle = 'rgb(221, 222, 226)';
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.restore();
    },
    // 放物線を地形データセット描画の前に描く → 地形が手前になる
    beforeDatasetsDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const { left, right, top, bottom } = chartArea;
      const diffX = right - left;
      const diffY = bottom - top;

      // 放物線の内側を白で塗りつぶし
      // 最後の放物線点のX座標を追跡し、そこから垂直に底辺へ降りることで斜め線を防ぐ
      let lastParabolaX = left;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      parabolaList.forEach((coord) => {
        const x = coord[0] / dist * diffX + left;
        const y = toPixelY(bottom, diffY, coord[1]);
        ctx.lineTo(x, y);
        lastParabolaX = x;
      });
      ctx.lineTo(lastParabolaX, bottom); // 最後の点から垂直に底辺へ
      ctx.lineTo(right, bottom);          // 底辺を右端まで
      ctx.closePath();
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fill();
      ctx.restore();

      // 放物線の輪郭を太い点線で描画
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      parabolaList.forEach((coord) => {
        const x = coord[0] / dist * diffX + left;
        const y = toPixelY(bottom, diffY, coord[1]);
        ctx.lineTo(x, y);
      });
      ctx.lineTo(lastParabolaX, bottom); // 最後の点から垂直に底辺へ
      ctx.lineTo(right, bottom);          // 底辺を右端まで
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgb(83, 90, 110)';
      ctx.stroke();
      ctx.restore();
    },
  };
}

export function createTextPlugin() {
  return {
    id: 'textPlugin',
    afterDraw: (chart) => {
      const { ctx, chartArea: { top, left, right } } = chart;
      ctx.save();

      ctx.font = '11px Arial';
      ctx.fillStyle = 'black';

      // グラフ左上に "(L)" 小さく表示
      ctx.textAlign = 'left';
      ctx.fillText('(L)', left + 2, top + 14);

      // グラフ右上に "(R)" 小さく表示
      ctx.textAlign = 'right';
      ctx.fillText('(R)', right - 2, top + 14);

      // Y軸最上位の目盛り数字の真上に "(m)" 表示
      const yScale = chart.scales.y;
      ctx.font = '11px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('(m)', yScale.right, yScale.top - 6);

      ctx.restore();
    }
  }
}

// 逸脱範囲矩形の描画
function drawRect(chart, airwayMargin=10) {
  const ctx = chart.ctx;
  const { rect, isEditing, mouseX, mouseY, mouseInCanvas, isResizing } = chart.dragData;

  if (rect) {
    // 矩形本体: 青色太線 + 薄青塗り
    ctx.save();
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 102, 255, 0.15)';
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 編集モード時のみ9点に□ハンドル表示 (4隅 + 4辺中点 + 中央)
    if (isEditing) {
      const mx = rect.x + rect.width / 2;
      const my = rect.y + rect.height / 2;
      const handlePositions = [
        { x: rect.x,              y: rect.y },               // 左上
        { x: rect.x + rect.width, y: rect.y },               // 右上
        { x: rect.x,              y: rect.y + rect.height }, // 左下
        { x: rect.x + rect.width, y: rect.y + rect.height }, // 右下
        { x: mx,                  y: rect.y },               // 上中点
        { x: mx,                  y: rect.y + rect.height }, // 下中点
        { x: rect.x,              y: my },                   // 左中点
        { x: rect.x + rect.width, y: my },                   // 右中点
        { x: mx,                  y: my },                   // 中央
      ];
      const markerSize = 8;
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      handlePositions.forEach((pos) => {
        ctx.fillRect(pos.x - markerSize / 2, pos.y - markerSize / 2, markerSize, markerSize);
        ctx.strokeRect(pos.x - markerSize / 2, pos.y - markerSize / 2, markerSize, markerSize);
      });
      ctx.restore();
    }

    // --- 矩形寸法表示 (伸縮ドラッグ中のみ) ---
    if (isResizing) {
      const scales = chart.scales;
      if (scales && scales.x && scales.y) {
        const xLeft  = scales.x.getValueForPixel(rect.x);
        const xRight = scales.x.getValueForPixel(rect.x + rect.width);
        const yTop   = scales.y.getValueForPixel(rect.y);
        const yBtm   = scales.y.getValueForPixel(rect.y + rect.height);
        const wVal   = Math.abs(Math.round(xRight - xLeft));
        const hVal   = Math.abs(Math.round(yTop   - yBtm));
        const wText  = `横 ${wVal}m`;
        const hText  = `縦 ${hVal}m`;
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = 'rgba(0, 60, 160, 0.90)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        const cx = rect.x + rect.width  / 2;
        const cy = rect.y + rect.height / 2;
        // 横幅ラベル: 矩形上辺の中央上
        ctx.fillText(wText, cx, rect.y - 10);
        // 縦幅ラベル: 矩形左辺の中央左 (90度回転)
        ctx.save();
        ctx.translate(rect.x - 12, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(hText, 0, 0);
        ctx.restore();
        ctx.restore();
      }
    }
  }

  // --- 高度ホバーツールチップ (最前面・グラフエリア内のみ表示) ---
  const ca = chart.chartArea;
  const mouseInChartArea = mouseInCanvas && ca &&
    mouseX >= ca.left && mouseX <= ca.right &&
    mouseY >= ca.top  && mouseY <= ca.bottom;
  if (mouseInChartArea) {
    const scales = chart.scales;
    if (scales && scales.y) {
      const altValue = scales.y.getValueForPixel(mouseY);
      if (altValue !== undefined && altValue !== null) {
        const altText = `高度 ${Math.round(altValue)}m`;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        const padding = 6;
        const textW = ctx.measureText(altText).width;
        const boxW = textW + padding * 2;
        const boxH = 22;
        let tx = mouseX + 16;
        let ty = mouseY - boxH / 2;
        // グラフエリア端を越えないよう調整
        if (tx + boxW > ca.right)  tx = mouseX - boxW - 8;
        if (ty < ca.top)           ty = ca.top;
        if (ty + boxH > ca.bottom) ty = ca.bottom - boxH;
        ctx.fillStyle = 'rgba(30, 30, 30, 0.80)';
        ctx.fillRect(tx, ty, boxW, boxH);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(altText, tx + padding, ty + boxH / 2);
        ctx.restore();
      }
    }
  }
}

const updateRectangleCoords = (dist, rect, chart, intersections, drawJunctionIcon, airwayMargin) => {
  if (!rect) return;
  // 逸脱範囲の矩形
  let rectangleCoords = {}
  let curLandmark = [];
  let curCoords = [];
  const scales = chart.scales;
  rectangleCoords = {
    topLeft: {
      x: scales.x.getValueForPixel(rect.x),
      y: scales.y.getValueForPixel(rect.y),
    },
    topRight: {
      x: scales.x.getValueForPixel(rect.x + rect.width),
      y: scales.y.getValueForPixel(rect.y),
    },
    bottomLeft: {
      x: scales.x.getValueForPixel(rect.x),
      y: scales.y.getValueForPixel(rect.y + rect.height),
    },
    bottomRight: {
      x: scales.x.getValueForPixel(rect.x + rect.width),
      y: scales.y.getValueForPixel(rect.y + rect.height),
    },
  };

  const ret = interpolateLatLng(
    dist,
    rectangleCoords.topLeft.x,
    rectangleCoords.topRight.x,
    rectangleCoords.topLeft.y,
    rectangleCoords.bottomLeft.y,
    intersections,
    airwayMargin
  )
  chart.$resCoords = chart.$resCoords || {};
  chart.$resCoords = ret
  curCoords[0] = [ret.lat1, ret.lng1]
  curCoords[1] = [ret.lat2, ret.lng2]
  const midLat = (ret.lat1 + ret.lat2) / 2;
  const midLng = (ret.lng1 + ret.lng2) / 2;
  chart.$curLandmark = chart.$curLandmark || [];
  curLandmark = [midLat, midLng]
  chart.$curLandmark = curLandmark;
  drawJunctionIcon();

  return {
    rectangleCoords,
    curCoords
  };
};

const updateRectangle = (rect, marker, mouseX, mouseY) => {
  switch (marker) {
    case "topLeft":
      rect.width += rect.x - mouseX;
      rect.height += rect.y - mouseY;
      rect.x = mouseX;
      rect.y = mouseY;
      break;
    case "topRight":
      rect.width = mouseX - rect.x;
      rect.height += rect.y - mouseY;
      rect.y = mouseY;
      break;
    case "bottomLeft":
      rect.width += rect.x - mouseX;
      rect.height = mouseY - rect.y;
      rect.x = mouseX;
      break;
    case "bottomRight":
      rect.width = mouseX - rect.x;
      rect.height = mouseY - rect.y;
      break;
    case "topCenter": // 上辺の中央
      rect.height += rect.y - mouseY;
      rect.y = mouseY;
      break;
    case "bottomCenter": // 下辺の中央
      rect.height = mouseY - rect.y;
      break;
    case "leftCenter": // 左辺の中央
      rect.width += rect.x - mouseX;
      rect.x = mouseX;
      break;
    case "rightCenter": // 右辺の中央
      rect.width = mouseX - rect.x;
      break;
  }
};

// 矩形描画プラグイン
export function createChartDragPlugin({
  dist,
  geoInfo,
  errorMsg,
  initDragPolylineMarker,
  parabolaCoordsTmp,
  prevCoords,
  selectedMaxFallRangeCoords,
  connectLandmark,
  airwayMargin,
  aircraftLength,
  intersections,
  drawJunctionIcon,
  existingAirwaysCoords,
  terrainCoords,
  optionCallbacks,
  initialRectData = null, // 初期矩形データ (newPoints ref): 航路点追加時の既存航路点矩形表示用
}) {
  return {
    id: "dragPlugin",
    beforeInit(chart) {
      const canvas = chart.canvas;
      const dragData = {
        rect: null,
        isDragging: false,
        activeMarker: null,
        isEditing: false,  // 矩形作成後の編集モード
        isMoving: false,   // 矩形移動モード
        moveStartX: 0,
        moveStartY: 0,
        initialRectInitialized: false, // 初期矩形の初期化フラグ
        mouseX: 0,         // ホバー表示用マウス座標
        mouseY: 0,
        mouseInCanvas: false,
        isResizing: false, // 伸縮ドラッグ中フラグ
      };
      let rectangleCoords = {}
      let curCoords = [];
      let lastValidRect = null; // エラー時に戻すための直前の有効な矩形

      // 矩形を正規化 (width/height を正の値に統一)
      const normalizeRect = (rect) => {
        if (rect.width < 0)  { rect.x += rect.width;  rect.width  = -rect.width;  }
        if (rect.height < 0) { rect.y += rect.height; rect.height = -rect.height; }
      };

      // 角ハンドルのヒット検出 (矩形は正規化済み前提)
      const getHitHandle = (rect, mouseX, mouseY, hitRadius = 9) => {
        const mx = rect.x + rect.width / 2;
        const my = rect.y + rect.height / 2;
        const handles = {
          topLeft:      { x: rect.x,              y: rect.y },
          topRight:     { x: rect.x + rect.width, y: rect.y },
          bottomLeft:   { x: rect.x,              y: rect.y + rect.height },
          bottomRight:  { x: rect.x + rect.width, y: rect.y + rect.height },
          topCenter:    { x: mx,                  y: rect.y },
          bottomCenter: { x: mx,                  y: rect.y + rect.height },
          leftCenter:   { x: rect.x,              y: my },
          rightCenter:  { x: rect.x + rect.width, y: my },
          center:       { x: mx,                  y: my },
        };
        for (const [name, pos] of Object.entries(handles)) {
          const dx = mouseX - pos.x;
          const dy = mouseY - pos.y;
          if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) return name;
        }
        return null;
      };

      // 矩形内部かどうか (正規化済み前提)
      const isInsideRect = (rect, mouseX, mouseY) =>
        mouseX >= rect.x && mouseX <= rect.x + rect.width &&
        mouseY >= rect.y && mouseY <= rect.y + rect.height;

      // ドラッグ時のエラー処理
      const dragError = (errMsg) => {
        console.log(errMsg);
        errorMsg.textContent = errMsg;
        if (lastValidRect) {
          // 既存の矩形を直前の有効位置に戻す
          dragData.rect = { ...lastValidRect };
          dragData.isEditing = true;
          const ret = updateRectangleCoords(dist, dragData.rect, chart, intersections, drawJunctionIcon, airwayMargin);
          rectangleCoords = ret.rectangleCoords;
          curCoords = ret.curCoords;
          connectLandmark();
          chart.update();
        } else {
          // 初回描画で無効 → 完全クリア
          chart.$curLandmark = [];
          dragData.rect = null;
          dragData.isEditing = false;
          initDragPolylineMarker();
          if (optionCallbacks.addMiddleMarkerPolyline && optionCallbacks.middlePointPlugin) {
            optionCallbacks.addMiddleMarkerPolyline();
            chart.config.plugins.push(optionCallbacks.middlePointPlugin);
          }
          chart.update();
        }
      };

      // --- 共通ハンドラ (マウス・タッチ兼用) ---
      const handlePointerDown = (mouseX, mouseY) => {
        // 描画・ドラッグ開始時にエラーメッセージをクリア
        errorMsg.textContent = '';

        // initialRectData から初期化された矩形の場合、最初の操作で lastValidRect を同期
        if (lastValidRect === null && dragData.rect !== null && dragData.isEditing) {
          lastValidRect = { ...dragData.rect };
        }

        // 編集モード中: ハンドル or 内部クリックを優先
        if (dragData.isEditing && dragData.rect) {
          const handle = getHitHandle(dragData.rect, mouseX, mouseY);
          if (handle) {
            // ドラッグ開始前に現在の有効な矩形を保存
            lastValidRect = { ...dragData.rect };
            if (handle === 'center') {
              // 中央ハンドル = 移動
              dragData.isDragging = true;
              dragData.activeMarker = null;
              dragData.isMoving = true;
              dragData.moveStartX = mouseX;
              dragData.moveStartY = mouseY;
            } else {
              dragData.isDragging = true;
              dragData.activeMarker = handle;
              dragData.isMoving = false;
            }
            return;
          }
          if (isInsideRect(dragData.rect, mouseX, mouseY)) {
            // 移動開始前に現在の有効な矩形を保存
            lastValidRect = { ...dragData.rect };
            dragData.isDragging = true;
            dragData.activeMarker = null;
            dragData.isMoving = true;
            dragData.moveStartX = mouseX;
            dragData.moveStartY = mouseY;
            return;
          }
          // 矩形外をクリック → 編集モード終了して新たに描画
          dragData.isEditing = false;
        }

        // 新規描画開始 → 保存済みの有効矩形をリセット
        lastValidRect = null;

        // 新規矩形描画
        dragData.rect = null;
        chart.update();
        dragData.rect = { x: mouseX, y: mouseY, width: 0, height: 0 };
        dragData.isDragging = true;
        dragData.activeMarker = null;
        dragData.isMoving = false;

        if (optionCallbacks.clearMiddleMarkerPolyline) {
          optionCallbacks.clearMiddleMarkerPolyline();
          const pluginIndex = chart.config.plugins.findIndex(p => p.id === 'middlePlugin');
          if (pluginIndex !== -1) {
            chart.config.plugins.splice(pluginIndex, 1);
            chart.update();
          }
        }
      };

      const handlePointerMove = (mouseX, mouseY, updateCursor) => {
        // マウス座標を常に更新 (ホバーツールチップ用)
        dragData.mouseX = mouseX;
        dragData.mouseY = mouseY;
        dragData.mouseInCanvas = true;

        // 非ドラッグ時のカーソル更新 (編集モード、マウスのみ)
        if (!dragData.isDragging) {
          if (updateCursor) {
            if (dragData.isEditing && dragData.rect) {
              const handle = getHitHandle(dragData.rect, mouseX, mouseY);
              if (handle === 'topLeft' || handle === 'bottomRight') {
                canvas.style.cursor = 'nwse-resize';
              } else if (handle === 'topRight' || handle === 'bottomLeft') {
                canvas.style.cursor = 'nesw-resize';
              } else if (handle === 'leftCenter' || handle === 'rightCenter') {
                canvas.style.cursor = 'ew-resize';
              } else if (handle === 'topCenter' || handle === 'bottomCenter') {
                canvas.style.cursor = 'ns-resize';
              } else if (handle === 'center') {
                canvas.style.cursor = 'move';
              } else if (isInsideRect(dragData.rect, mouseX, mouseY)) {
                canvas.style.cursor = 'move';
              } else {
                canvas.style.cursor = 'crosshair';
              }
            } else {
              canvas.style.cursor = 'crosshair';
            }
          }
          chart.update('none'); // ホバーツールチップ再描画
          return;
        }
        if (!dragData.rect) return;

        // 移動モード
        if (dragData.isMoving) {
          dragData.rect.x += mouseX - dragData.moveStartX;
          dragData.rect.y += mouseY - dragData.moveStartY;
          dragData.moveStartX = mouseX;
          dragData.moveStartY = mouseY;
        } else if (dragData.activeMarker) {
          updateRectangle(dragData.rect, dragData.activeMarker, mouseX, mouseY);
        } else {
          // 新規ドラッグ描画
          dragData.rect.width  = mouseX - dragData.rect.x;
          dragData.rect.height = mouseY - dragData.rect.y;
        }

        // 伸縮ドラッグ中かどうか更新 (移動・中央ハンドルは除外)
        dragData.isResizing = !dragData.isMoving && (
          (dragData.activeMarker !== null && dragData.activeMarker !== 'center') ||
          dragData.activeMarker === null
        );

        const ret = updateRectangleCoords(dist, dragData.rect, chart, intersections, drawJunctionIcon, airwayMargin);
        rectangleCoords = ret.rectangleCoords;
        curCoords = ret.curCoords;
        connectLandmark();
        chart.update();
      };

      const handlePointerUp = () => {
        dragData.isDragging = false;
        dragData.activeMarker = null;
        dragData.isMoving = false;
        dragData.isResizing = false; // 伸縮ドラッグ終了 → 寸法ラベル消去
        canvas.style.cursor = 'crosshair';

        if (!dragData.rect) return;

        // 矩形を正規化し編集モードへ移行
        normalizeRect(dragData.rect);
        dragData.isEditing = true;

        const ret = updateRectangleCoords(dist, dragData.rect, chart, intersections, drawJunctionIcon, airwayMargin); // スケール変換後の座標を更新        
        rectangleCoords = ret.rectangleCoords;
        /*
          以下の場合はエラーとする
          ・最小航路幅(機体の最大幅+マージン)より小さい
          ・矩形の上辺・下辺の高さが逆転する
        */
        const topHeight = Math.round(rectangleCoords.topLeft.y);
        const bottomHeight = Math.round(rectangleCoords.bottomRight.y);
        const x = Math.round(Math.abs(rectangleCoords.topRight.x - rectangleCoords.topLeft.x))
        const y = Math.round(Math.abs(rectangleCoords.topLeft.y - rectangleCoords.bottomLeft.y))
        const minAirwayLength = Math.round(aircraftLength + airwayMargin)
        if (topHeight - airwayMargin <= bottomHeight + airwayMargin
          || x <= minAirwayLength
          || y <= minAirwayLength
        ) {
          dragError(rectTooSmallErrorMsg);
          return;
        }

        curCoords = ret.curCoords;
        chart.update(); // 正規化後の矩形と角ハンドルを再描画

        // ドラッグアンドドロップをどの位置から始めても問題ないように対応
        const vertices = calculateVertices(
          rectangleCoords.topLeft.x,
          rectangleCoords.topLeft.y,
          rectangleCoords.bottomRight.x,
          rectangleCoords.bottomRight.y
        );

        const polygon = turf.polygon([
          [
            [vertices.topLeft.x, vertices.topLeft.y], // 左上
            [vertices.topLeft.x, vertices.bottomRight.y], // 左下
            [vertices.bottomRight.x, vertices.bottomRight.y], // 右下
            [vertices.bottomRight.x, vertices.topLeft.y], // 右下
            [vertices.topLeft.x, vertices.topLeft.y], // 左上
          ]
        ])

        let b = false;
        // TODO チェックする順番要確認
        // 下部の高度リストと矩形が交わるまたは含まれているか
        b = isAltitudeListIntersectOrContains(polygon, terrainCoords, dist);
        if (b) {
          // TODO 文言要確認
          dragError(featuresErrorMsg);
          return;
        }

        // 既存航路と矩形が交わっているかどうか
        b = isExistingAirwaysIntersectOrContains(polygon, existingAirwaysCoords);
        if (b) {
          dragError(multiErrorMsg);
          return;
        }

        // ドラッグアンドドロップで描いた四角形の座標が逸脱範囲内にあるかどうかを確認
        b = isInDeviationRange(
          parabolaCoordsTmp,
          vertices.topLeft.x,
          vertices.topLeft.y,
          vertices.topRight.x,
          vertices.topRight.y,
          vertices.bottomLeft.x,
          vertices.bottomLeft.y,
          vertices.bottomRight.x,
          vertices.bottomRight.y
        );
        if (b) {
          dragError(rangeErrorMsg);
          return;
        }

        // 標高内にドラッグアンドドロップで描いた四角形の座標があるかどうかを確認
        b = isInElevation(
          geoInfo,
          vertices.bottomLeft.x,
          vertices.bottomRight.x,
          vertices.bottomLeft.y
        );
        if (b) {
          dragError(elevationsErrorMsg);
          return;
        }

        // 地物内にドラッグアンドドロップで描いた四角形の座標があるかどうかを確認
        b = isInFeatures(
          geoInfo,
          vertices.bottomLeft.x,
          vertices.bottomRight.x,
          vertices.bottomLeft.y
        );
        if (b) {
          dragError(featuresErrorMsg);
          return;
        }

        // 矩形座標を結んだ線が最大落下範囲と交わっているかを確認
        b = isCrossfallToleranceRange(
          prevCoords,
          curCoords,
          selectedMaxFallRangeCoords.value
        )
        if (b) {
          dragError(fallToleranceRangeErrorMsg);
          return;
        }
        errorMsg.textContent = '';
        // バリデーション全通過 → 現在の矩形を有効な矩形として保存
        lastValidRect = { ...dragData.rect };
      };

      const handlePointerLeave = () => {
        dragData.mouseInCanvas = false;
        chart.update('none'); // ツールチップ消去
      };

      // Mouse events
      canvas.addEventListener("mousedown", (event) => {
        const bounds = canvas.getBoundingClientRect();
        const mouseX = event.clientX - bounds.left;
        const mouseY = event.clientY - bounds.top;
        handlePointerDown(mouseX, mouseY);
      });

      canvas.addEventListener("mousemove", (event) => {
        const bounds = canvas.getBoundingClientRect();
        const mouseX = event.clientX - bounds.left;
        const mouseY = event.clientY - bounds.top;
        handlePointerMove(mouseX, mouseY, true);
      });

      canvas.addEventListener("mouseleave", () => {
        handlePointerLeave();
      });

      canvas.addEventListener("mouseup", () => {
        handlePointerUp();
      });

      // Touch events
      canvas.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) return;
        event.preventDefault();
        const touch = event.touches[0];
        const bounds = canvas.getBoundingClientRect();
        handlePointerDown(touch.clientX - bounds.left, touch.clientY - bounds.top);
      }, { passive: false });

      canvas.addEventListener("touchmove", (event) => {
        if (event.touches.length !== 1) return;
        event.preventDefault();
        const touch = event.touches[0];
        const bounds = canvas.getBoundingClientRect();
        handlePointerMove(touch.clientX - bounds.left, touch.clientY - bounds.top, false);
      }, { passive: false });

      canvas.addEventListener("touchend", (event) => {
        event.preventDefault();
        handlePointerUp();
      }, { passive: false });

      canvas.addEventListener("touchcancel", () => {
        handlePointerLeave();
      });

      chart.dragData = dragData;
    },
    afterDraw(chart) {
      // 初期矩形の初期化 (initialRectData が渡された場合、初回のみ)
      if (!chart.dragData.initialRectInitialized && initialRectData && initialRectData.value &&
          initialRectData.value.leftCrossPointDist !== undefined) {
        chart.dragData.initialRectInitialized = true;
        const scales = chart.scales;
        const leftX    = scales.x.getPixelForValue(initialRectData.value.leftCrossPointDist);
        const rightX   = scales.x.getPixelForValue(initialRectData.value.rightCrossPointDist);
        const topPx    = Math.min(
          scales.y.getPixelForValue(initialRectData.value.leftMaxHeight),
          scales.y.getPixelForValue(initialRectData.value.rightMaxHeight)
        );
        const bottomPx = Math.max(
          scales.y.getPixelForValue(initialRectData.value.leftMinHeight),
          scales.y.getPixelForValue(initialRectData.value.rightMinHeight)
        );
        chart.dragData.rect = { x: leftX, y: topPx, width: rightX - leftX, height: bottomPx - topPx };
        chart.dragData.isEditing = true;
      }
      drawRect(chart, airwayMargin);
    },
  }
}

// TODO airwayMargin は必要か要確認
// 中間点における航路描画プラグイン
export function createMiddlePointPlugin(newPoints) {
  return {
    id: 'middlePlugin',
    afterDraw: (chart) => {
      const { ctx } = chart;
      ctx.save();
      ctx.beginPath();
      const scales = chart.scales
      const leftX = scales.x.getPixelForValue(newPoints.value.leftCrossPointDist);
      const leftMinHeight = scales.y.getPixelForValue(newPoints.value.leftMinHeight);
      const leftMaxHeight = scales.y.getPixelForValue(newPoints.value.leftMaxHeight);
      const rightX = scales.x.getPixelForValue(newPoints.value.rightCrossPointDist);
      const rightMinHeight = scales.y.getPixelForValue(newPoints.value.rightMinHeight);
      const rightMaxHeight = scales.y.getPixelForValue(newPoints.value.rightMaxHeight);
      // 左上
      ctx.moveTo(leftX, leftMaxHeight);
      // 右上
      ctx.lineTo(rightX, rightMaxHeight);
      // 右下
      ctx.lineTo(rightX, rightMinHeight);
      // 左下
      ctx.lineTo(leftX, leftMinHeight);
      ctx.closePath();
      ctx.fillStyle = 'skyblue'; // 塗り色
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

// 既存航路描画プラグイン
export function createExistingAirwaysPlugin(existingAirwaysCoords) {
  return {
    id: 'existingAirwaysPlugin',
    afterDatasetsDraw: (chart) => {
      const { ctx } = chart;
      const scales = chart.scales;
      for (let i = 0; i < existingAirwaysCoords.length; i++) {
        const pts = existingAirwaysCoords[i];
        if (!pts || pts.length === 0) continue;
        // 全点からバウンディングボックスを算出して矩形を描画
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        for (const pt of pts) {
          if (pt.x < xMin) xMin = pt.x;
          if (pt.x > xMax) xMax = pt.x;
          if (pt.y < yMin) yMin = pt.y;
          if (pt.y > yMax) yMax = pt.y;
        }
        const pxLeft   = scales.x.getPixelForValue(xMin);
        const pxRight  = scales.x.getPixelForValue(xMax);
        const pxTop    = scales.y.getPixelForValue(yMax); // 高い値 = 画面上方向
        const pxBottom = scales.y.getPixelForValue(yMin);
        ctx.save();
        ctx.beginPath();
        ctx.rect(pxLeft, pxTop, pxRight - pxLeft, pxBottom - pxTop);
        ctx.fillStyle = 'rgba(120, 120, 120, 0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(100, 100, 100)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// 地形描画プラグイン
export function createTerrainPlugin(terrainCoords, dist) {
  return {
    id: 'terrainPlugin',
    afterDatasetsDraw: (chart) => {
      const { ctx } = chart;
      const scales = chart.scales
      const terrainLists = [];
      for (let i=0; i<terrainCoords.length; i++) {
        const x = terrainCoords[i][0]
        const y = terrainCoords[i][1]
        terrainLists.push([x, y]);
      }
      // terrainLists.unshift([0,0]);
      // terrainLists.push([Math.floor(dist),0]);
      // terrainLists.push([0,0]);

      ctx.save();
      ctx.beginPath();
      for (let i=0; i<terrainLists.length; i++) {
        const x = scales.x.getPixelForValue(terrainLists[i][0])
        const y = scales.y.getPixelForValue(terrainLists[i][1])
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);  
        }
      }
      ctx.strokeStyle = 'rgb(44, 105, 255)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}
