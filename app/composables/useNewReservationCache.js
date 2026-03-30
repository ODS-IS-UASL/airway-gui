/**
 * 新規予約フロー専用のキャッシュ共有コンポーザブル。
 * Nuxt の useState を用いてページ・コンポーネント間で状態を共有する。
 *
 * portHashMap: airwaySetting.vue の MapComponent から得たポートデータを
 *   portId をキーにした Map として保持し、datetimeSetting ／ CalendarDisplayOrchestration
 *   でセマンティックライブラリを再コールせずにポート名を解決するために使用する。
 *
 * selectedAirwayData: airwaySetting.vue で選択・蓄積された航路データ。
 *   datetimeSetting.vue でカレンダーのセクション解決に使用する。
 */
export function useNewReservationCache() {
  /**
   * portId → { portName, lat, lon } のハッシュマップ
   * airwaySetting.vue の handlePortsUpdated で構築される。
   */
  const portHashMap = useState('_newRsv_portHashMap', () => ({}))

  /**
   * airwaySetting.vue でマップに表示された全航路データ（蓄積）
   * handleAirwaysUpdated で更新される。
   */
  const selectedAirwayData = useState('_newRsv_selectedAirwayData', () => ({ airway: { airways: [] } }))

  /**
   * uaslPointId → uaslPointName のハッシュマップ
   * airwaySetting.vue の handleAirwaysUpdated で構築される。
   * externalSystemInfo により名前を補完した航路点を含む全航路点名のマッピング。
   */
  const junctionNameMap = useState('_newRsv_junctionNameMap', () => ({}))

  return { portHashMap, selectedAirwayData, junctionNameMap }
}
