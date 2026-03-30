import * as turf from "@turf/turf";

/* 航路区画IDが所属する航路IDを取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路区画ID
 * @returns 航路ID
 */

export const useAirwayGetAirwayIdFromSectionId = (data, id) => {
  let airwayId = 'Not found.';
  let airways = data['airway']['airways'];
  
  airways.forEach((airway) => {
    let tmpAirwayId = airway['airwayId'];
    airway['airwaySections'].forEach((section) => {
      if (section['airwaySectionId'] === id) {
        
        airwayId = tmpAirwayId;
      }
    })
  })

  return airwayId;
}

/* 航路IDに対応する航路名を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路名
 */

export const useAirwayGetAirwayNameFromAirwayId = (data, id) => {
  let airwayName = 'Not found.';
  let airways = data['airway']['airways'];
  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airwayName = airway['airwayName'];
    }
  })

  return airwayName;
}

/* 航路IDに対応する飛行目的を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 飛行目的
 */

export const useAirwayGetPurposeFromAirwayId = (data, id) => {
  let airwayPurpose = 'Not found.';

  let airways = data['airway']['airways'];
  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airwayPurpose = airway['flightPurpose'];
    }
  })

  return airwayPurpose;
}

/* 航路IDに対応する画定日時を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 画定日時の文字列
 */

export const useAirwayGetAirwayApplicationDateFromAirwayId = (data, id) => {
  let airwayDate = 'Not found.';
  let airways = data['airway']['airways'];
  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airwayDate = airway['createdAt'];
    }
  })

  return airwayDate;
}

/* 予約情報の航路区画IDのリストから航路点の区間を取得
 * @param data 航路一覧のJSONデータ
 * @param list [航路区画ID, ...]
 * @returns 航路点の区間 (例: 航路点1 ~ 航路点3)
 */

export const useAirwayGetCorridorPointRangeFromSectionIdList = (data, list) => {
  let airwayJunctionRange = 'Not found.';
  let airways = data['airway']['airways'];
  let lastListSectionId = list[0].airwaySectionId;
  
  airways.forEach((airway) => {
    let pointIdList = [];
    let matchingJunctionIds = null;
    airway['airwaySections'].forEach((section) => {
      if (list.some((item) => item.airwaySectionId === (section['airwaySectionId']))) {
        section['airwayJunctionIds'].forEach((point) => {
          pointIdList.push(point);
        })
      }
      if (lastListSectionId === section['airwaySectionId']) {
        matchingJunctionIds = section['airwayJunctionIds']
      }
    })

    if (pointIdList.length > 0) {
      let startId = pointIdList[0];
      let endId = pointIdList[pointIdList.length - 1];
      let startName = null;
      let endName = null;
      //航路の始点と終点が逆の場合の対応
      // listの中身が2個以上かつlistの最初のSectionのJunctionIdの最後とendIdがヒットした場合
      if (list.length > 1 && matchingJunctionIds !== null && matchingJunctionIds[matchingJunctionIds.length - 1] === endId) {
        [startId, endId] = [endId, startId];
      } 
      airway['airwayJunctions'].forEach((point) => {
        if (point['airwayJunctionId'] === startId) {
          startName = point['airwayJunctionName'];
        } else if (point['airwayJunctionId'] === endId) {
          endName = point['airwayJunctionName'];
        }
      })

      airwayJunctionRange = startName + ' ~ ' + endName;
      return;
    }
  })
  return airwayJunctionRange;
}

/* 航路の最長区間を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路点の区間 (例: 航路点1 ~ 航路点3)
 */

export const useAirwayGetCorridorPointRangeFromAirwayId = (data, id) => {
  let airwayJunctionRange = 'Not found.';
  let airways = data['airway']['airways'];
  let pointNameList = [];

  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airway['airwayJunctions'].forEach((point) => {
        pointNameList.push(point['airwayJunctionName']);
      })

      airwayJunctionRange = pointNameList[0] + ' ~ ' + pointNameList[pointNameList.length - 1];
      return;
    }
  })

  return airwayJunctionRange;
}

/* 航路区間の最長区間を取得 (～ 全角バージョン)
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路区間の区間 (例: 航路区間A～航路区間C)
 */

export const useAirwayGetSectionRangeFromAirwayIdFullWidth = (data, id) => {
  let sectionRange = 'Not found.';
  let airways = data['airway']['airways'];
  let sectionNameList = [];

  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airway['airwaySections'].forEach((point) => {
        sectionNameList.push(point['airwaySectionName']);
      })

      sectionRange = sectionNameList[0] + '～' + sectionNameList[sectionNameList.length - 1];
      return;
    }
  })

  return sectionRange;
}

/* 航路の最長区間を取得 (～ 全角バージョン)
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路点の区間 (例: 航路点1～航路点3)
 */

export const useAirwayGetCorridorPointRangeFromAirwayIdFullWidth = (data, id) => {
  let airwayJunctionRange = 'Not found.';
  let airways = data['airway']['airways'];
  let pointNameList = [];

  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airway['airwayJunctions'].forEach((point) => {
        pointNameList.push(point['airwayJunctionName']);
      })

      airwayJunctionRange = pointNameList[0] + ' ~ ' + pointNameList[pointNameList.length - 1];
      return;
    }
  })

  return airwayJunctionRange;
}

/* 航路の最長距離を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路の最長距離 (メートル)
 */

export const useAirwayGetFullDistanceFromAirwayId = (data, id) => {
  let airwayDistance = 0;
  let airways = data['airway']['airways'];
  let middlePoints = [];

  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airway['airwayJunctions'].forEach((point) => {
        let coords = point['airways'][0]['airway']['geometry']['coordinates'];
        middlePoints.push([
          (coords[0][0] + coords[2][0]) / 2,
          (coords[0][1] + coords[2][1]) / 2,
          (coords[0][2] + coords[2][2]) / 2,
        ]);
      })
      return;
    }
  })

  // 航路の中心線の距離を求める
  for (let i = 0; i < middlePoints.length - 1; i++) {
    // 三角形の底辺 (xy座標) の距離
    let point0 = turf.point([middlePoints[i][0], middlePoints[i][1]]);
    let point1 = turf.point([middlePoints[i + 1][0], middlePoints[i + 1][1]]);
    let base = turf.distance(point0, point1) * 1000;

    // 高さ
    let height = Math.abs(middlePoints[i][2] - middlePoints[i + 1][2]);

    // 航路の距離に加算
    airwayDistance += Math.floor(Math.sqrt(base ** 2 + height ** 2));
  }

  return airwayDistance;
}

/* 始点と終点の航路点リストをもとに距離を取得
 * @param data 航路一覧のJSONデータ
 * @param id 出発航路区画ID
 * @param list 航路点のリスト
 * @returns 航路区画の間の距離 (メートル)
 */

export const useAirwayGetDistanceFromJunctionNameList = (data, id, list) => {
  // 対象の airway を取得
  const airway = data?.airway?.airways?.find(a => a?.airwayId === id);
  if (!airway || !Array.isArray(list) || list.length < 2) return 0;

  const points = Array.isArray(airway.airwayJunctions) ? airway.airwayJunctions : [];
  let sectionDistance = 0;

  // 指定した2つのjunction名の間（順序に依存せず）を middlePoints として抽出
  const getMiddlePointsBetween = (nameA, nameB) => {
    const idxA = points.findIndex(p => p?.airwayJunctionName === nameA);
    const idxB = points.findIndex(p => p?.airwayJunctionName === nameB);
    if (idxA === -1 || idxB === -1) return [];

    const step = idxA <= idxB ? 1 : -1;
    const middlePoints = [];
    for (let i = idxA; i !== idxB + step; i += step) {
      const point = points[i];
      const coords = point?.airways?.[0]?.airway?.geometry?.coordinates;
      if (!coords || coords.length < 3) continue;

      // 中心点（左右境界の平均）を作成
      const cx = (coords[0][0] + coords[2][0]) / 2;
      const cy = (coords[0][1] + coords[2][1]) / 2;
      const cz = (coords[0][2] + coords[2][2]) / 2;
      middlePoints.push([cx, cy, cz]);
    }
    return middlePoints;
  };

  // list が複数区間（A->B->C...）の場合も連続ペアで距離を合算
  for (let k = 0; k < list.length - 1; k++) {
    const startName = list[k];
    const endName = list[k + 1];
    const middlePoints = getMiddlePointsBetween(startName, endName);

    // 航路の中心線の距離を求める
    for (let i = 0; i < middlePoints.length - 1; i++) {
      const p0 = turf.point([middlePoints[i][0], middlePoints[i][1]]);
      const p1 = turf.point([middlePoints[i + 1][0], middlePoints[i + 1][1]]);
      const baseMeters = turf.distance(p0, p1) * 1000; // km -> m
      const heightMeters = Math.abs(middlePoints[i][2] - middlePoints[i + 1][2]); // 高度の単位に注意

      sectionDistance += Math.floor(Math.sqrt(baseMeters ** 2 + heightMeters ** 2));
    }
  }
  return sectionDistance;
};

export const useAirwayGetDistanceFromJunctionIdList = (data, airwayId, idList) => {
  const aId = String(airwayId ?? '').trim();
  const airway = data?.airway?.airways?.find(a => String(a?.airwayId ?? '').trim() === aId);
  if (!airway || !Array.isArray(idList) || idList.length < 2) return 0;

  const points = Array.isArray(airway.airwayJunctions) ? airway.airwayJunctions : [];
  let sectionDistance = 0;

  const getMiddlePointsBetween = (idA, idB) => {
    const a = String(idA ?? '').trim();
    const b = String(idB ?? '').trim();
    const idxA = points.findIndex(p => String(p?.airwayJunctionId ?? '').trim() === a);
    const idxB = points.findIndex(p => String(p?.airwayJunctionId ?? '').trim() === b);
    if (idxA === -1 || idxB === -1) return [];

    const step = idxA <= idxB ? 1 : -1;
    const middlePoints = [];

    for (let i = idxA; i !== idxB + step; i += step) {
      const point = points[i];
      const coords = point?.airways?.[0]?.airway?.geometry?.coordinates;
      if (!coords || coords.length < 3) continue;

      const cx = (coords[0][0] + coords[2][0]) / 2;
      const cy = (coords[0][1] + coords[2][1]) / 2;
      const cz = (coords[0][2] + coords[2][2]) / 2;
      middlePoints.push([cx, cy, cz]);
    }
    return middlePoints;
  };

  for (let k = 0; k < idList.length - 1; k++) {
    const startId = idList[k];
    const endId = idList[k + 1];
    const middlePoints = getMiddlePointsBetween(startId, endId);

    for (let i = 0; i < middlePoints.length - 1; i++) {
      const p0 = turf.point([middlePoints[i][0], middlePoints[i][1]]);
      const p1 = turf.point([middlePoints[i + 1][0], middlePoints[i + 1][1]]);
      const baseMeters = turf.distance(p0, p1) * 1000;
      const heightMeters = Math.abs(middlePoints[i][2] - middlePoints[i + 1][2]);

      sectionDistance += Math.floor(Math.sqrt(baseMeters ** 2 + heightMeters ** 2));
    }
  }

  return sectionDistance;
};

/* 航路区画ID(airwaySectionId)リストから総距離を取得（区画の両端junction座標で算出）
 * - section は airwaySections[].airwayJunctionIds[0], [1] が両端
 * - junction の座標は airway.airwayJunctions[].airways[0].airway.geometry.coordinates の矩形中心を使用
 *
 * @param data 航路一覧のJSONデータ（chartData）
 * @param sectionIdList [airwaySectionId, ...]
 * @returns 距離 (メートル)
 */
export const useAirwayGetDistanceFromSectionIdList = (data, sectionIdList) => {
  if (!data || !Array.isArray(sectionIdList) || sectionIdList.length === 0) return 0;

  const airways = data?.airway?.airways ?? [];
  if (!Array.isArray(airways) || airways.length === 0) return 0;

  // 速引き用インデックス
  const junctionById = new Map(); // key: `${airwayId}:${junctionId}` -> junction
  const sectionById = new Map();  // key: sectionId -> { airway, section }

  for (const airway of airways) {
    const aId = String(airway?.airwayId ?? '');
    for (const j of (airway?.airwayJunctions ?? [])) {
      const jId = String(j?.airwayJunctionId ?? '');
      if (aId && jId) junctionById.set(`${aId}:${jId}`, j);
    }
    for (const sec of (airway?.airwaySections ?? [])) {
      const sId = String(sec?.airwaySectionId ?? '');
      if (sId) sectionById.set(sId, { airway, sec });
    }
  }

  const getCenter3DFromJunction = (junction) => {
    const coords = junction?.airways?.[0]?.airway?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 3) return null;

    // coords: [ [lon,lat,alt], ... ] を想定（矩形の対角 0 と 2 の中点）
    const lon = (coords[0][0] + coords[2][0]) / 2;
    const lat = (coords[0][1] + coords[2][1]) / 2;
    const alt = ((coords[0][2] ?? 0) + (coords[2][2] ?? 0)) / 2;
    return [lon, lat, alt];
  };

  let totalMeters = 0;

  for (const rawSectionId of sectionIdList) {
    const sectionId = String(rawSectionId ?? '');
    const hit = sectionById.get(sectionId);
    if (!hit) continue;

    const airway = hit.airway;
    const sec = hit.sec;

    const aId = String(airway?.airwayId ?? '');
    const pair = sec?.airwayJunctionIds ?? [];
    const j1 = pair?.[0];
    const j2 = pair?.[1];
    if (!aId || !j1 || !j2) continue;

    const junction1 = junctionById.get(`${aId}:${String(j1)}`);
    const junction2 = junctionById.get(`${aId}:${String(j2)}`);
    if (!junction1 || !junction2) continue;

    const p1 = getCenter3DFromJunction(junction1); // [lon,lat,alt]
    const p2 = getCenter3DFromJunction(junction2);
    if (!p1 || !p2) continue;

    const baseMeters = turf.distance(turf.point([p1[0], p1[1]]), turf.point([p2[0], p2[1]])) * 1000;
    const heightMeters = Math.abs((p1[2] ?? 0) - (p2[2] ?? 0));
    totalMeters += Math.floor(Math.sqrt(baseMeters ** 2 + heightMeters ** 2));
  }

  return totalMeters;
};

/* 航路区画IDリストから航路IDリスト（重複あり）を取得
 * @param data 航路一覧のJSONデータ（chartData）
 * @param sectionIdList [airwaySectionId, ...]
 * @returns [airwayId, airwayId, ...]（sectionIdListと同じ順序・同じ長さ）
 */
export const useAirwayGetAirwayIdListFromSectionIdList = (data, sectionIdList) => {
  if (!data || !Array.isArray(sectionIdList)) return [];

  const airways = data?.airway?.airways ?? [];
  const sectionToAirway = new Map(); // key: sectionId(string) -> airwayId

  for (const airway of airways) {
    const aId = airway?.airwayId;
    for (const sec of (airway?.airwaySections ?? [])) {
      const sId = String(sec?.airwaySectionId ?? '').trim();
      if (sId) sectionToAirway.set(sId, aId);
    }
  }

  return sectionIdList.map((sid) => {
    const key = String(sid ?? '').trim();
    return sectionToAirway.get(key) ?? null;
  });
};

/* 二つの航路点名から距離を取得（中心座標の直線距離：水平距離＋高度差）
 * @param data 航路一覧のJSONデータ（chartData）
 * @param pair [始点航路点名, 終点航路点名]
 * @returns 距離 (メートル)
 */
export const useAirwayGetDistanceBetweenJunctionNames = (data, pair) => {
  if (!data || !Array.isArray(pair) || pair.length !== 2) return 0;
  const [startName, endName] = pair.map(s => String(s || '').trim());
  if (!startName || !endName) return 0;

  // 航路点名から中心座標を取得（Polygonの対角の中点）
  const findCenterByName = (chartData, name) => {
    const airways = chartData?.airway?.airways || [];
    for (const airway of airways) {
      for (const point of airway.airwayJunctions || []) {
        const nm = (point.airwayJunctionName != null ? point.airwayJunctionName : point.name) || '';
        if (nm === name) {
          const coords = point?.airways?.[0]?.airway?.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length >= 3) {
            return [
              (coords[0][0] + coords[2][0]) / 2,
              (coords[0][1] + coords[2][1]) / 2,
              (coords[0][2] + coords[2][2]) / 2,
            ];
          }
        }
      }
    }
    return null;
  };

  const a = findCenterByName(data, startName);
  const b = findCenterByName(data, endName);
  if (!a || !b) return 0;

  // 水平距離（緯度経度）をmで算出
  const point0 = turf.point([a[0], a[1]]);
  const point1 = turf.point([b[0], b[1]]);
  const base = turf.distance(point0, point1) * 1000; // km -> m

  // 高度差
  const height = Math.abs((a[2] ?? 0) - (b[2] ?? 0));

  // 3次元距離
  const d = Math.sqrt(base ** 2 + height ** 2);

  return Math.floor(d);
};

/* 航路に含まれる航路点名の一覧を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路点の一覧リスト
 */

export const useAirwayGetCorridorPointNameListFromAirwayId = (data, id) => {
  let airwayJunctionList = [];
  let airways = data['airway']['airways'];

  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airway['airwayJunctions'].forEach((point) => {
        airwayJunctionList.push(point['airwayJunctionName']);
      })
    }
  })

  return airwayJunctionList;
}

/* 航路に含まれる航路区画名の一覧を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路ID
 * @returns 航路点の一覧リスト
 */

export const useAirwayGetCorridorSectionNameListFromAirwayId = (data, id) => {
  let airwaySectionList = [];
  let airways = data['airway']['airways'];

  airways.forEach((airway) => {
    if (airway['airwayId'] === id) {
      airway['airwaySections'].forEach((section) => {
        airwaySectionList.push(section['airwaySectionName']);
      })
    }
  })

  return airwaySectionList;
}

/* 始点と終点の航路点リストをもとに航路区画IDのリストを取得
 * @param data 航路一覧のJSONデータ
 * @param list 航路点のリスト
 * @param id 航路ID
 * @returns 航路区画IDのリスト
 */

export const useAirwayGetSectionIdListFromCorridorPointList = (data, list, ids) => {
  const sectionList = [];
  const airways = data?.airway?.airways ?? [];
  const pairCount = Math.max(0, (list?.length ?? 0) - 1);

  for (let i = 0; i < pairCount; i++) {
    const start = list[i];
    const end = list[i + 1];

    for (const targetId of ids || []) {
      const airway = airways.find(a => a.airwayId === targetId);
      if (!airway) continue;

      let startId = '';
      let endId = '';

      for (const point of airway.airwayJunctions || []) {
        if (point.airwayJunctionName === start) startId = point.airwayJunctionId;
        else if (point.airwayJunctionName === end) endId = point.airwayJunctionId;
        if (startId && endId) break;
      }
      if (!startId || !endId) continue;

      // ここからセクションを連結して収集する
      let started = false;
      let currentId = startId;

      for (const section of airway.airwaySections || []) {
        const junctionIds = section.airwayJunctionIds || [];
        const from = junctionIds[0];
        const to = junctionIds[1];

        if (!started) {
          if (from === currentId) {
            sectionList.push(section.airwaySectionId);
            started = true;
            currentId = to;
            if (currentId === endId) break;
          } else if (to === currentId) {
            // 逆向きセクションにも対応する場合
            sectionList.push(section.airwaySectionId);
            started = true;
            currentId = from;
            if (currentId === endId) break;
          }
        } else {
          if (from === currentId) {
            sectionList.push(section.airwaySectionId);
            currentId = to;
            if (currentId === endId) break;
          } else if (to === currentId && from === endId) {
            // 逆向きで直接 endId に繋がる場合のみ許可
            sectionList.push(section.airwaySectionId);
            currentId = from;
            if (currentId === endId) break;
          }
        }
      }
    }
  }

  return sectionList;
}


/* 始点と終点の航路点リストをもとに航路区画IDのリストを取得
 * @param data 航路一覧のJSONデータ
 * @param list 航路点のリスト
 * @param id 航路ID
 * @param startDateTime 開始日時
 * @param endDateTime 終了日時
 * @returns 航路区画IDのリスト
 */

export const useAirwayReservationGetSectionIdListFromCorridorPointList = (data, list, airwayId, startDateTime, endDateTime) => {
  let start = list[0];
  let end = list[1];

  let startId = '';
  let endId = '';

  const airways = data.airway.airways; 
  airways.forEach((airway) => {
    if (airway.airwayId === airwayId) {
      airway.airwayJunctions.forEach((point) => {
        if (point.airwayJunctionName === start) {
          startId = point.airwayJunctionId;
        } else if (point.airwayJunctionName === end) {
          endId = point.airwayJunctionId;
        }
      });
    }
  });

  let hitCount = 0; // 0:開始点未発見 1:開始点発見(区間抽出中) 2:終了点発見
  let sectionList = [];

  for (let i = 0; i < airways.length; i++) {
    let airway = airways[i];
    if (airway.airwayId === airwayId) {
      //airway.airwaySections.forEach((section) => {
        for (let j = 0; j < airway.airwaySections.length; j++) {
        let section = airway.airwaySections[j];
        const pointIds = section.airwayJunctionIds;
        console.log("pointIds",pointIds);
        if (hitCount === 0) {
          // 開始点未発見
          if (pointIds[0] === startId) {
            sectionList.push({
              airwaySectionId: section.airwaySectionId,
              startAt: startDateTime,
              endAt: endDateTime,
            });
            console.log(section.airwaySectionName);
            hitCount = 1; 
          }
        } else if (hitCount === 1) {
          // 開始点発見(区間抽出中)
          if (pointIds[0] === endId) {
            hitCount = 2;
            break;
          }
          sectionList.push({
            airwaySectionId: section.airwaySectionId,
            startAt: startDateTime,
            endAt: endDateTime,
          });
          console.log(section.airwaySectionName);
          }
        }
        if (hitCount === 2) {
          break; 
        }
      }
    }
  return sectionList;
}

/* 航路区画IDが所属する航路区画名を取得
 * @param data 航路一覧のJSONデータ
 * @param id 航路区画ID
 * @returns 航路区画名
 */

export const useAirwaySectionNameFromSectionId = (data, id) => {
  let sectionName = 'Not found.';
  let airways = data['airway']['airways'];
  
  airways.forEach((airway) => {
    airway['airwaySections'].forEach((section) => {
      if (section['airwaySectionId'] === id) {
        sectionName = section['airwaySectionName'];
      }
    })
  })

  return sectionName;
}