import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// 全スタッフのステータス一覧を取得
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

    // 全スタッフのステータスを取得
    console.log('スタッフステータス一覧取得開始');
    
    // RPCの代わりに直接SQLクエリを使用
    const { data, error } = await supabase
      .from('admin_users')
      .select(`
        id:id,
        username,
        display_name,
        company,
        staff_position,
        staff_level,
        status:staff_status(status, custom_status, updated_at)
      `)
      .eq('role', 'staff')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('スタッフステータス一覧取得エラー:', error);
      return NextResponse.json(
        { 
          success: false,
          error: `スタッフステータスの取得に失敗しました: ${error.message}` 
        },
        { status: 500 }
      );
    }
    
    console.log('スタッフステータス一覧取得成功:', data);
    
    // 成功レスポンス
    return NextResponse.json({
      success: true,
      staff_status: data || []
    });

  } catch (error) {
    console.error('スタッフステータス一覧取得エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'サーバーエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}
