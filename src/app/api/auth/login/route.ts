import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// ------------------------------------------------------------------
//  Login API (simplified)
//   • Authenticates via Supabase RPC `check_user_password`
//   • Returns JWT issued by the RPC (generated in Postgres)
//   • Dev mode fallback for admin/staff default users
// ------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const DEBUG = process.env.NODE_ENV !== 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

type UserInfo = {
  id: string;
  username: string;
  role: string;
};

export async function POST(req: NextRequest) {
  try {
    console.log('[login] API呼び出し開始');
    
    const { username, password } = await req.json();
    console.log(`[login] ユーザー名: ${username} (パスワードはセキュリティ上表示しません)`);

    if (!username || !password) {
      console.log('[login] ユーザー名またはパスワードが空です');
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // --------------------------------------------------------------
    //  call Supabase RPC for real authentication
    // --------------------------------------------------------------
    try {
      console.log('[login] Supabase RPC関数呼び出し: check_user_password');
      console.log('[login] Supabase URL:', SUPABASE_URL);
      
      const { data, error } = await supabase.rpc('check_user_password', { p_username: username, p_password: password });
      
      console.log('[login] RPCレスポンス:', { 
        hasData: !!data, 
        dataLength: Array.isArray(data) ? data.length : 'not an array',
        hasError: !!error 
      });

      if (error) {
        console.error('[login] RPC error', {
          message: error?.message || 'Unknown error',
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        });
        
        // RPCエラーの場合はフォールバック認証を試みる
        return await fallbackAuthentication(username, password);
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: '認証情報が正しくありません' }, { status: 401 });
      }

      const { id, username: uname, role, token } = data[0] as {
        id: string;
        username: string;
        role: string;
        token: string;
      };
      
      return buildResponse(token, { id, username: uname, role });
    } catch (rpcError) {
      console.error('[login] RPC exception', rpcError);
      
      // RPC実行中の例外の場合はフォールバック認証を試みる
      return await fallbackAuthentication(username, password);
    }
  } catch (err) {
    console.error('[login] exception', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// フォールバック認証関数
async function fallbackAuthentication(username: string, password: string) {
  console.log('[login] Trying fallback authentication');
  
  try {
    // 直接データベースからユーザー情報を取得
    console.log('[login] Fallback: ユーザー情報を取得中...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, password, role')
      .eq('username', username)
      .single();
      
    console.log('[login] Fallback: ユーザー情報取得結果:', { 
      hasUserData: !!userData, 
      hasUserError: !!userError,
      errorMessage: userError?.message
    });
    
    if (userError || !userData) {
      console.error('[login] Fallback user lookup failed', userError);
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 401 });
    }
    
    // パスワード検証 - cryptを使用して直接検証
    console.log('[login] Fallback: パスワード検証中...');
    
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_password_direct', { 
        p_password: password, 
        p_stored_hash: userData.password 
      });
    
    console.log('[login] Fallback: パスワード検証結果:', { 
      result: verifyResult, 
      hasError: !!verifyError,
      errorMessage: verifyError?.message
    });
    
    if (verifyError || !verifyResult) {
      console.error('[login] Password verification failed', verifyError);
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 });
    }
    
    // JWTトークンを生成
    console.log('[login] Fallback: JWTトークンを生成中...');
    
    const tokenPayload = {
      role: userData.role,
      user_id: userData.id,
      username: userData.username,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24時間
    };
    
    console.log('[login] Fallback: トークンペイロード:', tokenPayload);
    
    const token = jwt.sign(tokenPayload, JWT_SECRET);
    
    console.log('[login] Fallback: JWTトークン生成完了 (セキュリティ上表示しません)');
    
    return buildResponse(token, { 
      id: userData.id, 
      username: userData.username, 
      role: userData.role 
    });
  } catch (fallbackError) {
    console.error('[login] Fallback authentication failed', fallbackError);
    return NextResponse.json({ error: '認証処理中にエラーが発生しました' }, { status: 500 });
  }
}

function buildResponse(token: string, user: UserInfo) {
  console.log('[login] レスポンスを構築中...', {
    userId: user.id,
    username: user.username,
    role: user.role,
    hasToken: !!token
  });
  
  const responseBody = {
    session: {
      user: {
        id: user.id,
        user_metadata: { name: user.username, role: user.role },
      },
      access_token: token,
    },
    user,
  };
  
  const res = NextResponse.json(responseBody);

  res.cookies.set({
    name: 'auth_token',
    value: token,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24h
  });

  return res;
}
