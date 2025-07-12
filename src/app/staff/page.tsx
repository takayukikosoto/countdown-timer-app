'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useStatusData } from '@/hooks/useStatusData';
import { useTimerData } from '@/hooks/useTimerData';
import StatusDisplay from '@/components/StatusDisplay';
import StaffControlPanel from '@/components/StaffControlPanel';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { useSocket } from '@/contexts/SocketContext';

export default function StaffPage() {
  const { user, loading, isStaff } = useAuth();
  const router = useRouter();
  const { status, updateStatus } = useStatusData();
  const { currentTimer } = useTimerData();
  const { count: visitorCount } = useVisitorCount();
  const [attendeeCount, setAttendeeCount] = useState<number>(visitorCount);
  const { socket, connected } = useSocket();

  // 認証チェック
  useEffect(() => {
    if (!loading && !isStaff) {
      router.push('/login');
    }
  }, [loading, isStaff, router]);

  // 来場者数の更新
  useEffect(() => {
    setAttendeeCount(visitorCount);
  }, [visitorCount]);

  // Socket.IOの接続
  useEffect(() => {
    if (!socket || !connected) return;

    // 来場者数の更新イベントを受信
    const handleAttendeeUpdate = (data: { count: number }) => {
      setAttendeeCount(data.count);
    };
    
    socket.on('visitor:update', handleAttendeeUpdate);

    // クリーンアップ関数
    return () => {
      socket.off('visitor:update', handleAttendeeUpdate);
    };
  }, [socket, connected]);

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-2xl font-bold">読み込み中...</div>
      </div>
    );
  }

  // 認証されていない場合は何も表示しない（useEffectでリダイレクト）
  if (!isStaff) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">スタッフダッシュボード</h1>
      
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">現在のステータス</h2>
          <div className="mb-4 flex items-center">
            <StatusDisplay status={status} size="lg" />
          </div>
          
          <h2 className="mb-4 text-xl font-semibold">タイマー情報</h2>
          <div className="space-y-2">
            <p><span className="font-medium">タイトル:</span> {currentTimer?.title || '未設定'}</p>
            <p><span className="font-medium">開始時間:</span> {currentTimer?.startTime ? new Date(currentTimer.startTime).toLocaleString() : '未設定'}</p>
            <p><span className="font-medium">終了時間:</span> {currentTimer?.endTime ? new Date(currentTimer.endTime).toLocaleString() : '未設定'}</p>
            <p><span className="font-medium">来場者数:</span> {attendeeCount}人</p>
          </div>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">スタッフ操作パネル</h2>
          <StaffControlPanel 
            currentStatus={status} 
            onStatusChange={updateStatus} 
            attendeeCount={attendeeCount}
          />
        </div>
      </div>
      
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          ホームに戻る
        </Link>
        <Link href="/view" className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          ビューモード
        </Link>
        <Link href="/view?mode=full" className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
          全画面表示
        </Link>
      </div>
    </div>
  );
}
