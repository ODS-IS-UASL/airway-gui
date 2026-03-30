export type Codes = {
  aircraftType: any
  ownerType: any
  aircraftsSearchCandidates: any
  dronPortsSearchCandidates: any
  // dronePortType: any
  portType: any
  sensor: any
  activeStatus: any
  scheduledStatus: any
  reservationStatus: any
  dronPortsHeaders: any
  obstacleDetected: any
  usageTypeOfPort: any
  // 料金表管理改修  Start
  priceType: any
  // 料金表管理改修  End
}

export type CodeRow = {
  value: any
  title: string | null
}

// コード系定義
export const codes: Codes = {
  // 機体の種類
  aircraftType: {
    plane: {
      value: 1,
      title: '飛行機',
    },
    helicopter: {
      value: 2,
      title: '回転翼航空機（ヘリコプター）',
    },
    multirotor: {
      value: 3,
      title: '回転翼航空機（マルチローター）',
    },
    otherRotor: {
      value: 4,
      title: '回転翼航空機（その他）',
    },
    glider: {
      value: 5,
      title: '滑空機',
    },
    airship: {
      value: 6,
      title: '飛行船',
    },
  },
  // 機体所有種別
  ownerType: {
    owner: {
      value: 1,
      title: '事業者所有機体',
    },
    rental: {
      value: 2,
      title: 'レンタル機体',
    },
  },
  // 項目名選択(機体情報一覧)
  aircraftsSearchCandidates: {
    aircraftName: {
      value: 1,
      title: '機体名',
    },
    manufacturer: {
      value: 2,
      title: '製造メーカー',
    },
    manufacturingNumber: {
      value: 3,
      title: '製造番号',
    },
    aircraftType: {
      value: 4,
      title: '機体の種類',
    },
    certification: {
      value: 5,
      title: '機体認証の有無',
    },
    dipsRegistrationCode: {
      value: 6,
      title: 'DIPS登録記号',
    },
    ownerType: {
      value: 8,
      title: '機体所有種別',
    },
    ownerId: {
      value: 9,
      title: '所有者ID',
    },
    installationLocation: {
      value: 10,
      title: '場所',
    },
  },
  // 項目名選択(ドローンポート情報一覧)
  dronPortsSearchCandidates: {
    // dronePortType: {
    //   value: 2,
    //   title: '離着陸場種別',
    // },
    dronePortName: {
      value: 3,
      title: '離着陸場名',
    },
    address: {
      value: 4,
      title: '設置場所住所',
    },
    manufacturer: {
      value: 5,
      title: '製造メーカー',
    },
    serialNumber: {
      value: 6,
      title: '製造番号',
    },
    portType: {
      value: 7,
      title: '離着陸場種類',
    },
    area: {
      value: 8,
      title: '設置場所',
    },
    supportDroneType: {
      value: 9,
      title: '対応機体',
    },
    activeStatus: {
      value: 16,
      title: '動作状況',
    },
  },
  // ドローンポート種別
  // dronePortType: {
  //   ownSystemManage: {
  //     value: 1,
  //     title: '自システム管理',
  //   },
  //   visManage: {
  //     value: 2,
  //     title: 'VIS管理',
  //   },
  //   otherBusinessOperatorManage: {
  //     value: 3,
  //     title: '他事業者管理',
  //   },
  // },
  // 離着陸場種類
  portType: {
    emergencyLandingPoint: {
      value: 0,
      title: '緊急着陸場',
    },
    dronePort: {
      value: 1,
      title: '無人（機械式）',
    },
    takeOffAndLandingPlant: {
      value: 2,
      title: '有人',
    },
  },
  // 設置センサー
  sensor: {
    available: {
      value: true,
      title: 'あり',
    },
    notAvailable: {
      value: false,
      title: 'なし',
    },
  },
  // 動作状況
  activeStatus: {
    preparation: {
      value: 1,
      title: '準備中',
    },
    available: {
      value: 2,
      title: '使用可',
    },
    notAvailable: {
      value: 3,
      title: '使用不可',
    },
    maintenance: {
      value: 4,
      title: 'メンテナンス中',
    },
  },
  // 予約状態
  reservationStatus: {
    valid: {
      value: true,
      title: '有効',
    },
    invalid: {
      value: false,
      title: '取消中',
    },
  },
  // 予定された動作状況
  scheduledStatus: {
    notAvailable: {
      value: 3,
      title: '使用不可',
    },
    maintenance: {
      value: 4,
      title: 'メンテナンス',
    },
  },
  // 表ヘッダー要素
  dronPortsHeaders: {
    1: {
      value: 'dronePortId',
      title: '離着陸場ID',
    },
    /*
    2: {
      value: 'dronePortType',
      title: '離着陸場種別',
    },
    */
    3: {
      value: 'dronePortName',
      title: '離着陸場名',
    },
    4: {
      value: 'address',
      title: '設置場所住所',
    },
    /*
    5: {
      value: 'manufacturer',
      title: '製造メーカー',
    },
    */
    6: {
      value: 'serialNumber',
      title: '製造番号',
    },
    7: {
      value: 'portType',
      title: '離着陸場種類',
    },
    8: {
      value: 'installationLocation',
      title: '設置場所',
    },
    9: {
      value: 'alt',
      title: '着陸面対地高度(m)',
    },
    10: {
      value: 'supportDroneType',
      title: '対応機体',
    },
    // 11: {
    //   value: 'usageType',
    //   title: '使用用途',
    // },
    12: {
      value: 'activeStatus',
      title: '動作状況',
    },
    13: {
      value: 'status',
      title: 'ステータス',
    },
    14: {
      value: 'dronePortManufacturerId',
      title: '離着陸場メーカーID',
    },
    15: {
      value: 'visDronePortCompanyId',
      title: 'VIS離着陸場事業者ID',
    },
    16: {
      value: 'storedAircraftId',
      title: '格納中機体ID',
    },
    17: {
      value: 'scheduledStatus',
      title: '動作予約状況',
    },
  },
  // 障害物の有無
  obstacleDetected: {
    available: {
      value: true,
      title: '有り',
    },
    notAvailable: {
      value: false,
      title: '無し',
    },
  },
  // 利用形態
  usageTypeOfPort: {
    takeoff: {
      value: 1,
      title: '離陸場',
    },
    landing: {
      value: 2,
      title: '着陸場',
    },
    others: {
      value: 3,
      title: 'その他',
    },
  },
  // 料金表管理改修  Start
  // 料金タイプ
  priceType: {
    timePerSecond: {
      value: 1,
      title: '時間(秒)課金',
    },
    timePerMinute: {
      value: 2,
      title: '時間(分)課金',
    },
    timePerHour: {
      value: 3,
      title: '時間(時)課金',
    },
    timePerDay: {
      value: 4,
      title: '時間(日)課金',
    },
    timePerWeek: {
      value: 5,
      title: '時間(週)課金',
    },
    timePerMonth: {
      value: 6,
      title: '時間(月)課金',
    },
    timePerYear: {
      value: 7,
      title: '時間(年)課金',
    },
  }
  // 料金表管理改修  End
} as const
