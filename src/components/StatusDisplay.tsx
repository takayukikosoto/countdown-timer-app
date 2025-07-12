import React from 'react';

interface StatusDisplayProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function StatusDisplay({ 
  status, 
  className = '',
  size = 'lg'
}: StatusDisplayProps) {
  // ステータスに応じた背景色とグラデーションを設定
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      // 基本ステータス
      case '受付中':
        return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case '準備中':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500';
      case '終了':
        return 'bg-gradient-to-r from-red-500 to-rose-600';
      case '休憩中':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case '開催中':
        return 'bg-gradient-to-r from-purple-500 to-violet-600';
      case '開始前':
        return 'bg-gradient-to-r from-cyan-500 to-blue-600';
        
      // 拡張ステータス
      case 'セッション中':
        return 'bg-gradient-to-r from-fuchsia-500 to-purple-600';
      case 'ワークショップ中':
        return 'bg-gradient-to-r from-pink-500 to-rose-500';
      case 'パネルディスカッション':
        return 'bg-gradient-to-r from-orange-400 to-amber-600';
      case '質疑応答':
        return 'bg-gradient-to-r from-lime-500 to-green-600';
      case 'ネットワーキング':
        return 'bg-gradient-to-r from-teal-400 to-cyan-600';
      case 'ランチタイム':
        return 'bg-gradient-to-r from-amber-400 to-orange-500';
      case 'コーヒーブレイク':
        return 'bg-gradient-to-r from-stone-400 to-amber-700';
      case 'クロージング':
        return 'bg-gradient-to-r from-sky-500 to-indigo-500';
      case 'オープニング':
        return 'bg-gradient-to-r from-indigo-400 to-violet-600';
      case '特別セッション':
        return 'bg-gradient-to-r from-rose-400 to-red-600';
      case '急病時間':
        return 'bg-gradient-to-r from-red-600 to-rose-800';
        
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-600';
    }
  };

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'text-sm px-3 py-1',
    md: 'text-base px-4 py-1.5',
    lg: 'text-lg px-5 py-2',
    xl: 'text-xl px-6 py-2.5'
  };

  const bgColorClass = getStatusColor(status);

  return (
    <div className={`
      ${bgColorClass} 
      ${sizeClasses[size]} 
      text-white 
      font-medium 
      rounded-md 
      shadow-md 
      inline-block 
      tracking-wide
      transition-all duration-300
      backdrop-blur-sm
      border border-white/10
      ${className}
    `}>
      {status}
    </div>
  );
}
