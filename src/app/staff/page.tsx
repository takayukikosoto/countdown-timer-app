'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useStatusData } from '@/hooks/useStatusData';
import { useTimerData } from '@/hooks/useTimerData';
import StatusDisplay from '@/components/StatusDisplay';
import StaffControlPanel from '@/components/StaffControlPanel';
import StaffStatusPanel from '@/components/StaffStatusPanel';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { useSocket } from '@/contexts/SocketContext';

export default function StaffPage() {
  const { user, isLoading, isAdmin, isStaff } = useAuth();
  const router = useRouter();
  const [staffName, setStaffName] = useState<string>('');
  const { status, updateStatus } = useStatusData();
  const { currentTimer } = useTimerData();
  const { count: visitorCount } = useVisitorCount();
  const [attendeeCount, setAttendeeCount] = useState<number>(visitorCount);
  const { socket, connected } = useSocket();

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isStaff) {
      router.push('/login');
    }
    
    // ユーザー情報からスタッフ名を取得
    if (user) {
      // Supabaseから直接スタッフ情報を取得
      const fetchStaffInfo = async () => {
        try {
          const response = await fetch('/api/staff/info');
          if (response.ok) {
            const data = await response.json();
            // display_nameを使用
            setStaffName(data.display_name || user.user_metadata?.name || '');
          } else {
            // フォールバックとしてuser_metadataの名前を使用
            setStaffName(user.user_metadata?.name || '');
          }
        } catch (error) {
          console.error('スタッフ情報取得エラー:', error);
          setStaffName(user.user_metadata?.name || '');
        }
      };
      
      fetchStaffInfo();
    }
  }, [isLoading, isStaff, router, user]);

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
  if (isLoading) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">スタッフダッシュボード</h1>
        {staffName && (
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            <span className="font-medium">ログイン中: </span>
            <span>{staffName}</span>
          </div>
        )}
      </div>
      
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
          <h2 className="mb-4 text-xl font-semibold">スタッフステータス</h2>
          <StaffStatusPanel />
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">イベント操作パネル</h2>
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
