import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { CalendarIcon } from 'lucide-react';

interface DateRangePickerProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export default function DateRangePicker({ onDateRangeChange, className = '' }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 終了日の時刻を23:59:59に設定して、その日全体を含める
    end.setHours(23, 59, 59, 999);
    
    onDateRangeChange(start, end);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // プリセット期間の設定
  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className={`relative ${className}`}>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span>
          {formatDisplayDate(startDate)} 〜 {formatDisplayDate(endDate)}
        </span>
        <CalendarIcon className="h-4 w-4 ml-2" />
      </Button>
      
      {isOpen && (
        <Card className="absolute top-full mt-1 z-10 w-full">
          <CardContent className="p-3">
            <div className="space-y-3">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">開始日</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">終了日</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                <button 
                  onClick={() => setPresetRange(7)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                >
                  7日間
                </button>
                <button 
                  onClick={() => setPresetRange(14)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                >
                  14日間
                </button>
                <button 
                  onClick={() => setPresetRange(30)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                >
                  30日間
                </button>
                <button 
                  onClick={() => setPresetRange(90)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                >
                  90日間
                </button>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                >
                  キャンセル
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApply}
                >
                  適用
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
