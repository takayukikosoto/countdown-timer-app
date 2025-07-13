import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// スタッフユーザーを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 管理者権限の確認
    const authResult = await verifyAuth(request);
    if (!authResult.success || authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const staffId = params.id;
    if (!staffId) {
      return NextResponse.json(
        { error: 'スタッフIDが必要です' },
        { status: 400 }
      );
    }

    // スタッフユーザーを削除
    const { data: success, error } = await supabase.rpc(
      'delete_staff_user',
      { p_user_id: staffId }
    );

    if (error) {
      console.error('スタッフ削除エラー:', error);
      return NextResponse.json(
        { error: `スタッフの削除に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'スタッフの削除に失敗しました' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('スタッフ削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
