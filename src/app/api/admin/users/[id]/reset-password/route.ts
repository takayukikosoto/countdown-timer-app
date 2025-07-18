import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/auth';

// ------------------------------------------------------------------
//  Admin Password Reset API
//   • Generates new password for specified user
//   • Updates password in database using Supabase RPC
//   • Returns new password to admin
// ------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// パスワード生成関数
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // 最低1つずつ含める
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 残りの文字をランダムに追加
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // パスワードをシャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 認証チェック
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者権限チェック
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }

    console.log('[reset-password] Password reset requested for user:', userId);

    // 新しいパスワードを生成
    const newPassword = generatePassword(12);
    console.log('[reset-password] Generated new password for user:', userId);

    // Supabase RPC を使用してパスワードを更新
    const { data, error } = await supabase.rpc('update_user_password', {
      p_user_id: parseInt(userId),
      p_new_password: newPassword
    });

    if (error) {
      console.error('[reset-password] Supabase RPC error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ 
        error: 'パスワードの更新に失敗しました',
        details: error.message || 'RPC関数の実行に失敗しました'
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log('[reset-password] User not found:', userId);
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const updatedUser = data[0];
    console.log('[reset-password] Password updated successfully for user:', updatedUser.username);

    return NextResponse.json({
      success: true,
      message: 'パスワードが正常に再発行されました',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        role: updatedUser.role
      },
      newPassword: newPassword
    });

  } catch (err) {
    console.error('[reset-password] Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
