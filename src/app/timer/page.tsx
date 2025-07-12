'use client';

import React, { useState, useEffect } from 'react';
import { SocketProvider } from '@/contexts/SocketContext';
import CountdownTimer from '@/components/CountdownTimer';
import TimerControlPanel from '@/components/TimerControlPanel';
import MessageControlPanel from '@/components/MessageControlPanel';
import TimerActionPanel from '@/components/TimerActionPanel';
import ConnectionStatus from '@/components/ConnectionStatus';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TimerSettings } from '@/lib/countdownTimer';
import { useTimerData } from '@/hooks/useTimerData';

export default function TimerPage() {
  const [currentTimer, setCurrentTimer] = useState<TimerSettings | null>(null);
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  
  // 認証チェック
  useEffect(() => {
    console.log('タイマー管理ページの認証状態:', { loading, user, isAdmin });
    
    if (!loading) {
      if (!user) {
        console.log('ユーザーがログインしていません。ログインページにリダイレクトします');
        router.push('/login');
        setTimeout(() => {
          if (!user) window.location.href = '/login';
        }, 100);
      } else if (!isAdmin) {
        console.log('管理者権限がありません');
        alert('管理者権限がありません');
        router.push('/');
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    }
  }, [loading, user, isAdmin, router]);

  return (
    <SocketProvider role="admin">
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">タイマー管理</h1>
              <div className="flex space-x-4">
                <Link href="/" className="text-blue-500 hover:text-blue-700">
                  ホームに戻る
                </Link>
                <Link href="/dashboard" className="text-blue-500 hover:text-blue-700">
                  ダッシュボード
                </Link>
                <Link 
                  href="/timer/display" 
                  target="_blank"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  フルスクリーン表示
                </Link>
              </div>
            </div>
            <ConnectionStatusWrapper className="mt-2" />
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">タイマー表示</h2>
              <div className="flex justify-center items-center min-h-[200px]">
                <TimerDisplay />
              </div>
            </div>
            
            <div className="space-y-6">
              <TimerControlPanel />
              <MessageControlPanel />
              <TimerActionPanel />
            </div>
          </div>
        </div>
      </div>
    </SocketProvider>
  );
}

// ConnectionStatusラッパーコンポーネント
function ConnectionStatusWrapper({ className = '' }: { className?: string }) {
  const { connected } = useSocket();
  return <ConnectionStatus isConnected={connected} className={className} />;
}

function TimerDisplay() {
  const { socket, connected } = useSocket();
  const { currentTimer, fetchCurrentTimer } = useTimerData();

  useEffect(() => {
    if (!socket || !connected) return;

    // 現在のタイマーを取得
    fetchCurrentTimer();

    // タイマー更新イベントのリスナー
    const handleTimerUpdate = (data: { timer: TimerSettings }) => {
      // Socket.IOからのリアルタイム更新を受け取ったら、APIからも最新データを取得
      fetchCurrentTimer();
    };

    socket.on('timer:update', handleTimerUpdate);

    return () => {
      socket.off('timer:update', handleTimerUpdate);
    };
  }, [socket, connected, fetchCurrentTimer]);

  if (!currentTimer) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="mb-4">タイマーが選択されていません</p>
        <p className="text-sm">左側のパネルからタイマーを選択または作成してください</p>
      </div>
    );
  }

  return (
    <CountdownTimer timer={currentTimer} size="xl" />
  );
}
