# Event Countdown Timer – Tech & Feature Spec

## 1. Overview
リアルタイムでカウントダウン／ステータス／メッセージを配信する Next.js + Socket.IO + Redis 構成の Web アプリ。イベント運営向けに「ビューモード」「全画面モード」「管理ダッシュボード」を提供します。

## 2. Core Features
| 区分 | 機能 | 詳細 |
|------|------|------|
| タイマー | CountdownTimer | Redis に保存された `startAt`, `endAt`, `color` を表示／秒更新 |
| ステータス | StatusDisplay | 受付中 / 開始前 / 開催中 / 休憩中 / 終了 の5段階 |
| メッセージ | TimerMessage / MessageControlPanel | 管理者が送信・編集・削除。色・点滅設定可 |
| カスタム表示 | URL パラメータ `?title=&message=&mode=` | 任意タイトル・メッセージを埋め込み表示 |
| ビューモード | `/`（管理） `/` + `?mode=view`（通常） `/` + `?mode=full`（全画面） | 3 セクション構造 (Header / Main / Footer) |
| 参加者数 | VisitorCounter | リアルタイム更新（例: 入退場ゲート側で Redis INCR/DECR） |
| 現在時刻 | ServerClock + CurrentDateTime | サーバー時刻を fetch → 3 秒毎に補正 |
| リアルタイム通信 | Socket.IO + Redis Pub/Sub | `timer:update`, `message:new`, `visitor:update` |

## 3. Tech Stack
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS
- **Backend**: Custom Node server (`server.js`) → `src/lib/customServer.ts`  
  ‐ Combines Next.js HTTP & Socket.IO WebSocket on **port 3000**
- **Realtime**: Socket.IO + `@socket.io/redis-adapter`
- **Data Store**: Redis 7 (ElastiCache 推奨)
- **State Hooks**: `useTimerData`, `useStatusData`
- **Deployment**:  
  ‐ Dev: `npm run dev:custom` (ts-node)  
  ‐ Prod: `npm run start:custom` (compiled)  
  ‐ EC2/Nginx or Vercel (separate WS server) に対応

## 4. Directory Highlights
```
src/
├─ app/
│  ├─ page.tsx               # 3モード対応トップページ
│  ├─ api/
│  │   ├─ timer/route.ts     # GET/POST timer data
│  │   └─ status/route.ts    # GET/PUT event status
├─ components/
│  ├─ CountdownTimer.tsx
│  ├─ StatusDisplay.tsx
│  ├─ VisitorCounter.tsx
│  ├─ TimerMessage.tsx
│  └─ CurrentDateTime.tsx
├─ contexts/SocketContext.tsx
├─ hooks/useTimerData.ts
└─ lib/
   ├─ customServer.ts        # Next.js + Socket.IO サーバー
   ├─ redis.ts               # ioredis クライアント
   └─ timerTypes.ts          # 共有型定義
server.js                    # ts-node エントリ
```

## 5. Runtime Environment Variables
| Key | 用途 | 例 |
|-----|------|----|
| `REDIS_URL` | Redis 接続 | `redis://xxxxx:6379` |
| `JWT_SECRET` | 管理パネル認証 (予定) | `supersecret` |
| `PORT` | HTTP/WS ポート | `3000` |

## 6. API Endpoints
| Method | Path | Body / Query | 説明 |
|--------|------|--------------|------|
| GET    | `/api/timer` |  | 現行タイマーを返す |
| POST   | `/api/timer` | `{ startAt, endAt, color }` | 新タイマー作成 |
| GET    | `/api/status` |  | 現行ステータスを返す |
| PUT    | `/api/status` | `{ status }` | ステータス更新 |

### Socket.IO Events
```
timer:update      // タイマー変更通知
message:new       // 新メッセージ
visitor:update    // 入退場数変更
```

## 7. UX / UI Notes
- すべてのカードに半透明黒 + `backdrop-blur-md` + `border-white/10` を適用
- タイマー表示：数値ボックスに下線 + 20%透過背景、xl で 120 px 最小幅
- メッセージは `inline-block` 背景でタイマーと重ならない
- 全画面モードはタイマー倍サイズ＆背景グラデをステータス色に変更

## 8. Deployment on EC2 (Quick Steps)
1. `aws ec2 run-instances` t3.small (port 22/80/443 open)  
2. `git clone` → `npm ci` → `npm run build`  
3. `pm2 start server.js --name timer-app --env production`  
4. Nginx で `/` & `/socket.io/` → `localhost:3000` ProxyPass  
5. ElastiCache Redis を用意して `.env.production` に `REDIS_URL`

## 9. Cost Estimate (Tokyo)
| Item | Small | Medium |
|------|-------|--------|
| EC2 t3.small | ¥3k/月 | — |
| EC2 t3.medium | — | ¥6k/月 |
| Redis cache.t3.micro | ¥2.4k | — |
| Redis cache.t3.small | — | ¥4.8k |
| Data transfer 100 GB | ¥1.2k | ¥1.2k |
| **Total** | ≈ **¥6.7k/月** | ≈ **¥12.1k/月** |

## 10. Roadmap / TODO
- 管理者認証 (NextAuth + JWT)
- 多言語化 (i18n)
- CloudWatch Logs / Metrics 統合
- Unit / e2e Test (Jest + Playwright)

---
このドキュメントを Pull Request や README に同梱すれば、誰でも最短で開発・運用に参加できます。
