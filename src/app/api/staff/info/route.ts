import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// ログイン中のスタッフ情報を取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // スタッフIDを取得
    const staffId = authResult.user.id;

    // スタッフ情報を取得
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, display_name, created_at')
      .eq('id', staffId)
      .single();

    if (error) {
      console.error('スタッフ情報取得エラー:', error);
      return NextResponse.json(
        { error: `スタッフ情報の取得に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      created_at: data.created_at
    });

  } catch (error) {
    console.error('スタッフ情報取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
