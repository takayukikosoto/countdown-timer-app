'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStatusData } from '@/hooks/useStatusData';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import ServerClock from '@/components/ServerClock';
import ConnectionStatus from '@/components/ConnectionStatus';
import { 
  Calendar, 
  Users, 
  Timer, 
  BarChart, 
  Settings, 
  User, 
  Monitor,
  Clock,
  Activity,
  Shield,
  LogIn,
  LogOut
} from 'lucide-react';

export default function Home() {
  // 認証状態とルーター
  const { user, isAdmin, isStaff, logout } = useAuth();
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // ステータスデータの取得
  const { status, error: statusError } = useStatusData();
  
  // Supabaseから来場者数を取得
  const { count: visitorCount } = useVisitorCount();
  
  // ログアウト処理
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    } finally {
      setLogoutLoading(false);
    }
  };
  
  // 現在の日時
  const now = new Date();
  const formattedDate = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
  
  // システムステータス
  const systemStatus = {
    event: status || '準備中',
    visitors: visitorCount || 0,
    connection: 'オンライン'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">イベント管理システム</h1>
                <p className="text-sm text-gray-600">{formattedDate}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              <ServerClock />
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <Badge variant={isAdmin ? 'default' : 'secondary'}>
                    {isAdmin ? '管理者' : isStaff ? 'スタッフ' : 'ゲスト'}
                  </Badge>
                  <span className="text-sm text-gray-700">{user.username}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="flex items-center space-x-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>ログアウト</span>
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button className="flex items-center space-x-1">
                    <LogIn className="h-4 w-4" />
                    <span>ログイン</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        {/* システム概要 */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">イベント状態</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStatus.event}</div>
                <p className="text-xs text-muted-foreground mt-1">リアルタイム更新</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">来場者数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStatus.visitors}</div>
                <p className="text-xs text-muted-foreground mt-1">本日の総来場者数</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">システム状態</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{systemStatus.connection}</div>
                <p className="text-xs text-muted-foreground mt-1">すべてのサービスが正常稼働中</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 機能メニュー */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">機能メニュー</h2>
          
          {/* 管理者向け */}
          {isAdmin && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                管理者機能
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <BarChart className="h-8 w-8 text-blue-600 mb-2" />
                      <h4 className="font-medium text-center">管理ダッシュボード</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">システム全体の監視・管理</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/admin/users">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <User className="h-8 w-8 text-green-600 mb-2" />
                      <h4 className="font-medium text-center">ユーザー管理</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">スタッフ・参加者の管理</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/admin/visitors">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <Users className="h-8 w-8 text-purple-600 mb-2" />
                      <h4 className="font-medium text-center">来場者管理</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">来場者数・統計の管理</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/timer">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <Timer className="h-8 w-8 text-orange-600 mb-2" />
                      <h4 className="font-medium text-center">タイマー管理</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">イベントタイマーの設定</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* スタッフ向け */}
          {(isAdmin || isStaff) && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                スタッフ機能
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/dashboard">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <Monitor className="h-8 w-8 text-blue-600 mb-2" />
                      <h4 className="font-medium text-center">スタッフダッシュボード</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">業務状況・履歴の確認</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/staff">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <Activity className="h-8 w-8 text-green-600 mb-2" />
                      <h4 className="font-medium text-center">スタッフ業務</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">出退勤・業務報告</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/?mode=view" target="_blank">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-6">
                      <Clock className="h-8 w-8 text-purple-600 mb-2" />
                      <h4 className="font-medium text-center">表示モード</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">タイマー・情報の表示画面</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* 一般参加者向け */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              参加者機能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/attendee">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="flex flex-col items-center p-6">
                    <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                    <h4 className="font-medium text-center">参加者ページ</h4>
                    <p className="text-sm text-gray-600 text-center mt-1">イベント情報・スケジュール</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/vip">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="flex flex-col items-center p-6">
                    <Shield className="h-8 w-8 text-gold-600 mb-2" style={{color: '#D4AF37'}} />
                    <h4 className="font-medium text-center">VIPページ</h4>
                    <p className="text-sm text-gray-600 text-center mt-1">特別参加者向けサービス</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/agency">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="flex flex-col items-center p-6">
                    <Settings className="h-8 w-8 text-gray-600 mb-2" />
                    <h4 className="font-medium text-center">代理店ページ</h4>
                    <p className="text-sm text-gray-600 text-center mt-1">代理店向け情報・サポート</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-white/80 backdrop-blur-md border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} イベント管理システム - すべてのイベントを統合管理</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
