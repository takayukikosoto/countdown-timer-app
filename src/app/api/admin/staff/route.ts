import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// スタッフ一覧を取得
export async function GET(request: NextRequest) {
  try {
    // 管理者権限の確認
    const authResult = await verifyAuth(request);
    if (!authResult.success || authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // スタッフ一覧を取得
    const { data: staff, error } = await supabase.rpc('list_staff_users');

    if (error) {
      console.error('スタッフ一覧取得エラー:', error);
      return NextResponse.json(
        { error: `スタッフ一覧の取得に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff });

  } catch (error) {
    console.error('スタッフ一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
