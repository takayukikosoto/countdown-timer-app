import { NextResponse } from 'next/server';
import { 
  getCurrentTimer, 
  getAllTimers, 
  getAllTimerMessages
} from '@/lib/countdownTimerSupabase';

// 現在のタイマー情報を取得するAPI
export async function GET(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'current') {
      // 現在のタイマーを取得
      const timer = await getCurrentTimer();
      return NextResponse.json({ timer });
    } 
    else if (action === 'all') {
      // 全てのタイマーを取得
      const timers = await getAllTimers();
      return NextResponse.json({ timers });
    }
    else if (action === 'messages') {
      // 全てのメッセージを取得
      const messages = await getAllTimerMessages();
      return NextResponse.json({ messages });
    }
    else {
      // デフォルトは現在のタイマーを返す
      const timer = await getCurrentTimer();
      return NextResponse.json({ timer });
    }
  } catch (error) {
    console.error('タイマー情報取得エラー:', error);
    return NextResponse.json(
      { error: 'タイマー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
