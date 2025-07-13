'use client';

import React, { useState } from 'react';
import { useStaffStatus } from '@/hooks/useStaffStatus';

export default function StaffStatusPanel() {
  const { status, customStatus, updateStatus, loading } = useStaffStatus();
  const [newCustomStatus, setNewCustomStatus] = useState('');

  // カスタムステータス変更ハンドラー
  const handleCustomStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomStatus.trim()) {
      await updateStatus('カスタム', newCustomStatus.trim());
      setNewCustomStatus('');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">あなたのステータス: 
        <span className="ml-2 font-bold text-blue-600">
          {status === 'カスタム' && customStatus ? customStatus : status}
        </span>
      </h3>
      
      {/* 基本ステータス */}
      <div>
        <h4 className="mb-2 font-medium">ステータスを更新</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateStatus('出発前')}
            disabled={loading}
            className={`rounded px-3 py-1 text-white ${
              status === '出発前' ? 'bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            出発前
          </button>
          <button
            onClick={() => updateStatus('出発OK')}
            disabled={loading}
            className={`rounded px-3 py-1 text-white ${
              status === '出発OK' ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            出発OK
          </button>
          <button
            onClick={() => updateStatus('到着')}
            disabled={loading}
            className={`rounded px-3 py-1 text-white ${
              status === '到着' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            到着
          </button>
          <button
            onClick={() => updateStatus('勤務中')}
            disabled={loading}
            className={`rounded px-3 py-1 text-white ${
              status === '勤務中' ? 'bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            勤務中
          </button>
          <button
            onClick={() => updateStatus('業務終了')}
            disabled={loading}
            className={`rounded px-3 py-1 text-white ${
              status === '業務終了' ? 'bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
            }`}
          >
            業務終了
          </button>
        </div>
      </div>

      {/* カスタムステータス */}
      <div>
        <h4 className="mb-2 font-medium">カスタムステータス</h4>
        <form onSubmit={handleCustomStatusSubmit} className="flex gap-2">
          <input
            type="text"
            value={newCustomStatus}
            onChange={(e) => setNewCustomStatus(e.target.value)}
            placeholder="カスタムステータス"
            className="flex-grow rounded border border-gray-300 px-3 py-1"
            disabled={loading}
          />
          <button
            type="submit"
            className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
            disabled={loading || !newCustomStatus.trim()}
          >
            設定
          </button>
        </form>
      </div>
    </div>
  );
}
