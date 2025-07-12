'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import io from 'socket.io-client';

// SocketContext の型定義
interface SocketContextType {
  socket: any;
  connected: boolean;
  error: string | null;
}

// Context の作成
const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  error: null
});

// Context Provider の props の型定義
interface SocketProviderProps {
  children: ReactNode;
  role?: 'admin' | 'staff' | 'viewer';
}

// Socket.IO クライアントのシングルトンインスタンス
let socketInstance: any = null;

export const SocketProvider: React.FC<SocketProviderProps> = ({ 
  children, 
  role = 'viewer' 
}) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 接続状態を強制的に更新するためのタイマー
  useEffect(() => {
    // 5秒後に接続状態を確認し、必要に応じて強制更新
    const forceUpdateTimer = setTimeout(() => {
      if (socketInstance && socketInstance.connected) {
        console.log('%c 接続状態を強制的に更新します ', 'background: #2196F3; color: white; font-size: 12px; padding: 3px;');
        setConnected(true);
      }
    }, 5000);
    
    return () => clearTimeout(forceUpdateTimer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Socket.IO クライアントの初期化（シングルトンパターン）
    if (!socketInstance) {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
      
      // Socket.IOクライアントの初期化
      // 接続の安定性を向上させた設定
      let socketUrl = wsUrl;
      const socketPath = '/socket.io'; // Socket.IOのデフォルトパス
      
      try {
        // URLが有効な形式かチェック
        const parsedUrl = new URL(wsUrl);
        socketUrl = parsedUrl.origin;
      } catch (e) {
        console.error('無効なWebSocket URL:', wsUrl, e);
      }
      
      console.log(`Socket.IO 接続先: ${socketUrl}, パス: ${socketPath}`);
      
      // デバッグ用の詳細ログ出力
      console.log(`Socket.IO接続試行: URL=${socketUrl}, Path=${socketPath}`);
      console.log(`現在の環境変数: NEXT_PUBLIC_WS_URL=${process.env.NEXT_PUBLIC_WS_URL}`);
      
      // 接続設定を最適化
      socketInstance = io(socketUrl, {
        path: socketPath,
        transports: ['websocket', 'polling'],  // WebSocketを優先し、Pollingにフォールバック
        reconnection: true,
        reconnectionAttempts: 15,  // 再接続試行回数を増やす
        reconnectionDelay: 500,   // 再接続遅延を短くする
        reconnectionDelayMax: 3000, // 最大再接続遅延を短くする
        timeout: 30000,  // タイムアウト時間を長くする
        forceNew: false,  // 新しい接続を強制しない
        autoConnect: true, // 自動接続を有効化
        auth: {
          role
        }
      });
      
      console.log('Socket.IO 接続設定:', {
        url: socketUrl,
        path: socketPath,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 15
      });
      
      // 接続を強制的に開始
      if (!socketInstance.connected) {
        socketInstance.connect();
      }
      
      console.log('Socket.IO クライアントを初期化しました');
    }

    // 接続イベントのハンドラー
    const handleConnect = () => {
      console.log('%c Socket.IO サーバーに接続しました! ', 'background: #4CAF50; color: white; font-size: 12px; padding: 3px;');
      console.log('接続状態を「接続OK」に更新します');
      setConnected(true);
      setError(null);
      
      // 接続情報を詳細に出力
      console.log('接続情報:', {
        id: socketInstance?.id,
        transport: socketInstance?.io?.engine?.transport?.name,
        connected: socketInstance?.connected
      });
      
      // 参加イベントを送信
      socketInstance?.emit('join', { role });
    };

    // 切断イベントのハンドラー
    const handleDisconnect = (reason: string) => {
      console.log(`Socket.IO サーバーから切断されました: ${reason}`);
      setConnected(false);
    };

    // 接続エラーのハンドラー
    const handleConnectError = (err: Error) => {
      console.error('Socket.IO 接続エラー:', err);
      setError(`接続エラー: ${err.message}`);
      setConnected(false);
    };

    // エラーイベントのハンドラー
    const handleError = (data: { message: string }) => {
      console.error('Socket.IO エラー:', data.message);
      setError(data.message);
    };

    // イベントリスナーの登録
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('error', handleError);
    
    // 接続状態のデバッグ
    console.log('Socket.IO 接続を試みています...');
    console.log('現在の環境変数 NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL);

    // コンポーネントのアンマウント時にイベントリスナーを解除
    return () => {
      socketInstance?.off('connect', handleConnect);
      socketInstance?.off('disconnect', handleDisconnect);
      socketInstance?.off('connect_error', handleConnectError);
      socketInstance?.off('error', handleError);
    };
  }, [role]);

  return (
    <SocketContext.Provider value={{ socket: socketInstance, connected, error }}>
      {children}
    </SocketContext.Provider>
  );
};

// カスタムフック
export const useSocket = () => useContext(SocketContext);
