import { DateTime } from 'luxon'

interface Utils {
  isNullUndefined(val: any): boolean
  isBlank(val: any): boolean
  isNullUndefinedEmptyArray(val: any): boolean
  isNormalStatusResponse(val: any): boolean
  toFormatJSTtime(val: string, format?: string, timezone?: string): string
  convertUTCtoJST(val: string): string | null
  convertJSTtoUTC(val: string): string | null
  convertUTCtoJSTDateTime(val: string): DateTime | null
  convertJSTtoUTCDateTime(val: string): DateTime | null
  createDateIsoAndTimefromUTCISOTime(fromTimeISO: string, toTimeHHmm: string): string | null
  // 料金表管理改修  Start
  formatPrice(value: number | string): string | null
  // 料金表管理改修  End
  convertUaslToAirway(
    uaslPayload: any,
    options?: { businessNumber?: string | number | null; uaslAdministratorId?: string | number | null }
  ): any
  convertUaslToAirwayReservation(
    uaslPayload: any,
    options?: { overwriteChildReservationId?: boolean }
  ): any
}

// 共通処理関数
const utils: Utils = {
  // null判定
  isNullUndefined(val: any) {
    return typeof val === 'undefined' || val === null
  },
  // null or 空文字判定
  isBlank(val: any) {
    return this.isNullUndefined(val) || val === ''
  },
  // null or 空配列判定
  isNullUndefinedEmptyArray(val: any) {
    return this.isNullUndefined(val) || !Array.isArray(val) || val.length === 0
  },
  // 正常ステータス判定
  isNormalStatusResponse(val: number) {
    return val >= 200 && val < 300
  },

  // ISO形式からJSTの○○：××形式の時刻形式に変換
  toFormatJSTtime(val: string, format = 'HH:mm', timezone = DateTime.local().zoneName) {
    return DateTime.fromISO(val).setZone(timezone).toFormat(format)
  },

  // ISO形式のUTCからJSTへの変換メソッド
  convertUTCtoJST(val: string) {
    const timeZone = DateTime.local().zoneName
    const utcDate = DateTime.fromISO(val)
    const jstDate = utcDate.setZone(timeZone)
    return jstDate.toISO()
  },
  // ISO形式のJSTからUTCへの変換メソッド
  convertJSTtoUTC(val: string) {
    const jstDate = DateTime.fromISO(val)
    const utcDate = jstDate.setZone('utc')
    return utcDate.toISO()
  },

  // ISO形式のUTCからJST(DateTime型)への変換メソッド
  convertUTCtoJSTDateTime(val: string) {
    const timeZone = DateTime.local().zoneName
    const utcDate = DateTime.fromISO(val)
    const jstDate = utcDate.setZone(timeZone)
    return jstDate
  },

  // ISO形式のJSTからUTC(DateTime型)への変換メソッド
  convertJSTtoUTCDateTime(val: string) {
    const jstDate = DateTime.fromISO(val)
    const utcDate = jstDate.setZone('utc')
    return utcDate
  },

  // ISO形式（JST）の時刻（日付情報）とHH:mm形式の時刻から
  // 入力時刻のISO形式（UTC）を生成するメソッド
  createDateIsoAndTimefromUTCISOTime(fromTimeISO: string, toTimeHHmm: string) {
    const startDateTime = DateTime.fromISO(fromTimeISO)
    const [endHour, endMinute] = toTimeHHmm.split(':').map(Number)

    const toTime = startDateTime.set({
      hour: endHour,
      minute: endMinute,
    })
    const toTimeUtc = toTime.setZone('utc')
    return toTimeUtc.toISO()
  },

  // 料金表管理改修  Start
  // 金額を3桁区切り（カンマ区切り）で表示する
  formatPrice(value: number | string) {
    if (value === null || value === undefined || value === '') return ''
    return new Intl.NumberFormat('ja-JP').format(Number(value))
  },
  // 料金表管理改修  End

  // データ構造をUASL（新API）からAirway（旧API） 形式へ変換
  convertUaslToAirway(
    uaslPayload: any,
    options: { businessNumber?: string | number | null; uaslAdministratorId?: string | number | null } = {}
  ) {
    const filterBn = options?.businessNumber ?? null
    const filterAdminId = options?.uaslAdministratorId ?? null

    const adminGroups = Array.isArray(uaslPayload?.uasl) ? uaslPayload.uasl : []
    const sourceGroups = adminGroups.filter((g: any) =>
      (filterBn ? g?.businessNumber === filterBn : true) &&
      (filterAdminId ? g?.uaslAdministratorId === filterAdminId : true)
    )

    const toArray = (v: any) => (Array.isArray(v) ? v : (v ? [v] : []))

    const airways = sourceGroups.reduce((acc: any[], group: any) => {
      // ここが対応点：配列 or 単一オブジェクト を配列に正規化
      const routes = toArray(group?.uasl)

      routes.forEach((u: any) => {
        acc.push({
          airwayAdministratorId: group?.uaslAdministratorId || '',
          businessNumber: group?.businessNumber || '',

          airwayId: u?.uaslId,
          airwayName: u?.uaslName,
          flightPurpose: u?.flightPurpose,
          createdAt: u?.createdAt,
          updatedAt: u?.updatedAt,
          droneList: Array.isArray(u?.droneList) ? u.droneList : [],

          airwayJunctions: (Array.isArray(u?.uaslPoints) ? u.uaslPoints : []).map((p: any) => ({
            airwayJunctionId: p?.uaslPointId,
            name: p?.uaslPointName,
            airwayJunctionName: p?.uaslPointName,
            type: 'uaslPoint',
            airways: [
              {
                airway: {
                  type: p?.geometry?.type || 'Polygon',
                  geometry: {
                    type: p?.geometry?.type || 'Polygon',
                    coordinates: (Array.isArray(p?.geometry?.coordinates) ? p.geometry.coordinates[0] : []) || []
                  }
                },
                deviation: {
                  type: p?.deviationGeometry?.type || 'Polygon',
                  geometry: {
                    type: p?.deviationGeometry?.type || 'Polygon',
                    coordinates: (Array.isArray(p?.deviationGeometry?.coordinates) ? p.deviationGeometry.coordinates[0] : []) || []
                  }
                }
              }
            ]
          })),

          airwaySections: (Array.isArray(u?.uaslSections) ? u.uaslSections : []).map((s: any) => ({
            airwaySectionId: s?.uaslSectionId,
            airwaySectionName: s?.uaslSectionName,
            airwayJunctionIds: Array.isArray(s?.uaslPointIds) ? s.uaslPointIds : [],
            droneportIds: Array.isArray(s?.droneportIds) ? s.droneportIds : []
          }))
        })
      })
      return acc
    }, [])

    const firstGroup = sourceGroups[0] || {}

    return {
      airway: {
        airwayAdministratorId: firstGroup?.uaslAdministratorId,
        businessNumber: firstGroup?.businessNumber,
        airways
      }
    }
  },

  // 予約データ構造をUASL（新API）からAirway（旧API）形式へ変換
  convertUaslToAirwayReservation(
    uaslPayload: any,
    options: { overwriteChildReservationId?: boolean } = {} // ←互換のため残すが、reservationId上書きには使わない
  ) {
    const toArray = (v: any) => (Array.isArray(v) ? v : [])

    const sortBySequenceAsc = (arr: any[]) =>
      [...arr].sort((a, b) => {
        const sa = typeof a?.sequence === "number" ? a.sequence : Number.MAX_SAFE_INTEGER
        const sb = typeof b?.sequence === "number" ? b.sequence : Number.MAX_SAFE_INTEGER
        return sa - sb
      })

    const normalizePortsUsageType12 = (arr: any[]) =>
      [...arr]
        .filter((p) => p?.usageType === 1 || p?.usageType === 2)
        .sort((a, b) => (a?.usageType ?? 999) - (b?.usageType ?? 999))

    const src = uaslPayload ?? {}
    const srcResult = Array.isArray(src?.result) ? src.result : null

    const convertOne = (r: any) => {
      // ★要件：airwayReservationId は requestId を参照
      const airwayReservationId = r?.requestId ?? ""

      const hasNewShape = !!r?.originReservation || Array.isArray(r?.destinationReservations)
      let normalized = r ?? {}

      // ===== 新API形状（originReservation/destinationReservations）を root へ集約 =====
      if (hasNewShape && r?.originReservation) {
        const origin = r.originReservation ?? {}
        const dests = toArray(r?.destinationReservations)

        const originVehicles = toArray(origin?.vehicles)
        const originPorts = toArray(origin?.ports)
        const originSections = toArray(origin?.uaslSections)
        // 適合性確認改修 start
        const originConformityAssessmentResults = toArray(origin?.conformityAssessmentResults)
        // 適合性確認改修 end

        // destinationReservations 側
        const destPorts = dests.flatMap((d: any) => toArray(d?.ports))

        const destSections = dests.flatMap((d: any) =>
          toArray(d?.uaslSections).map((s: any) => ({
            ...s,
            uaslId: d?.uaslId,
            reservationId: d?.reservationId,
          }))
        )

        // 適合性確認改修 start
        const destConformityAssessmentResults = dests.flatMap((d: any) => toArray(d?.conformityAssessmentResults))
        // 適合性確認改修 end

        // originReservation.uaslSections[] の reservationId は originReservation.reservationId を使用
        const originSectionReservationId = origin?.reservationId ?? ""

        const originSectionsWithReservationId = originSections.map((s: any) => ({
          ...s,
          uaslId: origin?.uaslId,
          reservationId: originSectionReservationId,
        }))

        normalized = {
          ...r,
          ...origin,

          uaslSections: sortBySequenceAsc([...originSectionsWithReservationId, ...destSections]),
          ports: normalizePortsUsageType12([...originPorts, ...destPorts]),

          vehicles: [...originVehicles],

          // 適合性確認改修 start
          conformityAssessmentResults: [...originConformityAssessmentResults, ...destConformityAssessmentResults],
          // 適合性確認改修 end

          destinationReservations: dests,
        }

        delete (normalized as any).originReservation
      }

      // ===== uasl -> airway 互換キー生成（従来通り） =====
      const srcSections = Array.isArray(normalized?.uaslSections)
        ? normalized.uaslSections
        : Array.isArray(normalized?.airwaySections)
          ? normalized.airwaySections
          : []

      const airwaySections = srcSections.map((s: any) => ({
        ...s,
        airwaySectionId: s?.uaslSectionId ?? s?.airwaySectionId,
        airwayId: s?.uaslId ?? normalized?.uaslId ?? s?.airwayId,
        startAt: s?.startAt,
        endAt: s?.endAt,
      }))

      // ★要件：各要素のreservationIdは元の値を保持（上書きしない）
      const vehicles = toArray(normalized?.vehicles).map((v: any) => ({
        ...v,
        vehicleId: v?.vehicleId,
        reservationId: v?.reservationId, // ←上書きしない
        name: v?.name ?? v?.aircraftInfo?.name,
      }))

      const ports = toArray(normalized?.ports).map((p: any) => ({
        ...p,
        portId: p?.portId,
        reservationId: p?.reservationId, // ←上書きしない
        name: p?.name,
      }))

      // 適合性確認改修 start
      let notifyType = "";
      let evaluationResults = true;
      const conformityAssessmentResults = toArray(normalized?.conformityAssessmentResults)
      for (const assessmentRes of conformityAssessmentResults) {
        if (assessmentRes.evaluationResults === false) {
          evaluationResults = assessmentRes.evaluationResults;
          switch (assessmentRes.type) {
            case "weather":
              notifyType = "気象異常";
              break;
            case "event":
              notifyType = "規制イベント";
              break;
            case "railway":
              notifyType = "鉄道異常";
              break;
            case "intrusion":
              notifyType = "人立ち入り";
              break;
            default:
              notifyType = "取得失敗";
              break;
          }
          break;
        }
      }
      // 適合性確認改修 end

      return {
        ...normalized,
        airwayReservationId,
        airwaySections,
        vehicles,
        ports,
        // 適合性確認改修 start
        evaluationResults: evaluationResults,
        evaluationStatus: notifyType
        // 適合性確認改修 end
      }
    }

    if (srcResult) {
      return { ...src, result: srcResult.map(convertOne) }
    }

    if (src?.requestId || src?.uaslReservationId || src?.airwayReservationId) {
      return convertOne(src)
    }

    return { ...src, result: [] }
  }
}

export { utils }