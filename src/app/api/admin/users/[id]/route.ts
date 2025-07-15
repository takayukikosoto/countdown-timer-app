import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { UserRole } from '@/types/user';

// ユーザー情報を更新
export async function PUT(
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // リクエストボディからユーザー情報を取得
    const { display_name, company, role } = await request.json();

    // 入力検証
    if (!display_name) {
      return NextResponse.json(
        { error: '表示名は必須です' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'staff', 'organizer', 'platinum_sponsor', 'gold_sponsor', 'agency', 'production', 'attendee', 'vip_attendee'].includes(role)) {
      return NextResponse.json(
        { error: '有効なロールを指定してください' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新
    const { data, error } = await supabase
      .from('admin_users')
      .update({
        display_name,
        company: company || null,
        role: role as UserRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, display_name, role, company, updated_at');

    if (error) {
      console.error('ユーザー更新エラー:', error);
      return NextResponse.json(
        { error: `ユーザー情報の更新に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      user: data?.[0] || null
    });

  } catch (error) {
    console.error('ユーザー更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ユーザーを削除
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 自分自身は削除できないようにする
    if (userId === authResult.user?.id) {
      return NextResponse.json(
        { error: '自分自身を削除することはできません' },
        { status: 400 }
      );
    }

    // ユーザーを削除
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('ユーザー削除エラー:', error);
      return NextResponse.json(
        { error: `ユーザーの削除に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('ユーザー削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
