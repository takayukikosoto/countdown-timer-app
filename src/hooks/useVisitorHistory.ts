import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface VisitorHistoryItem {
  id: string;
  count: number;
  updated_at: string;
}

export const useVisitorHistory = (days: number = 7) => {
  const [history, setHistory] = useState<VisitorHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 来場者数の履歴を取得
  const fetchVisitorHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 指定した日数分の履歴を取得（updated_atを使用）
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      console.log('来場者数履歴取得開始:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      });
      
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString())
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('来場者数履歴の取得エラー - 詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          full_error: error
        });
        setError(error.message || 'データベースエラーが発生しました');
        return;
      }
      
      console.log('来場者数履歴取得成功:', { dataCount: data?.length || 0 });
      
      if (data) {
        setHistory(data as VisitorHistoryItem[]);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('来場者数履歴の取得中にエラーが発生しました - 詳細:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : '来場者数履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [days]);

  // 特定の期間の来場者数履歴を取得
  const fetchVisitorHistoryByPeriod = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('期間指定来場者数履歴取得開始:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString())
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('来場者数履歴の取得エラー - 詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          full_error: error
        });
        setError(error.message || 'データベースエラーが発生しました');
        return;
      }
      
      console.log('期間指定来場者数履歴取得成功:', { dataCount: data?.length || 0 });
      
      if (data) {
        setHistory(data as VisitorHistoryItem[]);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('来場者数履歴の取得中にエラーが発生しました - 詳細:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : '来場者数履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // 統計情報を計算
  const getStatistics = useCallback(() => {
    if (history.length === 0) {
      return {
        total: 0,
        average: 0,
        max: 0,
        maxDate: '',
        min: 0,
        minDate: ''
      };
    }

    const total = history.reduce((sum, item) => sum + item.count, 0);
    const average = Math.round(total / history.length);
    
    const maxItem = history.reduce((max, item) => 
      item.count > max.count ? item : max
    );
    
    const minItem = history.reduce((min, item) => 
      item.count < min.count ? item : min
    );

    return {
      total,
      average,
      max: maxItem.count,
      maxDate: maxItem.updated_at,
      min: minItem.count,
      minDate: minItem.updated_at
    };
  }, [history]);

  // 初回読み込み
  useEffect(() => {
    fetchVisitorHistory();
  }, [fetchVisitorHistory]);

  return {
    history,
    loading,
    error,
    fetchVisitorHistory,
    fetchVisitorHistoryByPeriod,
    getStatistics
  };
};
