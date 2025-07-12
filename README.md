# リアルタイムイベントタイマー

Next.js + Socket.IO + Redis を使用したリアルタイムイベントタイマーアプリケーションです。イベントの受付状況、来場者数、サーバー時刻をリアルタイムに配信し、スタッフ間で情報を共有できます。

## 主な機能

- **リアルタイム時刻同期**: サーバー時刻を基準に全クライアントで時刻を同期
- **イベント状態管理**: 受付中、終了などのステータスをリアルタイム配信
- **来場者カウンター**: 来場者数をリアルタイムに集計・表示
- **管理者ダッシュボード**: イベント状態の変更や来場者数の管理
- **ビューワーモード**: 大画面表示に最適化された表示モード

## 技術スタック

- **フロントエンド**: Next.js, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js (App Router), Socket.IO
- **データストア**: Redis (状態管理, Pub/Sub)
- **認証**: JWT (予定)
- **コンテナ化**: Docker, Docker Compose

## 開発環境のセットアップ

### 必要条件

- Node.js 20以上
- Docker と Docker Compose
- Redis (Dockerで提供)

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd timer

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して必要な環境変数を設定
```

### 開発サーバーの起動

#### 方法1: Next.js 開発サーバー (Socket.IO機能なし)

```bash
npm run dev
```

#### 方法2: カスタムサーバー (Socket.IO機能あり)

```bash
npm run dev:custom
```

#### 方法3: Docker Compose

```bash
docker-compose up
```

## 本番環境へのデプロイ

### ビルド

```bash
npm run build
```

### 起動

```bash
npm run start:custom
```

### Docker を使用したデプロイ

```bash
docker build -t event-timer .
docker run -p 3000:3000 -e REDIS_URL=redis://your-redis-host:6379 event-timer
```

## 環境変数

- `REDIS_URL`: Redis接続URL (例: `redis://localhost:6379`)
- `NEXT_PUBLIC_WS_URL`: WebSocket接続URL (例: `ws://localhost:3000/socket`)
- `JWT_SECRET`: JWT認証用の秘密鍵

## ライセンス

MIT
