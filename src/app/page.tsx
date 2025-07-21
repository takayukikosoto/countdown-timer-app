'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStatusData } from '@/hooks/useStatusData';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { useTimerData } from '@/hooks/useTimerData';
import ServerClock from '@/components/ServerClock';
import ConnectionStatus from '@/components/ConnectionStatus';
import CountdownTimer from '@/components/CountdownTimer';
import TimerMessage from '@/components/TimerMessage';
import StatusDisplay from '@/components/StatusDisplay';
import CurrentDateTime from '@/components/CurrentDateTime';
import { 
  Calendar, 
  Users, 
  Activity, 
  Settings, 
  Shield, 
  LogOut, 
  LogIn, 
  Check,
  Monitor,
  Clock,
  Timer,
  BarChart,
  User
} from 'lucide-react';

export default function Home() {
  // 認証状態とルーター
  const { user, isAdmin, isStaff, logout } = useAuth();
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // 表示モード状態
  const [viewMode, setViewMode] = useState<'view' | 'full' | 'mobile' | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  
  // ステータスデータの取得
  const { status, error: statusError } = useStatusData();
  
  // Supabaseから来場者数を取得
  const { count: visitorCount } = useVisitorCount();
  
  // タイマーデータの取得
  const { currentTimer, messages, error: timerError } = useTimerData();
  
  // URLパラメータをチェック
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const customTitleParam = urlParams.get('title') || '';
    const customMessageParam = urlParams.get('message') || '';

    if (mode) {
      setViewMode(mode as 'view' | 'full' | 'mobile');
      setIsViewOnly(true);
      setCustomTitle(customTitleParam);
      setCustomMessage(customMessageParam);
    }
  }, []);
  
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

  // 表示モードの場合は専用画面を表示
  if (isViewOnly && viewMode) {
    // Mobileモードの場合
    if (viewMode === 'mobile') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col overflow-hidden">
          {/* モバイル用ミニマルヘッダー */}
          <header className="bg-black/60 backdrop-blur-md px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="text-white text-xs opacity-80">
                {customTitle || 'イベント'}
              </div>
              <div className="text-white text-xs opacity-80">
                <ServerClock />
              </div>
            </div>
          </header>

          {/* モバイルメインコンテンツ */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
            {/* ステータス表示（コンパクト） */}
            <div className="mb-6">
              <StatusDisplay status={status || '準備中'} />
            </div>

            {/* モバイル用大型タイマー表示 */}
            {currentTimer && (
              <div className="mb-6 w-full">
                <CountdownTimer 
                  timer={currentTimer} 
                  size="mobile"
                  className="mobile-timer"
                />
              </div>
            )}

            {/* メッセージ表示（コンパクト） */}
            {customMessage ? (
              <div className="text-center px-2">
                <p className="text-lg md:text-xl text-white font-medium leading-relaxed">
                  {customMessage}
                </p>
              </div>
            ) : (
              currentTimer && messages && messages.length > 0 && (
                <div className="text-center px-2">
                  <TimerMessage message={messages[0]} />
                </div>
              )
            )}
          </main>
        </div>
      );
    }

    // FullモードとViewモード
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col">
        {/* ヘッダー（ビューモードでは最小限） */}
        <header className="bg-black/40 backdrop-blur-md p-4">
          <div className="flex justify-between items-center">
            <div className="text-white text-lg opacity-70">
              {customTitle || 'イベントタイマー'}
            </div>
            <div className="flex items-center space-x-4">
              <ServerClock />
              <ConnectionStatus isConnected={true} />
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          {/* カスタムタイトル */}
          {customTitle && (
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
                {customTitle}
              </h1>
            </div>
          )}

          {/* ステータス表示 */}
          <div className="mb-12">
            <StatusDisplay status={status || '準備中'} />
          </div>

          {/* 大型タイマー表示 */}
          {currentTimer && (
            <div className="mb-12">
              <CountdownTimer 
                timer={currentTimer} 
                size="ultra"
                className="ultra-large-timer"
              />
            </div>
          )}

          {/* カスタムメッセージまたはタイマーメッセージ */}
          {customMessage ? (
            <div className="text-center">
              <p className="text-2xl md:text-4xl lg:text-5xl text-white font-medium leading-relaxed">
                {customMessage}
              </p>
            </div>
          ) : (
            currentTimer && messages && messages.length > 0 && (
              <div className="text-center">
                <TimerMessage
                  message={messages[0]}
                />
              </div>
            )
          )}
        </main>

        {/* フッター（ビューモードでは最小限） */}
        <footer className="bg-black/40 backdrop-blur-md p-2">
          <div className="text-center text-sm text-gray-400">
            イベント管理システム
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent"></div>
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl"></div>
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl shadow-2xl border-b border-white/10 relative z-10 overflow-hidden">
        {/* ヘッダーの装飾的背景 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10"></div>
        <div className="absolute -top-2 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-2 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 py-6 relative">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {/* ロゴ・タイトル部分 */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl blur-sm opacity-75"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-100 bg-clip-text text-transparent tracking-tight">
                    Event <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent font-extrabold">Control</span>
                  </h1>
                  <div className="flex items-center space-x-2 text-xs text-blue-100/80">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="font-medium tracking-wide uppercase">{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右側ステータスエリア */}
            <div className="flex items-center space-x-6">
              {/* 接続ステータス */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <ConnectionStatus isConnected={true} />
              </div>
              
              {/* 小型カウントダウン表示 */}
              {currentTimer && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Timer className="h-5 w-5 text-blue-300" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    <CountdownTimer 
                      timer={currentTimer} 
                      size="sm" 
                      className="text-sm font-mono font-bold text-white tracking-wide"
                    />
                  </div>
                </div>
              )}
              
              {/* サーバークロック */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <ServerClock />
              </div>
              
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* ユーザー情報 */}
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="space-y-0.5">
                      <Badge 
                        variant={isAdmin ? 'default' : 'secondary'}
                        className={`${isAdmin 
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                          : isStaff 
                            ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white'
                            : 'bg-white/20 text-white'
                        } text-xs font-bold px-2 py-1 border-0`}
                      >
                        {isAdmin ? '管理者' : isStaff ? 'スタッフ' : 'ゲスト'}
                      </Badge>
                      <div className="text-sm text-blue-100 font-medium">
                        {user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー'}
                      </div>
                    </div>
                  </div>
                  
                  {/* ログアウトボタン */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="text-white hover:bg-white/10 transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>ログアウト</span>
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" className="text-white hover:bg-white/10 transition-colors duration-200">
                    <LogIn className="h-4 w-4 mr-2" />
                    <span>ログイン</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        {/* システム概要 */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white/70 backdrop-blur-lg border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">イベント状態</CardTitle>
                <Activity className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{systemStatus.event}</div>
                <p className="text-xs text-gray-500 font-medium">
                  リアルタイム更新
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">来場者数</CardTitle>
                <Users className="h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{systemStatus.visitors}</div>
                <p className="text-xs text-gray-500 font-medium">
                  本日の総来場者数
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">システム状態</CardTitle>
                <Check className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">オンライン</div>
                <p className="text-xs text-gray-500 font-medium">
                  すべてのサービスが正常稼働中
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 機能メニュー */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">機能メニュー</span>
          </h2>
          
          {/* 管理者向け */}
          {isAdmin && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center md:justify-start">
                <Shield className="h-6 w-6 mr-3 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">管理者機能</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/dashboard" className="group">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="flex flex-col items-center p-8 relative z-10">
                      <div className="bg-blue-500/10 p-4 rounded-full mb-4 group-hover:bg-blue-500/20 transition-colors duration-300">
                        <BarChart className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <h4 className="font-bold text-center text-gray-900 mb-2">管理ダッシュボード</h4>
                      <p className="text-sm text-gray-600 text-center leading-relaxed">システム全体の監視・管理</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/admin" className="group">
                  <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="flex flex-col items-center p-8 relative z-10">
                      <div className="bg-indigo-500/10 p-4 rounded-full mb-4 group-hover:bg-indigo-500/20 transition-colors duration-300">
                        <BarChart className="h-8 w-8 text-indigo-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <h4 className="font-bold text-center text-gray-900 mb-2">統計レポート</h4>
                      <p className="text-sm text-gray-600 text-center leading-relaxed">ロール別・企業別統計分析</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/admin/users" className="group">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="flex flex-col items-center p-8 relative z-10">
                      <div className="bg-green-500/10 p-4 rounded-full mb-4 group-hover:bg-green-500/20 transition-colors duration-300">
                        <User className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <h4 className="font-bold text-center text-gray-900 mb-2">ユーザー管理</h4>
                      <p className="text-sm text-gray-600 text-center leading-relaxed">スタッフ・参加者の管理</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/admin/visitors" className="group">
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="flex flex-col items-center p-8 relative z-10">
                      <div className="bg-purple-500/10 p-4 rounded-full mb-4 group-hover:bg-purple-500/20 transition-colors duration-300">
                        <Users className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <h4 className="font-bold text-center text-gray-900 mb-2">来場者管理</h4>
                      <p className="text-sm text-gray-600 text-center leading-relaxed">来場者数・統計の管理</p>
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
