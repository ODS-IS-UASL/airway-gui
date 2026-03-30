/**
 * 予約一覧の性能改善用 - UASL ハッシュマップ管理ユーティリティ
 *
 * 予約データから uaslId のセットを構築し、自社航路・セマンティック検索を
 * 段階的に取得するためのヘルパー関数群。
 * Nuxt の自動インポートにより、全コンポーネントから利用可能。
 */

/**
 * 変換済み予約データから uaslId のセットを構築する。
 * result[N].uaslSections / airwaySections の両形式に対応。
 * @param {Object} reservationData 変換済み予約データ（result 配列を含む）
 * @returns {Set<string>} 予約に含まれる uaslId のセット
 */
export const buildUaslIdSet = (reservationData) => {
  const ids = new Set()
  const results = reservationData?.result ?? []
  results.forEach((r) => {
    const sections = r.uaslSections ?? r.airwaySections ?? []
    sections.forEach((s) => {
      const id = s.uaslId ?? s.airwayId
      if (id) ids.add(String(id))
    })
  })
  return ids
}

/**
 * 自社航路（GET /uasl?all=true）を取得し、uaslIdSet に含まれる航路のみを
 * airwayData 形式に変換・整列して返す。
 * @param {Set<string>} uaslIdSet 対象 uaslId のセット
 * @returns {Object|null} 変換済み airwayData または null（取得失敗・該当なし）
 */
export const fetchOwnCompanyAirwayData = async (uaslIdSet) => {
  try {
    const res = await $fetch('/api/airway/uasl', { method: 'GET', query: { all: true } })
    if (res.status !== 200) {
      console.warn('[useUaslMap] fetchOwnCompanyAirwayData: non-200 status', res.status)
      return null
    }
    const filtered = {
      uasl: (res.data?.uasl ?? []).filter((u) => {
        const id = u.uasl?.uaslId ?? u.uaslId
        return id && uaslIdSet.has(String(id))
      }),
    }
    if (filtered.uasl.length === 0) return null
    const converted = utils.convertUaslToAirway(filtered)
    return useAirwayConvertConnectionOrder(converted)
  }
  catch (e) {
    console.error('[useUaslMap] fetchOwnCompanyAirwayData error:', e)
    return null
  }
}

/**
 * セマンティックライブラリ（getAllNearbyUasl）で周辺航路を検索し、
 * uaslIdSet に含まれる航路のみを airwayData 形式に変換・整列して返す。
 * SSR 環境では実行せず null を返す。
 * @param {Set<string>} uaslIdSet 対象 uaslId のセット
 * @param {number} centerLat 検索中心緯度
 * @param {number} centerLon 検索中心経度
 * @param {number} radiusMeters 検索半径（メートル）
 * @returns {Object|null} 変換済み airwayData または null（取得失敗・該当なし）
 */
export const fetchSemanticAirwayData = async (uaslIdSet, centerLat, centerLon, radiusMeters = 10000) => {
  if (!import.meta.client) return null
  try {
    const { UaslSystemClient } = await import('semantic-client-library')
    const client = new UaslSystemClient()
    const res = await client.getAllNearbyUasl({ latitude: centerLat, longitude: centerLon, radiusMeters })
    if (!res?.data?.systems?.length) return null
    const payload = semanticUaslResultToPayload(res.data)
    const filtered = {
      uasl: payload.uasl
        .map(g => ({
          ...g,
          uasl: (Array.isArray(g.uasl) ? g.uasl : [g.uasl]).filter(
            u => u?.uaslId && uaslIdSet.has(String(u.uaslId)),
          ),
        }))
        .filter(g => g.uasl.length > 0),
    }
    if (filtered.uasl.length === 0) return null
    const converted = utils.convertUaslToAirway(filtered)
    return useAirwayConvertConnectionOrder(converted)
  }
  catch (e) {
    console.error('[useUaslMap] fetchSemanticAirwayData error:', e)
    return null
  }
}

/**
 * 2つの airwayData をマージする。
 * additional の航路が base の同一 airwayId を上書きする（セマンティックデータ優先）。
 * @param {Object} base ベースの airwayData
 * @param {Object} additional 追加・更新する airwayData
 * @returns {Object} マージ済み airwayData
 */
export const mergeAirwayData = (base, additional) => {
  const baseAirways = base?.airway?.airways ?? []
  const additionalAirways = additional?.airway?.airways ?? []
  const mergedMap = new Map(baseAirways.map(aw => [String(aw.airwayId), aw]))
  additionalAirways.forEach((aw) => {
    mergedMap.set(String(aw.airwayId), aw)
  })
  return {
    airway: {
      ...(base?.airway ?? {}),
      airways: Array.from(mergedMap.values()),
    },
  }
}

/**
 * airwayData から航路点の座標を基にセマンティック検索中心座標を取得する。
 * @param {Object} airwayData 変換済み airwayData
 * @returns {[number, number]|null} [緯度, 経度] または null（座標取得不可の場合）
 */
export const getCenterFromAirwayData = (airwayData) => {
  const centerFromRect = (coords) => {
    const n = Math.min(coords.length, 4)
    let lat = 0
    let lng = 0
    for (let i = 0; i < n; i++) {
      lat += coords[i][1]
      lng += coords[i][0]
    }
    return [lat / n, lng / n]
  }
  const filteredData = airwayData?.airway?.airways
    ?.map(m => ({ junctions: m?.airwayJunctions?.find(j => j?.airways) }))
    ?.find(a => a?.junctions)?.junctions?.airways
  if (filteredData?.length) {
    return centerFromRect(filteredData[0].airway.geometry.coordinates)
  }
  return null
}

/**
 * 自社航路データの全航路点を走査し、最北端・最南端・最東端・最西端の4座標を返す。
 * NUXT_PUBLIC_SEMANTIC_SEARCH_SURROUNDING_MODE=2 時のセマンティック検索起点算出に使用。
 * @param {Object} airwayData 変換済み airwayData（Stage2 で取得した自社航路データ）
 * @returns {[[number,number],[number,number],[number,number],[number,number]]|null}
 *   [最北端, 最南端, 最東端, 最西端] 各座標の [lat, lon]、取得不可の場合は null
 */
export const getExtremePointsFromOwnAirwayData = (airwayData) => {
  const centerFromRect = (coords) => {
    const n = Math.min(coords.length, 4)
    let lat = 0, lng = 0
    for (let i = 0; i < n; i++) { lat += coords[i][1]; lng += coords[i][0] }
    return [lat / n, lng / n]
  }

  const points = []
  for (const airway of (airwayData?.airway?.airways ?? [])) {
    for (const junction of (airway?.airwayJunctions ?? [])) {
      for (const aw of (junction?.airways ?? [])) {
        const c = aw?.airway?.geometry?.coordinates
        if (Array.isArray(c) && c.length > 0) {
          points.push(centerFromRect(c))
        }
      }
    }
  }

  if (points.length === 0) return null

  let north = points[0], south = points[0], east = points[0], west = points[0]
  for (const [lat, lon] of points) {
    if (lat > north[0]) north = [lat, lon]
    if (lat < south[0]) south = [lat, lon]
    if (lon > east[1]) east = [lat, lon]
    if (lon < west[1]) west = [lat, lon]
  }

  // 重複座標を除去した上で返却（全点が同一の場合も正常動作）
  const seen = new Map()
  for (const pt of [north, south, east, west]) {
    const key = `${pt[0].toFixed(6)},${pt[1].toFixed(6)}`
    seen.set(key, pt)
  }
  return [...seen.values()]
}
