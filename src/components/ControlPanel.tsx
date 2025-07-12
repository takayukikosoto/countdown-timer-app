import React, { useState } from 'react';

interface ControlPanelProps {
  onStatusChange: (status: string) => void;
  onVisitorIncrement: (increment: number) => void;
  currentStatus: string;
  className?: string;
}

export default function ControlPanel({
  onStatusChange,
  onVisitorIncrement,
  currentStatus,
  className = ''
}: ControlPanelProps) {
  // カスタムステータス入力用
  const [customStatus, setCustomStatus] = useState('');
  // カスタム増加数入力用
  const [customIncrement, setCustomIncrement] = useState(1);

  // 定義済みステータスカテゴリー
  const statusCategories = [
    {
      name: '基本ステータス',
      statuses: [
        '受付中',
        '準備中',
        '開始前',
        '開催中',
        '休憩中',
        '終了'
      ]
    },
    {
      name: 'セッションステータス',
      statuses: [
        'セッション中',
        'ワークショップ中',
        'パネルディスカッション',
        '質疑応答',
        '特別セッション'
      ]
    },
    {
      name: '休憩ステータス',
      statuses: [
        'ネットワーキング',
        'ランチタイム',
        'コーヒーブレイク'
      ]
    },
    {
      name: '特殊ステータス',
      statuses: [
        'オープニング',
        'クロージング',
        '急病時間'
      ]
    }
  ];
  
  // すべてのステータスをフラットな配列に変換
  const allStatuses = statusCategories.flatMap(category => category.statuses);

  // 定義済み増加数
  const predefinedIncrements = [1, 5, 10, -1];

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-bold mb-4">スタッフコントロール</h2>
      
      {/* ステータス変更セクション */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">ステータス変更</h3>
        
        {/* カテゴリー別にステータスを表示 */}
        {statusCategories.map((category) => (
          <div key={category.name} className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">{category.name}</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {category.statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  className={`px-3 py-1 rounded-md ${
                    currentStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
        
        
        {/* カスタムステータス入力 */}
        <div className="flex mt-2">
          <input
            type="text"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="カスタムステータス"
            className="flex-1 px-3 py-1 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (customStatus.trim()) {
                onStatusChange(customStatus.trim());
                setCustomStatus('');
              }
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
          >
            設定
          </button>
        </div>
      </div>
      
      {/* 来場者数変更セクション */}
      <div>
        <h3 className="text-lg font-semibold mb-2">来場者数変更</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {predefinedIncrements.map((increment) => (
            <button
              key={increment}
              onClick={() => onVisitorIncrement(increment)}
              className={`px-3 py-1 rounded-md ${
                increment >= 0
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {increment >= 0 ? `+${increment}` : increment}
            </button>
          ))}
        </div>
        
        {/* カスタム増加数入力 */}
        <div className="flex mt-2">
          <input
            type="number"
            value={customIncrement}
            onChange={(e) => setCustomIncrement(parseInt(e.target.value) || 0)}
            className="w-20 px-3 py-1 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => onVisitorIncrement(customIncrement)}
            className="px-3 py-1 bg-green-500 text-white rounded-r-md hover:bg-green-600"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
