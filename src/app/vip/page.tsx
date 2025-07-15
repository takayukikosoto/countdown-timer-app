'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ServerClock from '@/components/ServerClock';
import StatusDisplay from '@/components/StatusDisplay';
import { formatDateTime } from '@/lib/timeSync';
import Link from 'next/link';
import { useTimerData } from '@/hooks/useTimerData';

export default function VipAttendeePage() {
  // 認証状態を取得
  const { user, loading, isVipAttendee, logout } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const { currentTimer } = useTimerData();
  
  // クライアントサイドでの日時表示用の状態
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // 認証チェック - VIP参加者でない場合はログインページにリダイレクト
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isVipAttendee) {
        // ユーザーはログインしているがVIP参加者権限がない場合
        alert('VIP参加者権限がありません');
        router.push('/');
      }
    }
  }, [loading, user, isVipAttendee, router]);
  
  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true);
    setCurrentDateTime(formatDateTime(Date.now()));
    
    // 1秒ごとに更新
    const timer = setInterval(() => {
      setCurrentDateTime(formatDateTime(Date.now()));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // ログアウト処理
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const success = await logout();
      if (success) {
        router.push('/');
      } else {
        alert('ログアウトに失敗しました');
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウト処理中にエラーが発生しました');
    } finally {
      setLogoutLoading(false);
    }
  };

  // 認証ロード中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xl text-white">読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* ヘッダー - VIP用のゴールドアクセント */}
      <header className="bg-gradient-to-r from-amber-700 to-yellow-600 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-white bg-black px-3 py-1 rounded-md mr-3 font-bold">VIP</span>
            <h1 className="text-2xl font-bold text-white">VIP参加者ダッシュボード</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white">
              {user?.user_metadata?.name || ''}さん（VIP参加者）
            </span>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-black/20 text-white hover:bg-black/30 border-white/30"
              onClick={handleLogout}
              disabled={logoutLoading}
            >
              {logoutLoading ? 'ログアウト中...' : 'ログアウト'}
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: 時計とステータス */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border-t-4 border-amber-500">
              <h2 className="text-xl font-bold mb-4">イベント情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* サーバー時計 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">現在時刻</h3>
                  <ServerClock className="text-3xl font-bold" />
                </div>
                
                {/* ステータス表示 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">現在のステータス</h3>
                  <StatusDisplay status="" />
                </div>
              </div>
            </div>
            
            {/* タイマー情報 - VIP向け詳細表示 */}
            <Card className="p-6 mb-6 border-t-4 border-amber-500">
              <h3 className="text-lg font-semibold mb-4">現在のタイマー情報</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold">タイトル</p>
                  <p className="text-lg">{currentTimer?.title || '設定されていません'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold">開始時間</p>
                  <p className="text-lg">{currentTimer?.startTime ? new Date(currentTimer.startTime).toLocaleString() : '設定されていません'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold">終了時間</p>
                  <p className="text-lg">{currentTimer?.endTime ? new Date(currentTimer.endTime).toLocaleString() : '設定されていません'}</p>
                </div>
                {currentTimer?.message && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-semibold">メッセージ</p>
                    <p className="text-lg">{currentTimer.message}</p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* イベントスケジュール - VIP向け詳細表示 */}
            <Card className="p-6 mb-6 border-t-4 border-amber-500">
              <h3 className="text-lg font-semibold mb-4">VIPイベントスケジュール</h3>
              <div className="space-y-4">
                <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">VIP受付開始</p>
                    <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded text-xs">VIP限定</span>
                  </div>
                  <p className="text-lg">9:00</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold">一般受付開始</p>
                  <p className="text-lg">9:30</p>
                </div>
                <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">VIP優先入場</p>
                    <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded text-xs">VIP限定</span>
                  </div>
                  <p className="text-lg">9:45</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold">開始時間</p>
                  <p className="text-lg">10:00</p>
                </div>
                <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">VIPラウンジ開放</p>
                    <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded text-xs">VIP限定</span>
                  </div>
                  <p className="text-lg">12:00</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold">終了予定</p>
                  <p className="text-lg">17:00</p>
                </div>
              </div>
            </Card>
            
            {/* 接続情報 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">システム情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">接続状態:</p>
                  <p className={`font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
                    {connected ? '接続OK' : 'オフライン - 再接続中...'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">最終更新:</p>
                  <p className="font-semibold">
                    {isClient ? currentDateTime : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: 機能リンクとVIP特典 */}
          <div>
            <h2 className="text-2xl font-bold mb-4">VIP機能メニュー</h2>
            
            {/* タイマー表示リンク */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border-t-4 border-amber-500">
              <h3 className="text-lg font-semibold mb-4">タイマー表示</h3>
              <div className="flex flex-col gap-4">
                <Link 
                  href="/?mode=view" 
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ビューモードで開く
                </Link>
                <Link 
                  href="/?mode=full" 
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  フルスクリーンモード
                </Link>
                <p className="text-sm text-gray-500 mt-2">
                  ※ビューモードは大画面表示に最適化されています。
                  プロジェクターやモニターに表示する場合に使用してください。
                </p>
              </div>
            </div>
            
            {/* VIP特典情報 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-t-4 border-amber-500">
              <h3 className="text-lg font-semibold mb-4">VIP特典</h3>
              <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg">
                <p className="font-bold text-lg mb-2 text-amber-800 dark:text-amber-300">VIP参加者特典</p>
                <ul className="list-disc pl-5 space-y-2 text-amber-900 dark:text-amber-200">
                  <li>VIP専用ラウンジへのアクセス</li>
                  <li>優先入場権</li>
                  <li>詳細なイベントタイムテーブルの閲覧</li>
                  <li>タイマーのリアルタイム表示</li>
                  <li>イベントステータスの詳細確認</li>
                  <li>出演者との写真撮影権（イベント後）</li>
                </ul>
              </div>
              
              <div className="mt-4">
                <Link 
                  href="/vip/benefits" 
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded text-center block"
                >
                  VIP特典の詳細を見る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gradient-to-r from-amber-700 to-yellow-600 shadow-inner p-4 mt-8">
        <div className="container mx-auto text-center text-sm text-white">
          <p>© {isClient ? new Date().getFullYear() : '2025'} イベントタイマー VIPエクスペリエンス</p>
        </div>
      </footer>
    </div>
  );
}
