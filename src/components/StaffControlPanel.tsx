'use client';

import React, { useState, useEffect } from 'react';
import { useVisitorCount } from '@/hooks/useVisitorCount';

export interface StaffControlPanelProps {
  currentStatus: string;
  onStatusChange: (status: string) => Promise<boolean>;
  attendeeCount: number;
}

export default function StaffControlPanel({ 
  currentStatus, 
  onStatusChange, 
  attendeeCount 
}: StaffControlPanelProps) {
  const [customStatus, setCustomStatus] = useState('');
  const [newAttendeeCount, setNewAttendeeCount] = useState(attendeeCount.toString());
  const { incrementCount, resetCount } = useVisitorCount();
  
  // 来場者数が変更されたらフォーム値も更新
  useEffect(() => {
    setNewAttendeeCount(attendeeCount.toString());
  }, [attendeeCount]);

  // ステータス変更ハンドラー
  const handleStatusChange = async (status: string) => {
    await onStatusChange(status);
  };

  // カスタムステータス変更ハンドラー
  const handleCustomStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customStatus.trim()) {
      await onStatusChange(customStatus.trim());
      setCustomStatus('');
    }
  };

  // 来場者数更新ハンドラー
  const handleAttendeeCountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(newAttendeeCount);
    if (!isNaN(count) && count >= 0) {
      // 現在の来場者数との差分を計算
      const diff = count - attendeeCount;
      if (diff !== 0) {
        await incrementCount(diff);
      }
    }
  };
  
  // 来場者数リセットハンドラー
  const handleResetCount = async () => {
    if (confirm('来場者数をリセットしますか？')) {
      await resetCount();
    }
  };

  return (
    <div className="space-y-6">
      {/* 基本ステータス */}
      <div>
        <h3 className="mb-2 font-medium">基本ステータス</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusChange('受付中')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === '受付中' ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            受付中
          </button>
          <button
            onClick={() => handleStatusChange('準備中')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === '準備中' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            準備中
          </button>
          <button
            onClick={() => handleStatusChange('開始前')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === '開始前' ? 'bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            開始前
          </button>
          <button
            onClick={() => handleStatusChange('開催中')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === '開催中' ? 'bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
            }`}
          >
            開催中
          </button>
          <button
            onClick={() => handleStatusChange('休憩中')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === '休憩中' ? 'bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            休憩中
          </button>
          <button
            onClick={() => handleStatusChange('終了')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === '終了' ? 'bg-red-700' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            終了
          </button>
        </div>
      </div>

      {/* 休憩ステータス */}
      <div>
        <h3 className="mb-2 font-medium">休憩ステータス</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusChange('コーヒーブレイク')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === 'コーヒーブレイク' ? 'bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            コーヒーブレイク
          </button>
          <button
            onClick={() => handleStatusChange('ランチタイム')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === 'ランチタイム' ? 'bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            ランチタイム
          </button>
          <button
            onClick={() => handleStatusChange('ネットワーキング')}
            className={`rounded px-3 py-1 text-white ${
              currentStatus === 'ネットワーキング' ? 'bg-teal-700' : 'bg-teal-500 hover:bg-teal-600'
            }`}
          >
            ネットワーキング
          </button>
        </div>
      </div>

      {/* カスタムステータス */}
      <div>
        <h3 className="mb-2 font-medium">カスタムステータス</h3>
        <form onSubmit={handleCustomStatusSubmit} className="flex gap-2">
          <input
            type="text"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="カスタムステータス"
            className="flex-grow rounded border border-gray-300 px-3 py-1"
          />
          <button
            type="submit"
            className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
            disabled={!customStatus.trim()}
          >
            設定
          </button>
        </form>
      </div>

      {/* 来場者数更新 */}
      <div>
        <h3 className="mb-2 font-medium">来場者数更新</h3>
        <form onSubmit={handleAttendeeCountSubmit} className="flex gap-2">
          <input
            type="number"
            value={newAttendeeCount}
            onChange={(e) => setNewAttendeeCount(e.target.value)}
            min="0"
            className="w-24 rounded border border-gray-300 px-3 py-1"
          />
          <button
            type="submit"
            className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
          >
            更新
          </button>
          <button
            type="button"
            onClick={handleResetCount}
            className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
          >
            リセット
          </button>
        </form>
      </div>
    </div>
  );
}
