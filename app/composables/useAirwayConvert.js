/* 航路点と航路区画を接続順に整列
 * @param data 航路一覧のJSONデータ
 * @returns 整列済み航路一覧のJSONデータ
 */
export const useAirwayConvertConnectionOrder = (data) => {
  let convertedData = null;
  let airways = [];

  data['airway']['airways'].forEach((airway) => {
    let tmpAirway = useAirwayConvertConnectionOrderSingleAirway(airway);
    if (!tmpAirway) {
      return;
    }
    airways.push(tmpAirway);
  })

  if (data['airway']['airways'].length != airways.length) {
    console.log(`warn: useAirwayConvertConnectionOrder: ${data['airway']['airways'].length - airways.length} airway(s) skipped.`)
  }

  convertedData = data;
  convertedData['airway']['airways'] = airways;
  return convertedData;
}

/* 単一航路情報の航路点と航路区画を接続順に整列
 * @param data 単一航路情報
 * @returns 整列済み単一航路情報
 */
export const useAirwayConvertConnectionOrderSingleAirway = (data) => {
  let convertedData = null;
  let sectionList = [];
  let startJunctionId = null;
  let endJunctionId = null;
  let junctionIdList = [];
  let airwaySections = [];
  let airwayJunctions = [];
  let j = 0;

  // 航路区画一覧を取得
  data['airwaySections'].forEach((section) => {
    sectionList.push(section['airwayJunctionIds']);
  })
  if (!sectionList.length) {
    console.log('error: failed to create section list.')
    return null;
  }

  // 端の二点を特定
  for (let i = 0; i < sectionList.length; i++) {
    if (startJunctionId && endJunctionId) {
      break;
    }

    for (j = 0; j < sectionList.length; j++) {
      if (i == j) {
        continue;
      }
      if (sectionList[j].includes(sectionList[i][0])) {
        break;
      }
    }
    
    // 端の点
    if (j == sectionList.length) {
      if (!startJunctionId) {
        startJunctionId = sectionList[i][0];
      } else {
        endJunctionId = sectionList[i][0];
      }
    }

    for (j = 0; j < sectionList.length; j++) {
      if (i == j) {
        continue;
      }
      if (sectionList[j].includes(sectionList[i][1])) {
        break;
      }
    }
    
    // 端の点
    if (j == sectionList.length) {
      if (!startJunctionId) {
        startJunctionId = sectionList[i][1];
      } else {
        endJunctionId = sectionList[i][1];
      }
    }
  }
  if (!startJunctionId || !endJunctionId) {
    console.log('error: failed to find start/end junctions.')
    return null;
  }

  // 航路点IDを順番に並べる
  junctionIdList.push(startJunctionId);
  while (junctionIdList.length < sectionList.length + 1) {
    sectionList.forEach((section) => {
      let lastJunction = junctionIdList[junctionIdList.length - 1];
      if (section.includes(lastJunction)) {
        if (section[0] == lastJunction) {
          junctionIdList.push(section[1]);
        } else {
          junctionIdList.push(section[0]);
        }
      }
    })
  }

  // airwayJunctions 組み立て
  // ソース(data['airwayJunctions'])が非空のときのみ順序整列を行う
  // 空の場合は uasl-list など座標なしデータのため、空のまま区画整列だけ続行
  if (data['airwayJunctions'].length > 0) {
    junctionIdList.forEach((junction) => {
      data['airwayJunctions'].forEach((junc) => {
        if (junction == junc['airwayJunctionId']) {
          airwayJunctions.push(junc);
          return;
        }
      })
    })
    if (airwayJunctions.length != junctionIdList.length) {
      console.log(`error: failed to create airwayJunctions. The length of airwayJunctions is ${airwayJunctions.length}. (actually ${data['airwayJunctions'].length})`)
      return null;
    }
  }

  // airwaySections 組み立て
  for (let i = 0; i < junctionIdList.length - 1; i++) {
    let airwayJunctionIds = [junctionIdList[i], junctionIdList[i + 1]];
    data['airwaySections'].forEach((section) => {
      if (section['airwayJunctionIds'].includes(airwayJunctionIds[0]) && section['airwayJunctionIds'].includes(airwayJunctionIds[1])) {
        section['airwayJunctionIds'] = airwayJunctionIds;
        airwaySections.push(section);
      }
    })
  }
  if (airwaySections.length != data['airwaySections'].length) {
    console.log(`error: failed to create airwaySections. The length of airwaySections is ${airwaySections.length}. (actually ${data['airwaySections'].length})`)
    return null;
  }

  convertedData = data;
  convertedData['airwayJunctions'] = airwayJunctions;
  convertedData['airwaySections'] = airwaySections;
  return convertedData;
}