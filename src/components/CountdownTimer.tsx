'use client';

import React, { useState, useEffect } from 'react';
import { TimerSettings, TimerMessage } from '@/lib/countdownTimerSupabase';
import { useSocket } from '@/contexts/SocketContext';

interface CountdownTimerProps {
  timer: TimerSettings;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'ultra' | 'mobile';
  onComplete?: () => void;
  message?: TimerMessage | null;
}

export default function CountdownTimer({
  timer,
  className = '',
  size = 'lg',
  onComplete,
  message
}: CountdownTimerProps) {
  const [displayTime, setDisplayTime] = useState<string>('--:--');
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionColor, setActionColor] = useState<string | null>(null);
  const [actionFlash, setActionFlash] = useState<boolean>(false);
  
  // Socket.IOからのタイマーアクションイベントを受信
  const { socket: socketContext, connected } = useSocket();

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
    xl: 'text-9xl',
    ultra: 'text-[9rem] md:text-[12rem] lg:text-[15rem]', // 超大型表示用（75%サイズ）
    mobile: 'text-[8rem] md:text-[10rem]' // モバイル用大型表示
  };

  useEffect(() => {
    // タイマーの表示を更新する関数
    const updateDisplay = () => {
      if (!timer) return;

      let timeToDisplay: number;
      let formattedTime: string;
      
      if (timer.type === 'countdown') {
        timeToDisplay = getRemainingTime(timer);
        const showHours = timer.duration > 3600000; // 1時間以上なら時間も表示
        formattedTime = formatTime(timeToDisplay, showHours, timer.showSeconds);
        
        // 残り時間がなくなったらオーバータイム
        if (timeToDisplay <= 0 && timer.state === 'running') {
          setIsOvertime(true);
          if (onComplete) onComplete();
        } else {
          setIsOvertime(timer.mode === 'overtime');
        }
      } else if (timer.type === 'countup') {
        timeToDisplay = getElapsedTime(timer);
        const showHours = timeToDisplay > 3600000; // 1時間以上なら時間も表示
        formattedTime = formatTime(timeToDisplay, showHours, timer.showSeconds);
        
        // 設定時間を超えたらオーバータイム
        if (timeToDisplay > timer.duration && timer.state === 'running') {
          setIsOvertime(true);
        } else {
          setIsOvertime(timer.mode === 'overtime');
        }
      } else {
        // 時計モード
        const now = new Date();
        formattedTime = now.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          second: timer.showSeconds ? '2-digit' : undefined,
          hour12: false
        });
        setIsOvertime(false);
      }
      
      setDisplayTime(formattedTime);
    };
    
    // クライアント側でタイマー計算関数を実装
    function getRemainingTime(timer: TimerSettings): number {
      if (timer.state === 'idle' || !timer.endTime) {
        return timer.duration;
      }
      
      if (timer.state === 'paused' && timer.elapsedTime !== undefined) {
        return timer.duration - timer.elapsedTime;
      }
      
      const now = Date.now();
      const remaining = timer.endTime - now;
      
      return Math.max(0, remaining);
    }
    
    function getElapsedTime(timer: TimerSettings): number {
      if (timer.state === 'idle') {
        return 0;
      }
      
      if (timer.state === 'paused' && timer.elapsedTime !== undefined) {
        return timer.elapsedTime;
      }
      
      if (!timer.startTime) {
        return 0;
      }
      
      const now = Date.now();
      return now - timer.startTime;
    }
    
    function formatTime(ms: number, showHours = true, showSeconds = true): string {
      if (ms < 0) ms = 0;
      
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      let result = '';
      
      if (showHours || hours > 0) {
        result += `${hours.toString().padStart(2, '0')}:`;
      }
      
      result += `${minutes.toString().padStart(2, '0')}`;
      
      if (showSeconds) {
        result += `:${seconds.toString().padStart(2, '0')}`;
      }
      
      return result;
    }

    // 初期表示
    updateDisplay();
    
    // 100ミリ秒ごとに更新
    const intervalId = setInterval(updateDisplay, 100);
    
    return () => clearInterval(intervalId);
  }, [timer, onComplete]);

  useEffect(() => {
    if (!connected) return;
    
    // 既存のSocketインスタンスがない場合は処理をスキップ
    if (!socketContext) return;
    
    // タイマーアクション実行イベントのリスナー
    const handleActionExecuted = (data: {
      actionId: string;
      timerId: string;
      actionType: string;
      message?: string;
      color?: string;
      flash?: boolean;
    }) => {
      // 現在のタイマーに関連するアクションのみ処理
      if (data.timerId === timer.id) {
        // アクションタイプに応じて処理
        if (data.actionType === 'message' || data.actionType === 'both') {
          setActionMessage(data.message || null);
          setActionFlash(data.flash || false);
          
          // メッセージのみの場合は10秒後に消去
          if (data.actionType === 'message') {
            setTimeout(() => {
              setActionMessage(null);
              setActionFlash(false);
            }, 10000);
          }
        }
        
        if (data.actionType === 'color' || data.actionType === 'both') {
          setActionColor(data.color || null);
        }
      }
    };
    
    // タイマーリセットイベントのリスナー
    const handleTimerReset = (data: { timerId: string }) => {
      if (data.timerId === timer.id) {
        // タイマーがリセットされたらアクション効果もリセット
        setActionMessage(null);
        setActionColor(null);
        setActionFlash(false);
      }
    };
    
    // イベントリスナーを登録
    socketContext.on('timer:action:executed', handleActionExecuted);
    socketContext.on('timer:reset', handleTimerReset);
    
    // クリーンアップ関数
    return () => {
      socketContext.off('timer:action:executed', handleActionExecuted);
      socketContext.off('timer:reset', handleTimerReset);
    };
  }, [connected, socketContext, timer.id]);

  // タイマーの状態に応じたスタイル
  const getTimerStyle = () => {
    // アクションによる色変更が優先
    if (actionColor) {
      return { color: actionColor };
    }
    
    if (timer.state === 'idle') {
      return { color: timer.color };
    }
    
    if (isOvertime) {
      return { color: timer.overtimeColor };
    }
    
    return { color: timer.color };
  };

  // カウントダウン表示用の分割関数
  const renderTimeSegment = (value: string, label: string) => {
    // サイズに応じたパディング
    const paddingClasses = {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
      xl: 'p-5',
      ultra: 'p-8',
      mobile: 'p-6'
    };
    
    // サイズに応じたラベルのクラス
    const labelClasses = {
      sm: 'text-xs mt-1',
      md: 'text-xs mt-1',
      lg: 'text-sm mt-2',
      xl: 'text-base mt-2',
      ultra: 'text-2xl mt-4',
      mobile: 'text-xl mt-3'
    };
    
    // サイズに応じた最小幅
    const minWidthValues = {
      sm: '70px',
      md: '90px',
      lg: '110px',
      xl: '140px',
      ultra: '320px',
      mobile: '200px'
    };
    
    
    return (
      <div className="flex flex-col items-center mx-2 md:mx-3 lg:mx-4 xl:mx-5">
        <div 
          className={`font-sans font-bold ${sizeClasses[size]} rounded-lg ${paddingClasses[size]} shadow-md`}
          style={{
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: minWidthValues[size],
            textAlign: 'center',
            fontWeight: 700
          }}
        >
          {value}
        </div>
        <div className={`${labelClasses[size]} font-medium opacity-90`}>{label}</div>
      </div>
    );
  };

  // 時間表示を分割して表示
  const renderFormattedTime = () => {
    if (!displayTime) return null;
    
    const parts = displayTime.split(':');
    const hasHours = parts.length === 3;
    
    // サイズに応じてコロンのスタイルを調整
    const colonClasses = {
      sm: 'text-3xl',
      md: 'text-4xl',
      lg: 'text-5xl',
      xl: 'text-6xl',
      ultra: 'text-[8rem]',
      mobile: 'text-[4rem]'
    };
    
    // コロンのスタイル
    const colonStyle = {
      color: '#ffffff',
      opacity: 0.8,
      fontWeight: 400
    };
    
    if (hasHours) {
      return (
        <div className="flex items-center justify-center">
          {renderTimeSegment(parts[0], '時')}
          <span className={`${colonClasses[size]} mx-1 md:mx-2`} style={colonStyle}>:</span>
          {renderTimeSegment(parts[1], '分')}
          <span className={`${colonClasses[size]} mx-1 md:mx-2`} style={colonStyle}>:</span>
          {renderTimeSegment(parts[2], '秒')}
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center">
          {renderTimeSegment(parts[0], '分')}
          <span className={`${colonClasses[size]} mx-1 md:mx-2`} style={colonStyle}>:</span>
          {renderTimeSegment(parts[1], '秒')}
        </div>
      );
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {timer.title && (
        <div className="text-xl font-bold mb-4 text-white">
          {timer.title}
        </div>
      )}
      
      {/* モダンなタイマー表示 */}
      <div className="relative p-3 rounded-xl backdrop-blur-sm bg-black/20">
        {renderFormattedTime()}
      </div>
      
      {/* タイマーメッセージ表示機能は削除 - 別コンポーネントで表示 */}
      
      {/* 新しいメッセージシステムからのメッセージ（優先表示） */}
      {message && (
        <div 
          className="mt-6 text-center px-6 py-3 rounded-lg font-medium text-xl shadow-md transition-all duration-300"
          style={{ 
            color: message.color || '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animation: message.flash ? 'pulse 1.5s infinite' : 'none',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {message.text}
        </div>
      )}
      
      {/* タイマーアクションからのメッセージ（通常メッセージがない場合のみ表示） */}
      {!message && actionMessage && (
        <div 
          className="mt-6 text-center px-6 py-3 rounded-lg font-medium text-xl shadow-md transition-all duration-300"
          style={{ 
            color: actionColor || '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            animation: actionFlash ? 'pulse 1.5s infinite' : 'none',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {actionMessage}
        </div>
      )}
    </div>
  );
}
