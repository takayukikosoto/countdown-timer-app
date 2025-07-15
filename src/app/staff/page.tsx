'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useStatusData } from '@/hooks/useStatusData';
import { useTimerData } from '@/hooks/useTimerData';
import StatusDisplay from '@/components/StatusDisplay';
import StaffStatusPanel from '@/components/StaffStatusPanel';
import StaffQRCodeViewer from '@/components/StaffQRCodeViewer';
import StaffHistoryPanel from '@/components/StaffHistoryPanel';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { useSocket } from '@/contexts/SocketContext';

export default function StaffPage() {
  const { user, isLoading, isAdmin, isStaff } = useAuth();
  const router = useRouter();
  const [staffName, setStaffName] = useState<string>('');
  const [staffCompany, setStaffCompany] = useState<string>('');
  const [staffPosition, setStaffPosition] = useState<string>('');
  const [staffLevel, setStaffLevel] = useState<string>('');
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
            // スタッフ情報を設定
            setStaffName(data.display_name || user.user_metadata?.name || '');
            setStaffCompany(data.company || '');
            setStaffPosition(data.staff_position || '');
            setStaffLevel(data.staff_level || '');
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
      
      {/* スタッフ情報カード */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">スタッフ情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">名前</p>
            <p className="font-medium">{staffName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">所属</p>
            <p className="font-medium">{staffCompany || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ポジション</p>
            <p className="font-medium">{staffPosition || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">レベル</p>
            <p className="font-medium">{staffLevel || '-'}</p>
          </div>
        </div>
        
        {/* QRコード表示セクション */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="mb-2 text-lg font-medium">ログインQRコード</h3>
          <p className="text-sm text-gray-600 mb-2">このQRコードを使って素早くログインできます</p>
          <StaffQRCodeViewer displayName={staffName} />
        </div>
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
          <h2 className="mb-4 text-xl font-semibold">来場者数</h2>
          <div className="text-3xl font-bold mb-2">{attendeeCount}人</div>
          <p className="text-sm text-gray-500">現在の来場者数です</p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <StaffHistoryPanel />
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
