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
