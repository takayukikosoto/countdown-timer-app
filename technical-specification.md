# カウントダウンタイマーアプリケーション 技術仕様書

## 1. 概要

このアプリケーションは、イベント管理のためのカウントダウンタイマーを提供するウェブアプリケーションです。管理者とスタッフが協力してイベントのタイムラインを管理し、参加者に対して視覚的なフィードバックを提供します。

## 2. 技術スタック

### 2.1 フロントエンド
- **フレームワーク**: Next.js 15.3.4 (App Router)
- **UI ライブラリ**: React 19.0.0
- **スタイリング**: Tailwind CSS 4.x
- **状態管理**: React Context API + カスタムフック
- **リアルタイム通信**: Socket.IO Client 4.8.1

### 2.2 バックエンド
- **サーバー**: Next.js API Routes + カスタムNode.jsサーバー
- **リアルタイム通信**: Socket.IO Server 4.8.1
- **データベース**: Supabase (PostgreSQL)
- **キャッシュ/Pub-Sub**: Redis (ioredis 5.6.1)
- **認証**: JWT (jsonwebtoken, jose)

### 2.3 開発環境
- **言語**: TypeScript 5.x
- **パッケージマネージャー**: npm
- **リンター**: ESLint 9.x
- **ビルドツール**: Next.js ビルドシステム

## 3. アーキテクチャ

### 3.1 全体構成
アプリケーションは以下の主要コンポーネントで構成されています：

1. **Next.js フロントエンド**: ユーザーインターフェースとクライアントサイドのロジック
2. **カスタムNode.jsサーバー**: Socket.IOとNext.jsを統合したサーバー
3. **Redis**: リアルタイムメッセージングとデータ同期のためのPub/Subシステム
4. **Supabase**: ユーザー認証、タイマーデータ、来場者数などのデータ永続化

### 3.2 主要モジュール
- **認証システム**: JWT認証によるユーザー管理（管理者/スタッフ/一般）
- **タイマー管理**: カウントダウンタイマーの作成・編集・表示
- **リアルタイム通信**: Socket.IOによるイベント状態の同期
- **来場者カウント**: イベント参加者数のリアルタイム管理
- **ステータス管理**: イベントステータスのリアルタイム更新と表示

## 4. データフロー

### 4.1 認証フロー
1. ユーザーがログインフォームから認証情報を送信
2. サーバーがSupabaseでユーザーを検証
3. 検証成功時、JWTトークンを生成してクライアントに返却
4. クライアントはトークンをローカルストレージに保存
5. 以降のリクエストにトークンを含めて送信

### 4.2 タイマーデータフロー
1. タイマーデータはSupabaseに保存
2. API Routesを通じてクライアントからアクセス
3. リアルタイム更新はSocket.IOとRedis Pub/Subで同期
4. クライアントはカスタムフック（useTimerData）を使用してデータにアクセス

### 4.3 リアルタイム通信フロー
1. クライアントがSocket.IOを通じてサーバーに接続
2. サーバーはRedis Pub/Subを使用して複数インスタンス間でイベントを同期
3. イベント発生時、関連するクライアントにリアルタイムで通知
4. クライアントはイベントに応じてUIを更新

## 5. 主要コンポーネント

### 5.1 フロントエンドコンポーネント
- **CountdownTimer**: タイマー表示コンポーネント
- **TimerControlPanel**: タイマー操作パネル
- **StaffControlPanel**: スタッフ用操作パネル
- **StatusDisplay**: イベントステータス表示
- **MessageControlPanel**: メッセージ管理パネル
- **VisitorCounter**: 来場者カウンター

### 5.2 カスタムフック
- **useTimerData**: タイマーデータの取得・管理
- **useStatusData**: ステータスデータの取得・更新
- **useSocket**: Socket.IO接続の管理
- **useVisitorCount**: 来場者数の管理
- **useAuth**: 認証状態の管理

### 5.3 バックエンドサービス
- **customServer.ts**: Socket.IOとNext.jsを統合したサーバー
- **redis.ts**: Redisクライアント管理
- **countdownTimer.ts**: タイマーロジック
- **status.ts**: ステータス管理ロジック
- **visitors.ts**: 来場者数管理ロジック

## 6. API エンドポイント

### 6.1 認証API
- `POST /api/auth/login`: ユーザーログイン

### 6.2 タイマーAPI
- `GET /api/timer?action=current`: 現在のタイマー取得
- `GET /api/timer?action=all`: 全タイマー取得
- `GET /api/timer?action=messages`: タイマーメッセージ取得
- `POST /api/timer/actions`: タイマーアクション実行

### 6.3 ステータスAPI
- `GET /api/status`: 現在のステータス取得
- `POST /api/status`: ステータス更新

### 6.4 その他API
- `GET /api/time`: サーバー時間取得
- `GET /api/health`: ヘルスチェック

## 7. Socket.IOイベント

### 7.1 タイマー関連
- `timer:update`: タイマー情報更新
- `timer:start`: タイマー開始
- `timer:pause`: タイマー一時停止
- `timer:resume`: タイマー再開
- `timer:reset`: タイマーリセット

### 7.2 メッセージ関連
- `message:send`: メッセージ送信
- `message:delete`: メッセージ削除
- `message:getAll`: 全メッセージ取得
- `message:new`: 新規メッセージ通知

### 7.3 来場者数関連
- `visitor:update`: 来場者数更新
- `visitor:reset`: 来場者数リセット

### 7.4 ステータス関連
- `status:update`: ステータス更新

## 8. データモデル

### 8.1 タイマーデータ
```typescript
interface TimerData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 8.2 メッセージデータ
```typescript
interface TimerMessage {
  id: string;
  text: string;
  color?: string;
  blink?: boolean;
  createdAt: string;
}
```

### 8.3 来場者データ
```typescript
interface VisitorData {
  id: string;
  count: number;
  event_date: string;
  updated_at: string;
}
```

### 8.4 ユーザーデータ
```typescript
interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff' | 'user';
  createdAt: string;
}
```

## 9. デプロイ構成

### 9.1 開発環境
- `npm run dev`: 開発サーバー起動（Next.js + Socket.IO）
- `npm run dev:next`: Next.jsのみ起動
- `npm run dev:custom`: カスタムサーバー起動

### 9.2 本番環境
- `npm run build`: アプリケーションビルド
- `npm run start`: 本番サーバー起動（Next.js + Socket.IO）
- `npm run start:next`: Next.jsのみ起動
- `npm run start:custom`: カスタムサーバー起動

### 9.3 必要な環境変数
```
# Next.js
NEXT_PUBLIC_SITE_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=
JWT_EXPIRATION=

# Socket.IO
SOCKET_IO_PORT=3000
```

## 10. セキュリティ対策

### 10.1 認証・認可
- JWTベースの認証システム
- ロールベースのアクセス制御（管理者/スタッフ/一般）
- セッション管理とトークン検証

### 10.2 データ保護
- 環境変数による機密情報の保護
- Supabaseのセキュリティルールによるデータアクセス制御
- クライアント側でのデータ検証

### 10.3 通信セキュリティ
- HTTPS通信
- Socket.IO接続のセキュリティ対策
- クロスサイトリクエストフォージェリ（CSRF）対策

## 11. パフォーマンス最適化

### 11.1 フロントエンド
- コンポーネントの最適なレンダリング
- 状態管理の効率化
- 画像・アセットの最適化

### 11.2 バックエンド
- Redis キャッシュの活用
- データベースクエリの最適化
- サーバーサイドレンダリングの活用

### 11.3 リアルタイム通信
- Socket.IOのトランスポート設定最適化
- イベント発火の効率化
- 接続状態の適切な管理

## 12. 今後の拡張性

### 12.1 機能拡張
- 複数イベントの同時管理
- 高度な分析ダッシュボード
- モバイルアプリ対応

### 12.2 技術的拡張
- マイクロサービスアーキテクチャへの移行
- コンテナ化（Docker）とオーケストレーション（Kubernetes）
- CI/CDパイプラインの強化

### 12.3 スケーラビリティ
- 水平スケーリングのためのステートレス設計
- Redis Clusterによる分散キャッシュ
- データベースのシャーディング

## 13. 既知の課題と対応策

### 13.1 Socket.IO接続の安定性
- 複数のトランスポート方式をサポート（WebSocket + Polling）
- 接続再試行のパラメータ最適化
- 接続状態の監視と自動リカバリ

### 13.2 時間同期の精度
- サーバー時間との定期的な同期
- NTPサーバーとの連携
- クライアント側の時刻ドリフト補正

### 13.3 複数デバイス間の一貫性
- 状態管理の一元化
- リアルタイム更新の信頼性向上
- 競合解決メカニズムの実装
