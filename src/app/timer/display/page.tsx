'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { SocketProvider } from '@/contexts/SocketContext';
import { useSocket } from '@/contexts/SocketContext';
import CountdownTimer from '@/components/CountdownTimer';
import { TimerSettings, TimerMessage as TimerMessageType } from '@/lib/countdownTimerSupabase';
import { useStatusData } from '@/hooks/useStatusData';

export default function TimerDisplayPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // フルスクリーン切り替え
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        console.log('フルスクリーンモードに入りました');
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`フルスクリーンエラー: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          console.log('フルスクリーンモードを終了しました');
          setIsFullscreen(false);
        }).catch(err => {
          console.error(`フルスクリーン終了エラー: ${err.message}`);
        });
      }
    }
  }, []);
  
  // フルスクリーン状態の変更を検出
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F キーでフルスクリーン切り替え
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      // ESCキーはブラウザが自動的に処理するため、ここでは何もしない
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  return (
    <SocketProvider role="viewer">
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* ヘッダー（非フルスクリーン時のみ表示） */}
        {!isFullscreen && (
          <header className="p-4 bg-gray-900">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">タイマー表示</h1>
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                フルスクリーン表示
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              F キーでフルスクリーン切り替え
            </p>
          </header>
        )}

        {/* タイマー表示エリア */}
        <div className="flex-1 flex items-center justify-center">
          <TimerDisplay 
            isFullscreen={isFullscreen} 
            toggleFullscreen={toggleFullscreen} 
          />
        </div>
      </div>
    </SocketProvider>
  );
}

interface TimerDisplayProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

function TimerDisplay({ isFullscreen, toggleFullscreen }: TimerDisplayProps) {
  const [currentTimer, setCurrentTimer] = useState<TimerSettings | null>(null);
  const [currentMessage, setCurrentMessage] = useState<TimerMessageType | null>(null);
  const [lastTimerId, setLastTimerId] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { socket, connected } = useSocket();
  const { status } = useStatusData();
  
  // ステータス変更を検知して自動リロード
  useEffect(() => {
    if (!status || status === lastStatus) return;
    
    console.log(`ステータスが変更されました: ${lastStatus} → ${status}`);
    setLastStatus(status);
    
    // 連続リロードを防ぐため、少し遅延させてからリロード
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }
    
    reloadTimeoutRef.current = setTimeout(() => {
      console.log('ステータス変更によりページをリロードします...');
      window.location.reload();
    }, 1500);
    
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [status, lastStatus, lastTimerId]);

  useEffect(() => {
    if (!socket || !connected) return;

    // タイマー更新を受信
    const handleTimerUpdate = (data: { timer: TimerSettings }) => {
      setCurrentTimer(data.timer);
      
      // タイマーIDが変わった場合（新しいタイマーが選択された場合）は自動リロード
      if (lastTimerId && data.timer && data.timer.id !== lastTimerId) {
        console.log(`タイマーが変更されました: ${lastTimerId} → ${data.timer.id}`);
        
        // 連続リロードを防ぐため、少し遅延させてからリロード
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
        }
        
        reloadTimeoutRef.current = setTimeout(() => {
          console.log('タイマー変更によりページをリロードします...');
          window.location.reload();
        }, 1500);
      }
      
      // 現在のタイマーIDを保存
      if (data.timer) {
        setLastTimerId(data.timer.id);
      }
    };

    // タイマー削除を受信
    const handleTimerDelete = (data: { timerId: string }) => {
      setCurrentTimer(prev => prev && prev.id === data.timerId ? null : prev);
    };
    
    // 新しいメッセージを受信
    const handleNewMessage = (data: { message: TimerMessageType }) => {
      setCurrentMessage(data.message);
    };
    
    // メッセージ削除を受信
    const handleDeleteMessage = (data: { messageId: string }) => {
      setCurrentMessage(prev => prev && prev.id === data.messageId ? null : prev);
    };

    // 初期タイマーを取得
    socket.emit('timer:getCurrent', {}, (response: { timer: TimerSettings | null }) => {
      if (response.timer) {
        setCurrentTimer(response.timer);
        setLastTimerId(response.timer.id);
      }
    });
    
    // 最新のメッセージを取得
    socket.emit('message:getAll', {}, (response: { success: boolean; messages: TimerMessageType[] }) => {
      if (response.success && response.messages.length > 0) {
        // 最新のメッセージを表示
        const latestMessage = response.messages.sort((a, b) => b.timestamp - a.timestamp)[0];
        setCurrentMessage(latestMessage);
      }
    });

    socket.on('timer:update', handleTimerUpdate);
    socket.on('timer:delete', handleTimerDelete);
    socket.on('message:new', handleNewMessage);
    socket.on('message:delete', handleDeleteMessage);

    // 初期ステータスを保存
    setLastStatus(status);
    
    return () => {
      socket.off('timer:update', handleTimerUpdate);
      socket.off('timer:delete', handleTimerDelete);
      socket.off('message:new', handleNewMessage);
      socket.off('message:delete', handleDeleteMessage);
      
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [socket, connected, setLastTimerId, setCurrentTimer, setCurrentMessage, setLastStatus, status, lastTimerId]);

  // 接続状態の表示
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full relative">
        {/* フルスクリーン切り替えボタン */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 shadow-lg border border-white/20"
          title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン表示'}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </button>
        
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/10">
          <div className="flex items-center mb-4">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl">サーバーに接続中...</p>
          </div>
          <p className="text-sm text-gray-300">しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  // タイマーがない場合
  if (!currentTimer) {
    return (
      <div className="flex flex-col items-center justify-center h-full relative">
        {/* フルスクリーン切り替えボタン */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 shadow-lg border border-white/20"
          title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン表示'}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </button>
        
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/10 max-w-md">
          <p className="text-xl mb-4">タイマーが設定されていません</p>
          <p className="text-sm text-gray-300 mb-2">ホーム画面からタイマーを設定してください</p>
          <div className="mt-4 flex justify-center">
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
          <div className="mt-6 text-xs text-gray-400 text-left">
            <p>接続状態: {connected ? '接続済み' : '未接続'}</p>
            <p>ステータス: {status || '不明'}</p>
            <p>フルスクリーン: {isFullscreen ? 'ON' : 'OFF'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center relative">
      {/* フルスクリーン切り替えボタン */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 shadow-lg border border-white/20"
        title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン表示'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        )}
      </button>
      
      {/* タイマー表示（メッセージも渡す） */}
      <CountdownTimer 
        timer={currentTimer} 
        message={currentMessage} 
        size="xl" 
      />
      
      {/* デバッグ情報（非表示） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 left-2 text-xs text-gray-500 bg-black/30 p-2 rounded opacity-50 hover:opacity-100 transition-opacity">
          <p>Socket: {connected ? '接続済み' : '未接続'}</p>
          <p>Timer ID: {currentTimer?.id || 'none'}</p>
          <p>Status: {status || '不明'}</p>
          <p>Fullscreen: {isFullscreen ? 'ON' : 'OFF'}</p>
        </div>
      )}
    </div>
  );
}
