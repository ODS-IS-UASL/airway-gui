# ドローン航路システム 共通GUIモジュール

Nuxt 3 ベースのドローン航路管理フロントエンドアプリケーションです。  
航路の画定・予約・運用状態の監視、ドローン機体・ドローンポートの管理などの機能を提供します。

---

## 主な機能

| 機能 | 説明 |
|---|---|
| 航路管理 | 新規航路の画定（断面図・高度幅設定）、共有航路の接続、中間点追加 |
| 航路予約 | UASL に基づく航路予約の申請・一覧表示 |
| 航路状態監視 | リアルタイムの航路利用状況のカレンダー表示 |
| ドローン管理 | 運用機体情報の登録・編集 |
| ドローンポート管理 | 離発着地点の登録・編集 |
| 落下範囲管理 | 最大落下範囲の設定 |
| 通知 | MQTT を用いたリアルタイム通知 |

---

## 技術スタック

- **フレームワーク**: [Nuxt 3](https://nuxt.com/) / [Vue 3](https://vuejs.org/)
- **UI コンポーネント**: [Vuetify 3](https://vuetifyjs.com/)
- **地図**: [Leaflet.js](https://leafletjs.com/) / [@vue-leaflet/vue-leaflet](https://github.com/vue-leaflet/vue-leaflet)
- **グラフ**: [Chart.js](https://www.chartjs.org/) / [vue-chartjs](https://vue-chartjs.org/)
- **通信**: [axios](https://axios-http.com/) / [MQTT.js](https://github.com/mqttjs/MQTT.js)
- **GIS 演算**: [@turf/turf](https://turfjs.org/)
- **認証**: [@sidebase/nuxt-auth](https://auth.sidebase.io/)
- **カレンダー**: [FullCalendar](https://fullcalendar.io/)

---

## 必要環境

- Node.js 20 以上
- npm 10 以上

---

## セットアップ

依存パッケージをインストールします。

```bash
npm install
```

> **注意**: `npm run build` はパスに日本語が含まれると失敗します。  
> プロジェクトは英数字のみのパスに配置してください。

---

## 開発サーバー起動

```bash
npm run dev
```

ホスト公開する場合（他端末からのアクセスを許可）:

```bash
npm run dev -- --host
```

開発サーバーは `http://localhost:3000` で起動します。

---

## ビルド・本番起動

```bash
# ビルド
npm run build

# 本番サーバー起動
npm run start
```

---

## コード品質

```bash
# Lint チェック
npm run lint

# Lint 自動修正
npm run format
```

---

## 環境変数

`.env` ファイルをプロジェクトルートに配置し、以下の変数を設定してください。

```env
# API エンドポイント
NUXT_PUBLIC_AIRWAY_API_BASE_URL=http://...
NUXT_PUBLIC_MISC_API_BASE_URL=http://...
NUXT_PUBLIC_RESERVATION_API_BASE_URL=http://...

# 地図タイル
NUXT_PUBLIC_MAP_TILE_URL=https://...

# 認証
NUXT_OIDC_CLIENT_SECRET=...
```

詳細は `nuxt.config.ts` の `runtimeConfig` を参照してください。

---

## 開発ツール（バックエンドシミュレーター）

`../tool/backend-simulator` に Nuxt ベースのモックAPIサーバーが含まれています。  
実APIが用意できない環境での開発・テストに使用します。

```bash
cd ../tool/backend-simulator
npm install
npm run dev
```

