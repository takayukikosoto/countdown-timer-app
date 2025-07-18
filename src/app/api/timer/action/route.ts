import { NextResponse } from 'next/server';
import { 
  createTimerAction,
  updateTimerAction,
  deleteTimerAction,
  getTimerAction,
  getTimerActions,
  getAllTimerActions,
  executeTimerAction,
  resetTimerActions
} from '@/lib/timerActionsSupabase';
import { TimerAction } from '@/lib/timerActionTypes';

// タイマーアクション操作API
export async function GET(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const actionId = searchParams.get('actionId');
    const timerId = searchParams.get('timerId');

    if (action === 'get' && actionId) {
      // 特定のアクションを取得
      const timerAction = await getTimerAction(actionId);
      return NextResponse.json({ action: timerAction });
    } 
    else if (action === 'list' && timerId) {
      // タイマーのアクションリストを取得
      const actions = await getTimerActions(timerId);
      return NextResponse.json({ actions });
    }
    else if (action === 'all') {
      // 全てのアクションを取得
      const actions = await getAllTimerActions();
      return NextResponse.json({ actions });
    }
    else {
      return NextResponse.json(
        { error: '無効なリクエスト' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('タイマーアクション取得エラー:', error);
    return NextResponse.json(
      { error: 'タイマーアクション情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, actionId, timerId, actionData } = body;

    switch (action) {
      case 'create':
        if (!actionData) {
          return NextResponse.json(
            { error: 'アクションデータが必要です' },
            { status: 400 }
          );
        }
        const newAction = await createTimerAction(actionData as Partial<TimerAction>);
        return NextResponse.json({ action: newAction });

      case 'update':
        if (!actionData || !actionData.id) {
          return NextResponse.json(
            { error: 'アクションIDとデータが必要です' },
            { status: 400 }
          );
        }
        const updatedAction = await updateTimerAction(actionData as Partial<TimerAction>);
        return NextResponse.json({ action: updatedAction });

      case 'delete':
        if (!actionId) {
          return NextResponse.json(
            { error: 'アクションIDが必要です' },
            { status: 400 }
          );
        }
        const result = await deleteTimerAction(actionId);
        return NextResponse.json({ success: result });

      case 'execute':
        if (!actionId) {
          return NextResponse.json(
            { error: 'アクションIDが必要です' },
            { status: 400 }
          );
        }
        const executed = await executeTimerAction(actionId);
        return NextResponse.json({ success: executed });

      case 'reset':
        if (!timerId) {
          return NextResponse.json(
            { error: 'タイマーIDが必要です' },
            { status: 400 }
          );
        }
        const reset = await resetTimerActions(timerId);
        return NextResponse.json({ success: reset });

      default:
        return NextResponse.json(
          { error: '不明なアクション' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('タイマーアクション操作エラー:', error);
    return NextResponse.json(
      { error: 'タイマーアクション操作に失敗しました' },
      { status: 500 }
    );
  }
}
