import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

interface StatusHistoryItem {
  id: string;
  staff_id: string;
  status: string;
  custom_status: string | null;
  created_at: string;
  display_name: string;
}

export default function StaffHistoryPanel() {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ステータスに応じた背景色を取得
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case '出発前': return 'bg-gray-100';
      case '出発OK': return 'bg-green-100';
      case '到着': return 'bg-blue-100';
      case '勤務中': return 'bg-indigo-100';
      case '業務終了': return 'bg-purple-100';
      case 'カスタム': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  };

  // 日時のフォーマット（秒数まで表示）
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const { session } = useAuth();

  // ステータス履歴を取得
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('ステータス履歴を取得中...');
        
        // 認証情報を送信（クッキー＋ヘッダー）
        const token = session?.access_token || localStorage.getItem('auth_token');
        const response = await fetch('/api/staff/history', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const responseText = await response.text();
        
        // レスポンスがJSONでない場合のエラーハンドリング
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('レスポンスのJSON解析エラー:', responseText);
          throw new Error('サーバーからのレスポンスが不正です');
        }
        
        if (!response.ok) {
          console.error('ステータス履歴取得エラー:', data);
          throw new Error(data.error || `ステータス履歴の取得に失敗しました (${response.status})`);
        }
        
        console.log('取得した履歴データ:', data);
        setHistory(data.history || []);
      } catch (err) {
        console.error('ステータス履歴取得エラー:', err);
        setError(err instanceof Error ? err.message : 'ステータス履歴の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">今日のステータス履歴</h2>
      
      {isLoading ? (
        <p className="text-center py-4">読み込み中...</p>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : history.length === 0 ? (
        <p className="text-center py-4">今日のステータス更新履歴はありません</p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div 
              key={item.id} 
              className={`p-3 rounded-md ${getStatusBgColor(item.status)} flex justify-between items-center`}
            >
              <div>
                <span className="font-medium">
                  {item.status === 'カスタム' && item.custom_status ? item.custom_status : item.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {formatTime(item.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
