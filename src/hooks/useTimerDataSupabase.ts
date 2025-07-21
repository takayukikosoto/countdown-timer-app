/**
 * タイマーデータを取得・購読するためのカスタムフック
 * Supabase実装
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TimerSettings, TimerMessage, TimerType, TimerState, TimerMode } from '../lib/timerTypes';

// 型定義
type TimerDataState = {
  currentTimer: TimerSettings | null;
  timers: TimerSettings[];
  messages: TimerMessage[];
  loading: boolean;
  error: string | null;
};

// 初期状態
const initialState: TimerDataState = {
  currentTimer: null,
  timers: [],
  messages: [],
  loading: true,
  error: null
};

/**
 * タイマーデータを取得・購読するためのカスタムフック
 */
export function useTimerDataSupabase() {
  const [state, setState] = useState<TimerDataState>(initialState);
  
  /**
   * 現在のタイマーを取得
   * @param {boolean} updateState - 状態を更新するかどうか（初期ロード時は更新、それ以外は更新しない）
   */
  const fetchCurrentTimer = useCallback(async (updateState = false) => {
    try {
      // 状態更新フラグが無い場合はデータ取得のみ行い、状態は更新しない
      if (updateState) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }
      
      // 現在のタイマーIDを取得
      const { data: currentData, error: currentError } = await supabase
        .from('current_timer')
        .select('timer_id')
        .single();
      
      if (currentError) {
        const errorMsg = `現在のタイマー取得エラー: ${currentError.message}`;
        console.error(errorMsg);
        
        if (updateState) {
          setState(prev => ({ ...prev, error: errorMsg, loading: false }));
        }
        return null;
      }
      
      if (!currentData?.timer_id) {
        if (updateState) {
          setState(prev => ({
            ...prev,
            currentTimer: null,
            loading: false
          }));
        }
        return null;
      }
      
      // タイマー情報を取得
      const { data: timer, error: timerError } = await supabase
        .from('timers')
        .select('*')
        .eq('id', currentData.timer_id)
        .single();
      
      if (timerError) {
        const errorMsg = `タイマー情報の取得エラー: ${timerError.message}`;
        console.error(errorMsg);
        
        if (updateState) {
          setState(prev => ({ ...prev, error: errorMsg, loading: false }));
        }
        return null;
      }
      
      // クライアント側の命名規則に変換
      const currentTimer: TimerSettings = {
        id: timer.id,
        title: timer.title,
        type: timer.type,
        duration: timer.duration,
        state: timer.state,
        mode: timer.mode,
        startTime: timer.start_time ? new Date(timer.start_time).getTime() : undefined,
        endTime: timer.end_time ? new Date(timer.end_time).getTime() : undefined,
        pausedAt: timer.paused_at ? new Date(timer.paused_at).getTime() : undefined,
        elapsedTime: timer.elapsed_time,
        showSeconds: timer.show_seconds,
        playSound: timer.play_sound,
        color: timer.color,
        overtimeColor: timer.overtime_color,
        message: timer.message
      };
      
      // updateStateがtrueの場合のみ状態を更新
      if (updateState) {
        setState(prev => ({
          ...prev,
          currentTimer,
          loading: false
        }));
      }
      
      return currentTimer;
    } catch (error) {
      console.error('現在のタイマー取得エラー:', error);
      if (updateState) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : '不明なエラー',
          loading: false
        }));
      }
      return null;
    }
  }, [supabase]);
  
  /**
   * 全タイマーを取得
   */
  const fetchAllTimers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data: timers, error } = await supabase
        .from('timers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`タイマーリスト取得エラー: ${error.message}`);
      }
      
      // クライアント側の命名規則に変換
      const formattedTimers = timers.map(timer => ({
        id: timer.id,
        title: timer.title,
        type: timer.type,
        duration: timer.duration,
        state: timer.state,
        mode: timer.mode,
        startTime: timer.start_time ? new Date(timer.start_time).getTime() : undefined,
        endTime: timer.end_time ? new Date(timer.end_time).getTime() : undefined,
        pausedAt: timer.paused_at ? new Date(timer.paused_at).getTime() : undefined,
        elapsedTime: timer.elapsed_time,
        showSeconds: timer.show_seconds,
        playSound: timer.play_sound,
        color: timer.color,
        overtimeColor: timer.overtime_color,
        message: timer.message
      }));
      
      setState(prev => ({
        ...prev,
        timers: formattedTimers,
        loading: false
      }));
      
      return formattedTimers;
    } catch (error) {
      console.error('タイマーリスト取得エラー:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '不明なエラー',
        loading: false
      }));
      return [];
    }
  }, [supabase]);
  
  /**
   * タイマーメッセージを取得
   */
  const fetchMessages = useCallback(async (timerId?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      let query = supabase
        .from('timer_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      // 特定のタイマーのメッセージのみを取得
      if (timerId) {
        query = query.eq('timer_id', timerId);
      }
      
      const { data: messages, error } = await query;
      
      if (error) {
        throw new Error(`メッセージ取得エラー: ${error.message}`);
      }
      
      // クライアント側の命名規則に変換
      const formattedMessages = messages.map(message => ({
        id: message.id,
        text: message.text,
        color: message.color,
        flash: message.flash,
        timestamp: message.timestamp,
        timerId: message.timer_id
      }));
      
      setState(prev => ({
        ...prev,
        messages: formattedMessages,
        loading: false
      }));
      
      return formattedMessages;
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '不明なエラー',
        loading: false
      }));
      return [];
    }
  }, [supabase]);
  
  /**
   * 初期データ読み込み用のuseEffect
   * コンポーネントマウント時に1回だけ実行
   */
  useEffect(() => {
    // 初期データ読み込み - 状態を更新するフラグをtrueに設定
    console.log('初期データ読み込み開始');
    // 直接関数を実行して状態を更新
    const loadInitialData = async () => {
      try {
        // 現在のタイマーIDを取得
        const { data: currentData, error: currentError } = await supabase
          .from('current_timer')
          .select('timer_id')
          .single();
        
        if (currentError) {
          console.error('現在のタイマー取得エラー:', currentError.message);
          setState(prev => ({ ...prev, error: currentError.message, loading: false }));
          return;
        }
        
        if (!currentData?.timer_id) {
          setState(prev => ({
            ...prev,
            currentTimer: null,
            loading: false
          }));
          return;
        }
        
        // タイマー情報を取得
        const { data: timer, error: timerError } = await supabase
          .from('timers')
          .select('*')
          .eq('id', currentData.timer_id)
          .single();
        
        if (timerError) {
          console.error('タイマー情報の取得エラー:', timerError.message);
          setState(prev => ({ ...prev, error: timerError.message, loading: false }));
          return;
        }
        
        // クライアント側の命名規則に変換
        const currentTimer = {
          id: timer.id,
          title: timer.title,
          type: timer.type,
          duration: timer.duration,
          state: timer.state,
          mode: timer.mode,
          startTime: timer.start_time ? new Date(timer.start_time).getTime() : undefined,
          endTime: timer.end_time ? new Date(timer.end_time).getTime() : undefined,
          pausedAt: timer.paused_at ? new Date(timer.paused_at).getTime() : undefined,
          elapsedTime: timer.elapsed_time,
          showSeconds: timer.show_seconds,
          playSound: timer.play_sound,
          color: timer.color,
          overtimeColor: timer.overtime_color,
          message: timer.message
        };
        
        setState(prev => ({
          ...prev,
          currentTimer,
          loading: false
        }));
        
        // 他のデータも読み込み
        await fetchAllTimers();
        await fetchMessages();
      } catch (error) {
        console.error('初期データ読み込みエラー:', error);
      }
    };
    
    loadInitialData();
  }, []);
  
  /**
   * Realtimeサブスクリプションを設定するためのuseEffect
   */
  useEffect(() => {
    
    // タイマーテーブルの変更を購読
    const timersSubscription = supabase
      .channel('timers-channel')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'timers' }, 
          (payload) => {
            console.log('タイマー変更:', payload);
            
            // 変更されたタイマーのデータを取得
            const changedTimer = payload.new as {
              id: string;
              title: string;
              type: string;
              duration: number;
              state: string;
              mode: string;
              start_time: string | null;
              end_time: string | null;
              paused_at: string | null;
              elapsed_time: number | null;
              show_seconds: boolean;
              play_sound: boolean;
              color: string;
              overtime_color: string;
              message: string | null;
            };
            
            if (changedTimer) {
              // クライアント側の命名規則に変換
              const formattedTimer: TimerSettings = {
                id: changedTimer.id,
                title: changedTimer.title,
                type: changedTimer.type as TimerType,
                duration: changedTimer.duration,
                state: changedTimer.state as TimerState,
                mode: changedTimer.mode as TimerMode,
                startTime: changedTimer.start_time ? new Date(changedTimer.start_time).getTime() : undefined,
                endTime: changedTimer.end_time ? new Date(changedTimer.end_time).getTime() : undefined,
                pausedAt: changedTimer.paused_at ? new Date(changedTimer.paused_at).getTime() : undefined,
                elapsedTime: changedTimer.elapsed_time || undefined,
                showSeconds: changedTimer.show_seconds,
                playSound: changedTimer.play_sound,
                color: changedTimer.color,
                overtimeColor: changedTimer.overtime_color,
                message: changedTimer.message || undefined
              };
              
              // 状態を更新
              setState(prev => {
                // 現在のタイマーの場合は更新
                if (prev.currentTimer && prev.currentTimer.id === formattedTimer.id) {
                  return {
                    ...prev,
                    currentTimer: formattedTimer
                  };
                }
                
                // タイマーリストを更新
                const updatedTimers = prev.timers.map(timer => 
                  timer.id === formattedTimer.id ? formattedTimer : timer
                );
                
                return {
                  ...prev,
                  timers: updatedTimers
                };
              });
            }
          })
      .subscribe();
    
    // 現在のタイマーの変更を購読
    const currentTimerSubscription = supabase
      .channel('current-timer-channel')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'current_timer' }, 
          async (payload) => {
            console.log('現在のタイマー変更:', payload);
            
            // ペイロードからタイマーIDを取得
            const newData = payload.new as { timer_id?: string };
            if (newData && newData.timer_id) {
              const timerId = newData.timer_id;
              
              try {
                // タイマー情報を取得
                const { data: timer, error: timerError } = await supabase
                  .from('timers')
                  .select('*')
                  .eq('id', timerId)
                  .single();
                
                if (timerError) throw new Error(`タイマー情報の取得エラー: ${timerError.message}`);
                if (!timer) return;
                
                // クライアント側の命名規則に変換
                const currentTimer: TimerSettings = {
                  id: timer.id,
                  title: timer.title,
                  type: timer.type,
                  duration: timer.duration,
                  state: timer.state,
                  mode: timer.mode,
                  startTime: timer.start_time ? new Date(timer.start_time).getTime() : undefined,
                  endTime: timer.end_time ? new Date(timer.end_time).getTime() : undefined,
                  pausedAt: timer.paused_at ? new Date(timer.paused_at).getTime() : undefined,
                  elapsedTime: timer.elapsed_time,
                  showSeconds: timer.show_seconds,
                  playSound: timer.play_sound,
                  color: timer.color,
                  overtimeColor: timer.overtime_color,
                  message: timer.message
                };
                
                setState(prev => ({
                  ...prev,
                  currentTimer,
                  loading: false
                }));
              } catch (error) {
                console.error('現在のタイマー取得エラー:', error);
              }
            }
          })
      .subscribe();
    
    // メッセージの変更を購読
    const messagesSubscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'timer_messages' }, 
          (payload) => {
            console.log('メッセージ変更:', payload);
            
            if (payload.eventType === 'INSERT') {
              // 新しいメッセージの場合
              const newMessage = payload.new as {
                id: string;
                text: string;
                color: string;
                flash: boolean;
                timestamp: number;
                timer_id: string;
              };
              
              // クライアント側の命名規則に変換
              const formattedMessage: TimerMessage = {
                id: newMessage.id,
                text: newMessage.text,
                color: newMessage.color,
                flash: newMessage.flash,
                timestamp: newMessage.timestamp,
                timerId: newMessage.timer_id
              };
              
              // 状態を更新
              setState(prev => ({
                ...prev,
                messages: [formattedMessage, ...prev.messages]
              }));
            } else if (payload.eventType === 'DELETE') {
              // メッセージ削除の場合
              const deletedId = (payload.old as { id: string }).id;
              
              // 状態を更新
              setState(prev => ({
                ...prev,
                messages: prev.messages.filter(msg => msg.id !== deletedId)
              }));
            }
          })
      .subscribe();
    
    // クリーンアップ関数
    return () => {
      supabase.removeChannel(timersSubscription);
      supabase.removeChannel(currentTimerSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, []);
  
  return {
    ...state,
    fetchCurrentTimer,
    fetchAllTimers,
    fetchMessages
  };
}
