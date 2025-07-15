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
    
    // ステータス履歴をシミュレート
    // 実際の履歴テーブルがないため、現在のステータスを元に擬似的な履歴を生成
    const now = new Date();
    const morning = new Date(now);
    morning.setHours(9, 0, 0, 0);
    
    // 現在のステータスに基づいて擬似的な履歴を生成
    const simulatedHistory = [];
    
    // 現在のステータスを追加
    simulatedHistory.push({
      id: `${userId}-current`,
      staff_id: userId,
      status: statusData.status,
      custom_status: statusData.custom_status,
      created_at: statusData.updated_at,
      display_name: staffData.display_name
    });
    
    // ステータスに基づいて過去のステータスを推測して追加
    if (statusData.status === '勤務中' || statusData.status === '業務終了') {
      // 到着ステータスを追加
      const arrivalTime = new Date(statusData.updated_at);
      arrivalTime.setHours(arrivalTime.getHours() - 1);
      simulatedHistory.push({
        id: `${userId}-arrival`,
        staff_id: userId,
        status: '到着',
        custom_status: null,
        created_at: arrivalTime.toISOString(),
        display_name: staffData.display_name
      });
      
      // 出発ステータスを追加
      const departureTime = new Date(arrivalTime);
      departureTime.setHours(departureTime.getHours() - 1);
      simulatedHistory.push({
        id: `${userId}-departure`,
        staff_id: userId,
        status: '出発OK',
        custom_status: null,
        created_at: departureTime.toISOString(),
        display_name: staffData.display_name
      });
    } else if (statusData.status === '到着') {
      // 出発ステータスを追加
      const departureTime = new Date(statusData.updated_at);
      departureTime.setHours(departureTime.getHours() - 1);
      simulatedHistory.push({
        id: `${userId}-departure`,
        staff_id: userId,
        status: '出発OK',
        custom_status: null,
        created_at: departureTime.toISOString(),
        display_name: staffData.display_name
      });
    }
    
    // 出発前ステータスを追加
    simulatedHistory.push({
      id: `${userId}-initial`,
      staff_id: userId,
      status: '出発前',
      custom_status: null,
      created_at: morning.toISOString(),
      display_name: staffData.display_name
    });
    
    // 時間順に並び替え
    simulatedHistory.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return NextResponse.json({ history: simulatedHistory });

  } catch (error) {
    console.error('ステータス履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
