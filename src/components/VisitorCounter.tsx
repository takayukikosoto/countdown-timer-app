import React from 'react';

interface VisitorCounterProps {
  count: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
}

export default function VisitorCounter({
  count,
  className = '',
  size = 'lg',
  label = '来場者数'
}: VisitorCounterProps) {
  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  // 3桁ごとにカンマを入れる
  const formattedCount = count.toLocaleString('ja-JP');

  return (
    <div className={`flex flex-col items-center ${className} bg-black/30 backdrop-blur-sm px-4 py-3 rounded-lg shadow-md border border-white/10`}>
      <div className={`${labelSizeClasses[size]} text-gray-300 mb-1 font-medium`}>
        {label}
      </div>
      <div className={`${sizeClasses[size]} font-bold font-sans text-white`}>
        {formattedCount}
        <span className="text-gray-300 ml-1 text-opacity-80">人</span>
      </div>
    </div>
  );
}
