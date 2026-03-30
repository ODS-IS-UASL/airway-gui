export type CommonResponse = {
  errorDetail: string // エラー詳細
}

/** 料金表管理情報（API レスポンス用） */
export type PriceInfoRecord = {
  priceId: string | null
  price: number
  priceType: number
  pricePerUnit: number
  effectiveStartTime: string
  effectiveEndTime: string
  priority?: number
  processingType?: number
}

/**
   * ドローンポート情報登録
   */
export type DronePortRegisterRequestParams = {
  dronePortId?: string // ドローンポートID
  dronePortName: string // ドローンポート名
  address?: string // 設置場所住所
  manufacturer?: string // 製造メーカー
  serialNumber?: string // 製造番号
  dronePortManufacturerId?: string // 離着陸場メーカーID
  portType: number // 離着陸場種類
  visDronePortCompanyId?: string // VIS離発着場事業者ID
  storedAircraftId?: string // 格納中機体ID
  lat: number // 緯度
  lon: number // 経度
  alt?: number // 着陸面対地高度
  supportDroneType?: string // 対応機体
  activeStatus?: number // 動作状況
  inactiveTimeFrom?: string // 使用不可開始日時
  inactiveTimeTo?: string // 使用不可終了日時
  imageData?: string // 画像
  operatorId?: string // オペレータID
}
export type DronePortRegisterResponse = CommonResponse | {
  dronePortId: string
}

/**
   * ドローンポート情報更新
   */
export type DronePortUpdateByPkRequestParams = {
  dronePortId: string // ドローンポートID
  dronePortName?: string // ドローンポート名
  address?: string // 設置場所住所
  manufacturer?: string // 製造メーカー
  serialNumber?: string // 製造番号
  portType?: number // 離着陸場種類
  visDronePortCompanyId?: string // VIS離発着場事業者ID
  storedAircraftId?: string // 格納中機体ID
  lat?: number // 緯度
  lon?: number // 経度
  alt?: number // 着陸面対地高度
  supportDroneType?: string // 対応機体
  activeStatus?: number // 動作状況
  inactiveTimeFrom?: string // 使用不可開始日時
  inactiveTimeTo?: string // 使用不可終了日時
  imageData?: string // 画像
  operatorId?: string // オペレータID
}
export type DronePortUpdateByPkResponse = DronePortRegisterResponse

/**
   * ドローンポート情報削除
   */
export type DronePortDeleteByPkResponse = CommonResponse | undefined

/**
   * ドローンポート情報一覧取得
   */
export type DronePortGetListRequestQueryParams = null | {
  dronePortName?: any // ドローンポート名
  address?: any // 設置場所住所
  manufacturer?: any // 製造メーカー
  serialNumber?: any // 製造番号
  portType?: any // 離着陸場種類
  minLat?: any // 最小緯度(南側)
  minLon?: any // 最小経度(西側)
  maxLat?: any // 最大緯度(北側)
  maxLon?: any // 最大経度(東側)
  supportDroneType?: any // 対応機体
  activeStatus?: any // 動作状況
}
export type DronePortGetListResponseRecord = {
  dronePortId: string // ドローンポートID
  dronePortName: string // ドローンポート名
  address: string // 設置場所住所
  manufacturer: string // 製造メーカー
  serialNumber: string // 製造番号
  portType: number // 離着陸場種類
  visDronePortCompanyId: string // VIS離発着場事業者ID
  storedAircraftId: string // 格納中機体ID
  lat: number // 緯度
  lon: number // 経度
  alt: number // 着陸面対地高度
  supportDroneType: string // 対応機体
  activeStatus: number // 動作状況
  scheduledStatus: number // 予定された動作状態
  inactiveTimeFrom: string // 使用不可開始日時
  inactiveTimeTo: string // 使用不可終了日時
}
export type DronePortGetListResponse = {
  data: DronePortGetListResponseRecord[]
  perPage: number
  currentPage: number
  lastPage: number
  total: number
}

/**
   * ドローンポート情報詳細取得
   */
export type DronePortGetByPkResponse = {
  dronePortId: string // ドローンポートID
  dronePortName: string // ドローンポート名
  address: string // 設置場所住所
  manufacturer: string // 製造メーカー
  serialNumber: string // 製造番号
  portType: number // 離着陸場種類
  visDronePortCompanyId: string // VIS離発着場事業者ID
  storedAircraftId: string // 格納中機体ID
  lat: number // 緯度
  lon: number // 経度
  alt: number // 着陸面対地高度
  supportDroneType: string // 対応機体
  activeStatus: number // 動作状況
  scheduledStatus: number // 予定された動作状態
  inactiveTimeFrom: string // 使用不可開始日時
  inactiveTimeTo: string // 使用不可終了日時
  imageData: string // 画像
  // 料金表管理改修  Start
  priceInfos: PriceInfoRecord[] // 料金表管理情報
  // 料金表管理改修  End
}

/**
   * ドローンポート予約情報登録
   */
export type DronePortReserveRequestParams = {
  dronePortReservationId?: string // ドローンポート予約ID
  dronePortId: string // ドローンポートID
  aircraftId: string // 使用機体ID
  routeReservationId: string // 航路予約ID
  usageType: number // 利用形態
  reservationTimeFrom: string // 予約開始日時
  reservationTimeTo: string // 予約終了日時
}
/*
*ドローンポート予約情報登録リスト
*/
export type DronePortReserveRequestParamData = {
  data: DronePortReserveRequestParams[]
  operatorId?: string // オペレータID
}
export type DronePortReserveResponse = {
  dronePortReservationId: string // ドローンポート予約ID
}

/**
   * ドローンポート予約情報更新
   */
export type DronePortReserveUpdateRequestParams = {
  dronePortReservationId: string // ドローンポート予約ID
  dronePortId?: string // ドローンポートID
  aircraftId?: string // 使用機体ID
  routeReservationId?: string // 航路予約ID
  usageType?: number // 利用形態
  reservationTimeFrom?: string // 予約開始日時
  reservationTimeTo?: string // 予約終了日時
  operatorId?: string // オペレータID
}
export type DronePortReserveUpdateResponse = DronePortReserveResponse

/**
   * ドローンポート予約情報削除
   */
export type DronePortReserveDeleteResponse = CommonResponse | undefined

/**
   * ドローンポート予約情報一覧取得
   */
export type DronePortReserveGetListRequestQueryParams = null | {
  dronePortId?: any // ドローンポートID
  dronePortName?: any // ドローンポート名
  aircraftId?: any // 使用機体ID
  routeReservationId?: any // 航路予約ID
  timeFrom?: any // 日時条件(開始)
  timeTo?: any // 日時条件(終了)
  perPage?: any // 1ページ当たりの件数
  page?: any // 現在ページ番号
}
export type DronePortReserveGetListResponseRecord = {
  dronePortReservationId: string // ドローンポート予約ID
  dronePortId: string // ドローンポートID
  aircraftId: string // 使用機体ID
  routeReservationId: string // 航路予約ID
  usageType: number // 利用形態
  dronePortName: string // ドローンポート名
  aircraftName: string // 機体名
  reservationTimeFrom: string // 予約開始日時
  reservationTimeTo: string // 予約終了日時
  reservationActiveFlag: boolean // 予約有効フラグ
  inactiveTimeFrom: string // 使用不可開始日時
  inactiveTimeTo: string // 使用不可終了日時
  visDronePortCompanyId: string // VISドローンポート事業者ID
  operatorId: string // オペレータID
}
export type DronePortReserveGetListResponse = {
  data: DronePortReserveGetListResponseRecord[]
  perPage: number
  currentPage: number
  lastPage: number
  total: number
}

/**
   * ドローンポート予約情報詳細取得
   */
export type DronePortReserveGetByPkResponse = CommonResponse | DronePortReserveGetListResponseRecord

/**
   * ドローンポート周辺情報取得
   */
export type DronePortGetEnvironmentResponse = {
  dronePortId: string // ドローンポートID
  windSpeed?: number // 風速
  windDirection?: number // 風向
  rainfall?: number // 雨量
  temp?: number // 気温
  pressure?: number // 気圧
  obstacleDetected?: boolean // 障害物
  observationTime: string // 取得時刻
}
