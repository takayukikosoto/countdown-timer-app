import React, { useState } from 'react';
import { useVisitorCount } from '@/hooks/useVisitorCount_fixed';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface VisitorCounterAdminProps {
  className?: string;
}

export default function VisitorCounterAdmin({ className = '' }: VisitorCounterAdminProps) {
  const { count, loading, error, incrementCount, resetCount, refreshCount } = useVisitorCount();
  const [incrementValue, setIncrementValue] = useState<number>(1);

  // 入力値の変更を処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setIncrementValue(value);
    } else {
      setIncrementValue(1);
    }
  };

  // 来場者数を増加
  const handleIncrement = () => {
    incrementCount(incrementValue);
  };

  // 来場者数を減少
  const handleDecrement = () => {
    if (count >= incrementValue) {
      incrementCount(-incrementValue);
    }
  };

  // 来場者数をリセット
  const handleReset = () => {
    if (window.confirm('来場者数をリセットしますか？')) {
      resetCount();
    }
  };

  // 3桁ごとにカンマを入れる
  const formattedCount = count.toLocaleString('ja-JP');

  return (
    <div className={`p-4 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 shadow-lg ${className}`}>
      <h2 className="text-xl font-bold mb-4 text-white">来場者数管理</h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 p-2 rounded mb-4">
          エラー: {error}
        </div>
      )}
      
      <div className="flex flex-col space-y-4">
        {/* 現在の来場者数表示 */}
        <div className="bg-black/30 p-4 rounded-lg text-center">
          <div className="text-sm text-gray-300 mb-1">現在の来場者数</div>
          <div className="text-4xl font-bold text-white">
            {loading ? '読込中...' : formattedCount}
            <span className="text-gray-300 ml-1 text-opacity-80 text-2xl">人</span>
          </div>
        </div>
        
        {/* 操作コントロール */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="bg-red-500/20 hover:bg-red-500/40 border-red-500/50"
            onClick={handleDecrement}
            disabled={loading || count < incrementValue}
          >
            <Minus className="w-5 h-5 mr-1" />
            減少
          </Button>
          
          <Input
            type="number"
            min="1"
            value={incrementValue}
            onChange={handleInputChange}
            className="text-center bg-white/10 border-white/20 text-white"
          />
          
          <Button 
            variant="outline" 
            className="bg-green-500/20 hover:bg-green-500/40 border-green-500/50"
            onClick={handleIncrement}
            disabled={loading}
          >
            <Plus className="w-5 h-5 mr-1" />
            増加
          </Button>
        </div>
        
        {/* リセットボタン */}
        <Button 
          variant="outline" 
          className="bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/50 mt-2"
          onClick={handleReset}
          disabled={loading}
        >
          <RotateCcw className="w-5 h-5 mr-1" />
          リセット
        </Button>
        
        {/* 更新ボタン */}
        <Button 
          variant="outline" 
          className="bg-purple-500/20 hover:bg-purple-500/40 border-purple-500/50"
          onClick={refreshCount}
          disabled={loading}
        >
          最新の情報に更新
        </Button>
      </div>
    </div>
  );
}
