import React from 'react';
import { useTimerData } from '@/hooks/useTimerData';

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
  hasTimerData?: boolean;
}

export default function ConnectionStatus({
  isConnected,
  className = '',
  hasTimerData
}: ConnectionStatusProps) {
  // タイマーデータの状態を取得
  const { loading, currentTimer, error } = useTimerData();
  
  // タイマーデータの接続状態を確認
  const timerDataAvailable = hasTimerData !== undefined ? hasTimerData : (currentTimer !== null && !error);
  
  // 接続状態の判定
  const getConnectionStatus = () => {
    if (!isConnected) {
      return { color: 'bg-red-500', text: 'オフライン - 再接続中...' };
    }
    
    if (loading) {
      return { color: 'bg-yellow-500', text: '接続中...' };
    }
    
    if (isConnected && timerDataAvailable) {
      return { color: 'bg-green-500', text: '接続OK' };
    }
    
    return { color: 'bg-yellow-500', text: '接続中...' };
  };
  
  const status = getConnectionStatus();
  
  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`w-3 h-3 rounded-full mr-2 ${status.color}`}
      />
      <span className="text-sm">
        {status.text}
      </span>
    </div>
  );
}
