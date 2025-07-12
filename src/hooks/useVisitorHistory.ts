import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface VisitorHistoryItem {
  id: string;
  count: number;
  event_date: string;
  updated_at: string;
  created_at: string;
}

export const useVisitorHistory = (days: number = 7) => {
  const [history, setHistory] = useState<VisitorHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 来場者数の履歴を取得
  const fetchVisitorHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      // 指定した日数分の履歴を取得
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .order('event_date', { ascending: false });
      
      if (error) {
        console.error('来場者数履歴の取得エラー:', error);
        setError(error.message);
        return;
      }
      
      if (data) {
        setHistory(data as VisitorHistoryItem[]);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('来場者数履歴の取得中にエラーが発生しました:', err);
      setError('来場者数履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [days, setLoading, setError, setHistory]);

  // 特定の期間の来場者数履歴を取得
  const fetchVisitorHistoryByPeriod = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .order('event_date', { ascending: false });
      
      if (error) {
        console.error('来場者数履歴の取得エラー:', error);
        setError(error.message);
        return;
      }
      
      if (data) {
        setHistory(data as VisitorHistoryItem[]);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('来場者数履歴の取得中にエラーが発生しました:', err);
      setError('来場者数履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setHistory]);

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
      item.count > max.count ? item : max, history[0]);
    
    const minItem = history.reduce((min, item) => 
      item.count < min.count ? item : min, history[0]);
    
    return {
      total,
      average,
      max: maxItem.count,
      maxDate: maxItem.event_date,
      min: minItem.count,
      minDate: minItem.event_date
    };
  }, [history]);

  // 初期データを取得
  useEffect(() => {
    fetchVisitorHistory();
    
    // Supabaseのリアルタイムリスナーを設定
    const subscription = supabase
      .channel('visitors-history-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'visitors' 
        }, 
        () => {
          // データが変更されたら再取得
          fetchVisitorHistory();
        }
      )
      .subscribe();
    
    // クリーンアップ
    return () => {
      subscription.unsubscribe();
    };
  }, [days, fetchVisitorHistory]);

  return {
    history,
    loading,
    error,
    statistics: getStatistics(),
    getStatistics,
    refreshHistory: fetchVisitorHistory,
    fetchByPeriod: fetchVisitorHistoryByPeriod
  };
};
