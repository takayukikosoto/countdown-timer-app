import Redis from 'ioredis';

// Redis クライアントのシングルトンインスタンス
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    // Dockerで実行されているRedisのポートは6381
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6381';
    console.log(`Redis接続先: ${redisUrl}`);
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        // 再接続戦略: 最大 30 秒まで指数バックオフ
        const delay = Math.min(times * 500, 30000);
        console.log(`Redis 再接続を ${delay}ms 後に試みます... (試行回数: ${times})`);
        return delay;
      },
      connectTimeout: 10000,
      maxRetriesPerRequest: 5,
      enableReadyCheck: true,
      enableOfflineQueue: true
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis エラー:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis に接続しました');
    });
    
    redisClient.on('reconnecting', () => {
      console.log('Redis に再接続しています...');
    });
    
    redisClient.on('ready', () => {
      console.log('Redis 接続準備完了');
    });
  }
  
  return redisClient;
}

// Redis Pub/Sub チャンネル
export const REDIS_CHANNELS = {
  STATUS: 'event:status',
  VISITORS: 'event:visitors',
  SERVER_TIME: 'server:time',
  TIMER: 'timer:events',
  MESSAGE: 'timer:message'
};

// Redis キー
export const REDIS_KEYS = {
  STATUS: 'status',
  VISITOR_COUNT: 'visitor_count',
  SOCKET_ROOM: (roomId: string) => `socket_room:${roomId}`,
};

// Redis からステータスを取得
export async function getStatus(): Promise<string> {
  const redis = getRedisClient();
  const status = await redis.get(REDIS_KEYS.STATUS);
  return status || '準備中';
}

// Redis にステータスを設定
export async function setStatus(status: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(REDIS_KEYS.STATUS, status);
  // ステータス変更を通知
  await redis.publish(REDIS_CHANNELS.STATUS, JSON.stringify({ status }));
}

// 来場者数を取得
export async function getVisitorCount(): Promise<number> {
  const redis = getRedisClient();
  const count = await redis.get(REDIS_KEYS.VISITOR_COUNT);
  return parseInt(count || '0', 10);
}

// 来場者数を増加
export async function incrementVisitorCount(increment: number = 1): Promise<number> {
  const redis = getRedisClient();
  const newCount = await redis.incrby(REDIS_KEYS.VISITOR_COUNT, increment);
  // 来場者数変更を通知
  await redis.publish(REDIS_CHANNELS.VISITORS, JSON.stringify({ visitors: newCount }));
  return newCount;
}

// 来場者数を設定（管理者用）
export async function setVisitorCount(count: number): Promise<void> {
  const redis = getRedisClient();
  await redis.set(REDIS_KEYS.VISITOR_COUNT, count);
  // 来場者数変更を通知
  await redis.publish(REDIS_CHANNELS.VISITORS, JSON.stringify({ visitors: count }));
}
