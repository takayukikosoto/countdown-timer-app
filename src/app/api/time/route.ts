import { NextResponse } from 'next/server';

/**
 * サーバー時刻を返す API エンドポイント
 * クライアントとサーバー間の時刻同期に使用
 */
export async function GET() {
  return NextResponse.json({ 
    now: Date.now(),
    timezone: 'Asia/Tokyo'
  });
}
