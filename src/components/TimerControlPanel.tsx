'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { TimerSettings, TimerType } from '@/lib/countdownTimerSupabase';

interface TimerControlPanelProps {
  className?: string;
}

export default function TimerControlPanel({ className = '' }: TimerControlPanelProps) {
  const { socket, connected } = useSocket();
  const [currentTimer, setCurrentTimer] = useState<TimerSettings | null>(null);
  const [timerList, setTimerList] = useState<TimerSettings[]>([]);
  const [newTimerForm, setNewTimerForm] = useState({
    title: '',
    duration: 5,
    type: 'countdown' as TimerType,
    showSeconds: true,
    message: ''
  });
  const [isCreatingTimer, setIsCreatingTimer] = useState(false);

  // タイマー情報を取得
  useEffect(() => {
    if (!socket || !connected) return;

    // 現在のタイマー情報を取得
    socket.emit('timer:get-current', {}, (response: { timer: TimerSettings | null }) => {
      setCurrentTimer(response.timer);
    });

    // タイマーリストを取得
    socket.emit('timer:get-list', {}, (response: { timers: TimerSettings[] }) => {
      setTimerList(response.timers);
    });

    // タイマー更新イベントのリスナー
    const handleTimerUpdate = (data: { timer: TimerSettings }) => {
      setCurrentTimer(data.timer);
      
      // リストも更新
      setTimerList(prev => {
        const index = prev.findIndex(t => t.id === data.timer.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data.timer;
          return updated;
        }
        return [...prev, data.timer];
      });
    };

    // タイマー削除イベントのリスナー
    const handleTimerDelete = (data: { timerId: string }) => {
      if (currentTimer?.id === data.timerId) {
        setCurrentTimer(null);
      }
      
      setTimerList(prev => prev.filter(t => t.id !== data.timerId));
    };

    socket.on('timer:update', handleTimerUpdate);
    socket.on('timer:delete', handleTimerDelete);

    return () => {
      socket.off('timer:update', handleTimerUpdate);
      socket.off('timer:delete', handleTimerDelete);
    };
  }, [socket, connected, currentTimer?.id]);

  // タイマーを開始
  const handleStartTimer = (timerId: string) => {
    if (!socket || !connected) return;
    socket.emit('timer:start', { timerId });
  };

  // タイマーを一時停止
  const handlePauseTimer = (timerId: string) => {
    if (!socket || !connected) return;
    socket.emit('timer:pause', { timerId });
  };

  // タイマーをリセット
  const handleResetTimer = (timerId: string) => {
    if (!socket || !connected) return;
    socket.emit('timer:reset', { timerId });
  };

  // タイマーを選択（現在のタイマーに設定）
  const handleSelectTimer = (timerId: string) => {
    if (!socket || !connected) return;
    socket.emit('timer:select', { timerId });
  };

  // タイマーを削除
  const handleDeleteTimer = (timerId: string) => {
    if (!socket || !connected) return;
    socket.emit('timer:delete', { timerId });
  };

  // 新しいタイマーを作成
  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !connected) return;

    const durationMs = newTimerForm.duration * 60 * 1000; // 分をミリ秒に変換
    
    socket.emit('timer:create', {
      title: newTimerForm.title || 'カウントダウン',
      type: newTimerForm.type,
      duration: durationMs,
      showSeconds: newTimerForm.showSeconds,
      message: newTimerForm.message
    }, () => {
      // フォームをリセット
      setNewTimerForm({
        title: '',
        duration: 5,
        type: 'countdown' as TimerType,
        showSeconds: true,
        message: ''
      });
      setIsCreatingTimer(false);
    });
  };

  // タイマー状態に応じたボタン表示
  const renderTimerControls = (timer: TimerSettings) => {
    const isCurrentTimer = currentTimer?.id === timer.id;
    
    return (
      <div className="flex space-x-2">
        {timer.state === 'running' ? (
          <button
            onClick={() => handlePauseTimer(timer.id)}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            一時停止
          </button>
        ) : (
          <button
            onClick={() => handleStartTimer(timer.id)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            開始
          </button>
        )}
        
        <button
          onClick={() => handleResetTimer(timer.id)}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          リセット
        </button>
        
        {!isCurrentTimer && (
          <button
            onClick={() => handleSelectTimer(timer.id)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            選択
          </button>
        )}
        
        <button
          onClick={() => handleDeleteTimer(timer.id)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          削除
        </button>
      </div>
    );
  };

  // タイマー種類の表示名
  const getTimerTypeName = (type: TimerType): string => {
    switch (type) {
      case 'countdown': return 'カウントダウン';
      case 'countup': return 'カウントアップ';
      case 'clock': return '時計';
      default: return '不明';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      <h2 className="text-xl font-bold mb-4">タイマー管理</h2>
      
      {/* 接続状態の表示 */}
      {!connected && (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          サーバーに接続されていません。再接続してください。
        </div>
      )}
      
      {/* 現在のタイマー情報 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">現在のタイマー</h3>
        {currentTimer ? (
          <div className="p-3 border rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{currentTimer.title}</span>
              <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {getTimerTypeName(currentTimer.type)}
              </span>
            </div>
            {renderTimerControls(currentTimer)}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            タイマーが選択されていません
          </div>
        )}
      </div>
      
      {/* タイマーリスト */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">タイマーリスト</h3>
          <button
            onClick={() => setIsCreatingTimer(!isCreatingTimer)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isCreatingTimer ? 'キャンセル' : '新規作成'}
          </button>
        </div>
        
        {/* 新規タイマー作成フォーム */}
        {isCreatingTimer && (
          <form onSubmit={handleCreateTimer} className="mb-4 p-3 border rounded">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input
                type="text"
                value={newTimerForm.title}
                onChange={(e) => setNewTimerForm({...newTimerForm, title: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700"
                placeholder="タイマーのタイトル"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">タイプ</label>
              <select
                value={newTimerForm.type}
                onChange={(e) => setNewTimerForm({...newTimerForm, type: e.target.value as TimerType})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700"
              >
                <option value="countdown">カウントダウン</option>
                <option value="countup">カウントアップ</option>
                <option value="clock">時計</option>
              </select>
            </div>
            
            {newTimerForm.type !== 'clock' && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">時間（分）</label>
                <input
                  type="number"
                  value={newTimerForm.duration}
                  onChange={(e) => setNewTimerForm({...newTimerForm, duration: parseInt(e.target.value) || 5})}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700"
                  min="1"
                  max="180"
                />
              </div>
            )}
            
            <div className="mb-3 flex items-center">
              <input
                type="checkbox"
                id="showSeconds"
                checked={newTimerForm.showSeconds}
                onChange={(e) => setNewTimerForm({...newTimerForm, showSeconds: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="showSeconds" className="text-sm">秒を表示</label>
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">メッセージ（オプション）</label>
              <textarea
                value={newTimerForm.message}
                onChange={(e) => setNewTimerForm({...newTimerForm, message: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700"
                rows={2}
                placeholder="タイマーと一緒に表示するメッセージ"
              />
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              タイマーを作成
            </button>
          </form>
        )}
        
        {/* タイマーリスト表示 */}
        {timerList.length > 0 ? (
          <div className="space-y-2">
            {timerList.map(timer => (
              <div key={timer.id} className="p-3 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{timer.title}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      {getTimerTypeName(timer.type)}
                    </span>
                    {currentTimer?.id === timer.id && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        現在選択中
                      </span>
                    )}
                  </div>
                </div>
                {renderTimerControls(timer)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            タイマーがありません
          </div>
        )}
      </div>
    </div>
  );
}
