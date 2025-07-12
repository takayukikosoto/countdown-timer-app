import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { TimerAction } from '@/lib/timerActionTypes';
import io from 'socket.io-client';

/**
 * タイマーアクションを管理するカスタムフック
 */
export function useTimerActions(timerId?: string) {
  const [actions, setActions] = useState<TimerAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useSocket();
  const [socket, setSocket] = useState<any | null>(null);
  
  // Socket.IOクライアントの初期化
  useEffect(() => {
    // Socket.IOクライアントの作成
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, []);

  // タイマーアクションを取得
  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = timerId 
        ? `/api/timer/actions?timerId=${encodeURIComponent(timerId)}`
        : '/api/timer/actions';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('アクションの取得に失敗しました');
      }
      
      const data = await response.json();
      setActions(data.actions || []);
    } catch (err) {
      console.error('タイマーアクション取得エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [timerId]);

  // タイマーアクションを作成
  const createAction = useCallback(async (action: Partial<TimerAction>) => {
    try {
      const response = await fetch('/api/timer/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      });
      
      if (!response.ok) {
        throw new Error('アクションの作成に失敗しました');
      }
      
      const data = await response.json();
      setActions(prev => [...prev, data.action]);
      return data.action;
    } catch (err) {
      console.error('タイマーアクション作成エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
      return null;
    }
  }, []);

  // タイマーアクションを更新
  const updateAction = useCallback(async (action: Partial<TimerAction>) => {
    try {
      const response = await fetch('/api/timer/actions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      });
      
      if (!response.ok) {
        throw new Error('アクションの更新に失敗しました');
      }
      
      const data = await response.json();
      setActions(prev => 
        prev.map(a => a.id === action.id ? data.action : a)
      );
      return data.action;
    } catch (err) {
      console.error('タイマーアクション更新エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
      return null;
    }
  }, []);

  // タイマーアクションを削除
  const deleteAction = useCallback(async (actionId: string) => {
    try {
      const response = await fetch(`/api/timer/actions?id=${encodeURIComponent(actionId)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('アクションの削除に失敗しました');
      }
      
      setActions(prev => prev.filter(a => a.id !== actionId));
      return true;
    } catch (err) {
      console.error('タイマーアクション削除エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
      return false;
    }
  }, []);

  // Socket.IOイベントのリスナーを設定
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }
    
    // アクション作成イベント
    const handleActionCreate = (data: { action: TimerAction }) => {
      if (!timerId || data.action.timerId === timerId) {
        setActions(prev => [...prev, data.action]);
      }
    };

    // アクション更新イベント
    const handleActionUpdate = (data: { action: TimerAction }) => {
      if (!timerId || data.action.timerId === timerId) {
        setActions(prev => 
          prev.map(a => a.id === data.action.id ? data.action : a)
        );
      }
    };

    // アクション削除イベント
    const handleActionDelete = (data: { actionId: string }) => {
      setActions(prev => prev.filter(a => a.id !== data.actionId));
    };

    // アクション実行イベント
    const handleActionExecuted = (data: { 
      actionId: string, 
      timerId: string,
      actionType: string,
      timestamp: number
    }) => {
      if (!timerId || data.timerId === timerId) {
        setActions(prev => 
          prev.map(a => a.id === data.actionId ? { ...a, executed: true } : a)
        );
      }
    };

    // イベントリスナーを登録
    socket.on('timer:action:create', handleActionCreate);
    socket.on('timer:action:update', handleActionUpdate);
    socket.on('timer:action:delete', handleActionDelete);
    socket.on('timer:action:executed', handleActionExecuted);

    // クリーンアップ関数
    return () => {
      socket.off('timer:action:create', handleActionCreate);
      socket.off('timer:action:update', handleActionUpdate);
      socket.off('timer:action:delete', handleActionDelete);
      socket.off('timer:action:executed', handleActionExecuted);
    };
  }, [socket, isConnected, timerId]);

  // 初回マウント時とタイマーID変更時にアクションを取得
  useEffect(() => {
    if (isConnected) {
      fetchActions();
    }
  }, [fetchActions, isConnected]);

  return {
    actions,
    loading,
    error,
    fetchActions,
    createAction,
    updateAction,
    deleteAction,
  };
}
