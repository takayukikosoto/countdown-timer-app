import { NextResponse } from 'next/server';
import { getStatusFromDB, setStatusInDB } from '@/lib/status';
import { getVisitorsFromDB, incrementVisitorsInDB, setVisitorsInDB, resetVisitorsInDB } from '@/lib/visitors';

// ステータス情報を取得するAPI
export async function GET(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'visitors') {
      // 来場者数を取得（Supabaseから）
      const visitorCount = await getVisitorsFromDB();
      return NextResponse.json({ visitors: visitorCount });
    } 
    else {
      // ステータスと来場者数を取得（Supabaseから）
      const [status, visitorCount] = await Promise.all([
        getStatusFromDB(),
        getVisitorsFromDB()
      ]);
      
      return NextResponse.json({
        status,
        visitors: visitorCount,
        serverTime: Date.now()
      });
    }
  } catch (error) {
    console.error('ステータス情報取得エラー:', error);
    return NextResponse.json(
      { error: 'ステータス情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ステータス情報を更新するAPI
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'update_status') {
      const { status } = body;
      if (!status) {
        return NextResponse.json(
          { error: 'ステータスが指定されていません' },
          { status: 400 }
        );
      }
      
      await setStatusInDB(status);
      return NextResponse.json({ success: true, status });
    } 
    else if (action === 'increment_visitors') {
      const { increment = 1 } = body;
      const newCount = await incrementVisitorsInDB(increment);
      return NextResponse.json({ success: true, visitors: newCount });
    }
    else if (action === 'set_visitors') {
      const { count } = body;
      if (count === undefined) {
        return NextResponse.json(
          { error: '来場者数が指定されていません' },
          { status: 400 }
        );
      }
      
      const newCount = await setVisitorsInDB(count);
      return NextResponse.json({ success: true, visitors: newCount });
    }
    else if (action === 'reset_visitors') {
      const newCount = await resetVisitorsInDB();
      return NextResponse.json({ success: true, visitors: newCount });
    }
    else {
      return NextResponse.json(
        { error: '不明なアクション' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    return NextResponse.json(
      { error: 'ステータスの更新に失敗しました' },
      { status: 500 }
    );
  }
}
