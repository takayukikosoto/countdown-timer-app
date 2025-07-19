import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface VisitorHistoryItem {
  id: string;
  count: number;
  event_date?: string;  // オプショナルに変更
  updated_at: string;
  created_at: string;
}

interface VisitorStatistics {
  total: number;
  average: number;
  max: number;
  maxDate: string;
  min: number;
  minDate: string;
}

export const useVisitorHistory = (days: number = 7) => {
  const [history, setHistory] = useState<VisitorHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasEventDateColumn, setHasEventDateColumn] = useState<boolean | null>(null);
  const tableStructureChecked = useRef<boolean>(false);

  // テーブル構造を確認する関数
  const checkTableStructure = useCallback(async (): Promise<boolean> => {
    // 既にチェック済みの場合は保存された値を返す
    if (tableStructureChecked.current && hasEventDateColumn !== null) {
      return hasEventDateColumn;
    }

    try {
      console.log('テーブル構造確認中...');
      const { data: tableInfo, error: tableError } = await supabase
        .from('visitors')
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.error('テーブル構造確認エラー:', tableError);
        throw new Error('テーブル構造の確認に失敗しました: ' + tableError.message);
      }
      
      // テーブルにevent_dateカラムがあるか確認
      const hasEventDate = tableInfo && tableInfo.length > 0 && 'event_date' in tableInfo[0];
      console.log('event_dateカラムの存在確認:', hasEventDate);
      
      // 結果をステートに保存
      setHasEventDateColumn(hasEventDate);
      tableStructureChecked.current = true;
      
      return hasEventDate;
    } catch (err) {
      console.error('テーブル構造確認中にエラーが発生しました:', err);
      throw err;
    }
  }, [hasEventDateColumn]);

  // 共通のデータ取得ロジック
  const fetchVisitorData = useCallback(async (startDate: Date, endDate: Date, context: string = 'default') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`${context} - 来場者数履歴取得開始:`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // テーブル構造を確認
      const hasEventDate = await checkTableStructure();
      
      let query = supabase
        .from('visitors')
        .select('*');
      
      if (hasEventDate) {
        // event_dateカラムがある場合はそれを使用
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        query = query
          .gte('event_date', startDateStr)
          .lte('event_date', endDateStr)
          .order('event_date', { ascending: false });
      } else {
        // event_dateカラムがない場合はupdated_atを使用
        query = query
          .gte('updated_at', startDate.toISOString())
          .lte('updated_at', endDate.toISOString())
          .order('updated_at', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`${context} - 来場者数履歴の取得エラー:`, error.message);
        setError(error.message || 'データベースエラーが発生しました');
        return [];
      }
      
      console.log(`${context} - 来場者数履歴取得成功:`, { 
        dataCount: data?.length || 0,
        dateField: hasEventDate ? 'event_date' : 'updated_at'
      });
      
      return data as VisitorHistoryItem[] || [];
    } catch (err) {
      console.error(`${context} - 来場者数履歴の取得中にエラーが発生しました:`, err);
      const errorMessage = err instanceof Error ? err.message : '来場者数履歴の取得に失敗しました';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [checkTableStructure]);

  // 指定日数の履歴を取得
  const fetchVisitorHistory = useCallback(async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const data = await fetchVisitorData(startDate, endDate, '日数指定');
    setHistory(data);
  }, [days, fetchVisitorData]);

  // 特定の期間の来場者数履歴を取得
  const fetchVisitorHistoryByPeriod = useCallback(async (startDate: Date, endDate: Date) => {
    const data = await fetchVisitorData(startDate, endDate, '期間指定');
    setHistory(data);
  }, [fetchVisitorData]);

  // 統計情報を計算
  const getStatistics = useCallback((): VisitorStatistics => {
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

    // event_dateかupdated_atを使用
    const getDateString = (item: VisitorHistoryItem) => {
      return item.event_date || item.updated_at;
    };

    return {
      total,
      average,
      max: maxItem.count,
      maxDate: getDateString(maxItem),
      min: minItem.count,
      minDate: getDateString(minItem)
    };
  }, [history]);

  // 履歴を更新
  const refreshHistory = useCallback(() => {
    fetchVisitorHistory();
  }, [fetchVisitorHistory]);

  // 初回読み込み
  useEffect(() => {
    fetchVisitorHistory();
  }, [fetchVisitorHistory]);

  return {
    history,
    loading,
    error,
    refreshHistory,
    fetchByPeriod: fetchVisitorHistoryByPeriod,
    getStatistics,
    hasEventDateColumn
  };
};
