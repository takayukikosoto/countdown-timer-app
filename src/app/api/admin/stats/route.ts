import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// 管理者向け統計情報を取得
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

    // ロールごとのユーザー数を取得
    const { data: roleCounts, error: roleError } = await supabase
      .rpc('get_role_counts');

    if (roleError) {
      console.error('ロール集計エラー:', roleError);
      return NextResponse.json(
        { 
          success: false,
          error: `統計情報の取得に失敗しました: ${roleError.message}` 
        },
        { status: 500 }
      );
    }

    // 最近追加されたユーザー (上位5件)
    const { data: recentUsers, error: recentError } = await supabase
      .from('admin_users')
      .select('id, username, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('最近のユーザー取得エラー:', recentError);
      return NextResponse.json(
        { 
          success: false,
          error: `最近のユーザー情報の取得に失敗しました: ${recentError.message}` 
        },
        { status: 500 }
      );
    }

    // 会社ごとのユーザー数 (上位5件)
    const { data: companyStats, error: companyError } = await supabase
      .rpc('get_company_counts');

    if (companyError) {
      console.error('会社統計エラー:', companyError);
      return NextResponse.json(
        { 
          success: false,
          error: `会社統計情報の取得に失敗しました: ${companyError.message}` 
        },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      stats: {
        roleCounts: roleCounts || [],
        recentUsers: recentUsers || [],
        companyStats: companyStats || []
      }
    });

  } catch (error) {
    console.error('統計情報取得エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'サーバーエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}
