import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// スタッフステータスの取得
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

    // スタッフステータスを取得
    const { data, error } = await supabase.rpc(
      'get_staff_status',
      { p_staff_id: staffId }
    );

    if (error) {
      console.error('スタッフステータス取得エラー:', error);
      return NextResponse.json(
        { error: `スタッフステータスの取得に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // ステータスが存在しない場合はデフォルト値を返す
    if (!data || data.length === 0) {
      return NextResponse.json({
        status: '出発前',
        custom_status: null,
        updated_at: new Date().toISOString()
      });
    }

    // 成功レスポンス
    return NextResponse.json({
      status: data[0].status,
      custom_status: data[0].custom_status,
      updated_at: data[0].updated_at
    });

  } catch (error) {
    console.error('スタッフステータス取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// スタッフステータスの更新
export async function POST(request: NextRequest) {
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

    // リクエストボディからステータス情報を取得
    const { status, custom_status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'ステータスは必須です' },
        { status: 400 }
      );
    }

    // スタッフステータスを更新
    const { data, error } = await supabase.rpc(
      'update_staff_status',
      { 
        p_staff_id: staffId,
        p_status: status,
        p_custom_status: custom_status || null
      }
    );

    if (error) {
      console.error('スタッフステータス更新エラー:', error);
      return NextResponse.json(
        { error: `スタッフステータスの更新に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      status,
      custom_status: custom_status || null,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('スタッフステータス更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
