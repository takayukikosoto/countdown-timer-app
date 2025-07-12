import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディからユーザー名とパスワードを取得
    const { username, password } = await request.json();

    // 入力検証
    if (!username || !password) {
      return NextResponse.json(
        { error: 'ユーザー名とパスワードは必須です' },
        { status: 400 }
      );
    }

    console.log('認証処理を開始します:', { username });
    
    // ユーザー情報を取得
    const { data: users, error: userError } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, role')
      .eq('username', username)
      .limit(1);

    console.log('ユーザー取得結果:', { users, userError });
    
    if (userError) {
      console.error('ユーザー取得エラー:', userError);
      return NextResponse.json(
        { error: `認証に失敗しました: ${userError.message}` },
        { status: 500 }
      );
    }
    
    // ユーザーが見つからない場合
    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }
    
    const user = users[0];
    
    // パスワードの検証
    const { data: verifyResult, error: verifyError } = await supabase.rpc(
      'verify_password',
      { password: password, hash: user.password_hash }
    );
    
    console.log('パスワード検証結果:', { verifyResult, verifyError });
    
    if (verifyError || !verifyResult) {
      console.error('パスワード検証エラー:', verifyError);
      return NextResponse.json(
        { error: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // JWTトークンを生成
    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24時間有効
      },
      JWT_SECRET
    );

    // セッション情報を作成
    const session = {
      user: {
        id: user.id,
        user_metadata: {
          name: user.username,
          role: user.role
        }
      },
      access_token: token
    };

    // クッキーを設定したレスポンスを作成
    const response = NextResponse.json({
      session,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
    // クッキーにトークンを設定
    response.cookies.set({
      name: 'auth_token',
      value: token,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24時間
      sameSite: 'strict'
    });
    
    return response;

  } catch (error) {
    console.error('ログインエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
