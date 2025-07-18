import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// 管理者が特定のスタッフのステータス履歴を取得するAPI
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.error('認証エラー:', authResult.error);
      return NextResponse.json(
        { error: '認証が必要です', details: authResult.error },
        { status: 401 }
      );
    }

    // 管理者権限チェック
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // URLからスタッフIDを取得
    const url = new URL(request.url);
    const staffId = url.searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { error: 'スタッフIDが指定されていません' },
        { status: 400 }
      );
    }

    try {
      // スタッフ情報を取得
      const { data: staffData, error: staffError } = await supabase
        .from('admin_users')
        .select('username, display_name')
        .eq('id', staffId)
        .single();

      if (staffError) {
        console.error('スタッフ情報取得エラー:', staffError);
        return NextResponse.json(
          { error: 'スタッフ情報の取得に失敗しました', details: staffError.message },
          { status: 404 }
        );
      }
      
      // 実際の履歴テーブルからデータを取得
      // get_staff_status_history関数を使用
      const { data: historyData, error: historyError } = await supabase.rpc(
        'get_staff_status_history',
        { 
          p_staff_id: staffId,
          p_limit: 50,  // 直近の50件を取得
          p_offset: 0
        }
      );

      if (historyError) {
        console.error('スタッフ履歴取得エラー:', historyError);
        
        // バックアップ方法: 直接テーブルから取得
        const { data: directData, error: directError } = await supabase
          .from('staff_status_history')
          .select('*')
          .eq('staff_id', staffId)
          .order('recorded_at', { ascending: false })
          .limit(50);
          
        if (directError) {
          console.error('直接テーブルからの履歴取得エラー:', directError);
          return NextResponse.json(
            { error: 'スタッフ履歴の取得に失敗しました', details: directError.message },
            { status: 500 }
          );
        }
        
        // データを整形して返す
        const formattedHistory = directData.map((item: any) => ({
          id: item.id,
          staff_id: item.staff_id,
          status: item.status,
          custom_status: item.custom_status,
          created_at: item.recorded_at,
          display_name: staffData?.display_name || ''
        }));
        
        return NextResponse.json({ 
          history: formattedHistory,
          staff: {
            id: staffId,
            display_name: staffData?.display_name || ''
          }
        });
      }
      
      // データがない場合は空配列を返す
      if (!historyData || historyData.length === 0) {
        return NextResponse.json({ 
          history: [],
          staff: {
            id: staffId,
            display_name: staffData?.display_name || ''
          }
        });
      }
      
      // データを整形して返す
      const formattedHistory = historyData.map((item: any) => ({
        id: item.id,
        staff_id: item.staff_id,
        status: item.status,
        custom_status: item.custom_status,
        created_at: item.recorded_at,
        display_name: staffData?.display_name || ''
      }));
      
      return NextResponse.json({ 
        history: formattedHistory,
        staff: {
          id: staffId,
          display_name: staffData?.display_name || ''
        }
      });
    } catch (dbError) {
      console.error('データベースエラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました', details: dbError instanceof Error ? dbError.message : '不明なエラー' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('ステータス履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    );
  }
}
