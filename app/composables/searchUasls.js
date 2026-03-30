
/* 指定の座標を基点に検索して航路情報を取得する（他社航路含む）
 * @param uaslIds 検索対象航路ID配列
 * @param latitude 中心座標（緯度）
 * @param longitude 中心座標（軽度）
 * @param radiusMeters 検索初期半径（メートル）
 * @param notFoundErrorTransferFlag セマンティックライブラリ情報取得失敗時処理振替フラグ
 * @returns 航路情報配列
 */
export const searchUasls = async(uaslIds,latitude,longitude,radiusMeters=14000,notFoundErrorTransferFlag=false) => {

  const uaslData = new Object;
  uaslData.uasl = [];

  // SSR(サーバ)で呼ばれたら semantic-client-library は使わずフォールバック
  if (!import.meta.client) {
    console.warn('semantic-client-library for SSR: fallback');
    return getUaslFallback(uaslIds);
  }

  let client;
  try {
    const { UaslSystemClient } = await import('semantic-client-library');
    client = new UaslSystemClient();
  } catch (error) {
    const message = 'semantic-client-library import/init failed'; 
    if(notFoundErrorTransferFlag) {
      console.warn(message, error);
      return getUaslFallback(uaslIds);
    } else {
      console.err(message, error);
      throw new Error(message, { cause: error });
    }
  }

  let loopCount = 0;
  const loopMax = 10;

  // パラメータで指定された航路IDの情報が全て取得できるまで繰り返し（最大 loopMax 回）
  do {
    // 航路情報取得用エンドポイント取得
    try {
      const nearbyUaslRes = await client.getAllNearbyUasl({
        latitude: latitude,
        longitude: longitude,
        radiusMeters: radiusMeters
      });

      if(!(nearbyUaslRes?.data?.systems?.length > 0)) {
        // 取得レコード０件の場合はセマンティックライブラリ発行エラー扱いとする（最低でも１件の自社航路データが存在する前提）
        throw new Error('semantic-client-library getAllNearbyUasl: data not found.');
      }

      const payload = semanticUaslResultToPayload(nearbyUaslRes?.data);
      uaslData.uasl.push(...
        payload.uasl.map(group => ({
          ...group, uasl: group.uasl.filter(u => uaslIds.includes(u.uaslId))
        })).filter(u => u.uasl.length > 0)
      );
      uaslIds = uaslIds.filter(id => !uaslData.uasl.flatMap(u => u.uasl).map(m => m.uaslId).includes(id));

    } catch(error) {
      const message = 'semantic-client-library getAllNearbyUasl: failed'; 
      if(notFoundErrorTransferFlag) {
        console.warn(message, error);
        return getUaslFallback(uaslIds);
      } else {
        console.err(message, error);
        throw new Error(message, { cause: error });
      }
    }

    // 次回半径２倍にして周辺航路を検索
    radiusMeters*=2;

  } while(uaslIds.length > 0 && ++loopCount < loopMax);
  
  // 航路情報未取得の航路IDが存在する場合は航路情報クリア
  if(uaslIds.length > 0) {
    const message = 'semantic-client-library getAllNearbyUasl: not enough data'; 
    if(notFoundErrorTransferFlag) {
      console.warn(message);
      return getUaslFallback(uaslIds);
    } else {
      console.err(message);
      throw new Error(message);
    }
  }

  return uaslData;
}

/* 検索対象の航路IDより自社航路を取得して、自社航路の座標を基点に検索して航路情報を取得する
 * （前提：検索航路内に自社航路が最低１件存在すること）
 * @param uaslIds 検索対象航路ID配列
 * @param radiusMeters 検索初期半径（メートル）
 * @returns 航路情報配列
 */
export const searchUaslsFromID = async(uaslIds, radiusMeters=null) => {

  let uaslRes = null;
  const ids = Array.isArray(uaslIds) ? uaslIds : (uaslIds ? [uaslIds] :[]);
  if(ids.length == 0) {
    return { uasl:[] };
  }

  // .env の半径設定を優先（引数未指定時）
  const runtimeConfig = useRuntimeConfig();
  const radius = radiusMeters ?? (parseInt(runtimeConfig.public.semanticSearchRadiusMeters) || 20000);

  // 基点座標取得元の航路情報を取得
  try {
    for(let uaslId of ids) {
      uaslRes = await $fetch('/api/airway/uasl', { 
        method: 'GET',
        query: { uaslId: [ uaslId ] }
      });
      if (uaslRes.status === 200) {
        if((uaslRes.data?.uasl?.length ?? 0) == 0) continue;
        break;
      } else 
      if(uaslRes.status !== 404) {
        console.error(`error[searchUaslsFromID]: get uasl info {status: ${uaslRes.status}}.`);
        throw new Error(`error[searchUaslsFromID]: get uasl info {status: ${uaslRes.status}}.`);
      }
    }
  }
  catch(error) {
    console.error(`error[searchUaslsFromID]: get uasl info: ${error}`);
    throw new Error(`error[searchUaslsFromID]: get uasl info: ${error}`);
  }
  // 自社航路未存在時
  if(uaslRes.status === 404 || (uaslRes.data?.uasl?.length ?? 0) == 0) {
    console.error(`data nothing[searchUaslsFromID]: get uasl info.`);
    throw new Error(`data nothing[searchUaslsFromID]: get uasl info.`);
  }

  // ヘルパー: ポリゴン(矩形)の中心を算出（最初の4点で平均）
  const centerFromRect = (coords) => {
    const n = Math.min(coords.length, 4);
    let lat = 0, lng = 0;
    for (let i = 0; i < n; i++) {
      lat += coords[i][1]; // lat
      lng += coords[i][0]; // lng
    }
    return [lat / n, lng / n]; // Leafletは [lat, lng]
  };
  const coordinate = centerFromRect(uaslRes.data.uasl[0].uasl.uaslPoints[0].geometry.coordinates[0]);

  // 航路情報取得
  return searchUasls(ids, coordinate[0], coordinate[1], radius, true);
}

/* セマンティックライブラリが失敗した場合に実施するフォールバック（自社航路情報のみ取得）処理
 * @param uaslIds 検索対象航路ID配列
 */
const getUaslFallback = async(uaslIds) => {
  const uaslRslt = await $fetch('/api/airway/uasl', { 
    method: 'GET',
    query: { 
      all: true
    }
  });
  if (uaslRslt.status !== 200) {
    console.error(`getUaslFallback /uasl Error {status: ${uaslRslt.status}}.`);
    throw new Error(`getUaslFallback /uasl Error {status: ${uaslRslt.status}}.`);
  }
  return { uasl: uaslRslt.data.uasl.filter(u => uaslIds.includes(u.uasl.uaslId)) };
}


/* 指定の座標を基点に検索して離着陸場情報を取得する（他社航路含む）
 * @param portIds 検索対象ドローンポートID配列
 * @param latitude 中心座標（緯度）
 * @param longitude 中心座標（軽度）
 * @param radiusMeters 検索初期半径（メートル）
 * @param notFoundErrorTransferFlag セマンティックライブラリ情報取得失敗時処理振替フラグ
 * @returns ドローンポート情報配列
 */
export const searchPorts = async(portIds,latitude,longitude,radiusMeters=14000,notFoundErrorTransferFlag=false) => {
  const portData = new Object;
  portData.data = [];

  // SSR(サーバ)で呼ばれたら semantic-client-library は使わずフォールバック
  if (!import.meta.client) {
    console.warn('semantic-client-library for SSR: fallback');
    return getPortFallback(portIds);
  }

  let client;
  try {
    const { UaslSystemClient } = await import('semantic-client-library');
    client = new UaslSystemClient();
  } catch (error) {
    const message = 'semantic-client-library import/init failed'; 
    if(notFoundErrorTransferFlag) {
      console.warn(message, error);
      return getPortFallback(portIds);
    } else {
      console.err(message, error);
      throw new Error(message, { cause: error });
    }
  }

  let loopCount = 0;
  const loopMax = 10;

  // パラメータで指定された航路IDの情報が全て取得できるまで繰り返し（最大 loopMax 回）
  do {
    // 航路情報取得用エンドポイント取得
    try {
      const nearbyPortRes = await client.getAllNearbyDroneport({
        latitude: latitude,
        longitude: longitude,
        radiusMeters: radiusMeters
      });

      if(!(nearbyPortRes?.data?.systems?.length > 0)) {
        // 取得レコード０件の場合はセマンティックライブラリ発行エラー扱いとする（最低でも１件の自社航路データが存在する前提）
        throw new Error('semantic-client-library getAllNearbyDroneport: data not found.');
      }
      portData.data.push(...
          (nearbyPortRes.data?.systems ?? [])
          .flatMap(s => s.droneports ?? [])
          .filter(data => portIds.includes(data.dronePortId))
      );
      portIds = portIds.filter(id => !portData.data.some(data => data.dronePortId == id));

    } catch(error) {
      const message = 'semantic-client-library getAllNearbyDroneport: failed'; 
      if(notFoundErrorTransferFlag) {
        console.warn(message, error);
        return getPortFallback(portIds);
      } else {
        console.err(message, error);
        throw new Error(message, { cause: error });
      }
    }

    // 次回半径２倍にして周辺航路を検索
    radiusMeters*=2;

  } while(portIds.length > 0 && ++loopCount < loopMax);
  
  // ドローンポート情報未取得のドローンポートIDが存在する場合はフォールバック
  if(portIds.length > 0) {
    const message = 'semantic-client-library getAllNearbyUasl: not enough data'; 
    if(notFoundErrorTransferFlag) {
      console.warn(message);
      return getPortFallback(portIds);
    } else {
      console.err(message);
      throw new Error(message);
    }
  }

  console.log('searchPorts:getAllNearbyDroneport', portData)
  return portData;
}

/* セマンティックライブラリが失敗した場合に実施するフォールバック（自社ドローンポート情報のみ取得）処理
*/
const getPortFallback = async() => {
  const portRslt = await $fetch('/api/drone/droneport/info/list', {
    method: 'GET',
    query: {
      activeStatus: '1,2',
      portType: '1,2'
    }
  });
  if (portRslt.status != 200) {
    console.error(`getPortFallback /droneport/info/list Error {status: ${uaslRslt.status}}.`);
    throw new Error(`getPortFallback /droneport/info/list Error {status: ${uaslRslt.status}}.`);
  }
  console.log('searchPorts:getPortFallback', portRslt)
  return portRslt.data;
}