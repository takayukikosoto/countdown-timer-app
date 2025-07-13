import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import { verifyAuth } from '@/lib/auth';

// スタッフIDの生成（6文字のランダムID）
function generateStaffId(): string {
  return `staff_${nanoid(6)}`;
}

// ランダムパスワードの生成（8文字）
function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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

    // リクエストボディから情報を取得
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'スタッフ名は必須です' },
        { status: 400 }
      );
    }

    // スタッフIDとパスワードを生成
    const username = generateStaffId();
    const password = generatePassword();

    // スタッフユーザーを作成
    const { data: newUser, error } = await supabase.rpc(
      'create_staff_user',
      { 
        p_username: username,
        p_password: password,
        p_name: name
      }
    );

    if (error) {
      console.error('スタッフ登録エラー:', error);
      return NextResponse.json(
        { error: `スタッフの登録に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      staff: {
        username,
        password,
        name
      }
    });

  } catch (error) {
    console.error('スタッフ登録エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
