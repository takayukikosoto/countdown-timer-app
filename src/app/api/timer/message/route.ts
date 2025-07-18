import { NextResponse } from 'next/server';
import { 
  sendTimerMessage,
  deleteTimerMessage,
  getTimerMessage,
  getAllTimerMessages
} from '@/lib/countdownTimerSupabase';
import { TimerMessage } from '@/lib/timerTypes';

// タイマーメッセージ操作API
export async function GET(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    
    if (messageId) {
      // 特定のメッセージを取得
      const message = await getTimerMessage(messageId);
      return NextResponse.json({ message });
    } else {
      // 全てのメッセージを取得
      const messages = await getAllTimerMessages();
      return NextResponse.json({ messages });
    }
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    return NextResponse.json(
      { error: 'メッセージの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'メッセージデータが必要です' },
        { status: 400 }
      );
    }
    
    const newMessage = await sendTimerMessage(message as Partial<TimerMessage>);
    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'メッセージIDが必要です' },
        { status: 400 }
      );
    }
    
    const result = await deleteTimerMessage(messageId);
    return NextResponse.json({ success: result });
  } catch (error) {
    console.error('メッセージ削除エラー:', error);
    return NextResponse.json(
      { error: 'メッセージの削除に失敗しました' },
      { status: 500 }
    );
  }
}
