'use client';

import { useEffect, useState, useRef } from 'react';
import ServerClock from '@/components/ServerClock';
import StatusDisplay from '@/components/StatusDisplay';
import VisitorCounter from '@/components/VisitorCounter';
import ConnectionStatus from '@/components/ConnectionStatus';
import CountdownTimer from '@/components/CountdownTimer';
import TimerMessage from '@/components/TimerMessage';
import { useSocket } from '@/contexts/SocketContext';
import { useStatusData } from '@/hooks/useStatusData';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { useTimerData } from '@/hooks/useTimerData';
import CurrentDateTime from '@/components/CurrentDateTime';
import Link from 'next/link';
import { TimerSettings } from '@/lib/countdownTimer';

export default function Home() {
  // クエリパラメータからモードを取得
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  // Socket.IO接続
  const { socket, connected } = useSocket();
  
  // ステータスデータの取得
  const { status, error: statusError } = useStatusData();
  
  // Supabaseから来場者数を取得
  const { count: visitorCount } = useVisitorCount();
  
  // タイマーデータの取得
  const { currentTimer, messages, error: timerError } = useTimerData();
  
  // エラーの統合
  const error = statusError || timerError;
  
  // ビューモードの設定
  const [viewMode, setViewMode] = useState<'view' | 'full' | null>(null);
  
  // カスタムメッセージ入力用
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  
  // 自動リロード用の状態
  const [lastStatus, setLastStatus] = useState<string>('');
  const [lastTimerId, setLastTimerId] = useState<string | null>(null);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // フルスクリーン状態の管理
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // フルスクリーン切り替え関数
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        console.log('フルスクリーンモードに入りました');
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          console.log('フルスクリーンモードを終了しました');
        }
      }
    } catch (err) {
      console.error('フルスクリーン切り替えエラー:', err);
    }
  };
  
  // フルスクリーン状態の変更を検出
  useEffect(() => {
    // インラインで関数を定義して未使用変数の警告を解消
    document.addEventListener('fullscreenchange', () => {
      setIsFullscreen(!!document.fullscreenElement);
    });
    return () => document.removeEventListener('fullscreenchange', () => {
      setIsFullscreen(!!document.fullscreenElement);
    });
  }, []);
  
  // キーボードショートカット
  useEffect(() => {
    // インラインで関数を定義して未使用変数の警告を解消
    const keydownHandler = (e: KeyboardEvent) => {
      // F キーでフルスクリーン切り替え
      if ((e.key === 'f' || e.key === 'F') && viewMode) {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', keydownHandler);
    return () => window.removeEventListener('keydown', keydownHandler);
  }, [viewMode, toggleFullscreen]);
  
  // 注意: 定期的な自動リロードは削除しました
  // ステータスやタイマーの変更時のみリロードされます
  
  // URLパラメータの処理
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const title = params.get('title');
      const message = params.get('message');
      
      if (mode === 'view' || mode === 'full') {
        setViewMode(mode as 'view' | 'full');
        setIsViewOnly(true);
        
        // URLパラメータからタイトルとメッセージを取得
        if (title) setCustomTitle(decodeURIComponent(title));
        if (message) setCustomMessage(decodeURIComponent(message));
        
        // 初期状態を保存
        setLastStatus(status);
        if (currentTimer) {
          setLastTimerId(currentTimer.id);
        }
      } else {
        setViewMode(null);
        setIsViewOnly(false);
      }
    }
  }, [status, currentTimer]);
  
  // ステータスに応じた背景色の設定
  const getBackgroundColorByStatus = (status: string): string => {
    switch(status) {
      case '受付中': return 'bg-gradient-to-br from-green-800 to-teal-900';
      case '開始前': return 'bg-gradient-to-br from-blue-800 to-indigo-900';
      case '開催中': return 'bg-gradient-to-br from-purple-800 to-indigo-900';
      case '休憩中': return 'bg-gradient-to-br from-orange-700 to-amber-900';
      case '終了': return 'bg-gradient-to-br from-red-800 to-rose-900';
      default: return 'bg-gradient-to-br from-gray-800 to-slate-900';
    }
  };
  
  // 全画面表示モードでのステータス変更の監視
  useEffect(() => {
    if (!isViewOnly || viewMode !== 'full') return;
    if (!status) return; // ステータスが空の場合は何もしない
    
    console.log(`現在のステータス: ${status}, 前回のステータス: ${lastStatus || 'なし'}`);
    
    // ステータスが変更された場合のみ処理
    if (lastStatus && status !== lastStatus) {
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
    } else if (!lastStatus) {
      // 初期化時に現在のステータスを保存
      console.log(`初期ステータスを設定: ${status}`);
      setLastStatus(status);
    }
    
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [status, lastStatus, isViewOnly, viewMode]);
  
  // Socket.IOでステータス変更イベントを監視
  useEffect(() => {
    if (!isViewOnly || viewMode !== 'full' || !socket || !connected) return;
    
    console.log('Socket.IOステータス監視を開始しました');
    
    // ステータス更新イベント
    const handleStatusUpdate = (data: { status: string }) => {
      console.log(`Socket.IOイベント受信: status:update`, data);
      
      if (data.status) {
        console.log(`Socket.IOイベント: ステータス受信 - 現在:${data.status}, 前回:${lastStatus || 'なし'}`);
        
        if (!lastStatus || data.status !== lastStatus) {
          console.log(`Socket.IOイベント: ステータスが変更されました: ${lastStatus || '初期化'} → ${data.status}`);
          setLastStatus(data.status);
          
          // 連続リロードを防ぐため、少し遅延させてからリロード
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          
          reloadTimeoutRef.current = setTimeout(() => {
            console.log('ステータス変更によりページをリロードします...');
            window.location.reload();
          }, 1500);
        }
      }
    };
    
    // 初期状態受信イベント
    const handleInitialState = (data: { status?: string }) => {
      console.log('Socket.IOイベント受信: state', data);
      if (data.status) {
        console.log(`初期状態受信: ステータス=${data.status}`);
        setLastStatus(data.status);
      }
    };
    
    // イベントリスナー登録
    socket.on('status:update', handleStatusUpdate);
    socket.on('state', handleInitialState);
    
    // 接続時に現在の状態をリクエスト
    socket.emit('get:state');
    
    return () => {
      console.log('Socket.IOステータス監視を終了しました');
      socket.off('status:update', handleStatusUpdate);
      socket.off('state', handleInitialState);
    };
  }, [socket, connected, lastStatus, isViewOnly, viewMode]);
  
  // 全画面表示モードでのタイマー変更検知と自動リロード
  useEffect(() => {
    if (!isViewOnly || viewMode !== 'full') return;
    if (!currentTimer || !lastTimerId || currentTimer.id === lastTimerId) return;
    
    console.log(`タイマーが変更されました: ${lastTimerId} → ${currentTimer.id}`);
    setLastTimerId(currentTimer.id);
    
    // 連続リロードを防ぐため、少し遅延させてからリロード
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }
    
    reloadTimeoutRef.current = setTimeout(() => {
      console.log('タイマー変更によりページをリロードします...');
      window.location.reload();
    }, 1500);
    
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [currentTimer, lastTimerId, isViewOnly, viewMode]);
  
  // Socket.IOイベントリスナーの設定
  useEffect(() => {
    if (!isViewOnly || viewMode !== 'full' || !socket || !connected) return;
    
    // タイマー更新イベント
    const handleTimerUpdate = (data: { timer: TimerSettings }) => {
      if (lastTimerId && data.timer && data.timer.id !== lastTimerId) {
        console.log(`Socket.IOイベント: タイマーが変更されました: ${lastTimerId} → ${data.timer.id}`);
        
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
    
    socket.on('timer:update', handleTimerUpdate);
    
    return () => {
      socket.off('timer:update', handleTimerUpdate);
      
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [socket, connected, lastTimerId, isViewOnly, viewMode]);

  return (
    <div className={`min-h-screen ${isViewOnly ? getBackgroundColorByStatus(status) : 'bg-gradient-to-br from-gray-900 to-blue-900'} text-gray-100 transition-colors duration-500`}>
      {isViewOnly ? (
        viewMode === 'full' ? (
          // 全画面表示モード
          <div className="flex flex-col h-[100vh] relative">
            {/* フルスクリーン切り替えボタン */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 shadow-lg border border-white/20"
              title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン表示'}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
            {/* ヘッダーエリア */}
            <div className="py-8 text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                {customTitle || 'イベントタイマー'}
              </h1>
              <div className="mt-6">
                <StatusDisplay 
                  status={status} 
                  size="lg" 
                />
              </div>
            </div>
            
            {/* メインエリア - タイマー */}
            <div className="flex-grow flex items-center justify-center">
              {currentTimer && (
                <div className="transform scale-[2.5] mt-4 mb-4 p-6 rounded-xl backdrop-blur-md bg-black/30 shadow-lg border border-white/10">
                  <CountdownTimer timer={currentTimer} />
                </div>
              )}
            </div>
            
            {/* フッターエリア - メッセージ */}
            <div className="py-8 text-center">
              {customMessage ? (
                <div className="transform scale-[1.5]">
                  <h2 className="text-2xl md:text-3xl font-medium text-center px-6 py-4 rounded-lg inline-block bg-black/40 backdrop-blur-md border border-white/10 shadow-md">
                    {customMessage}
                  </h2>
                </div>
              ) : currentTimer && currentTimer.message ? (
                <div className="transform scale-[1.5]">
                  <h2 
                    className="text-2xl md:text-3xl font-medium text-center px-6 py-4 rounded-lg inline-block"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {currentTimer.message}
                  </h2>
                </div>
              ) : (
                <TimerMessage 
                  message={messages && messages.length > 0 ? messages[0] : null} 
                  className="shadow-md"
                />
              )}
            </div>
          </div>
        ) : (
          // 通常ビューモード
          <div className="flex flex-col h-[100vh] relative">
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
            {/* ヘッダーエリア */}
            <div className="py-6 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {customTitle || 'イベントタイマー'}
              </h1>
              <div className="mt-4">
                <StatusDisplay 
                  status={status} 
                  size="lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
              {/* 左カラム */}
              <div className="flex flex-col gap-8">
                {/* 時計 */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 flex flex-col items-center border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">現在時刻</h2>
                  <ServerClock size="lg" />
                  <CurrentDateTime />
                </div>

                {/* ステータス */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 flex flex-col items-center border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">イベントステータス</h2>
                  <StatusDisplay 
                    status={status} 
                    size="lg"
                  />
                </div>
              </div>

              {/* 右カラム */}
              <div className="flex flex-col gap-8">
                {/* 来場者数 */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 flex flex-col items-center border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">来場者数</h2>
                  <VisitorCounter 
                    count={visitorCount} 
                    size="lg"
                  />
                </div>

                {/* タイマー */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">タイマー</h2>
                  {currentTimer ? (
                    <CountdownTimer timer={currentTimer} />
                  ) : (
                    <p className="text-center text-gray-300">タイマーが設定されていません</p>
                  )}
                </div>
                
                {/* メッセージ表示 */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">メッセージ</h2>
                  {customMessage ? (
                    <div className="text-center">
                      <p className="text-xl font-medium px-4 py-2 bg-black/30 rounded-md inline-block border border-white/10">
                        {customMessage}
                      </p>
                    </div>
                  ) : (
                    <TimerMessage 
                      message={messages && messages.length > 0 ? messages[0] : null} 
                      className="shadow-md"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        // 管理画面モード
        <div className="container mx-auto px-4 py-8">
          <header className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 mb-8 border border-white/10">
            <h1 className="text-3xl font-bold text-center text-white">イベントタイマー管理</h1>
            <div className="mt-4 flex justify-center">
              <ConnectionStatus isConnected={connected} />
            </div>
          </header>

          <main>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 左カラム */}
              <div className="flex flex-col gap-8">
                {/* 時計 */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 flex flex-col items-center border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">現在時刻</h2>
                  <ServerClock size="lg" />
                  <CurrentDateTime />
                </div>

                {/* ステータス */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 flex flex-col items-center border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">イベントステータス</h2>
                  <StatusDisplay 
                    status={status} 
                    size="lg"
                  />
                </div>
              </div>

              {/* 右カラム */}
              <div className="flex flex-col gap-8">
                {/* 来場者数 */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 flex flex-col items-center border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">来場者数</h2>
                  <VisitorCounter 
                    count={visitorCount} 
                    size="lg"
                  />
                </div>

                {/* タイマー */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">タイマー</h2>
                  {currentTimer ? (
                    <CountdownTimer timer={currentTimer} />
                  ) : (
                    <p className="text-center text-gray-300">タイマーが設定されていません</p>
                  )}
                </div>
                
                {/* ダッシュボードリンク */}
                <div className="bg-black/40 backdrop-blur-md rounded-lg shadow-md p-6 border border-white/10">
                  <h2 className="text-xl font-semibold mb-4 text-white">管理メニュー</h2>
                  <div className="flex flex-col gap-4">
                    <a 
                      href="/dashboard" 
                      className="bg-blue-600/80 hover:bg-blue-700/90 text-white font-medium py-2 px-4 rounded-md text-center transition-all duration-200 shadow-sm border border-white/10"
                    >
                      管理ダッシュボード
                    </a>
                    <a 
                      href="/staff" 
                      className="bg-green-600/80 hover:bg-green-700/90 text-white font-medium py-2 px-4 rounded-md text-center transition-all duration-200 shadow-sm border border-white/10"
                    >
                      スタッフページ
                    </a>
                    <a 
                      href="/timer" 
                      className="bg-purple-600/80 hover:bg-purple-700/90 text-white font-medium py-2 px-4 rounded-md text-center transition-all duration-200 shadow-sm border border-white/10"
                    >
                      タイマー管理画面
                    </a>
                    <a 
                      href="/?mode=view" 
                      className="bg-green-600/80 hover:bg-green-700/90 text-white font-medium py-2 px-4 rounded-md text-center transition-all duration-200 shadow-sm border border-white/10"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ビューモードで開く
                    </a>
                    <a 
                      href="/?mode=full" 
                      className="bg-teal-600/80 hover:bg-teal-700/90 text-white font-medium py-2 px-4 rounded-md text-center transition-all duration-200 shadow-sm border border-white/10"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        // リンクを開いた後、ユーザーにフルスクリーンボタンをクリックするよう案内
                        setTimeout(() => {
                          alert('フルスクリーン表示にするには、画面右上のフルスクリーンボタンをクリックしてください。または F キーを押してください。');
                        }, 1000);
                      }}
                    >
                      タイトル・メッセージ付き全画面表示
                    </a>
                  </div>
                  
                  {/* カスタムタイトル・メッセージ入力エリア */}
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="text-lg font-semibold mb-3 text-white">カスタム表示設定</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="customTitle" className="block text-sm font-medium mb-1 text-gray-200">カスタムタイトル</label>
                        <input
                          type="text"
                          id="customTitle"
                          className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-md text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all"
                          placeholder="イベントタイトルを入力"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="customMessage" className="block text-sm font-medium mb-1 text-gray-200">カスタムメッセージ</label>
                        <textarea
                          id="customMessage"
                          className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-md text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all"
                          placeholder="表示したいメッセージを入力"
                          rows={2}
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={`/?mode=view&title=${encodeURIComponent(customTitle)}&message=${encodeURIComponent(customMessage)}`}
                          className="bg-green-600/80 hover:bg-green-700/90 text-white font-medium py-2 px-4 rounded-md text-center flex-1 transition-all duration-200 shadow-sm border border-white/10"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          カスタムビューモード
                        </a>
                        <a 
                          href={`/?mode=full&title=${encodeURIComponent(customTitle)}&message=${encodeURIComponent(customMessage)}`}
                          className="bg-teal-600/80 hover:bg-teal-700/90 text-white font-medium py-2 px-4 rounded-md text-center flex-1 transition-all duration-200 shadow-sm border border-white/10"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            // リンクを開いた後、ユーザーにフルスクリーンボタンをクリックするよう案内
                            setTimeout(() => {
                              alert('フルスクリーン表示にするには、画面右上のフルスクリーンボタンをクリックしてください。または F キーを押してください。');
                            }, 1000);
                          }}
                        >
                          カスタム全画面表示
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <footer className="bg-black/40 backdrop-blur-md shadow-inner p-4 mt-8 border-t border-white/10 rounded-lg">
            <div className="container mx-auto text-center text-sm text-gray-300">
              <p className="font-medium">{new Date().getFullYear()} イベントタイマー</p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
