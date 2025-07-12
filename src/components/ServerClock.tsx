import React, { useState, useEffect } from 'react';
import { formatTime, syncWithServerTime, getAdjustedTime, shouldSync } from '@/lib/timeSync';

interface ServerClockProps {
  className?: string;
  showSeconds?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ServerClock({ 
  className = '', 
  showSeconds = true,
  size = 'lg' 
}: ServerClockProps) {
  // 現在の表示時刻
  const [displayTime, setDisplayTime] = useState<string>('');
  // クライアントサイドでのレンダリングかどうか
  const [isClient, setIsClient] = useState(false);
  
  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl'
  };

  useEffect(() => {
    // クライアントサイドであることをマーク
    setIsClient(true);
    
    // 初回のサーバー時刻同期
    syncWithServerTime().then(() => {
      // 初期表示を設定
      setDisplayTime(formatTime(getAdjustedTime()));
    });

    // 表示更新用のインターバル (100ms)
    const displayInterval = setInterval(() => {
      setDisplayTime(formatTime(getAdjustedTime(), showSeconds));
    }, 100);

    // サーバー時刻再同期用のインターバル (30秒)
    const syncInterval = setInterval(() => {
      if (shouldSync()) {
        syncWithServerTime();
      }
    }, 5000);

    // ページがバックグラウンドから復帰した時に再同期
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithServerTime();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // クリーンアップ関数
    return () => {
      clearInterval(displayInterval);
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showSeconds]);

  // サーバーサイドレンダリング時は何も表示しない
  if (!isClient) {
    return <div className={`font-sans font-bold ${sizeClasses[size]} ${className}`}></div>;
  }
  
  return (
    <div 
      className={`font-sans font-bold ${sizeClasses[size]} ${className} p-4 rounded-lg`}
      style={{
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontWeight: 700
      }}
    >
      {displayTime}
    </div>
  );
}
