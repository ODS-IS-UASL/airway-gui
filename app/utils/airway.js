import * as turf from "@turf/turf";
import { Chart } from 'chart.js';
import iconUrl from "../assets/css/img/dummyImg/dummy_legendIcon_waypoint.svg";
// 新規航路改修用 start
import { UaslSystemClient } from 'semantic-client-library';
// 新規航路改修用 end

function createUnionFind() {
  const parent = {};

  function find(x) {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x, y) {
    const px = find(x), py = find(y);
    if (px !== py) parent[py] = px;
  }

  function groups() {
    // 全ての代表ごとにグループ化
    const groupMap = {};
    Object.keys(parent).forEach(x => {
      const p = find(x);
      if (!groupMap[p]) groupMap[p] = [];
      groupMap[p].push(Number(x));
    });
    return Object.values(groupMap);
  }

  // API公開
  return { find, union, groups };
}


// 新規航路改修用 start
/** 周辺 UASL/ドローン port 検索半径（メートル）。半径取得方法不明のため固定値。 */
export function getDefaultSearchRadiusMeters() {
  //TODO 半径取得方法不明
  return 5000;
}
// 新規航路改修用 end

/* 最大落下範囲の結合
 * @param ranges /max-fall-range の結果
 * @returns 結合した最大落下範囲群
 */
export function unionFallToleranceRanges(ranges) {
  const allPolygons = []
  const polygons = []
  for (let i = 0; i < ranges.length; i++) {
    const coordinates = turf.polygon([ranges[i]['geometry']['coordinates'][0].map(([lng, lat]) => [lat, lng])])
    polygons.push(
      {
        used: false,
        coordinates: coordinates
      }
    )
  }
  const pairIdx = []
  let b = false;
  for (let i = 0; i < polygons.length; i++) {
    if (polygons[i].used) {
      continue;
    }
    b = false;
    for (let j = i + 1; j < polygons.length; j++) {
      if (turf.booleanIntersects(polygons[i].coordinates, polygons[j].coordinates)) {
        b = true;
        polygons[j].used = true;
        pairIdx.push([i, j])
      }
    }
    if (!b) { // 結合なし
      allPolygons.push(polygons[i].coordinates)
    }
  }
  const uf = createUnionFind();
  // union処理
  pairIdx.forEach(([a, b]) => {
    uf.union(a, b);
  });

  const allGroups = uf.groups();
  for(let i=0; i < allGroups.length; i++) {
    const tmpList = [];
    for(let j=0; j < allGroups[i].length; j++) {
      const idx = allGroups[i][j]
      tmpList.push(polygons[idx].coordinates)
    }
    allPolygons.push(turf.union(turf.featureCollection(tmpList)));
  }

  return allPolygons
}

/* 内包するポリゴンを探索
 * @param range 探索対象の最大落下範囲
 * @param allPolygons 結合した最大落下範囲群(unionFallToleranceRanges()の戻り値)
 * @returns range が含まれる結合した最大落下範囲
 */
export function searchPolygonWithin(range, allPolygons) {
  const poly = turf.polygon([range['geometry']['coordinates'][0].map(([lng, lat]) => [lat, lng])])
  let i = 0
  for (i = 0; i < allPolygons.length; i++) {
    if (turf.booleanWithin(poly, allPolygons[i])) {
      break;
    }
  }
  return allPolygons[i]
}

/* ポリライン用の座標計算
 * @param airway 航路情報
 * @returns ポリラインの座標
 */
export function calcPolylineCoordinates(airway) {
  // 座標を格納するリスト
  const allCoordinates = [];

  // 座標を抽出
  airway.airwayJunctions.forEach((point) => {
    point["airways"].forEach((coordinates) => {
      const coords = coordinates["airway"]["geometry"]["coordinates"];
      if (Array.isArray(coords)) {
        allCoordinates.push(coords);
      }
    });
  });

  // ポリライン用の座標を計算（平均座標を使用）
  const polyline = [];
  allCoordinates.forEach((coords) => {
    let x = 0;
    let y = 0;
    // 矩形の座標は 5 点だが、計算に使うのは 4 点
    for (let i = 0; i < 4; i++) {
      if (coords[i][1] !== undefined && coords[i][0] !== undefined) {
        x += coords[i][1];
        y += coords[i][0];
      }
    }
    x /= 4;
    y /= 4;
    polyline.push([x, y]);
  });
  return polyline
}

/* ポリライン、マーカーの表示
 * @param l_map 地図オブジェクト
 * @param data 航路情報
 * @param id 航路ID(airwayId)
 * @param color ポリラインの色
 * @returns なし
 */
export async function drawSingleAirline(l_map, data, id, color) {
  const info = data.airway.airways.find(item => item.airwayId === id)
  // 新規航路改修用 start
  if (!info) return [];
  const polyline = calcPolylineCoordinates(info);
  // 新規航路改修用 end
  // 地図にポリラインを描画
  if (polyline.length > 0) {
    L.polyline(polyline, {
      color: color,
      weight: 8
    }).addTo(l_map);
  }
  polyline.forEach(markerCoords => {
    const icon = L.icon({
      iconUrl,
      iconSize: [15, 15],
    });
    L.marker(markerCoords, { icon }).addTo(l_map);
  });
  return polyline;
}

/* /uasl-list の結果表示(ポリライン、マーカー)
 * @param l_map 地図オブジェクト
 * @param excludedIds 除外する航路ID(uaslId)リスト
 * @returns なし
 */
export async function drawUaslList(l_map, excludedIds) {
  console.log("drawUaslList")
  const bounds = l_map.getBounds();
  // 新規航路改修用 start
  const center = l_map.getCenter();
  const northeast = bounds.getNorthEast();
  const radiusMeters = center.distanceTo(northeast);
  const searchArea = {
    latitude: center.lat,
    longitude: center.lng,
    radiusMeters: radiusMeters
  };
  console.log("searchArea : ", searchArea);

  let airwayData = null;
  let payload = null;

  try {
    const client = new UaslSystemClient();
    const nearbyRes = await client.getAllNearbyUasl(searchArea);
    const semanticData = nearbyRes?.data;
    console.log("semanticData :", semanticData);
    if (!semanticData?.systems?.length) {
      throw new Error('getAllNearbyUasl: data not found.');
    }
    payload = semanticUaslResultToPayload(semanticData);

  } catch (e) {
    console.error('getAllNearbyUasl error:', e);
    // セマンティックライブラリ情報取得失敗また0件の場合
    const uaslRes = await $fetch('/api/airway/uasl', { 
      method: 'GET',
      query: { all: true }
    });
    if (uaslRes.status != 200) {
      console.error(`error: get airway data {status: ${uaslRes.status}}.`);
      return;
    }
    payload = uaslRes.data;
  }
  if (!payload) {
    console.error('No payload available for airway data.');
    return;
  }
  airwayData = convertUaslToAirway(payload);
  console.log("airwayData : ", airwayData);

  if (!airwayData?.airway?.airways?.length) {
    return;
  }
  // 新規航路改修用 end

  const polylines = [];
  for (let i=0; i<airwayData.airway.airways.length; i++) {
    if (excludedIds.includes(airwayData.airway.airways[i].airwayId)) {
      continue;
    }
    const polyline = calcPolylineCoordinates(airwayData.airway.airways[i]);
    // 地図にポリラインを描画
    if (polyline.length > 0) {
      L.polyline(polyline, {
        color: "#000000",
        weight: 8
      }).addTo(l_map);

      L.polyline(polyline, {
        color: "#FFFFFF",
        weight: 7
      }).addTo(l_map);
    }
    polyline.forEach(markerCoords => {
      const icon = L.icon({
        iconUrl,
        iconSize: [15, 15],
      });
      L.marker(markerCoords, { icon }).addTo(l_map);
    });
    polylines.push(polyline)
  }
  return;
}

// 新規航路改修用 start
/**
 * semantic-client の getAllNearbyUasl 戻り値（AllNearbyUaslResult.data）
 * convertUaslToAirway が受け取る uasl payload 形式に変換する。
 * @param semanticData - AllNearbyUaslResult.data（AllUaslDto）
 * @returns - { uasl: [...] } 形式
 */
export function semanticUaslResultToPayload(semanticData) {
  if (!semanticData?.systems) return { uasl: [] };
  // 自社ID：ログイン時の所属事業社（localStorage uasl:user:parentOperatorId）
  const parentOperatorId = localStorage.getItem('uasl:user:parentOperatorId');
  const uasl = semanticData.systems.flatMap((sys) =>
    (sys.uaslAdministrators || []).map((admin) => ({
      uaslAdministratorId: admin.uaslAdministratorId,
      businessNumber: admin.businessNumber,
      uasl: (admin.uasl || []).map((u) => ({
        uaslId: u.uaslId,
        uaslName: u.uaslName,
        flightPurpose: u.flightPurpose,
        area: u.area,
        areaName: u.areaName,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        droneList: u.droneList || [],
        // 接続先航路点のexternalGuarantee/externalSystemInfoを保持
        uaslPoints: (u.uaslPoints || []).map((p) => ({
          uaslPointId: p.uaslPointId,
          uaslPointName: p.uaslPointName,
          geometry: p.geometry,
          deviationGeometry: p.deviationGeometry,
          ...(p.externalGuarantee !== undefined && { externalGuarantee: p.externalGuarantee }),
          // 外部システム情報(externalSystemInfo)作成
          // 現在の事業者と parentOperatorId が一致しない場合のみ付与する
          ...(admin.businessNumber !== parentOperatorId && {
            externalSystemInfo: {
              // 接続先の航路点が自身のExternalSystemInfoを持つ場合はその systemId を使用する。
              // セマンティックライブラリが返す p.externalSystemInfo.systemId は
              // 接続先システムが TTL 内で自己宣言した canonical なシステムID（:externalSystemId）。
              // sys.systemMetadata.systemId は ODS コネクタの SPARQL エンドポイント URL であり
              // 異なる値になる場合があるためフォールバックとしてのみ使用する。
              systemId: p.externalSystemInfo?.systemId ?? sys.systemMetadata.systemId,
              uaslId: u.uaslId,
              uaslPointId: p.uaslPointId
            }
          })
        })),

        uaslSections: (u.uaslSections || []).map((s) => ({
          uaslSectionId: s.uaslSectionId,
          uaslSectionName: s.uaslSectionName,
          uaslPointIds: s.uaslPointIds || [],
          droneportIds: s.droneportIds || []
        }))
      }))
    }))
  );
  console.log("semanticUaslResultToPayload : ", { uasl });
  return { uasl };
}
// 新規航路改修用 end

/* Uasl のデータを Airway に変換
 * @param data 航路情報
 * @returns なし
 */
export function convertUaslToAirwaySingle(uasl) {
  const airway = {
    "airwayId": "",
    "airwayName": "",
    "airwayJunctions": [],
    "airwaySections": [],
  };
  airway.airwayId = uasl.uaslId;
  airway.airwayName = uasl.uaslName;
  return airway;
}

export const svgTemplateNumber = (number, iconSize_w = '33', iconSize_h = '33') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize_w}" height="${iconSize_h}" viewBox="0 0 33.818 33.818">
    <circle cx="16.909" cy="16.909" r="14.909" fill="white" stroke="#2C69FF" stroke-width="1.5"/>
    <circle cx="16.909" cy="16.909" r="12" fill="#2C69FF"/>
    <text x="16.909" y="22" text-anchor="middle" font-size="14" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700" fill="white">${number}</text>
  </svg>
`;

export const svgTemplate = (number, iconSize_w = '33', iconSize_h = '33') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize_w}" height="${iconSize_h}" viewBox="0 0 33.818 33.818">
    <circle cx="16.909" cy="16.909" r="14.909" fill="white" stroke="#2C69FF" stroke-width="4"/>
    <text x="16.909" y="22" text-anchor="middle" font-size="16" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700" fill="#2C69FF">${number}</text>
  </svg>
`;

export const leftTemplate = `
  <div style="
    font-size: 30PX;
  ">
    <p>L</p>
  </div>
`

export const rightTemplate = `
  <div style="
    font-size: 30PX;
  ">
    <p>R</p>
  </div>
`

export const airwayOptions = {
  color: "#2C69FF",
  weight: 22,
  opacity: 1,
}

export const airwayInnerOptions = {
  color: "#B1C8FF",
  weight: 14,
  opacity: 1,
}

export const sectionOptions1 = {
  color: 'white',
  weight: 35,
  opacity: 1,
}
export const sectionOptions2 = {
  color: '#BBBBBB',
  weight: 30,
  opacity: 1,
}

export function convertUaslToAirway(uaslPayload, options = {}) {
  const filterBn = options.businessNumber ?? null;
  const filterAdminId = options.uaslAdministratorId ?? null;

  const adminGroups = Array.isArray(uaslPayload?.uasl) ? uaslPayload.uasl : [];
  const sourceGroups = adminGroups.filter(g =>
    (filterBn ? g.businessNumber === filterBn : true) &&
    (filterAdminId ? g.uaslAdministratorId === filterAdminId : true)
  );

  const airways = sourceGroups.flatMap(group => {
    const routes = Array.isArray(group.uasl) ? group.uasl : (group.uasl ? [group.uasl] : []);
    return routes.map(u => ({
      airwayAdministratorId: group.uaslAdministratorId || '',
      businessNumber: group.businessNumber || '',

      airwayId: u.uaslId,
      airwayName: u.uaslName,
      flightPurpose: u.flightPurpose,
      // 新規航路改修用 start
      area: u.area ?? u.areaName ?? '',
      areaName: u.area ?? u.areaName ?? '',
      // 新規航路改修用 end
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      droneList: Array.isArray(u.droneList) ? u.droneList : [],

      // 新規航路改修用 start（接続先判定用にexternalGuarantee/externalSystemInfo を付与）
      airwayJunctions: (Array.isArray(u.uaslPoints) ? u.uaslPoints : []).map(p => ({
        airwayJunctionId: p.uaslPointId,
        name: p.uaslPointName,
        airwayJunctionName: p.uaslPointName,
        type: 'uaslPoint',
        ...(p.externalGuarantee !== undefined && { externalGuarantee: p.externalGuarantee }),
        ...(p.externalSystemInfo && { externalSystemInfo: p.externalSystemInfo }),
        airways: [
          {
            airway: {
              type: p.geometry?.type || 'Polygon',
              geometry: {
                type: p.geometry?.type || 'Polygon',
                coordinates: p.geometry?.coordinates?.[0] || []
              }
            },
            deviation: {
              type: p.deviationGeometry?.type || 'Polygon',
              geometry: {
                type: p.deviationGeometry?.type || 'Polygon',
                coordinates: p.deviationGeometry?.coordinates?.[0] || []
              }
            }
          }
        ]
      })),
      // 新規航路改修用 end

      airwaySections: (Array.isArray(u.uaslSections) ? u.uaslSections : []).map(s => ({
        airwaySectionId: s.uaslSectionId,
        airwaySectionName: s.uaslSectionName,
        airwayJunctionIds: Array.isArray(s.uaslPointIds) ? s.uaslPointIds : [],
        droneportIds: Array.isArray(s.droneportIds) ? s.droneportIds : []
      }))
    }));
  });

  const firstGroup = sourceGroups[0] || {};

  return {
    airway: {
      airwayAdministratorId: firstGroup.uaslAdministratorId,
      businessNumber: firstGroup.businessNumber,
      airways
    }
  };
}

export function convertMaxFallRangeToFallToleranceRanges(uaslPayload) {
  const keyMap = {
    maxFallRangeId: 'fallToleranceRangeId',
    uaslOperatorId: 'airwayOperatorId',
    uaslIdUse: 'airwayIdUse'
  };

  // 変換処理
  uaslPayload.maxFallRanges = uaslPayload.maxFallRanges.map(item => {
    // 新しいオブジェクト
    const newItem = {};
    Object.keys(item).forEach(key => {
      // マップに該当するなら変換、なければ元のキー
      const newKey = keyMap[key] ?? key;
      newItem[newKey] = item[key];
    });
    return newItem;
  });

  const fallToleranceRangesJson = {
    fallToleranceRanges: uaslPayload.maxFallRanges
  }
  return fallToleranceRangesJson
}

// 最大落下範囲取得用 start
/**
 * 複数 businessNumber で max-fall-range API を並列取得し、社内・社外に分割して返す。
 * セレクトボックスは社内のみ使用、地図は社内+社外を別レイヤーで表示するためのデータ取得に使用。
 * @param {string[]} businessNumbers - 航路から取得した businessNumber の配列（重複可）
 * @returns {Promise<{ inHouseRanges: { fallToleranceRanges: any[] } | null, externalRanges: { fallToleranceRanges: any[] } }>}
 */
export async function fetchMaxFallRangesByBusinessNumbers(businessNumbers) {
  const dedup = [...new Set((businessNumbers || []).filter(bn => bn != null && String(bn).trim() !== ''))];
  if (dedup.length === 0) {
    return [];
  }
  const results = await Promise.all(
    dedup.map(async (bn) => {
      try {
        const res = await $fetch('/api/airway/max-fall-range', { 
          method: 'GET',
          query: { businessNumber: bn }
        });
        if (res?.status !== 200 || !res?.data) return { bn, data: { fallToleranceRanges: [] } };
        const converted = convertMaxFallRangeToFallToleranceRanges(res.data);
        return { bn, data: converted };
      } catch (e) {
        console.warn('[fetchMaxFallRangesByBusinessNumbers] fetch failed for bn:', bn, e);
        return { bn, data: { fallToleranceRanges: [] } };
      }
    })
  );
  const allRanges = [];
  for (const { bn, data } of results) {
    const arr = data?.fallToleranceRanges || [];
    const rangesWithSource = arr.map(range => ({
      ...range,
      sourceBusinessNumber: bn
    }));
    
    allRanges.push(...rangesWithSource);
  }
  return {maxFallRanges: allRanges};
}
// 最大落下範囲取得用 end

export function convertAirwayToUaslAddAirway(sourceAirwayId, airwayPayload, targetAirwayId) {
  console.log(airwayPayload)

  const uaslDeterminationId = airwayPayload.airwayDeterminationId;
  const uaslName = airwayPayload.airwayName;
  const flightPurpose = airwayPayload.flightPurpose;
  const keyMap = {
    airwayParts: 'uaslParts',
    despersionNode: 'fallRangeSeam',
    airwayJunction: 'uaslPoint',
    airwaySection: 'uaslSection'
  };
  const uaslParts = [];
  let sourceUaslId;
  let targetUaslId;

  const source = {
    externalPointId: sourceAirwayId
  }
  uaslParts.push(source);

  const airwayPartsLen = airwayPayload.airwayParts.length;
  for (let i = 0; i < airwayPayload.airwayParts.length; i++) {
    if (i === 0) {
      // 接続元の場合は continue
      sourceUaslId = airwayPayload.airwayParts[i].airwayJunction[0].externalSystemInfo?.uaslId;
      continue;
    } else if (i === airwayPartsLen-1) {
      // 接続先の場合は continue
      targetUaslId = airwayPayload.airwayParts[i].airwayJunction[0].externalSystemInfo?.uaslId;
      continue;
    }
    const original = airwayPayload.airwayParts[i];
    const newItem = {};
    for (let key in original) {
      // 変換マップがあれば使い、なければ元キー
      const newKey = keyMap[key] !== undefined ? keyMap[key] : key;
      newItem[newKey] = original[key];
    }
    delete newItem.prevAirwayPartsIndex;
    uaslParts.push(newItem);
  }

  const targetSection = airwayPayload.airwayParts[airwayPartsLen-1].airwaySection
  const target = {
    externalPointId: targetAirwayId,
    uaslSection: targetSection
  }
  let ownToOwn;
  // 自社⇒自社か自社⇒他社を判断
  console.log(`sourceUaslId: ${sourceUaslId}`)
  console.log(`targetUaslId: ${targetUaslId}`)
  if (sourceUaslId === targetUaslId) {
    // 自社⇒自社
    ownToOwn = true;
  } else {
    const getPrefix = (s) => (typeof s === 'string' ? s.split('_', 1)[0] : undefined)
    if (getPrefix(sourceUaslId) === getPrefix(targetUaslId)) {
      // uaslIdの「_」より前が一致した場合は自社⇒自社とみなす
      ownToOwn = true;
    } else {
      // 自社⇒他社
      ownToOwn = false;
      console.log("自社⇒他社")
    }
  }

  if (!ownToOwn) {
  // 新規航路改修用 start
  const uaslPoint = {
    geometry: airwayPayload.airwayParts[airwayPartsLen-1].airwayJunction[0].geometry,
    deviationGeometry: airwayPayload.airwayParts[airwayPartsLen-1].airwayJunction[0].deviationGeometry,
  }
  if (airwayPayload.airwayParts[airwayPartsLen-1].airwayJunction[0].hasOwnProperty("externalGuarantee")) {
    uaslPoint["externalGuarantee"] = airwayPayload.airwayParts[airwayPartsLen-1].airwayJunction[0].externalGuarantee;
  }
  if (airwayPayload.airwayParts[airwayPartsLen-1].airwayJunction[0].hasOwnProperty("externalSystemInfo")) {
    uaslPoint["externalSystemInfo"] = airwayPayload.airwayParts[airwayPartsLen-1].airwayJunction[0].externalSystemInfo;
  }
  if (uaslPoint.hasOwnProperty("externalGuarantee") || uaslPoint.hasOwnProperty("externalSystemInfo")) {
    target["uaslPoint"] = uaslPoint;
  }
  // 他社航路との接続の場合は externalSystemInfo を使うため externalPointId は不要
  // 自社航路との接続（externalSystemInfo なし）の場合のみ externalPointId を使う
  if (uaslPoint.hasOwnProperty("externalSystemInfo")) {
    delete target.externalPointId;
  }
  // 新規航路改修用 end
  }

  uaslParts.push(target);

  const tmp = {
    uaslDeterminationId: uaslDeterminationId,
    uaslName: uaslName,
    flightPurpose: flightPurpose,
    uaslParts: uaslParts
  }

  const json = {
    ...tmp,
    uaslParts: (tmp.uaslParts ?? []).map((p) => {
      // uaslPoint が無い要素はそのまま
      if (!('uaslPoint' in p)) return p

      // uaslPoint が配列なら1要素目にする（1要素前提）
      if (Array.isArray(p.uaslPoint)) {
        return { ...p, uaslPoint: p.uaslPoint[0] }
      }

      return p
    }),
  }
  return json;
}

export function convertAirwayToUaslAddJunction(airwayPayload) {
  console.log(airwayPayload)

  const uaslDeterminationId = airwayPayload.airwayDeterminationId;
  const uaslName = airwayPayload.airwayName;
  const flightPurpose = airwayPayload.flightPurpose;
  const keyMap = {
    airwayParts: 'uaslParts',
    despersionNode: 'fallRangeSeam',
    airwayJunction: 'uaslPoint',
    airwaySection: 'uaslSection'
  };
  const uaslParts = [];

  for (let i = 0; i < airwayPayload.airwayParts.length; i++) {
    const original = airwayPayload.airwayParts[i];
    const newItem = {};
    for (let key in original) {
      // 変換マップがあれば使い、なければ元キー
      const newKey = keyMap[key] !== undefined ? keyMap[key] : key;
      newItem[newKey] = original[key];
    }
    delete newItem.prevAirwayPartsIndex;
    uaslParts.push(newItem);
  }

  const tmp = {
    uaslDeterminationId: uaslDeterminationId,
    uaslName: uaslName,
    flightPurpose: flightPurpose,
    uaslParts: uaslParts
  }

  const json = {
    ...tmp,
    uaslParts: (tmp.uaslParts ?? []).map((p) => {
      // uaslPoint が無い要素はそのまま
      if (!('uaslPoint' in p)) return p

      // uaslPoint が配列なら1要素目にする（1要素前提）
      if (Array.isArray(p.uaslPoint)) {
        return { ...p, uaslPoint: p.uaslPoint[0] }
      }

      return p
    }),
  }

  return json;
}

export function shiftSectionNames(data) {
  console.log(data.uaslParts)
  const names = data.uaslParts.map(part => part.uaslSection?.name);
  for (let i = data.uaslParts.length - 1; i > 0; i--) {
    if (!data.uaslParts[i].uaslSection) {
      data.uaslParts[i].uaslSection = {};
    }
    data.uaslParts[i].uaslSection.name = names[i - 1];
  }
  delete data.uaslParts[0].uaslSection;
  return data;
}

export function makeCorridorPointsJson(airwayData) {
  const resList = [];
  airwayData.airwayJunctions.forEach((point) => {
    const corridor_points = {
      LDN_name: "",
      LDN_coordinates: [],
      LDN_airway_coordinates: [],
      LDN_new: false,
    }
    corridor_points["LDN_name"] = point["name"]
    corridor_points["LDN_id"] = point["airwayJunctionId"]
    // 新規航路改修用 start
    if (point.hasOwnProperty("externalGuarantee")) {
      corridor_points["LDN_externalGuarantee"] = point["externalGuarantee"];
    }
    if (point.hasOwnProperty("externalSystemInfo")) {
      corridor_points["LDN_externalSystemInfo"] = point["externalSystemInfo"];
    }
    // 新規航路改修用 end
    point["airways"].forEach((coordinates) => {
      corridor_points["LDN_airway_coordinates"] = coordinates["airway"]["geometry"]["coordinates"].map(([lng, lat, height]) => [lat, lng, height]);
      corridor_points["LDN_coordinates"] = coordinates["deviation"]["geometry"]["coordinates"].map(([lng, lat, height]) => [lat, lng, height]);
    });
    resList.push(corridor_points);
  });
  return {
    corridor_points: resList
  };
}

// 航路区画表示
export function drawAirway(l_map, latlng1, latlng2) {
  const coords = [latlng1, latlng2];
  const polyOuter = L.polyline(coords, airwayOptions).addTo(l_map);
  const polyInner = L.polyline(coords, airwayInnerOptions).addTo(l_map);
  return [polyOuter, polyInner];
}

// 航路区画Icon表示
export function drawAirwaySection(l_map, latlng1, latlng2, sectionName) {
  // 1文字のサイズ(px)
  const fontSize = 12
  // sectionNameの長さを取得
  const sectionNameLen = sectionName.length;
  // 長さに基づいて横幅を計算
  const boxWidth = sectionNameLen * fontSize + fontSize; // px単位
  // 長さに基づいて縦幅を計算
  const boxHeight = fontSize * 2; // px単位
  let html = `
    <div style="
      background-color: white;
      font-size: ${fontSize}px;
      font-weight: bold;
      display: flex;
      width:${boxWidth}px;
      justify-content: center; // 水平揃え
      height: ${boxHeight}px;
      align-items: center;     // 垂直揃え
    ">
      <p>${sectionName}</p>
    </div> 
  `;
  let sectionIcon = L.divIcon({
    html: html
  });
  const middlePoint = [
    (latlng1[0] + latlng2[0]) / 2,
    (latlng1[1] + latlng2[1]) / 2,
  ]; 
  return L.marker(middlePoint, {icon: sectionIcon}).addTo(l_map);
}

export const loadGeoJson = async () => {
  let geoJson;
  try {
    let jsonFile = await fetch('/geojson/bldg_533877.geojson'); // ゼンリン地物情報未契約の場合は使用不可、コンテナ内からファイルを削除する
    if (!jsonFile.ok) {
      throw Error('ファイルの読み込みに失敗しました');
    }
    geoJson = await jsonFile.json();
  } catch(err) {
    console.error(err)
    geoJson = {};
  }
  return geoJson;
}

// 直線状の標高と地物の高さを取得
export async function calculateGeoInfo(
  startCoord,
  endCoord,
  geoJson
) {
  let intersectsList = [];
  let bldgXList = [];
  let bldgYList = [];
  let altitudeXList = [];
  let altitudeYList = [];
  let mergedXList = [];
  let mergedBldgYList = [];
  let mergedAltitudeYList = [];
  let result = {X:[], bldgY:[], altitudeY:[], minAltitude: null};

  /* 直線を作成 */
  let line = turf.lineString([startCoord, endCoord]);
  /* 各地物を走査し、交点を求める */
  console.log('---', geoJson)
  if (!geoJson || Object.keys(geoJson).length === 0) {
    result['X'] = [0];
    result['bldgY'] = [0];
    result['altitudeY'] = [0];
    result['minAltitude'] = 0
    result['maxY'] = 0;

    return result;
  }
  geoJson.features.forEach(function(feature) {
    let pointNum = feature.geometry.coordinates[0].length;
    for (let i = 0; i < pointNum - 1; i++) {
      var tmpPoint1 = [feature.geometry.coordinates[0][i][0], feature.geometry.coordinates[0][i][1]];
      var tmpPoint2 = [feature.geometry.coordinates[0][i + 1][0], feature.geometry.coordinates[0][i + 1][1]];
      let eachLine = turf.lineString([tmpPoint1, tmpPoint2]);  
      let intersects = turf.lineIntersect(line, eachLine);
      /* 交点があれば、交点の座標と建物の高さを取得 */
      if (intersects.features.length > 0) {
        var tmpPoint1 = turf.point([intersects.features[0].geometry.coordinates[0], intersects.features[0].geometry.coordinates[1]]);
        var tmpPoint2 = turf.point(startCoord);
        let tmpIntersect = {x: turf.distance(tmpPoint1, tmpPoint2) * 1000, y: feature.properties.measuredHeight, point: tmpPoint1};
        /* 交点リストに追加 */
        intersectsList.push(tmpIntersect);
      }
    }
  })
  
  /* 直線の開始座標に近い順にソート */
  intersectsList.sort((a, b) =>
    a['x'] - b['x']
  );

  /* 直線を分割して各点の標高を取得 */
  var tmpPoint1 = turf.point(startCoord);
  var tmpPoint2 = turf.point(endCoord);
  var lineDistance = turf.distance(tmpPoint1, tmpPoint2);
  let divideNum = 30;
  for (let i = 0; i < divideNum + 1; i++) {
    let tmpPoint = turf.along(line, i * lineDistance / divideNum, {units: 'kilometers'});
    let tmpAltitude = await useGeoJsonGetSingleAltitude(tmpPoint.geometry.coordinates[0], tmpPoint.geometry.coordinates[1]);
    // let tmpAltitude = 0;
    altitudeXList.push(i * lineDistance / divideNum * 1000);
    altitudeYList.push(tmpAltitude);
  }

  /* 対地高で表示するため、最小の標高を求めて各Y値から引く */
  // const calculateMin = function (a, b) {return Math.min(a, b);}
  // let minAltitudeY = altitudeYList.reduce(calculateMin);
  // console.log(minAltitudeY)
  // var i = 0;
  // for (i = 0; i < altitudeYList.length; i++) {
  //   altitudeYList[i] = altitudeYList[i] - minAltitudeY;
  // }
  // 対地高度から標高に変更
  let minAltitudeY = 0;

  /* 地物の床と天井の座標を交互に登録するために使用 */
  /* 制限: 直線の開始地点に地物が存在しないこと */
  let floorFlag = false;

  for (let i = 0; i < intersectsList.length; i++) {
    let tmpAltitude = await useGeoJsonGetSingleAltitude(intersectsList[i]['point'].geometry.coordinates[0], intersectsList[i]['point'].geometry.coordinates[1]);
    // let tmpAltitude = 0;
    let bldgHeight = intersectsList[i]['y'] + tmpAltitude - minAltitudeY; //要修正。上で取得した標高が minAltitudeY よりも小さい可能性がある。
    if (floorFlag) {
      bldgXList.push(intersectsList[i]['x']);
      bldgXList.push(intersectsList[i]['x']);
      bldgYList.push(bldgHeight);
      bldgYList.push(0);
    } else {
      bldgXList.push(intersectsList[i]['x']);
      bldgYList.push(0);
      bldgYList.push(bldgHeight);
      bldgXList.push(intersectsList[i]['x']);
    }
    floorFlag = !floorFlag;
  }

  /* リスト長を合わせる */
  let bldgIndex = 0;
  let prevBldgY = 0;
  var i = 0;
  while (i < altitudeXList.length) {
    if (bldgIndex < bldgXList.length) {
      if (altitudeXList[i] < bldgXList[bldgIndex]) {
        mergedXList.push(altitudeXList[i]);
        mergedBldgYList.push(prevBldgY);
        mergedAltitudeYList.push(altitudeYList[i]);
        i++;
      } else if (altitudeXList[i] >= bldgXList[bldgIndex]) {
        mergedXList.push(bldgXList[bldgIndex]);
        mergedBldgYList.push(bldgYList[bldgIndex]);
        mergedAltitudeYList.push(altitudeYList[i]);
        prevBldgY = bldgYList[bldgIndex];
        bldgIndex++;
      }
    } else {
      mergedXList.push(altitudeXList[i]);
      mergedBldgYList.push(0);
      mergedAltitudeYList.push(altitudeYList[i]);
      i++;
    }
  }

  // グラフの縦軸定義用に高さ最大値を取得
  let maxY = 0;
  mergedAltitudeYList.forEach((alt) => {
    if (alt > maxY) {
      maxY = alt;
    }
  });
  mergedBldgYList.forEach((bld) => {
    if (bld > maxY) {
      maxY = bld;
    }
  })

  result['X'] = mergedXList;
  result['bldgY'] = mergedBldgYList;
  result['altitudeY'] = mergedAltitudeYList;
  result['minAltitude'] = altitudeYList.length > 0 ? Math.min(...altitudeYList) : 0;
  result['maxY'] = maxY;

  return result;
}

/* 交点の左右の決定
 * @param lnglat1 最大落下範囲と落下節との交点([lng, lat]の配列)
 * @param lnglat2 最大落下範囲と落下節との交点([lng, lat]の配列)
 * @param prevLandmarkCoords 作成する航路点の1つ前の航路点の座標([lat, lng]の配列)
 * @returns start 進行方向に対して左の交点
 * @returns end 進行方向に対して右の交点
 * @returns dist start と end 間の距離
 */
export function determineIntersectionDirection(lnglat1, lnglat2, prevLandmarkCoords) {
  let startCoord = lnglat1;
  let endCoord = lnglat2;
  let startPoint = turf.point(startCoord);
  let endPoint = turf.point(endCoord);
  let dist = turf.distance(startPoint, endPoint) * 1000;

  // 座標計算の誤差で直線が最大落下範囲からはみ出ることがあるので、固定値だけ内側にずらす
  var tmpCurLine = turf.lineString([startCoord, endCoord]);
  let tmpStartPoint = turf.along(tmpCurLine, 0.003, {units: 'kilometers'});
  startCoord = [tmpStartPoint.geometry.coordinates[0], tmpStartPoint.geometry.coordinates[1]];
  var tmpCurLine = turf.lineString([endCoord, startCoord]);
  let tmpEndPoint = turf.along(tmpCurLine, 0.003, {units: 'kilometers'});
  endCoord = [tmpEndPoint.geometry.coordinates[0], tmpEndPoint.geometry.coordinates[1]];
  dist = turf.distance(tmpStartPoint, tmpEndPoint) * 1000;

  // 最初の断面図は見る方向が不明なため、南から北に見た向きで固定
  // 西側の点が start になる
  let start;
  let end;
  if (startCoord[0] >= endCoord[0] && startCoord[1] >= endCoord[1]) {
    start = endCoord;
    end = startCoord;
  } else if (startCoord[0] >= endCoord[0] && startCoord[1] < endCoord[1]) {
    start = endCoord;
    end = startCoord;
  } else if (startCoord[0] < endCoord[0] && startCoord[1] >= endCoord[1]) {
    start = startCoord;
    end = endCoord;
  } else {
    start = startCoord;
    end = endCoord;
  }

  // 二個目以降の断面図は進行方向で見る向きに調整する
  if (prevLandmarkCoords) {
    // ひとつ前の航路点の座標を指定
    let tmpLng = prevLandmarkCoords[1];
    let tmpLat = prevLandmarkCoords[0];
    
    // 線分の両端を無限に延長した直線の方程式(y = mx + c )を求める
    const m = (end[1] - start[1]) / (end[0] - start[0]);
    const c = start[1] - m * start[0];

    // 直前に置かれたジャンクションの緯度は直線上のどこに位置するか
    const y = m * tmpLng + c;

    // 実際の経度と比較
    if (tmpLat > y) {
      // 北から南に見る
      const tmpCoord = start;
      start = end;
      end = tmpCoord;
      console.log('北から南');
    } else {
      // 南から北に見る
    }
  }

  return {
    start,
    end,
    dist
  }
}

export async function drawAirLine(l_map, uaslType) {
  let data = {}
  if (uaslType === "uasl-list") { 
    const bounds = l_map.getBounds();
    const northwest = bounds.getNorthWest();
    const southeast = bounds.getSouthEast();

    const left = northwest.lng;
    const right = southeast.lng;
    const upper = northwest.lat;
    const lower = southeast.lat;

    data = {
      point1:  `${left},${lower}`,
      point2:  `${right},${lower}`,
      point3:  `${right},${upper}`,
      point4:  `${left},${upper}`
    }
  } else {
    uaslType = "uasl";
    data = { 
      all: true 
    }
  }
  const uaslRes = await $fetch(`/api/airway/${uaslType}`, { 
    method: 'GET',
    query: data
  });
  if(uaslRes.status !== 200) {
    return;
  }

  const convertedUasl = convertUaslToAirway(uaslRes.data);
  const airwayData = useAirwayConvertConnectionOrder(convertedUasl);
  for (let i=0; i<airwayData["airway"]["airways"].length; i++) {
    const coordinates = calcPolylineCoordinates(airwayData["airway"]["airways"][i]);
    for (let k=0; k<coordinates.length-1; k++) {
      L.polyline(
        [[coordinates[k][0], coordinates[k][1]], [coordinates[k+1][0], coordinates[k+1][1]]],
        {
          color: "rgb(146, 161, 197)",
          weight: 6
        }
      ).addTo(l_map);
    }
    for (let j=0; j<coordinates.length; j++) {
      const label = j + 1;
      const icon = L.divIcon({
        html: `<svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="19" r="15" fill="white" stroke="rgb(146, 161, 197)" stroke-width="2.5"/><text x="19" y="24" text-anchor="middle" font-size="14" font-family="Meiryo UI, sans-serif" font-weight="700" fill="rgb(146, 161, 197)">${label}</text></svg>`,
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      L.marker(coordinates[j], { icon }).addTo(l_map);
    }
  }
  return;
}

// 交点取得
export function getIntersection(newLine, selectedMaxFallRangeCoords) {
  const intersections = [];
  let lineChecked1 = turf.lineString([[newLine[0][1], newLine[0][0]], [newLine[1][1], newLine[1][0]]]);
  for (let i =0; i < selectedMaxFallRangeCoords.length - 1; i++) {
    let lineChecked2 = turf.lineString([
      [selectedMaxFallRangeCoords[i][1], selectedMaxFallRangeCoords[i][0]],
      [selectedMaxFallRangeCoords[i + 1][1], selectedMaxFallRangeCoords[i + 1][0]]
    ]);
    let tmpIntersect = turf.lineIntersect(lineChecked1, lineChecked2);
    if (tmpIntersect.features.length > 0) {
      intersections.push([tmpIntersect.features[0].geometry.coordinates[1], tmpIntersect.features[0].geometry.coordinates[0]]);
    }
  }
  return intersections
}

export async function makeGraphData(
  despersionNodes,
  determinationId,
  geoJson,
  start,
  end,
  dist,
  excludeUaslId = null
) {
    // 直線状の標高と地物の高さを取得
    let geoInfo = await calculateGeoInfo(start, end, geoJson);
    console.log(geoInfo)

    // 航路設定可能空間節取得
    const params = {
      "uaslDeterminationId": determinationId,
      "geometry": {
        "type": "LineString",
        "coordinates": [start, end]
      }
    }

    let parabolaCoords = [];
    let seamInfos;
    let seamTerrainCoords;
    try {
      const response = await $fetch('/api/airway/feasible-vol-seam', { 
        method: 'POST',
        body: params
      });
      if (response.status !== 201) {
        console.error('API request failed:', response.status);
        return false;
      }
      console.log(response.data);
      parabolaCoords = response.data.data;
      // 自身の航路のセクションを除外する（航路点追加時に自身の切断面が灰色矩形で表示されるのを防ぐ）
      seamInfos = excludeUaslId
        ? response.data.uaslInfos.filter(info => info.uaslId !== excludeUaslId)
        : response.data.uaslInfos;
      seamTerrainCoords = response.data.terrain.coordinates;
      let tmpDespersion = {
        name: 'despersion-' + despersionNodes.length,
        geometry: {
          type: 'LineString',
          coordinates: [start, end]
        },
        feasibleVolSeamId: response.data.feasibleVolSeamId
      };
      despersionNodes.push(tmpDespersion);
    } catch (error) {
      console.error('API request failed:', error);
      return false;
    }

    console.log(parabolaCoords);
    const parabolaMinY = geoInfo.minAltitude ?? 0;
    let parabolaList = [[0, parabolaMinY]];
    const startEndDiff = Math.abs(end[0] - start[0]);
    parabolaCoords.forEach((coord) => {
      parabolaList.push([
        Math.abs(coord[0] - start[0]) / startEndDiff * dist,
        Math.max(coord[2], parabolaMinY)
      ]);
    });
    parabolaList.sort((a, b) => a[0] - b[0]);
    const parabolaCoordsTmp = parabolaList;

    let maxParabolaHeight = 0;
    let parabolaCount = 0;
    parabolaList.forEach((point) => {
      if (point[1] > maxParabolaHeight) {
        maxParabolaHeight = point[1];
      }
      parabolaCount++;
    })
    console.log(maxParabolaHeight);

    let startPoint = turf.point(start);
    const existingAirwaysCoords = [];
    for (let i=0; i<seamInfos.length; i++) {
      const coords = seamInfos[i]["geometry"]["coordinates"]
      // MultiLineString の全 LineString の全点を1エントリにまとめる
      // → プラグイン側でバウンディングボックスから矩形を描画するため
      const tmp = [];
      for (let j=0; j<coords.length; j++) {
        for (let k=0; k<coords[j].length; k++) {
          const point = turf.point([coords[j][k][0], coords[j][k][1]]);
          const dist = turf.distance(startPoint, point) * 1000;
          tmp.push({
            x: dist,
            y: coords[j][k][2]
          })
        }
      }
      existingAirwaysCoords.push(tmp)
    }
    const terrainCoords = [];
    for (let i=0; i<seamTerrainCoords.length; i++) {
      const point = turf.point([seamTerrainCoords[i][0], seamTerrainCoords[i][1]])
      const dist = turf.distance(startPoint, point) * 1000;
      terrainCoords.push([
        dist,
        seamTerrainCoords[i][2]
      ])
    }
    console.log(terrainCoords)

    return {
      parabolaList,
      maxParabolaHeight,
      geoInfo,
      parabolaCoordsTmp,
      existingAirwaysCoords, 
      terrainCoords
    }
}

// 交点を結ぶ線とグラフを見る向きを表すLRを地図に描画
export function drawLineLR(l_map, start, end, lineList, arrowList, lineWeight = 3) {
  /* 直線を描画 */
  let tmpLine = [
    [start[1], start[0]],
    [end[1], end[0]]
  ]
  const line = L.polyline(tmpLine, { color: "#555555", weight: lineWeight, dashArray: '6, 6' }).addTo(l_map);
  lineList.push(line);
  // グラフを見る向きを表す LR を地図に描画
  const angleInRadians = Math.atan2(end[0] - start[0], end[1] - start[1]);
  const angleInDegrees = angleInRadians * (180 / Math.PI);
  let angle = angleInDegrees % 360;
  let radian = angle * Math.PI / 180;
  var anchor = [Math.round(60 * Math.sin(radian)), Math.round(-60 * Math.cos(radian))];
  var html = leftTemplate;
  let leftIcon = L.divIcon({
    className: '',
    html: html,
    iconAnchor: anchor
  })
  const leftIconObj = L.marker([start[1], start[0]], {icon: leftIcon}).addTo(l_map);
  arrowList.push(leftIconObj);
  anchor = [Math.round(-60 * Math.sin(radian)), Math.round(60 * Math.cos(radian))];
  html = rightTemplate;
  let rightIcon = L.divIcon({
    className: '',
    html: html,
    iconAnchor: anchor
  })
  const rightIconObj = L.marker([end[1], end[0]], {icon: rightIcon}).addTo(l_map);
  arrowList.push(rightIconObj);

  return;
}

// 地図上のレイヤー削除
export const removeLayerFromMap = (l_map, layerOrLayers) => {
  if (Array.isArray(layerOrLayers)) {
    for (let i = 0; i < layerOrLayers.length; i++) {
      if (layerOrLayers[i] === null) {
        continue;
      }
      if (Array.isArray(layerOrLayers[i])) {
        // ネスト配列（例: drawAirway が返す [polyOuter, polyInner]）を再帰的に削除
        for (const layer of layerOrLayers[i]) {
          if (layer !== null) l_map.removeLayer(layer);
        }
      } else {
        l_map.removeLayer(layerOrLayers[i]);
      }
    }
    // layerOrLayers = [];
    layerOrLayers.length = 0;
  } else {
    if (layerOrLayers !== null) {
      if (Array.isArray(layerOrLayers)) {
        for (const layer of layerOrLayers) {
          if (layer !== null) l_map.removeLayer(layer);
        }
      } else {
        l_map.removeLayer(layerOrLayers);
      }
    }
    // layerOrLayers = null;
  }
  return null;
}

// 地図上のコントロール削除
export const removeControlFromMap = (l_map, controls) => {
  for (let i = 0; i < controls.length; i++) {
    l_map.removeControl(controls[i]);
  }
  controls = [];
}

// 一個目の矩形のみ座標が逆回りになっているかチェックし修正する
// 二個目以降の断面図は進行方向に見る向きで揃えているのでずれない
export const checkAndFixCoordinates = (corridor_points) => {
  // 左上同士を結んだ直線と右上同士を結んだ直線が交差するかチェック
  const coordTopRight = corridor_points[1]['LDN_coordinates'][3];
  const coordTopLeft = corridor_points[1]['LDN_coordinates'][0];
  const FirstCoordTopRight = corridor_points[0]['LDN_coordinates'][3];
  const FirstCoordTopLeft = corridor_points[0]['LDN_coordinates'][0];
  const leftLine = turf.lineString(
    [
      [coordTopLeft[1], coordTopLeft[0]],
      [FirstCoordTopLeft[1], FirstCoordTopLeft[0]]
    ]
  );
  const rightLine = turf.lineString(
    [
      [coordTopRight[1], coordTopRight[0]],
      [FirstCoordTopRight[1], FirstCoordTopRight[0]]
    ]
  );

  // 逆回りなので要調整
  if (turf.booleanIntersects(leftLine, rightLine)) {
    console.log('reverse!');
    const tmpFirstCoords = structuredClone(corridor_points[0]);
    corridor_points[0]['LDN_coordinates'][0] = tmpFirstCoords['LDN_coordinates'][3];
    corridor_points[0]['LDN_coordinates'][1] = tmpFirstCoords['LDN_coordinates'][2];
    corridor_points[0]['LDN_coordinates'][2] = tmpFirstCoords['LDN_coordinates'][1];
    corridor_points[0]['LDN_coordinates'][3] = tmpFirstCoords['LDN_coordinates'][0];
    corridor_points[0]['LDN_coordinates'][4] = tmpFirstCoords['LDN_coordinates'][3];
    corridor_points[0]['LDN_airway_coordinates'][0] = tmpFirstCoords['LDN_airway_coordinates'][3];
    corridor_points[0]['LDN_airway_coordinates'][1] = tmpFirstCoords['LDN_airway_coordinates'][2];
    corridor_points[0]['LDN_airway_coordinates'][2] = tmpFirstCoords['LDN_airway_coordinates'][1];
    corridor_points[0]['LDN_airway_coordinates'][3] = tmpFirstCoords['LDN_airway_coordinates'][0];
    corridor_points[0]['LDN_airway_coordinates'][4] = tmpFirstCoords['LDN_airway_coordinates'][3];
  }
  return corridor_points
}