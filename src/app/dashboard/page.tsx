'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ServerClock from '@/components/ServerClock';
import StatusDisplay from '@/components/StatusDisplay';
import VisitorCounter from '@/components/VisitorCounter';
import ConnectionStatus from '@/components/ConnectionStatus';
import ControlPanel from '@/components/ControlPanel';
import { useSocket } from '@/contexts/SocketContext';
import { useStatusData } from '@/hooks/useStatusData';
import { useVisitorCount } from '@/hooks/useVisitorCount_fixed';
import { formatDateTime } from '@/lib/timeSync';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function Dashboard() {
  // 認証状態を取得
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  
  // クライアントサイドでの日時表示用の状態
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // 認証チェック - 管理者でない場合はログインページにリダイレクト
  useEffect(() => {
    console.log('ダッシュボードページの認証状態:', { loading, user, isAdmin });
    
    if (!loading) {
      if (!user) {
        console.log('ユーザーがログインしていません。ログインページにリダイレクトします');
        router.replace('/login');
        return;
      } else if (!isAdmin) {
        // ユーザーはログインしているが管理者権限がない場合
        console.log('管理者権限がありません');
        alert('管理者権限がありません');
        router.replace('/');
        return;
      } else {
        console.log('管理者としてダッシュボードにアクセスしています');
      }
    }
  }, [loading, user, isAdmin]);
  
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
  
  // Socket.IO接続（スタッフ権限）
  const { socket, connected } = useSocket();
  
  // ステータスデータの取得
  const {
    status,
    error,
    updateStatus
  } = useStatusData();
  
  // Supabaseから来場者数を取得
  const {
    count: visitorCount,
    incrementCount: incrementVisitors,
    resetCount: resetVisitorCount
  } = useVisitorCount();

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
            <span className="text-xl text-white">認証を確認中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* ヘッダー */}
      <header className="bg-gray-900 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">タイマー管理ダッシュボード</h1>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-sm text-gray-300">
                  <span className="mr-2">管理者:</span>
                  <span className="font-medium">{user.user_metadata.name || user.email || '管理者'}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={`px-3 py-1 text-sm rounded ${logoutLoading ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
              >
                {logoutLoading ? 'ログアウト中...' : 'ログアウト'}
              </button>
              <Link 
                href="/" 
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                ビューワーページへ
              </Link>
              <ConnectionStatus isConnected={connected} />
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto p-4 md:p-8">
        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: 現在の状態 */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4">現在の状態</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 時計 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">現在時刻</h3>
                <ServerClock size="md" />
                <p className="text-xs text-gray-500 mt-2">
                  {isClient ? currentDateTime : ''}
                </p>
              </div>

              {/* ステータス */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">イベントステータス</h3>
                <StatusDisplay 
                  status={status} 
                  size="md"
                />
              </div>

              {/* 来場者数 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">来場者数</h3>
                <VisitorCounter 
                  count={visitorCount} 
                  size="md"
                />
                <div className="mt-2">
                  <button
                    onClick={() => resetVisitorCount()}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    リセット
                  </button>
                </div>
              </div>
            </div>

            {/* 接続情報 */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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

          {/* 右カラム: コントロールパネル */}
          <div>
            <h2 className="text-2xl font-bold mb-4">操作パネル</h2>
            <ControlPanel 
              onStatusChange={updateStatus}
              onVisitorIncrement={incrementVisitors}
              currentStatus={status}
              className="mb-6"
            />
            
            {/* タイマー管理リンク */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">タイマー管理</h3>
              <Link 
                href="/timer" 
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded text-center block mb-3"
              >
                カウントダウンタイマー管理
              </Link>
              <Link 
                href="/admin/visitors" 
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-center block mb-3"
              >
                来場者数管理
              </Link>
              <Link 
                href="/admin/staff" 
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded text-center block mb-3"
              >
                スタッフ管理
              </Link>
              <Link 
                href="/admin/users" 
                className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded text-center block"
              >
                ユーザー管理
              </Link>
            </div>

            {/* ビューモードリンク */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">表示モード</h3>
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
                  className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  タイトル・メッセージ付き全画面表示
                </Link>
                <p className="text-sm text-gray-500 mt-2">
                  ※ビューモードは大画面表示に最適化されています。
                  プロジェクターやモニターに表示する場合に使用してください。
                </p>
              </div>
            </div>
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

export default Dashboard;
