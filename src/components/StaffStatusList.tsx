'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

type StaffStatusItem = {
  staff_id: string;
  username: string;
  display_name: string;
  status: string;
  custom_status: string | null;
  updated_at: string;
};

export default function StaffStatusList() {
  const [staffStatusList, setStaffStatusList] = useState<StaffStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocket();

  // スタッフステータス一覧を取得
  const fetchStaffStatusList = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/staff/status');
      
      if (!response.ok) {
        throw new Error('スタッフステータスの取得に失敗しました');
      }
      
      const data = await response.json();
      setStaffStatusList(data.staff_status || []);
      return data.staff_status;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    fetchStaffStatusList();
  }, []);

  // Socket.IOイベントリスナーの設定
  useEffect(() => {
    if (!socket || !connected) return;

    // スタッフステータス更新イベント
    const handleStaffStatusUpdate = (data: { 
      staff_id: string;
      status: string;
      custom_status: string | null;
      updated_at: string;
    }) => {
      setStaffStatusList(prevList => {
        const newList = [...prevList];
        const index = newList.findIndex(item => item.staff_id === data.staff_id);
        
        if (index !== -1) {
          newList[index] = {
            ...newList[index],
            status: data.status,
            custom_status: data.custom_status,
            updated_at: data.updated_at
          };
        }
        
        return newList;
      });
    };
    
    socket.on('staff:status_update', handleStaffStatusUpdate);
    
    return () => {
      socket.off('staff:status_update', handleStaffStatusUpdate);
    };
  }, [socket, connected]);

  // ステータスに応じた背景色を取得
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case '出発前': return 'bg-gray-100';
      case '出発OK': return 'bg-green-100';
      case '到着': return 'bg-blue-100';
      case '勤務中': return 'bg-indigo-100';
      case '業務終了': return 'bg-purple-100';
      case 'カスタム': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  };

  // 日時のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  if (loading) {
    return <div className="text-center py-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>;
  }

  if (staffStatusList.length === 0) {
    return <div className="text-center py-4">スタッフのステータス情報はありません</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              スタッフ名
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最終更新
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staffStatusList.map((item) => (
            <tr key={item.staff_id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {item.display_name || item.username}
                </div>
                <div className="text-xs text-gray-500">{item.username}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBgColor(item.status)}`}>
                  {item.status === 'カスタム' && item.custom_status ? item.custom_status : item.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
