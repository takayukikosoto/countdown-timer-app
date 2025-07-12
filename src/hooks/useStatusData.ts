'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

// ステータスデータを管理するためのカスタムフック
export function useStatusData() {
  const [status, setStatus] = useState<string>('準備中');
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocket();

  // ステータス情報を取得
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error('ステータス情報の取得に失敗しました');
      }
      const data = await response.json();
      setStatus(data.status);
      setServerTime(data.serverTime);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ステータスを更新
  const updateStatus = async (newStatus: string) => {
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました');
      }
      
      // Socket.IOでも送信（冗長化のため）
      if (socket && connected) {
        socket.emit('status:update', { status: newStatus });
      }
      
      setStatus(newStatus);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return false;
    }
  };

  // 来場者数関連の機能はuseVisitorCountフックに移行

  // 初期データ読み込みとSocket.IOイベントリスナーの設定
  useEffect(() => {
    // 初期データの読み込み
    fetchStatus();
    
    // Socket.IOイベントリスナー
    if (socket && connected) {
      // ステータス更新イベント
      socket.on('status:update', (data: { status?: string }) => {
        if (data.status) {
          setStatus(data.status);
        }
      });
      
      // サーバー時刻同期イベント
      socket.on('server:time', (data: { time?: number }) => {
        if (data.time) {
          setServerTime(data.time);
        }
      });
      
      // 接続時の初期状態
      socket.on('state', (data: { status?: string; serverTime?: number }) => {
        setStatus(data.status || '準備中');
        setServerTime(data.serverTime || Date.now());
        setLoading(false);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('status:update');
        socket.off('server:time');
        socket.off('state');
      }
    };
  }, [socket, connected]);

  return {
    status,
    serverTime,
    loading,
    error,
    fetchStatus,
    updateStatus
  };
}
