import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  build: {
    transpile: ['vuetify'],
  },
  css: [
    './assets/css/main.css',
  ],
  modules: [
    '@nuxt/eslint',
    // 'nuxt-security',
    'nuxt-lodash',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error vuetify公式のためok
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],
  eslint: {
    config: {
      stylistic: true,
    },
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
  imports: {
    dirs: [
      // トップレベルモジュールのスキャン
      'composables',
      // ...または、特定の名前とファイル拡張子で１レベル深くネストされたモジュールをスキャン
      'composables/*/*',
    ],
  },
  runtimeConfig: {
    // private:
    oidcClientSecret: '',
    oidcGrantType: '',
    oidcTokenEndPointDev: '',
    oidcIssuerDev: '',
    keycloakLogoutUrl: '', // Keycloak ログアウトエンドポイント
    ouranos: {
      authFlow: {
        clientId: '',
        clientSecret: '',
      },
      clientFlow: {
        clientId: '',
        clientSecret: '',
      },
      redirectUri: '',
      apiBaseUrl: '',
      userAttrUrl: '',
      apiKey: '',
    },
    reservationApiKey: '', // API-Key (予約)
    weatherApiToken: '', // API (風向、風速、降水量) アクセストークン
    // BaseURL
    apigwApiBaseUrl: '', // API Gateway
    airwayApiBaseUrl: '', // API (航路、最大落下許容範囲)
    safetyApiBaseUrl: '', // API (安全確認)
    reservationApiBaseUrl: '', // API (予約)
    droneApiBaseUrl: '', // API (機体、ドローン)
    miscApiBaseUrl: '', // API (関係者一覧、DIPS連携)
    weatherApiBaseUrl: '', // API (風向、風速、降水量)
    public: {
      apiBaseUrl: '',
      baseCenterLat: '',
      baseCenterLon: '',
      baseZoom: '',
      mapMinZoom: '',
      mapMaxZoom: '',
      maxBoundSouth: '',
      maxBoundWest: '',
      maxBoundEast: '',
      maxBoundNorth: '',
      mapTileUrl: '',
      emergencyIconColor: '',
      dronePortIconColor: '',
      notAvailablePortIconColor: '',
      preparationPortIconColor: '',
      maintenancePortIconColor: '',
      largePortIconSize: '',
      zoomThresholdLM: '',
      mediumPortIconSize: '',
      zoomThresholdMS: '',
      smallPortIconSize: '',
      apiKey: '',
      businessNumber: '',
      centerInitLat: '',
      centerInitLon: '',
      timeoutValueGet: '',
      timeoutValue: '',
      numCrossSectionDivisions: '30',
      oidcAuthEndPointDev: '',
      oidcRedirectUri: '',
      oidcClientId: '',
      oidcResponseType: '',
      oidcScope: '',
      airwayReservationIgnoreLinkageFailure: '',
      airwayReservationWaittimeBeforeLinkage: '',
      airwayReservationRetryCountBeforeLinkage: '',
      mqttBrokerApiBaseDomain: '', // MQTTブローカー
      // 運航状況ステータスラベル・ドローンアイコン色 (RouteApproach / NormalOperation 共通色)
      statusColorNormalBg: 'rgb(225, 234, 255)',
      statusColorNormalFg: 'rgb(44, 105, 255)',
      // 運航状況ステータスラベル・ドローンアイコン色 (RouteDeviation)
      statusColorDeviationBg: 'rgb(253, 233, 244)',
      statusColorDeviationFg: 'rgb(230, 30, 140)',
      // 運航状況ステータスラベル・ドローンアイコン色 (PlannedRouteDeviation)
      statusColorPlannedDeviationBg: 'rgb(228, 235, 157)',
      statusColorPlannedDeviationFg: 'rgb(109, 100, 33)',
      semanticSearchRadiusMeters:  '10000',
      semanticSearchCenterLat: '35.9467139',
      semanticSearchCenterLon: '139.0552745',
      semanticSearchSurroundingMode: '1',
      colorPalette: ['#0F1ED2','#E6248F','#0074D9','#2ECC40','#FF851B','#B10DC9','#39CCCC','#FF4136','#FFDC00','#3D3D3D'],
      // 最大落下範囲：系統
      typeList: [
        { value: 'R' , title: '河川' },
        { value: 'P' , title: '送電線' },
        { value: 'O' , title: 'その他' },
      ],
      // 最大落下範囲：地域
      regionList: [
        { value: 'H' , title: '北海道' },
        { value: 'T' , title: '東北' },
        { value: 'K' , title: '関東・甲信越' },
        { value: 'C' , title: '中部・近畿' },
        { value: 'S' , title: '中国・四国' },
        { value: 'Q' , title: '九州' },
        { value: 'O' , title: '沖縄' },
      ],
      ouranos: {
        cookie: {
          codeVerifier: 'code_verifier',
          accessToken: 'access_token',
          expiresAt: 'expires_at',
          refreshToken: 'refresh_token',
          refreshExpiresAt: 'refresh_expires_at',
          operatorId: 'operator_id',
          parentOperatorId: 'parentOperatorId',
          operatorName: 'operator_name',
          roles: 'roles',
          secureFlg: process.env.NODE_ENV === 'production',
          skewSeconds: 30,
        },
        execAuth: true, // ログイン処理を実行するかどうか
      },
    },
  },
})
