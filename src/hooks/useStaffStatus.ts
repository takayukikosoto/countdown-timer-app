'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

// スタッフステータスの型定義
export type StaffStatus = {
  status: string;
  custom_status: string | null;
  updated_at: string;
};

// スタッフステータスを管理するためのカスタムフック
export function useStaffStatus() {
  const [status, setStatus] = useState<string>('出発前');
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>(new Date().toISOString());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { socket, connected } = useSocket();

  // スタッフステータス情報を取得
  const fetchStatus = async () => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const token = session?.access_token || localStorage.getItem('auth_token');
      const response = await fetch('/api/staff/status', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('スタッフステータスの取得に失敗しました');
      }
      const data = await response.json();
      setStatus(data.status);
      setCustomStatus(data.custom_status);
      setUpdatedAt(data.updated_at);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // スタッフステータスを更新
  const updateStatus = async (newStatus: string, newCustomStatus?: string) => {
    if (!user) return false;
    
    try {
      const token = session?.access_token || localStorage.getItem('auth_token');
      const response = await fetch('/api/staff/status', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: newStatus,
          custom_status: newCustomStatus || null
        }),
      });
      
      if (!response.ok) {
        throw new Error('スタッフステータスの更新に失敗しました');
      }
      
      const data = await response.json();
      
      // Socket.IOでも送信（リアルタイム更新のため）
      if (socket && connected) {
        socket.emit('staff:status_update', { 
          staff_id: user.id,
          status: newStatus,
          custom_status: newCustomStatus || null
        });
      }
      
      setStatus(newStatus);
      setCustomStatus(newCustomStatus || null);
      setUpdatedAt(data.updated_at);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return false;
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [user]);

  // Socket.IOイベントリスナーの設定
  useEffect(() => {
    if (!socket || !connected || !user) return;

    // スタッフステータス更新イベント
    const handleStatusUpdate = (data: { 
      staff_id: string;
      status: string;
      custom_status: string | null;
      updated_at: string;
    }) => {
      // 自分自身のステータス更新のみ反映
      if (data.staff_id === user.id) {
        setStatus(data.status);
        setCustomStatus(data.custom_status);
        setUpdatedAt(data.updated_at);
      }
    };
    
    socket.on('staff:status_update', handleStatusUpdate);
    
    return () => {
      socket.off('staff:status_update', handleStatusUpdate);
    };
  }, [socket, connected, user]);

  return {
    status,
    customStatus,
    updatedAt,
    loading,
    error,
    fetchStatus,
    updateStatus
  };
}
