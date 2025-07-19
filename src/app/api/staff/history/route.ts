import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// スタッフ自身のステータス履歴を取得するAPI
export async function GET(request: NextRequest) {
  try {
    // スタッフ権限の確認
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    
    // スタッフの現在のステータスを取得
    const { data: statusData, error: statusError } = await supabase
      .from('staff_status')
      .select('staff_id, status, custom_status, updated_at')
      .eq('staff_id', userId)
      .single();

    if (statusError) {
      console.error('スタッフステータス取得エラー:', statusError);
      return NextResponse.json(
        { error: 'スタッフステータスの取得に失敗しました' },
        { status: 500 }
      );
    }

    // スタッフ情報を取得
    const { data: staffData, error: staffError } = await supabase
      .from('admin_users')
      .select('username, display_name')
      .eq('id', userId)
      .single();

    if (staffError) {
      console.error('スタッフ情報取得エラー:', staffError);
      return NextResponse.json(
        { error: 'スタッフ情報の取得に失敗しました' },
        { status: 500 }
      );
    }
    
    // ステータスがない場合は空配列を返す
    if (!statusData) {
      return NextResponse.json({ history: [] });
    }
    
    // スタッフのステータス履歴を取得（timestampカラムをrecorded_atとして取得）
    const { data: historyData, error: historyError } = await supabase
      .from('staff_status_history')
      .select(`
        id,
        staff_id,
        status,
        custom_status,
        timestamp
      `)
      .eq('staff_id', userId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (historyError) {
      console.error('ステータス履歴取得エラー:', historyError);
      return NextResponse.json(
        { error: 'ステータス履歴の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 履歴データにスタッフ情報を追加（timestampをrecorded_atとして変換）
    const historyWithStaffInfo = (historyData || []).map(item => ({
      id: item.id,
      staff_id: item.staff_id,
      status: item.status,
      custom_status: item.custom_status,
      created_at: item.timestamp,
      display_name: staffData.display_name
    }));
    
    return NextResponse.json({ history: historyWithStaffInfo });

  } catch (error) {
    console.error('ステータス履歴取得エラー:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
