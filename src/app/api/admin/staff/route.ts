import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface CreateStaffRequest {
  display_name: string;
  company?: string;
  staff_position?: string;
  staff_level?: string;
}

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
    // 開発用に一時的にパスワードも取得する
    const { data: staff, error } = await supabase
      .from('admin_users')
      .select('id, username, display_name, created_at, company, staff_position, staff_level, password_hash')
      .eq('role', 'staff')
      .order('created_at', { ascending: false });

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

// 新しいスタッフを作成
export async function POST(request: NextRequest) {
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
    const body: CreateStaffRequest = await request.json();
    
    // 必須フィールドの確認
    if (!body.display_name || body.display_name.trim() === '') {
      return NextResponse.json(
        { error: 'スタッフ名は必須です' },
        { status: 400 }
      );
    }

    // ユーザー名を生成（ランダム文字列のみを使用）
    // 2バイト文字を避けるため、表示名は使わず、英数字のランダム文字列のみでユーザーIDを生成
    const randomId = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    const username = `staff_${randomId}_${timestamp}`;
    
    // スタッフユーザーを作成
    const { data, error } = await supabase.rpc('create_staff_user', {
      p_username: username,
      p_display_name: body.display_name,
      p_company: body.company || null,
      p_staff_position: body.staff_position || null,
      p_staff_level: body.staff_level || null
    });

    if (error) {
      console.error('スタッフ作成エラー:', error);
      return NextResponse.json(
        { error: `スタッフの作成に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('スタッフ作成エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
