import { buildUaslIdSet, fetchOwnCompanyAirwayData, fetchSemanticAirwayData, mergeAirwayData, getCenterFromAirwayData, getExtremePointsFromOwnAirwayData } from './useUaslMap'

/**
 * 予約一覧・運航状況一覧で使用する航路情報の3段階ロードを管理するコンポーザブル。
 * Nuxt の useState を使用するため、ページ遷移後も状態が保持される。
 * これにより、予約詳細ページでも Stage3 完了通知を受け取れる。
 */
export function useAirwayReservationLoader() {
  /** 統合済み航路データ */
  const airwayData = useState('_rsvLoader_airwayData', () => ({ airway: { airways: [] } }))
  /** Stage2（自社航路）取得完了フラグ */
  const ownDataReady = useState('_rsvLoader_ownDataReady', () => false)
  /** Stage3（セマンティック検索）完了前は true */
  const airwayDataLoading = useState('_rsvLoader_airwayDataLoading', () => true)

  /**
   * 3段階ロードを開始する。
   * Stage2 完了後に ownDataReady = true、Stage3 完了後に airwayDataLoading = false となる。
   * @param {Object} reservationData - GET /uaslReservations の結果
   */
  async function startLoading(reservationData) {
    // 状態をリセット
    ownDataReady.value = false
    airwayDataLoading.value = true
    airwayData.value = { airway: { airways: [] } }

    const uaslIdSet = buildUaslIdSet(reservationData)

    // Stage2: 自社航路システムから航路情報取得
    try {
      const ownData = await fetchOwnCompanyAirwayData(uaslIdSet)
      if (ownData) {
        airwayData.value = ownData
      }
    }
    catch (e) {
      console.error('useAirwayReservationLoader: Stage2 own airway fetch failed:', e)
    }
    ownDataReady.value = true

    // Stage3: セマンティック検索（バックグラウンド実行）
    // このIIFEはページ遷移後も完走し、useStateの値を更新し続ける
    ;(async () => {
      try {
        const runtimeConfig = useRuntimeConfig()
        const radius = parseInt(runtimeConfig.public.semanticSearchRadiusMeters) || 20000
        const mode = parseInt(runtimeConfig.public.semanticSearchSurroundingMode ?? '1')

        if (mode === 2) {
          // MODE2: 自社航路点の最北南東西4点を起点にセマンティック検索を4回実行
          const extremes = getExtremePointsFromOwnAirwayData(airwayData.value)
          if (extremes && extremes.length > 0) {
            const results = await Promise.all(
              extremes.map(([lat, lon]) =>
                fetchSemanticAirwayData(uaslIdSet, lat, lon, radius).catch(() => null)
              )
            )
            let merged = airwayData.value
            for (const r of results) {
              if (r) merged = mergeAirwayData(merged, r)
            }
            airwayData.value = merged
          } else {
            // 自社航路点が取得できなかった場合はフォールバックとして設定座標を使用
            const lat = parseFloat(runtimeConfig.public.semanticSearchCenterLat)
            const lon = parseFloat(runtimeConfig.public.semanticSearchCenterLon)
            const semanticData = await fetchSemanticAirwayData(uaslIdSet, lat, lon, radius)
            if (semanticData) {
              airwayData.value = mergeAirwayData(airwayData.value, semanticData)
            }
          }
        } else {
          // MODE1(デフォルト): 自社航路の中心座標だけで検索
          const fromOwn = getCenterFromAirwayData(airwayData.value)
          const lat = fromOwn ? fromOwn[0] : parseFloat(runtimeConfig.public.semanticSearchCenterLat)
          const lon = fromOwn ? fromOwn[1] : parseFloat(runtimeConfig.public.semanticSearchCenterLon)
          const semanticData = await fetchSemanticAirwayData(uaslIdSet, lat, lon, radius)
          if (semanticData) {
            airwayData.value = mergeAirwayData(airwayData.value, semanticData)
          }
        }
      }
      catch (e) {
        console.error('useAirwayReservationLoader: Stage3 semantic fetch failed:', e)
      }
      finally {
        airwayDataLoading.value = false
      }
    })()
  }

  return { airwayData, ownDataReady, airwayDataLoading, startLoading }
}
