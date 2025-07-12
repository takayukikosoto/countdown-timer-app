'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

// ステータスデータを管理するためのカスタムフック
export function useStatusData() {
  const [status, setStatus] = useState<string>('準備中');
  const [visitorCount, setVisitorCount] = useState<number>(0);
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
      setVisitorCount(data.visitors);
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

  // 来場者数を増加
  const incrementVisitors = async (increment: number = 1) => {
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'increment_visitors',
          increment
        }),
      });
      
      if (!response.ok) {
        throw new Error('来場者数の更新に失敗しました');
      }
      
      const data = await response.json();
      
      // Socket.IOでも送信（冗長化のため）
      if (socket && connected) {
        socket.emit('count:increment', { increment });
      }
      
      setVisitorCount(data.visitors);
      return data.visitors;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return null;
    }
  };

  // 来場者数を設定
  const setVisitors = async (count: number) => {
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set_visitors',
          count
        }),
      });
      
      if (!response.ok) {
        throw new Error('来場者数の設定に失敗しました');
      }
      
      // Socket.IOでも送信（冗長化のため）
      if (socket && connected) {
        socket.emit('count:set', { count });
      }
      
      setVisitorCount(count);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return false;
    }
  };

  // 初期データ読み込みとSocket.IOイベントリスナーの設定
  useEffect(() => {
    // 初期データの読み込み
    fetchStatus();
    
    // Socket.IOイベントリスナー
    if (socket && connected) {
      // ステータス更新イベント
      socket.on('status:update', (data) => {
        if (data.status) {
          setStatus(data.status);
        }
      });
      
      // 来場者数更新イベント
      socket.on('count:update', (data) => {
        if (data.visitors !== undefined) {
          setVisitorCount(data.visitors);
        }
      });
      
      // サーバー時刻同期イベント
      socket.on('server:time', (data) => {
        if (data.time) {
          setServerTime(data.time);
        }
      });
      
      // 接続時の初期状態
      socket.on('state', (data) => {
        setStatus(data.status || '準備中');
        setVisitorCount(data.visitors || 0);
        setServerTime(data.serverTime || Date.now());
        setLoading(false);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('status:update');
        socket.off('count:update');
        socket.off('server:time');
        socket.off('state');
      }
    };
  }, [socket, connected]);

  return {
    status,
    visitorCount,
    serverTime,
    loading,
    error,
    fetchStatus,
    updateStatus,
    incrementVisitors,
    setVisitors
  };
}
