import { NextRequest, NextResponse } from 'next/server';
import { 
  createTimerAction, 
  updateTimerAction, 
  deleteTimerAction, 
  getTimerActions, 
  getAllTimerActions 
} from '@/lib/timerActions';

/**
 * タイマーアクションを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timerId = searchParams.get('timerId');
    
    let actions;
    if (timerId) {
      // 特定のタイマーのアクションを取得
      actions = await getTimerActions(timerId);
    } else {
      // すべてのアクションを取得
      actions = await getAllTimerActions();
    }
    
    return NextResponse.json({ actions });
  } catch (error) {
    console.error('タイマーアクション取得エラー:', error);
    return NextResponse.json(
      { error: 'タイマーアクションの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タイマーアクションを作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.timerId || body.triggerTime === undefined) {
      return NextResponse.json(
        { error: 'タイマーIDとトリガー時間は必須です' },
        { status: 400 }
      );
    }
    
    const action = await createTimerAction(body);
    return NextResponse.json({ action });
  } catch (error) {
    console.error('タイマーアクション作成エラー:', error);
    return NextResponse.json(
      { error: 'タイマーアクションの作成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タイマーアクションを更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'アクションIDは必須です' },
        { status: 400 }
      );
    }
    
    const action = await updateTimerAction(body);
    
    if (!action) {
      return NextResponse.json(
        { error: '指定されたアクションが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ action });
  } catch (error) {
    console.error('タイマーアクション更新エラー:', error);
    return NextResponse.json(
      { error: 'タイマーアクションの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タイマーアクションを削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('id');
    
    if (!actionId) {
      return NextResponse.json(
        { error: 'アクションIDは必須です' },
        { status: 400 }
      );
    }
    
    const success = await deleteTimerAction(actionId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'アクションの削除に失敗しました' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('タイマーアクション削除エラー:', error);
    return NextResponse.json(
      { error: 'タイマーアクションの削除に失敗しました' },
      { status: 500 }
    );
  }
}
