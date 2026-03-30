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

/** 補足資料（API レスポンス用） */
export type FileInfoRecord = {
  fileId: string | null
  fileLogicalName?: string
  filePhysicalName?: string
  fileData?: string
  processingType?: number
}

/** ペイロード情報（API レスポンス用） */
export type PayloadInfoRecord = {
  processingType?: number
  payloadId: string | null
  payloadName: string
  payloadDetailText: string
  imageData: string
  filePhysicalName: string
  fileData: string
}

/**
   * 機体情報登録
   */
export type AircraftRegisterRequestParams = {
  aircraftId?: string // 機体ID
  aircraftName: string // 機体名
  manufacturer?: string // 製造メーカー
  manufacturingNumber?: string // 製造番号
  aircraftType?: number // 機体の種類
  maxTakeoffWeight?: number // 最大離陸重量
  bodyWeight?: number // 重量
  maxFlightSpeed?: number // 最大速度
  maxFlightTime?: number // 最大飛行時間
  certification?: boolean // 機体認証の有無
  dipsRegistrationCode?: string // DIPS登録記号
  ownerType: number // 機体所有種別
  ownerId?: string // 所有者ID
  imageData?: string // 画像
  // 料金表管理改修  Start
  publicFlag: boolean // 公開フラグ
  modelNumber?: string // 型式番号
  fileInfos?: FileInfoRecord[] // 補足資料
  payloadInfos?: PayloadInfoRecord[] // ペイロード情報
  priceInfos?: PriceInfoRecord[] // 料金表管理情報
  // 料金表管理改修  End
}
export type AircraftRegisterResponse = CommonResponse | {
  aircraftId: string
}

/**
   * 機体情報更新
   */
export type AircraftUpdateByPkRequestParams = {
  aircraftId: string // 機体ID
  aircraftName?: string // 機体名
  manufacturer?: string // 製造メーカー
  manufacturingNumber?: string // 製造番号
  aircraftType?: number // 機体の種類
  maxTakeoffWeight?: number // 最大離陸重量
  bodyWeight?: number // 重量
  maxFlightSpeed?: number // 最大速度
  maxFlightTime?: number // 最大飛行時間
  certification?: boolean // 機体認証の有無
  dipsRegistrationCode?: string // DIPS登録記号
  ownerType?: number // 機体所有種別
  ownerId?: string // 所有者ID
  imageData?: string // 画像
  // 料金表管理改修  Start
  modelNumber?: string // 型式番号
  publicFlag: boolean // 公開フラグ
  fileInfos?: FileInfoRecord[] // 補足資料
  payloadInfos?: PayloadInfoRecord[] // ペイロード情報
  priceInfos?: PriceInfoRecord[] // 料金表管理情報
  // 料金表管理改修  End
}
export type AircraftUpdateByPkResponse = AircraftRegisterResponse

/**
   * 機体情報削除
   */
export type AircraftDeleteByPkResponse = CommonResponse | undefined

/**
   * 機体情報一覧取得
   */
export type AircraftGetListRequestQueryParams = null | {
  aircraftName?: any // 機体名
  manufacturer?: any // 製造メーカー
  manufacturingNumber?: any // 製造番号
  aircraftType?: any // 機体の種類
  certification?: any // 機体認証の有無
  dipsRegistrationCode?: any // DIPS登録記号
  ownerType?: any // 機体所有種別
  ownerId?: any // 所有者ID
  minLat?: any // 最小緯度(南側)
  minLon?: any // 最小経度(西側)
  maxLat?: any // 最大緯度(北側)
  maxLon?: any // 最大経度(東側)
}
export type AircraftGetListResponse = {
  data: AircraftGetByPkResponse[]
  perPage: number
  currentPage: number
  lastPage: number
  total: number
}

/**
   * 機体情報詳細取得
   */
export type AircraftGetByPkResponse = {
  aircraftId: string // 機体ID
  aircraftName: string // 機体名
  manufacturer: string // 製造メーカー
  manufacturingNumber: string // 製造番号
  aircraftType: number // 機体の種類
  maxTakeoffWeight: number // 最大離陸重量
  bodyWeight: number // 重量
  maxFlightSpeed: number // 最大速度
  maxFlightTime: number // 最大飛行時間
  lat: number // 緯度
  lon: number // 経度
  certification: boolean // 機体認証の有無
  dipsRegistrationCode: string // DIPS登録記号
  ownerType: number // 機体所有種別
  ownerId: string // 所有者ID
  imageData: string // 画像
  // 料金表管理改修  Start
  modelNumber?: string // 型式番号
  operatorId?: string // オペレータID
  priceInfos: PriceInfoRecord[] // 料金表管理情報
  fileInfos: FileInfoRecord[] // 補足資料
  payloadInfos: PayloadInfoRecord[] // ペイロード情報
  // 料金表管理改修  End
}

/**
   * 機体予約情報登録
   */
export type AircraftReserveRequestParams = {
  aircraftReservationId?: string // 機体予約ID
  aircraftId: string // 機体ID
  reservationTimeFrom: string // 予約開始時間
  reservationTimeTo: string // 予約終了時間
  operatorId?: string // オペレータID
}
export type AircraftReserveResponse = CommonResponse | {
  aircraftReservationId: string // 機体予約ID
}

/**
   * 機体予約情報更新
   */
export type AircraftUpdateReserveRequestParams = {
  aircraftReservationId: string // 機体予約ID
  aircraftId?: string // 機体ID
  reservationTimeFrom?: string // 予約開始時間
  reservationTimeTo?: string // 予約終了時間
  operatorId?: string // オペレータID
}
export type AircraftUpdateReserveResponse = AircraftReserveResponse

/**
   * 機体予約情報削除
   */
export type AircraftReserveDeleteResponse = CommonResponse | undefined

/**
   * 機体予約情報一覧取得
   */
export type AircraftReserveGetListRequestQueryParams = null | {
  aircraftId?: any // 機体ID
  aircraftName?: any // 機体名
  timeFrom?: any // 日時条件(開始)
  timeTo?: any // 日時条件(終了)
  perPage?: any // 1ページ当たりの件数
  page?: any // 現在ページ番号
}
type AircraftReserveGetListResponseRecord = {
  aircraftReservationId: string // 機体予約ID
  aircraftId: string // 機体ID
  reservationTimeFrom: string // 予約開始時間
  reservationTimeTo: string // 予約終了時間
  aircraftName: string // 機体名
  operatorId: string // オペレータID
}
export type AircraftReserveGetListResponse = {
  data: AircraftReserveGetListResponseRecord[]
  perPage: number
  currentPage: number
  lastPage: number
  total: number
}

/**
   * 機体予約情報詳細取得
   */
export type AircraftReserveGetByPkResponse = CommonResponse | AircraftReserveGetListResponseRecord
