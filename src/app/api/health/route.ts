import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

/**
 * ヘルスチェック用 API エンドポイント
 * Docker や Kubernetes のヘルスチェックに使用
 */
export async function GET() {
  try {
    // Redis 接続チェック
    const redis = getRedisClient();
    const pong = await redis.ping();
    
    if (pong !== 'PONG') {
      throw new Error('Redis connection failed');
    }
    
    return NextResponse.json({ 
      status: 'ok',
      timestamp: Date.now(),
      services: {
        redis: 'connected'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 503 } // Service Unavailable
    );
  }
}
