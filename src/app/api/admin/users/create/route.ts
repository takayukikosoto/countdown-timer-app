import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { generateUsername, generatePassword } from '@/lib/generators';
import bcrypt from 'bcrypt';
import { UserRole } from '@/types/user';

// 新しいユーザーを作成
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

    // ユーザー名とパスワードを生成
    const username = generateUsername();
    const password = generatePassword();
    
    // パスワードをハッシュ化
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // admin_usersテーブルにユーザーを作成
    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        username,
        password_hash,
        display_name,
        company: company || null,
        role: role as UserRole
      })
      .select('id, username, display_name, role, company')
      .single();

    if (error) {
      console.error('admin_usersテーブルへのユーザー作成エラー:', error);
      return NextResponse.json(
        { error: `ユーザーの作成に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }

    // 認証用にusersテーブルにも同じユーザー情報を作成
    // （check_user_password関数がusersテーブルを参照するため）
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: newUser.id,
        username,
        password: password_hash, // usersテーブルのpasswordカラム名
        role: role as UserRole,
        display_name,
        company: company || null
      });

    if (usersError) {
      console.error('usersテーブルへのユーザー作成エラー:', usersError);
      // admin_usersテーブルからも削除してロールバック
      await supabase.from('admin_users').delete().eq('id', newUser.id);
      return NextResponse.json(
        { error: `認証用ユーザー情報の作成に失敗しました: ${usersError.message}` },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        password, // 一度だけクライアントに返す
        name: display_name
      }
    });

  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
