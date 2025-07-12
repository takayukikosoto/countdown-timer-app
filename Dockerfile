# ベースイメージ
FROM node:20-alpine AS base
# NTP同期のためのchronyをインストール
RUN apk add --no-cache chrony curl

# 依存関係のインストール
FROM base AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# ビルド
FROM deps AS builder
WORKDIR /usr/src/app
COPY . .
COPY --from=deps /usr/src/app/node_modules ./node_modules
RUN npm run build

# 本番環境
FROM base AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# 必要なファイルのみをコピー
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/server.js ./server.js

# 起動スクリプト
RUN echo "#!/bin/sh\nchronyd -q\nnode server.js" > /usr/src/app/start.sh && \
    chmod +x /usr/src/app/start.sh

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 起動コマンド
CMD ["/usr/src/app/start.sh"]
