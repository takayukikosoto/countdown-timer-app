'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ServerClock from '@/components/ServerClock';
import StatusDisplay from '@/components/StatusDisplay';
import VisitorCounter from '@/components/VisitorCounter';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { formatDateTime } from '@/lib/timeSync';
import Link from 'next/link';

export default function SponsorPage() {
  // 認証状態を取得
  const { user, loading, isPlatinumSponsor, isGoldSponsor, logout } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();
  
  // クライアントサイドでの日時表示用の状態
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // Supabaseから来場者数を取得（読み取り専用）
  const { count: visitorCount } = useVisitorCount();

  // スポンサータイプの判定
  const sponsorType = isPlatinumSponsor ? 'プラチナスポンサー' : isGoldSponsor ? 'ゴールドスポンサー' : '';

  // 認証チェック - スポンサーでない場合はログインページにリダイレクト
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isPlatinumSponsor && !isGoldSponsor) {
        // ユーザーはログインしているがスポンサー権限がない場合
        alert('スポンサー権限がありません');
        router.push('/');
      }
    }
  }, [loading, user, isPlatinumSponsor, isGoldSponsor, router]);
  
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
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">スポンサーダッシュボード</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user?.user_metadata?.name || ''}さん（{sponsorType}）
            </span>
            <Button 
              variant="outline" 
              size="sm"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
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
            
            {/* 来場者数 */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">来場者数</h3>
              <div className="flex items-center justify-center">
                <VisitorCounter count={visitorCount} />
              </div>
            </Card>
            
            {/* スポンサー情報 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">スポンサー情報</h3>
              <div className="p-4 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-lg">
                <p className="font-bold text-lg mb-2">
                  {isPlatinumSponsor ? 'プラチナスポンサー特典' : 'ゴールドスポンサー特典'}
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>イベント中の優先サポート</li>
                  <li>来場者数のリアルタイム確認</li>
                  <li>イベントステータスの確認</li>
                  {isPlatinumSponsor && (
                    <>
                      <li>VIP参加者向け特別情報の確認</li>
                      <li>イベント後の詳細レポート</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* 右カラム: 機能リンク */}
          <div>
            <h2 className="text-2xl font-bold mb-4">機能メニュー</h2>
            
            {/* タイマー表示リンク */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
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
                <p className="text-sm text-gray-500 mt-2">
                  ※ビューモードは大画面表示に最適化されています。
                  プロジェクターやモニターに表示する場合に使用してください。
                </p>
              </div>
            </div>
            
            {/* プラチナスポンサー専用機能 */}
            {isPlatinumSponsor && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">プラチナスポンサー専用</h3>
                <Link 
                  href="/sponsor/vip-attendees" 
                  className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded text-center block"
                >
                  VIP参加者情報
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white dark:bg-gray-800 shadow-inner p-4 mt-8">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>© {isClient ? new Date().getFullYear() : '2025'} イベントタイマー</p>
        </div>
      </footer>
    </div>
  );
}
