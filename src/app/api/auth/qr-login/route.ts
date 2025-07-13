import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// QRコードログインAPI
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからトークンを取得
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'トークンが必要です' },
        { status: 400 }
      );
    }

    // トークンの検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('staff_login_tokens')
      .select('staff_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 401 }
      );
    }

    // トークンの有効期限チェック
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'トークンの有効期限が切れています' },
        { status: 401 }
      );
    }

    // スタッフ情報の取得
    const { data: userData, error: userError } = await supabase
      .from('admin_users')
      .select('id, username, display_name, role')
      .eq('id', tokenData.staff_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // JWTトークンの生成
    const jwt = await createJWT({
      id: userData.id,
      username: userData.username,
      role: userData.role,
    });

    // Cookieにトークンを設定
    const cookieStore = cookies();
    cookieStore.set('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        display_name: userData.display_name,
        role: userData.role,
      },
    });

  } catch (error) {
    console.error('QRコードログインエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
