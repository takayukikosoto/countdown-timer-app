import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// イベントの型定義
export interface ServerState {
  status: string;
  visitors: number;
  serverTime: number;
}

export interface StatusUpdate {
  status: string;
}

export interface CountUpdate {
  visitors: number;
}

export interface TimerSync {
  serverTime: number;
}

export interface SocketError {
  message: string;
}

// Socket.IOクライアントのカスタムフック
export function useSocket(role: 'viewer' | 'staff' | 'admin' = 'viewer') {
  // Socket.IOクライアントの参照
  const socketRef = useRef<Socket | null>(null);
  
  // 接続状態
  const [isConnected, setIsConnected] = useState(false);
  
  // サーバーから受け取った状態
  const [serverState, setServerState] = useState<ServerState>({
    status: '準備中',
    visitors: 0,
    serverTime: Date.now(),
  });
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // Socket.IOクライアントの初期化
  useEffect(() => {
    // Socket.IOクライアントの作成
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      path: '/socket.io',
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      auth: {
        role, // 認証情報としてロールを送信
      },
    });

    // 接続イベント
    socket.on('connect', () => {
      console.log('Socket.IO接続成功');
      setIsConnected(true);
      setError(null);
      
      // ロールを指定して参加
      socket.emit('join', { role });
    });

    // 切断イベント
    socket.on('disconnect', (reason) => {
      console.log(`Socket.IO切断: ${reason}`);
      setIsConnected(false);
    });

    // 再接続イベント
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO再接続成功 (${attemptNumber}回目)`);
      setIsConnected(true);
      setError(null);
    });

    // 再接続エラーイベント
    socket.on('reconnect_error', (error) => {
      console.error('Socket.IO再接続エラー:', error);
      setError('サーバーに再接続できません。ネットワーク接続を確認してください。');
    });

    // 初期状態受信イベント
    socket.on('state', (state: ServerState) => {
      console.log('初期状態を受信:', state);
      setServerState(state);
    });

    // ステータス更新イベント
    socket.on('status:update', (data: StatusUpdate) => {
      console.log('ステータス更新:', data);
      setServerState((prev) => ({ ...prev, status: data.status }));
    });

    // 来場者数更新イベント
    socket.on('count:update', (data: CountUpdate) => {
      console.log('来場者数更新:', data);
      setServerState((prev) => ({ ...prev, visitors: data.visitors }));
    });

    // 時刻同期イベント
    socket.on('timer:sync', (data: TimerSync) => {
      console.log('時刻同期:', data);
      setServerState((prev) => ({ ...prev, serverTime: data.serverTime }));
    });

    // エラーイベント
    socket.on('error', (data: SocketError) => {
      console.error('Socket.IOエラー:', data);
      setError(data.message);
    });

    // クリーンアップ関数
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  // ステータス更新関数
  const updateStatus = useCallback((status: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('status:update', { status });
    } else {
      setError('サーバーに接続されていません。');
    }
  }, [isConnected]);

  // 来場者数増加関数
  const incrementCount = useCallback((increment: number = 1) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('count:increment', { increment });
    } else {
      setError('サーバーに接続されていません。');
    }
  }, [isConnected]);

  return {
    isConnected,
    serverState,
    error,
    updateStatus,
    incrementCount,
  };
}
