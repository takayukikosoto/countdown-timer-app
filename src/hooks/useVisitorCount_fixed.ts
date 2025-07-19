import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface VisitorData {
  id: string;
  count: number;
  updated_at: string;
}

/**
 * 訪問者カウントを管理するカスタムフック（最適化版）
 * - リアルタイム更新のためのSocket.IOとSupabase購読
 * - 認証トークンを適切に処理
 * - エラーハンドリングの強化
 * - デバッグログの改善
 */
export const useVisitorCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocket();
  const { session } = useAuth();
  
  // Supabaseサブスクリプションの参照を保持
  const subscriptionRef = useRef<any>(null);
  
  // 最後に取得したカウントを保持（不要な更新を防ぐため）
  const lastCountRef = useRef<number | null>(null);

  // 来場者数を取得
  const fetchVisitorCount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('来場者数を取得中...');
      
      // visitorsテーブルから最新のcountを取得
      const { data, error } = await supabase
        .from('visitors')
        .select('count')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('来場者数の取得エラー - 詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          full_error: error
        });
        setError(error.message || 'データベースエラーが発生しました');
        return;
      }
      
      if (data) {
        console.log('来場者数を取得しました:', data.count);
        setCount(data.count);
        lastCountRef.current = data.count;
      } else {
        // データがない場合は0を設定
        console.log('来場者データが見つかりません。カウントを0に設定します。');
        setCount(0);
        lastCountRef.current = 0;
      }
    } catch (err) {
      console.error('来場者数の取得中にエラーが発生しました - 詳細:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : '来場者数の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // 来場者数を増加
  const incrementCount = useCallback(async (incrementBy: number = 1) => {
    try {
      setError(null);
      console.log(`来場者数を ${incrementBy} 増加させます...`);
      
      // 認証ヘッダーの準備
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
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
        console.log('来場者数を更新しました:', data);
        setCount(data);
        lastCountRef.current = data;
        
        // Socket.IOで他のクライアントに通知
        if (socket && connected) {
          socket.emit('visitor:update', { count: data });
        }
      }
    } catch (err) {
      console.error('来場者数の更新中にエラーが発生しました:', err);
      setError(err instanceof Error ? err.message : '来場者数の更新に失敗しました');
    }
  }, [socket, connected, session]);

  // 来場者数をリセット
  const resetCount = useCallback(async () => {
    try {
      setError(null);
      console.log('来場者数をリセットします...');
      
      // 認証ヘッダーの準備
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Supabase関数を呼び出して来場者数をリセット
      const { data, error } = await supabase.rpc('reset_visitor_count');
      
      if (error) {
        console.error('来場者数のリセットエラー:', error);
        setError(error.message);
        return;
      }
      
      // リセットされた値を設定
      if (data !== null) {
        console.log('来場者数をリセットしました:', data);
        setCount(data);
        lastCountRef.current = data;
        
        // Socket.IOで他のクライアントに通知
        if (socket && connected) {
          socket.emit('visitor:update', { count: data });
        }
      }
    } catch (err) {
      console.error('来場者数のリセット中にエラーが発生しました:', err);
      setError(err instanceof Error ? err.message : '来場者数のリセットに失敗しました');
    }
  }, [socket, connected, session]);

  // リアルタイム更新のリスナーを設定
  useEffect(() => {
    // 初期データを取得
    fetchVisitorCount();
    
    // Socket.IOのリスナーを設定
    if (socket) {
      console.log('Socket.IOリスナーを設定中...');
      
      const handleVisitorUpdate = (data: { count: number }) => {
        console.log('Socket.IOから更新を受信:', data);
        // 現在の値と異なる場合のみ更新
        if (lastCountRef.current !== data.count) {
          setCount(data.count);
          lastCountRef.current = data.count;
        }
      };
      
      socket.on('visitor:update', handleVisitorUpdate);
      
      // クリーンアップ
      return () => {
        console.log('Socket.IOリスナーを削除中...');
        socket.off('visitor:update', handleVisitorUpdate);
      };
    }
  }, [socket, fetchVisitorCount]);
  
  // Supabaseのリアルタイムリスナーを設定
  useEffect(() => {
    console.log('Supabaseリアルタイムリスナーを設定中...');
    
    // 既存のサブスクリプションをクリーンアップ
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    // 新しいサブスクリプションを作成
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
          console.log('Supabaseから更新を受信:', newData);
          
          // 現在の値と異なる場合のみ更新
          if (lastCountRef.current !== newData.count) {
            setCount(newData.count);
            lastCountRef.current = newData.count;
          }
        }
      )
      .subscribe();
    
    // 参照を保存
    subscriptionRef.current = subscription;
    
    // クリーンアップ
    return () => {
      console.log('Supabaseリアルタイムリスナーを削除中...');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    count,
    loading,
    error,
    incrementCount,
    resetCount,
    refreshCount: fetchVisitorCount
  };
};

export default useVisitorCount;
