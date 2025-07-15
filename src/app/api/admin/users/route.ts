import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// 全ユーザー一覧を取得
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

    // 全ユーザーを取得
    console.log('ユーザー一覧取得開始');
    
    const { data, error } = await supabase
      .from('admin_users')
      .select(`
        id,
        username,
        display_name,
        role,
        company,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ユーザー一覧取得エラー:', error);
      return NextResponse.json(
        { 
          success: false,
          error: `ユーザー一覧の取得に失敗しました: ${error.message}` 
        },
        { status: 500 }
      );
    }
    
    console.log('ユーザー一覧取得成功:', data?.length);
    
    // 成功レスポンス
    return NextResponse.json({
      success: true,
      users: data || []
    });

  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'サーバーエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}
