import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface EditStaffRequest {
  staff_id: string;
  display_name?: string;
  company?: string;
  staff_position?: string;
  staff_level?: string;
}

// スタッフ情報を編集
export async function PUT(request: NextRequest) {
  try {
    // 管理者権限の確認
    const authResult = await verifyAuth(request);
    if (!authResult.success || authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストボディを取得
    const body: EditStaffRequest = await request.json();
    
    // 必須フィールドの確認
    if (!body.staff_id) {
      return NextResponse.json(
        { error: 'スタッフIDは必須です' },
        { status: 400 }
      );
    }

    // 更新するフィールドを準備
    const updateFields: any = {};
    
    if (body.display_name !== undefined) {
      updateFields.display_name = body.display_name;
    }
    
    if (body.company !== undefined) {
      updateFields.company = body.company;
    }
    
    if (body.staff_position !== undefined) {
      updateFields.staff_position = body.staff_position;
    }
    
    if (body.staff_level !== undefined) {
      updateFields.staff_level = body.staff_level;
    }
    
    // 更新するフィールドがない場合
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: '更新するフィールドがありません' },
        { status: 400 }
      );
    }

    // スタッフ情報を更新
    const { data, error } = await supabase
      .from('admin_users')
      .update(updateFields)
      .eq('id', body.staff_id)
      .eq('role', 'staff') // スタッフのみ更新可能
      .select('id, username, display_name, company, staff_position, staff_level')
      .single();

    if (error) {
      console.error('スタッフ情報更新エラー:', error);
      return NextResponse.json(
        { error: `スタッフ情報の更新に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      staff: data
    });

  } catch (error) {
    console.error('スタッフ情報更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
