import { NextResponse } from 'next/server';
import { 
  startTimer,
  pauseTimer,
  resetTimer,
  createTimer,
  deleteTimer,
  saveTimer,
  sendTimerMessage
} from '@/lib/countdownTimerSupabase';
import { TimerSettings, TimerMessage } from '@/lib/timerTypes';

// タイマー操作API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, timerId, settings, message } = body;

    switch (action) {
      case 'start':
        if (!timerId) {
          return NextResponse.json(
            { error: 'タイマーIDが必要です' },
            { status: 400 }
          );
        }
        const startedTimer = await startTimer(timerId);
        return NextResponse.json({ timer: startedTimer });

      case 'pause':
        if (!timerId) {
          return NextResponse.json(
            { error: 'タイマーIDが必要です' },
            { status: 400 }
          );
        }
        const pausedTimer = await pauseTimer(timerId);
        return NextResponse.json({ timer: pausedTimer });

      case 'reset':
        if (!timerId) {
          return NextResponse.json(
            { error: 'タイマーIDが必要です' },
            { status: 400 }
          );
        }
        const resetedTimer = await resetTimer(timerId);
        return NextResponse.json({ timer: resetedTimer });

      case 'create':
        if (!settings) {
          return NextResponse.json(
            { error: 'タイマー設定が必要です' },
            { status: 400 }
          );
        }
        const newTimer = await createTimer(settings as Partial<TimerSettings>);
        return NextResponse.json({ timer: newTimer });

      case 'delete':
        if (!timerId) {
          return NextResponse.json(
            { error: 'タイマーIDが必要です' },
            { status: 400 }
          );
        }
        const result = await deleteTimer(timerId);
        return NextResponse.json({ success: result });

      case 'save':
        if (!settings) {
          return NextResponse.json(
            { error: 'タイマー設定が必要です' },
            { status: 400 }
          );
        }
        await saveTimer(settings as TimerSettings);
        return NextResponse.json({ success: true });

      case 'message':
        if (!message) {
          return NextResponse.json(
            { error: 'メッセージが必要です' },
            { status: 400 }
          );
        }
        const newMessage = await sendTimerMessage(message as Partial<TimerMessage>);
        return NextResponse.json({ message: newMessage });

      default:
        return NextResponse.json(
          { error: '不明なアクション' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('タイマー操作エラー:', error);
    return NextResponse.json(
      { error: 'タイマー操作に失敗しました' },
      { status: 500 }
    );
  }
}
