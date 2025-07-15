import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import crypto from 'crypto';

// スタッフ自身のQRコードトークン生成API
export async function GET(request: NextRequest) {
  try {
    // スタッフ権限の確認
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    
    // スタッフの存在確認
    const { data: staffData, error: staffError } = await supabase
      .from('admin_users')
      .select('id, username, display_name')
      .eq('id', userId)
      .eq('role', 'staff')
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'スタッフ情報が見つかりません' },
        { status: 404 }
      );
    }

    // 一意のトークンを生成
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90日間有効

    // 既存のトークンがあれば削除
    await supabase
      .from('staff_login_tokens')
      .delete()
      .eq('staff_id', userId);

    // 新しいトークンを保存
    const { error: insertError } = await supabase
      .from('staff_login_tokens')
      .insert({
        staff_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('トークン保存エラー:', insertError);
      return NextResponse.json(
        { error: 'トークンの保存に失敗しました' },
        { status: 500 }
      );
    }

    // フロントエンドに返すURLエンコードされたトークン
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/login?qr=${token}`;
    
    return NextResponse.json({ 
      token: loginUrl,
      username: staffData.username,
      displayName: staffData.display_name
    });

  } catch (error) {
    console.error('QRコードトークン生成エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
