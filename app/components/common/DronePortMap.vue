<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import { useTemplateRef, createApp, h } from 'vue'
import type { Map as leafletsMap, LatLngBoundsLiteral, LatLngExpression, LayerGroup } from 'leaflet'
import CommonDialog from '~/components/dialogs/CommonDialog.vue'
import EmergencySiteIcon from '~/components/svg/EmergencySiteIcon.vue'
import DronePortIcon from '~/components/svg/DronePortIcon.vue'
import DronePortColorDisp from '~/components/common/DronePortColorDisp.vue'

const {
  $luxon,
} = useNuxtApp()

// ドローンポートの型定義
interface DronePort {
  lat: number
  lon: number
  dronePortId: string
  [key: string]: any
}
const props = defineProps({
  dronePortsList: {
    type: Array as () => DronePort[],
    default: () => [],
    required: false,
  },
  displayLocaiton: {
    type: Array as () => number[],
    default: () => [],
    required: false,
  },
  dronePortPopup: {
    type: Boolean,
    default: false,
    required: false,
  },
  // 使用可能ポート表示フラグ
  dronePortVisible: {
    type: Boolean,
    default: true,
    required: false,
  },
  // 緊急着陸地点表示フラグ
  emergencyLandingSitesVisible: {
    type: Boolean,
    default: true,
    required: false,
  },
  // 準備中ポート表示フラグ
  preparationVisible: {
    type: Boolean,
    default: true,
    required: false,
  },
  // 使用不可ポート表示フラグ
  notAvailableVisible: {
    type: Boolean,
    default: true,
    required: false,
  },
  // メンテナンス中ポート表示フラグ
  maintenanceVisible: {
    type: Boolean,
    default: true,
    required: false,
  },
  baseZoom: {
    type: Number,
    default: null,
    required: false,
  },
})
const emit = defineEmits(['updateBounds', 'onDronePortClick'])

const isLoading = useState('isLoading')// スピナー表示
isLoading.value = true
const isMounted = ref(false)
const { constants } = useMyConstant()
const { convertCode, blankToHyphen } = useMyFilter()
const { codes } = useCode()

/** 地図 */
const minZoom = Number(useRuntimeConfig().public.mapMinZoom)
const maxZoom = Number(useRuntimeConfig().public.mapMaxZoom)
const maxBoundsSouth = Number(useRuntimeConfig().public.maxBoundSouth)
const maxBoundsWest = Number(useRuntimeConfig().public.maxBoundWest)
const maxBoundsNorth = Number(useRuntimeConfig().public.maxBoundNorth)
const maxBoundsEast = Number(useRuntimeConfig().public.maxBoundEast)
const maxBounds: LatLngBoundsLiteral = [
  // 日本が表示される境界値を設定
  [maxBoundsSouth, maxBoundsWest],
  [maxBoundsNorth, maxBoundsEast],
]
// デフォルト表示位置
const centerLat = Number(useRuntimeConfig().public.baseCenterLat)
const centerLon = Number(useRuntimeConfig().public.baseCenterLon)
const center = ref<LatLngExpression>([centerLat, centerLon])
const zoom = ref(props.baseZoom ?? Number(useRuntimeConfig().public.baseZoom))
const url = useRuntimeConfig().public.mapTileUrl
// 連続したマップムーブイベントを制御する閾値
const delay = 700

// 詳細情報切替フラグ
const dispDetail = ref(false)
// ダイアログ表示フラグ
const getByPkFailedDialogVisible = ref(false) // 詳細取得失敗ダイアログ
const getFailedDronePortEnvironmentDialogVisible = ref(false) // 周辺情報取得失敗ダイアログ
// ダイアログメッセージ
const commonDialogMessage = ref('')
// 周辺情報API結果
const dronePortEnvironmemt = ref()
// 詳細情報API結果
const dronePortDetail = ref()

/** leaflet */
let markersGroup: LayerGroup // マーカーレイヤーグループインスタンス
let leafletMap: leafletsMap // 地図インスタンス
const mapRef = useTemplateRef('mapRef') // Vue3.5.*のref
/** ポートアイコン基準値 */
const largeSvgSize = Number(useRuntimeConfig().public.largePortIconSize) // 大
const mediumSvgSize = Number(useRuntimeConfig().public.mediumPortIconSize) // 中
const smallSvgSize = Number(useRuntimeConfig().public.smallPortIconSize) // 小
/** サイズ変更ズーム値の閾値 */
const largeZoomThreshold = Number(useRuntimeConfig().public.zoomThresholdLM) // 大（以上）
const mediumZoomThreshold = Number(useRuntimeConfig().public.zoomThresholdMS) // 中（以上）
// const smallZoomThreshold // 小（else）

const largeSvgHtmls: Map<string, string> = new Map()
const mediumSvgHtmls: Map<string, string> = new Map()
const smallSvgHtmls: Map<string, string> = new Map()

let zoomControl: any // ズームコントロールインスタンス
let L: any // Leafletインスタンス
/** 環境変数からポートアイコンの色を取得 */
const emergencyIconColor = useRuntimeConfig().public.emergencyIconColor
const dronePortIconColor = useRuntimeConfig().public.dronePortIconColor
const notAvailablePortIconColor = useRuntimeConfig().public.notAvailablePortIconColor
const preparationPortIconColor = useRuntimeConfig().public.preparationPortIconColor
const maintenancePortIconColor = useRuntimeConfig().public.maintenancePortIconColor

/**
 * 離発着場押下処理
 */
const onDronePortClick = (dronePort: DronePort) => {
  emit('onDronePortClick', dronePort)
}
/**
 * 連続したmoveイベントを制御処理
 */
let debounceTimeoutId: ReturnType<typeof setTimeout> | null = null
const onDebounce = (callback: () => void) => {
  // 連続したイベントを制御
  if (debounceTimeoutId) {
    clearTimeout(debounceTimeoutId)
  }
  debounceTimeoutId = setTimeout(() => {
    callback()
  }, delay)
}

/**
 * パンズーム終了時処理
 */
const onMoveEnd = () => {
  onDebounce(() => {
    const north = leafletMap.getBounds().getNorth()
    const east = leafletMap.getBounds().getEast()
    const south = leafletMap.getBounds().getSouth()
    const west = leafletMap.getBounds().getWest()
    zoom.value = leafletMap.getZoom()
    // 最大最小緯度経度をemit
    emit('updateBounds', north, east, south, west, zoom.value)
    console.log(`${north}, ${east}, ${south}, ${west}, ${zoom.value}`)
  })
}

/**
 * ドローンポート詳細画面を表示
 */
const dispDronePortDetail = async (dronePortId: string) => {
  isLoading.value = true
  const environmentResult = await getDronePortEnvironment(dronePortId)
  if (!environmentResult) { // エラーの場合
    isLoading.value = false
    return
  }

  const detailResult = await getDronePortDetail(dronePortId)
  if (!detailResult) { // エラーの場合
    isLoading.value = false
    return
  }

  // 表示用にコンバート
  environmentResult.windSpeed = blankToHyphen(environmentResult.windSpeed)
  environmentResult.windDirection = blankToHyphen(environmentResult.windDirection)
  environmentResult.rainfall = blankToHyphen(environmentResult.rainfall)
  environmentResult.temp = blankToHyphen(environmentResult.temp)
  environmentResult.pressure = blankToHyphen(environmentResult.pressure)
  environmentResult.obstacleDetected = blankToHyphen(environmentResult.obstacleDetected)
  environmentResult.obstacleDetected = convertCode(environmentResult.obstacleDetected, 'obstacleDetected')
  environmentResult.observationTime = utils.isBlank(environmentResult.observationTime) ? blankToHyphen(environmentResult.observationTime) : utils.toFormatJSTtime(environmentResult.observationTime, constants.format.datetime, 'local')

  detailResult.portType = convertCode(detailResult.portType, 'portType')
  detailResult.activeStatus = convertDispActiveStatus(detailResult.activeStatus, detailResult.inactiveTimeFrom, detailResult.inactiveTimeTo) as any
  detailResult.scheduledStatus = convertDispScheduledStatus(detailResult.scheduledStatus, detailResult.inactiveTimeFrom, detailResult.inactiveTimeTo) as any

  dronePortEnvironmemt.value = environmentResult
  dronePortDetail.value = detailResult
  isLoading.value = false

  // 詳細情報画面（カスタムコントロール）表示
  dispDetail.value = true
  // ズームコントロール非表示
  zoomControl.remove()
}

// 動作状況画面表示用変換処理
const convertDispActiveStatus = (activeStatus: number, inactiveTimeFrom: string, inactiveTimeTo: string) => {
  const dispInactiveTimeFrom = utils.toFormatJSTtime(inactiveTimeFrom, constants.format.datetime, 'local')
  const dispInactiveTimeTo = utils.toFormatJSTtime(inactiveTimeTo, constants.format.datetime, 'local')
  switch (activeStatus) {
    case 1:
      return [`${convertCode(activeStatus, 'activeStatus')}`]
    case 2:
      return [`${convertCode(activeStatus, 'activeStatus')}`]
    case 3:
      return [`${convertCode(activeStatus, 'activeStatus')}`, `(${dispInactiveTimeFrom}～)`]
    case 4:
      return [`${convertCode(activeStatus, 'activeStatus')}`, `(${dispInactiveTimeFrom}～${dispInactiveTimeTo})`]
    default:
      return ['使用可']
  }
}

// 動作予約状況画面表示用変換処理
const convertDispScheduledStatus = (scheduledStatus: number, inactiveTimeFrom: string, inactiveTimeTo: string) => {
  const dispInactiveTimeFrom = utils.toFormatJSTtime(inactiveTimeFrom, constants.format.datetime, 'local')
  const dispInactiveTimeTo = utils.toFormatJSTtime(inactiveTimeTo, constants.format.datetime, 'local')
  switch (scheduledStatus) {
    case 3:
      return [`${convertCode(scheduledStatus, 'scheduledStatus')}`, `(${dispInactiveTimeFrom}～)`]
    case 4:
      return [`${convertCode(scheduledStatus, 'scheduledStatus')}`, `(${dispInactiveTimeFrom}～${dispInactiveTimeTo})`]
    default:
      return ['-']
  }
}

/**
 * ドローンポート周辺情報取得
 */
const getDronePortEnvironment = async (dronePortId: string) => {
  try {
    const apiResult = await $fetch(`/api/drone/droneport/environment/${dronePortId}`, { 
      method: 'GET',
    });
    if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
      const dataList = apiResult.data
      return dataList
    }
    else {
    // 取得失敗時処理
      const responseBody = apiResult.data
      getFailedDronePortEnvironmentDialogVisible.value = true
      if (responseBody?.errorDetail) {
        commonDialogMessage.value = `離着陸場周辺情報の取得に失敗しました。(エラー詳細：${responseBody.errorDetail})`
      }
      else {
        commonDialogMessage.value = `離着陸場周辺情報の取得に失敗しました。`
      }
      return false
    }
  }
  catch (error) {
    console.log(error)
    return false
  }
}

/**
 * ドローンポート詳細情報取得
 */
const getDronePortDetail = async (dronePortId: string) => {
  try {
    const apiResult = await $fetch(`/api/drone/droneport/info/detail/${dronePortId}`, { 
      method: 'GET',
      query: { isRequiredPriceInfo: false }
    });
    if (utils.isNormalStatusResponse(apiResult.status)) {
    // 取得成功時処理
      const dataList = apiResult.data
      return dataList
    }
    else {
      // 取得失敗時処理
      const responseBody = apiResult.data
      getByPkFailedDialogVisible.value = true
      if (responseBody?.errorDetail) {
        commonDialogMessage.value = `離着陸場情報の取得に失敗しました。(エラー詳細：${apiResult.data.errorDetail})`
      }
      else {
        commonDialogMessage.value = `離着陸場情報の取得に失敗しました。`
      }
      return false
    }
  }
  catch (error) {
    console.log(error)
    return false
  }
}

/**
 * ドローンポート情報を離着陸場種類でソート（降順）
 */
const sortDronePortsList = (dronePortList: DronePort[]) => {
  return dronePortList.sort((a, b) => {
    if (a.portType > b.portType) return -1
    if (a.portType < b.portType) return 1
    return 0
  })
}
const sortedDronePortsList = ref<DronePort[]>() // 描画用ドローンポートリスト
watch(() => props.dronePortsList, (newVal) => {
  sortedDronePortsList.value = sortDronePortsList(newVal)
  clearMarkers()
  addMarkers()
})
watch(() => [props.dronePortVisible, props.emergencyLandingSitesVisible, props.maintenanceVisible, props.notAvailableVisible, props.preparationVisible], () => {
  sortedDronePortsList.value = sortDronePortsList(props.dronePortsList)
  clearMarkers()
  addMarkers()
})
/**
 * マーカーレイヤーの初期化
 */
const clearMarkers = () => {
  markersGroup.clearLayers()
}
/**
 * マーカーのイベントリスナーを削除
 */
const removeMarkersEventListner = () => {
  markersGroup.eachLayer((layer) => {
    // 各レイヤーのすべてのリスナーを削除
    layer.off()
    if (layer.getPopup()) {
      layer.getPopup()!.off()
    }
  })
}
/**
 * マーカーをマーカーレイヤーへバインド
 */
const addMarkers = () => {
  let emergencySiteSvgHtml: string // 緊急着陸地点アイコン用
  let readyESvgHtml: string // 準備中緊急着陸地点アイコン用
  let notAvailableESvgHtml: string // 使用不可緊急着陸地点アイコン用
  let maintenanceESvgHtml: string // メンテナンス中緊急着陸地点アイコン用
  let dronePortSvgHtml: string // ドローンポートアイコン用
  let readyHSvgHtml: string // 準備中ドロポアイコン用
  let notAvailableHSvgHtml: string // 使用不可ドロポアイコン用
  let maintenanceHSvgHtml: string // メンテナンス中ドロポアイコン用
  let svgSize: number // 座標とSVGアイコンの案分用
  if (zoom.value >= largeZoomThreshold) {
    emergencySiteSvgHtml = largeSvgHtmls.get('emergencySiteSvgHtml') as string
    readyESvgHtml = largeSvgHtmls.get('readyESvgHtml') as string
    notAvailableESvgHtml = largeSvgHtmls.get('notAvailableESvgHtml') as string
    maintenanceESvgHtml = largeSvgHtmls.get('maintenanceESvgHtml') as string
    dronePortSvgHtml = largeSvgHtmls.get('dronePortSvgHtml') as string
    readyHSvgHtml = largeSvgHtmls.get('readyHSvgHtml') as string
    notAvailableHSvgHtml = largeSvgHtmls.get('notAvailableHSvgHtml') as string
    maintenanceHSvgHtml = largeSvgHtmls.get('maintenanceHSvgHtml') as string
    svgSize = largeSvgSize
  }
  else if (zoom.value >= mediumZoomThreshold) {
    emergencySiteSvgHtml = mediumSvgHtmls.get('emergencySiteSvgHtml') as string
    readyESvgHtml = mediumSvgHtmls.get('readyESvgHtml') as string
    notAvailableESvgHtml = mediumSvgHtmls.get('notAvailableESvgHtml') as string
    maintenanceESvgHtml = mediumSvgHtmls.get('maintenanceESvgHtml') as string
    dronePortSvgHtml = mediumSvgHtmls.get('dronePortSvgHtml') as string
    readyHSvgHtml = mediumSvgHtmls.get('readyHSvgHtml') as string
    notAvailableHSvgHtml = mediumSvgHtmls.get('notAvailableHSvgHtml') as string
    maintenanceHSvgHtml = mediumSvgHtmls.get('maintenanceHSvgHtml') as string
    svgSize = mediumSvgSize
  }
  else {
    emergencySiteSvgHtml = smallSvgHtmls.get('emergencySiteSvgHtml') as string
    readyESvgHtml = smallSvgHtmls.get('readyESvgHtml') as string
    notAvailableESvgHtml = smallSvgHtmls.get('notAvailableESvgHtml') as string
    maintenanceESvgHtml = smallSvgHtmls.get('maintenanceESvgHtml') as string
    dronePortSvgHtml = smallSvgHtmls.get('dronePortSvgHtml') as string
    readyHSvgHtml = smallSvgHtmls.get('readyHSvgHtml') as string
    notAvailableHSvgHtml = smallSvgHtmls.get('notAvailableHSvgHtml') as string
    maintenanceHSvgHtml = smallSvgHtmls.get('maintenanceHSvgHtml') as string
    svgSize = smallSvgSize
  }
  sortedDronePortsList.value?.forEach((port) => {
    let indexOffSet = 0
    let svgHtml
    // 表示アイコンを決定
    if (port.portType === codes.portType.emergencyLandingPoint.value) {
      indexOffSet = 1000
      if (!props.emergencyLandingSitesVisible) return
      // 緊急着陸地点
      if (utils.isBlank(port.activeStatus) || port.activeStatus === codes.activeStatus.available.value) {
        svgHtml = emergencySiteSvgHtml
      }
      else if (port.activeStatus === codes.activeStatus.preparation.value) {
        if (!props.preparationVisible) return
        // 準備中
        svgHtml = readyESvgHtml
      }
      else if (port.activeStatus === codes.activeStatus.notAvailable.value) {
        if (!props.notAvailableVisible) return
        // 使用不可
        svgHtml = notAvailableESvgHtml
      }
      else if (port.activeStatus === codes.activeStatus.maintenance.value) {
        if (!props.maintenanceVisible) return
        // メンテナンス中
        svgHtml = maintenanceESvgHtml
      }
      else {
        svgHtml = emergencySiteSvgHtml
      }
    }
    else {
      if (!props.dronePortVisible) return
      // 駐機場
      if (utils.isBlank(port.activeStatus) || port.activeStatus === codes.activeStatus.available.value) {
        svgHtml = dronePortSvgHtml
      }
      else if (port.activeStatus === codes.activeStatus.preparation.value) {
        if (!props.preparationVisible) return
        // 準備中
        svgHtml = readyHSvgHtml
      }
      else if (port.activeStatus === codes.activeStatus.notAvailable.value) {
        if (!props.notAvailableVisible) return
        // 使用不可
        svgHtml = notAvailableHSvgHtml
      }
      else if (port.activeStatus === codes.activeStatus.maintenance.value) {
        if (!props.maintenanceVisible) return
        // メンテナンス中
        svgHtml = maintenanceHSvgHtml
      }
      else {
        svgHtml = dronePortSvgHtml
      }
    }
    // アイコンをバインド
    const svgIcon = L.divIcon({
      html: svgHtml,
      className: '',
      iconAnchor: [svgSize / 2, svgSize / 2], // ViewBoxの中央を指定すること
    })
    // マーカー生成
    const marker = L.marker([port.lat, port.lon], { icon: svgIcon, zIndexOffset: indexOffSet })
    // マーカー押下イベント設定
    marker.on('click', () => {
      // ドローンポート押下時にポート情報をemit
      onDronePortClick(port)
    })
    marker.bindTooltip(port.dronePortName).openTooltip()
    if (props.dronePortPopup) {
      // ドロポ押下時のポップアップ設定
      let linkButtonListener: ((event: Event) => void) | null = null
      // 押下時のLeafletポップアップをバインド
      marker.bindPopup(`
        <div
          class="d-flex font-weight-bold py-1" 
        >
          <div
            class="w-50 flex-0-0-50"
          >
            離着陸場名
          </div>
          <span
            class="w-50 flex-0-0-50 link-button"
            id="drone-port-id-${port.dronePortId}"
            data-drone-port-id="${port.dronePortId}"
          >
            ${port.dronePortName}
          </span>
        </div>
        <div
          class="d-flex font-weight-bold py-1"
        >
          <div
            class="w-50 flex-0-0-50"
          >
            離着陸場ID
          </div>
          <div
            class="w-50 flex-0-0-50"
          >
            ${port.dronePortId}
          </span>
        </div>
      `).on('popupopen', () => {
      // ポップアップが開いたときのクリックイベントを設定
        const linkButton = document.querySelector(`#drone-port-id-${port.dronePortId}`)
        if (linkButton) {
        // ポップアップ部のドローンポートID押下イベント設定
          linkButtonListener = () => {
            const dronePortId = linkButton.getAttribute('data-drone-port-id')
            dispDronePortDetail(dronePortId!)
          }
          linkButton.addEventListener('click', linkButtonListener)
        }
      }).on('popupclose', () => {
        // メモリリーク考慮（念のため）
        const linkButton = document.querySelector(`#drone-port-id-${port.dronePortId}`)
        if (linkButton && linkButtonListener) {
          // イベントリスナーを削除
          linkButton.removeEventListener('click', linkButtonListener)
          linkButtonListener = null // リスナー参照をクリア
        }
      })
    }
    // マーカーグループレイヤーへ追加（インスタンス一括削除用）
    marker.addTo(markersGroup)
  })
}
/**
 * 詳細情報×ボタン押下
 */
const onDetailClose = () => {
  zoomControl.addTo(leafletMap)
  dispDetail.value = false
}
/**
 * mounted
 */
onMounted(async () => {
  nextTick(async () => {
    if (import.meta.client && mapRef.value) {
      // クライアントインポート
      L = await import('leaflet')
      // ビルド実行時に画像パスが不正になる
      const isDev = useRuntimeConfig().app.buildId === 'dev'
      if (!isDev) {
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
          iconUrl: '/leaflet/images/marker-icon.png',
          shadowUrl: '/leaflet/images/marker-shadow.png',
        })
      }
      // マップの初期化
      leafletMap = L.map(mapRef.value, {
        center: props.displayLocaiton.length === 2 ? props.displayLocaiton : center.value,
        zoom: zoom.value,
        doubleClickZoom: false, // ダブルクリックズームを無効化
        zoomControl: false, // ズームコントロールを非表示
        minZoom: minZoom, // 最小ズームレベル
        maxZoom: maxZoom, // 最大ズームレベル
        dragging: true, // 地図のドラッグを有効化
        bounceAtZoomLimits: false, // ズーム制限到達時にバウンス
        worldCopyJump: false, // 世界地図のコピーを作成しない
        maxBounds: maxBounds, // マップの境界制限
        maxBoundsViscosity: 1.0, // 境界制限の粘度
      })

      // タイルレイヤーの追加
      L.tileLayer(url, {
        maxZoom: maxZoom,
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
      }).addTo(leafletMap)
      // 右上にズームコントロールを表示
      zoomControl = L.control.zoom({
        position: 'topright',
      })
      zoomControl.addTo(leafletMap)
      markersGroup = L.layerGroup()
      leafletMap.addLayer(markersGroup)

      // マップズームドラッグ終了イベント設定
      leafletMap.on('moveend', () => {
        onMoveEnd()
      })

      // 地図初期表示後に東西南北の座標をemit（ドローンポート一覧情報等の取得用）
      const north = leafletMap.getBounds().getNorth()
      const east = leafletMap.getBounds().getEast()
      const south = leafletMap.getBounds().getSouth()
      const west = leafletMap.getBounds().getWest()
      const emitZoom = leafletMap.getZoom()
      emit('updateBounds', north, east, south, west, emitZoom)
      console.log(`${north}, ${east}, ${south}, ${west}, ${emitZoom}`)

      // コンポーネントを動的に生成してHTMLを取得
      const createComponentHtml = (component: any, props = {}) => {
        const container = document.createElement('div')
        const app = createApp({
          render: () => h(component, props),
        })
        app.mount(container)
        return container.innerHTML
      }
      // 表示アイコンごとのSVGHTMLを生成しておく
      /** 大 */
      largeSvgHtmls.set('dronePortSvgHtml', createComponentHtml(DronePortIcon, { portType: dronePortIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('emergencySiteSvgHtml', createComponentHtml(EmergencySiteIcon, { portType: emergencyIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('readyHSvgHtml', createComponentHtml(DronePortIcon, { portType: preparationPortIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('readyESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: preparationPortIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('notAvailableHSvgHtml', createComponentHtml(DronePortIcon, { portType: notAvailablePortIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('notAvailableESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: notAvailablePortIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('maintenanceHSvgHtml', createComponentHtml(DronePortIcon, { portType: maintenancePortIconColor, size: largeSvgSize }))
      largeSvgHtmls.set('maintenanceESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: maintenancePortIconColor, size: largeSvgSize }))
      /** 中 */
      mediumSvgHtmls.set('dronePortSvgHtml', createComponentHtml(DronePortIcon, { portType: dronePortIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('emergencySiteSvgHtml', createComponentHtml(EmergencySiteIcon, { portType: emergencyIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('readyHSvgHtml', createComponentHtml(DronePortIcon, { portType: preparationPortIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('readyESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: preparationPortIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('notAvailableHSvgHtml', createComponentHtml(DronePortIcon, { portType: notAvailablePortIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('notAvailableESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: notAvailablePortIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('maintenanceHSvgHtml', createComponentHtml(DronePortIcon, { portType: maintenancePortIconColor, size: mediumSvgSize }))
      mediumSvgHtmls.set('maintenanceESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: maintenancePortIconColor, size: mediumSvgSize }))
      /** 小 */
      smallSvgHtmls.set('dronePortSvgHtml', createComponentHtml(DronePortIcon, { portType: dronePortIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('emergencySiteSvgHtml', createComponentHtml(EmergencySiteIcon, { portType: emergencyIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('readyHSvgHtml', createComponentHtml(DronePortIcon, { portType: preparationPortIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('readyESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: preparationPortIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('notAvailableHSvgHtml', createComponentHtml(DronePortIcon, { portType: notAvailablePortIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('notAvailableESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: notAvailablePortIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('maintenanceHSvgHtml', createComponentHtml(DronePortIcon, { portType: maintenancePortIconColor, size: smallSvgSize }))
      smallSvgHtmls.set('maintenanceESvgHtml', createComponentHtml(EmergencySiteIcon, { portType: maintenancePortIconColor, size: smallSvgSize }))

      window.addEventListener('resize', onResize)

      // 画面のちらつき防止
      isMounted.value = true
    }
  })
})
let resizeTimeout: any
const onResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = setTimeout(() => {
    if (leafletMap) {
      leafletMap.invalidateSize()
    }
  }, 300)
}
/**
 * beforeUnmount
 */
onBeforeUnmount(async () => {
  // マーカーのイベントリスナーを破棄
  removeMarkersEventListner()
  // マーカーグループの破棄
  markersGroup.remove()
  // 地図インスタンスの破棄
  leafletMap.remove()

  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div>
    <ClientOnly>
      <div
        ref="mapRef"
        style="height: 78vh; width: 100%"
      >
        <div
          v-if="isMounted"
          class="leaflet-control-container"
        >
          <!-- 左上 -->
          <div
            class="leaflet-top leaflet-left"
            style="margin-left: 0px;margin-top: 0px;"
            @wheel.stop
            @mousedown.stop
          >
            <slot name="customControlTL" />
          </div>
          <!-- 左下 -->
          <div
            class="leaflet-bottom leaflet-left"
            style="margin-left: 0px;margin-top: 0px;"
          >
            <div
              class="leaflet-control leaflet-bar font-weight-bold"
              style="background-color: white; padding: 8px; font-size: 15px;"
              @wheel.stop
              @mousedown.stop
            >
              <v-row>
                <v-col>
                  凡例
                  <div class="legend-item py-1">
                    <DronePortColorDisp bg-color="green" />離着陸場
                  </div>
                  <div class="legend-item py-1">
                    <DronePortColorDisp bg-color="red" />緊急着陸場
                  </div>
                  <div class="legend-item py-1">
                    <DronePortColorDisp bg-color="orange" />準備中
                  </div>
                  <div class="legend-item py-1">
                    <DronePortColorDisp bg-color="grey" />使用不可
                  </div>
                  <div class="legend-item py-1">
                    <DronePortColorDisp bg-color="yellow" />メンテナンス中
                  </div>
                </v-col>
              </v-row>
            </div>
          </div>
          <!-- 右上 -->
          <template v-if="!dispDetail">
            <div
              class="leaflet-top leaflet-right"
              style="margin-right: 0px;margin-top: 73px;"
              @wheel.stop
              @mousedown.stop
            >
              <slot name="customControlTR" />
            </div>
          </template>
          <template v-if="dispDetail">
            <div
              style="margin-right: 10px;margin-top: 15px;overflow: visible;"
              class="leaflet-top leaflet-right responsive-control leaflet-bar leaflet-control"
            >
              <v-card
                class="mx-auto leaflet-control"
                max-width="660"
                max-height="650"
                style="overflow-y: auto;width: 100%;height: 100%;margin-top: 0px;"
                @wheel.stop
                @mousedown.stop
              >
                <v-card-text
                  class="text-h6"
                >
                  <div>
                    <v-row>
                      <v-col
                        cols="auto"
                        class="text-h5 font-weight-bold"
                      >
                        {{ dronePortDetail?.dronePortName }}
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="auto">
                        <v-card
                          v-if="dronePortDetail?.imageData"
                          height="18vh"
                          width="9vw"
                        >
                          <v-img
                            :src="dronePortDetail?.imageData"
                            height="100%"
                            width="100%"
                          />
                        </v-card>
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        離着陸場ID
                      </v-col>
                      <v-col>
                        {{ dronePortDetail?.dronePortId }}
                      </v-col>
                    </v-row>
                  </div>
                  <v-divider class="py-2" />
                  <div class="text-subtitle-1 py-2">
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        緯度
                      </v-col>
                      <v-col>
                        {{ dronePortDetail?.lat }}
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        経度
                      </v-col>
                      <v-col>
                        {{ dronePortDetail?.lon }}
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        着陸面対地高度
                      </v-col>
                      <v-col>
                        {{ dronePortDetail?.alt }} m
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        動作状況
                      </v-col>
                      <v-col>
                        <div
                          v-for="activeStatus in dronePortDetail?.activeStatus"
                          :key="activeStatus"
                        >
                          <div>{{ activeStatus }}</div>
                        </div>
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        動作予約状況
                      </v-col>
                      <v-col>
                        <div
                          v-for="activeStatus in dronePortDetail?.scheduledStatus"
                          :key="activeStatus"
                        >
                          <div>{{ activeStatus }}</div>
                        </div>
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        離着陸場種類
                      </v-col>
                      <v-col>
                        {{ dronePortDetail?.portType }}
                      </v-col>
                    </v-row>
                  </div>
                  <v-divider class="py-1" />
                  <div class="text-subtitle-1 py-1">
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        風速
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.windSpeed }} m/s
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        風向
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.windDirection }} 度
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        雨量
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.rainfall }} mm/s
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        気温
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.temp }} ℃
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        気圧
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.pressure }} hPa
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        障害物
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.obstacleDetected }}
                      </v-col>
                    </v-row>
                    <v-row dense>
                      <v-col
                        cols="5"
                        class="font-weight-bold"
                      >
                        取得時刻
                      </v-col>
                      <v-col>
                        {{ dronePortEnvironmemt?.observationTime }}
                      </v-col>
                    </v-row>
                  </div>
                </v-card-text>
                <!-- 詳細情報を閉じるボタン -->
                <v-btn
                  icon
                  color="grey-darken-1"
                  class="close-btn"
                  size="x-small"
                  @click="onDetailClose"
                >
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card>
            </div>
          </template>
        </div>
      </div>
    </ClientOnly>
    <!-- 詳細取得失敗ダイアログ -->
    <CommonDialog
      v-model:dialog-visible="getByPkFailedDialogVisible"
      title="離着陸場情報詳細取得 失敗"
      :message="commonDialogMessage"
      :dialog-type="constants.dialogType.error"
    >
      <template #customDialogButton>
        <v-row>
          <v-btn
            class="mx-2 dialog-button"
            variant="outlined"
            rounded="0"
            size="large"
            text="閉じる"
            @click="getByPkFailedDialogVisible = false"
          />
        </v-row>
      </template>
    </CommonDialog>
    <!-- 周辺情報取得失敗ダイアログ -->
    <CommonDialog
      v-model:dialog-visible="getFailedDronePortEnvironmentDialogVisible"
      title="離着陸場周辺情報取得 失敗"
      :message="commonDialogMessage"
      :dialog-type="constants.dialogType.error"
    >
      <template #customDialogButton>
        <v-row>
          <v-btn
            class="mx-2 dialog-button"
            variant="outlined"
            rounded="0"
            size="large"
            text="閉じる"
            @click="getFailedDronePortEnvironmentDialogVisible = false"
          />
        </v-row>
      </template>
    </CommonDialog>
  </div>
</template>

<style>
.legend-item {
    display: flex;
    align-items: center;
  }
.link-button {
  color: #1a73e8;
  text-decoration: underline;
}
.link-button:hover {
  color: #1a73e8;
  text-decoration: auto;
  cursor: pointer;
}

.responsive-control {
  max-width: 660px;
  width: 600px;
}
@media (max-width: 900px) {
  .responsive-control {
    max-width: 400px;
    width: 400px;
    font-size: 14px;
  }
}
@media (max-width: 600px) {
  .responsive-control {
    max-width: 200px;
    font-size: 12px;
    position: relative;
  }
}
.close-btn {
   /* 右上に固定 */
  position: absolute;
  top: 8px;
  right: 5px;
}
.flex-0-0-50 {
  flex: 0 0 50%;
}
</style>
