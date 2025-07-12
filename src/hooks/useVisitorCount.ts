import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSocket } from '@/contexts/SocketContext';

interface VisitorData {
  id: string;
  count: number;
  event_date: string;
  updated_at: string;
}

export const useVisitorCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocket();

  // 来場者数を取得
  const fetchVisitorCount = useCallback(async () => {
    try {
      setLoading(true);
      
      // 今日の日付のデータを取得
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('visitors')
        .select('count')
        .eq('event_date', today)
        .single();
      
      if (error) {
        console.error('来場者数の取得エラー:', error);
        setError(error.message);
        return;
      }
      
      if (data) {
        setCount(data.count);
      } else {
        // データがない場合は0を設定
        setCount(0);
      }
    } catch (err) {
      console.error('来場者数の取得中にエラーが発生しました:', err);
      setError('来場者数の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setCount, setError]);

  // 来場者数を増加
  const incrementCount = useCallback(async (incrementBy: number = 1) => {
    try {
      // Supabase関数を呼び出して来場者数を増加
      const { data, error } = await supabase
        .rpc('increment_visitor_count', { increment_by: incrementBy });
      
      if (error) {
        console.error('来場者数の更新エラー:', error);
        setError(error.message);
        return;
      }
      
      // 更新された値を設定
      if (data !== null) {
        setCount(data);
        
        // Socket.IOで他のクライアントに通知
        if (socket && connected) {
          socket.emit('visitor:update', { count: data });
        }
      }
    } catch (err) {
      console.error('来場者数の更新中にエラーが発生しました:', err);
      setError('来場者数の更新に失敗しました');
    }
  }, [setCount, setError, socket, connected]);

  // 来場者数をリセット
  const resetCount = useCallback(async () => {
    try {
      // Supabase関数を呼び出して来場者数をリセット
      const { data, error } = await supabase.rpc('reset_visitor_count');
      
      if (error) {
        console.error('来場者数のリセットエラー:', error);
        setError(error.message);
        return;
      }
      
      // リセットされた値を設定
      if (data !== null) {
        setCount(data);
        
        // Socket.IOで他のクライアントに通知
        if (socket && connected) {
          socket.emit('visitor:update', { count: data });
        }
      }
    } catch (err) {
      console.error('来場者数のリセット中にエラーが発生しました:', err);
      setError('来場者数のリセットに失敗しました');
    }
  }, [setCount, setError, socket, connected]);

  // リアルタイム更新のリスナーを設定
  useEffect(() => {
    // 初期データを取得
    fetchVisitorCount();
    
    // Socket.IOのリスナーを設定
    if (socket) {
      socket.on('visitor:update', (data: { count: number }) => {
        setCount(data.count);
      });
    }
    
    // Supabaseのリアルタイムリスナーを設定
    const subscription = supabase
      .channel('visitors-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'visitors' 
        }, 
        (payload) => {
          const newData = payload.new as VisitorData;
          setCount(newData.count);
        }
      )
      .subscribe();
    
    // クリーンアップ
    return () => {
      if (socket) {
        socket.off('visitor:update');
      }
      subscription.unsubscribe();
    };
  }, [socket, connected, fetchVisitorCount, setCount]);

  return {
    count,
    loading,
    error,
    incrementCount,
    resetCount,
    refreshCount: fetchVisitorCount
  };
};
