"use client";

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/timeSync';

/**
 * クライアントサイドでのみ実行される現在時刻表示コンポーネント
 */
export default function CurrentDateTime() {
  const [dateTime, setDateTime] = useState<string>('');
  
  useEffect(() => {
    // 初期表示
    setDateTime(formatDateTime(Date.now()));
    
    // 1秒ごとに更新
    const interval = setInterval(() => {
      setDateTime(formatDateTime(Date.now()));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <p className="text-sm text-gray-500 mt-2">
      {dateTime}
    </p>
  );
}
