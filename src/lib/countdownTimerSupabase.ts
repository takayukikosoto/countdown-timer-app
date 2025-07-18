/**
 * カウントダウンタイマー機能を管理するモジュール
 * Supabase実装
 */

import { supabase } from './supabase';
import {
  TimerSettings,
  TimerMessage,
  TimerState,
  TimerType,
  TimerMode
} from './timerTypes';
import { checkAndExecuteActions, resetTimerActions } from './timerActions';

// 型定義をエクスポート（後方互換性のため）
export type { TimerSettings, TimerMessage, TimerState, TimerType, TimerMode };

// ユーティリティ関数をエクスポート（後方互換性のため）
import {
  getRemainingTimeClient as getRemainingTime,
  getElapsedTimeClient as getElapsedTime,
  formatTimeClient as formatTime,
  getTimerStateTextClient as getTimerStateText
} from './timerTypes';

export { getRemainingTime, getElapsedTime, formatTime, getTimerStateText };

/**
 * 現在のタイマー設定を取得
 */
export async function getCurrentTimer(): Promise<TimerSettings | null> {
  try {
    // 現在のタイマーIDを取得
    const { data: currentData, error: currentError } = await supabase
      .from('current_timer')
      .select('timer_id')
      .single();
    
    if (currentError || !currentData?.timer_id) {
      console.log('現在のタイマーが設定されていません:', currentError?.message);
      return null;
    }
    
    // タイマー情報を取得
    const { data: timer, error: timerError } = await supabase
      .from('timers')
      .select('*')
      .eq('id', currentData.timer_id)
      .single();
    
    if (timerError || !timer) {
      console.error('タイマー情報の取得エラー:', timerError?.message);
      return null;
    }
    
    // Supabaseのカラム名をクライアント側の命名規則に変換
    return {
      id: timer.id,
      title: timer.title,
      type: timer.type as TimerType,
      duration: timer.duration,
      state: timer.state as TimerState,
      mode: timer.mode as TimerMode,
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
  } catch (error) {
    console.error('getCurrentTimer エラー:', error);
    return null;
  }
}

/**
 * タイマー設定を保存
 */
export async function saveTimer(timer: TimerSettings): Promise<void> {
  try {
    // Supabaseのカラム名に変換
    const timerData = {
      id: timer.id,
      title: timer.title,
      type: timer.type,
      duration: timer.duration,
      state: timer.state,
      mode: timer.mode,
      start_time: timer.startTime ? new Date(timer.startTime).toISOString() : null,
      end_time: timer.endTime ? new Date(timer.endTime).toISOString() : null,
      paused_at: timer.pausedAt ? new Date(timer.pausedAt).toISOString() : null,
      elapsed_time: timer.elapsedTime,
      show_seconds: timer.showSeconds,
      play_sound: timer.playSound,
      color: timer.color,
      overtime_color: timer.overtimeColor,
      message: timer.message,
      updated_at: new Date().toISOString()
    };
    
    // タイマー情報を保存/更新
    const { error: timerError } = await supabase
      .from('timers')
      .upsert(timerData)
      .select();
    
    if (timerError) {
      throw new Error(`タイマー保存エラー: ${timerError.message}`);
    }
    
    // 現在のタイマーとして設定
    const { data: currentTimer, error: currentError } = await supabase
      .from('current_timer')
      .select('id')
      .single();
    
    if (currentError && currentError.code !== 'PGRST116') {
      throw new Error(`現在のタイマー取得エラー: ${currentError.message}`);
    }
    
    if (currentTimer) {
      const { error: updateError } = await supabase
        .from('current_timer')
        .update({ timer_id: timer.id, updated_at: new Date().toISOString() })
        .eq('id', currentTimer.id);
      
      if (updateError) {
        throw new Error(`現在のタイマー更新エラー: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('current_timer')
        .insert({ timer_id: timer.id });
      
      if (insertError) {
        throw new Error(`現在のタイマー作成エラー: ${insertError.message}`);
      }
    }
    
    // カウントダウンタイマーの場合、残り時間に基づいてアクションをチェック
    if (timer.type === 'countdown' && timer.state === 'running') {
      const remainingTime = getRemainingTime(timer);
      await checkAndExecuteActions(timer.id, remainingTime);
    }
  } catch (error) {
    console.error('saveTimer エラー:', error);
    throw error;
  }
}

/**
 * タイマーを開始
 */
export async function startTimer(timerId: string): Promise<TimerSettings | null> {
  try {
    // タイマー情報を取得
    const { data: timer, error: timerError } = await supabase
      .from('timers')
      .select('*')
      .eq('id', timerId)
      .single();
    
    if (timerError || !timer) {
      console.error('タイマー情報の取得エラー:', timerError?.message);
      return null;
    }
    
    const now = Date.now();
    const updatedTimer: Partial<any> = {
      state: 'running',
      mode: 'normal',
      updated_at: new Date().toISOString()
    };
    
    // タイマーの状態を更新
    if (timer.state === 'paused' && timer.paused_at && timer.elapsed_time) {
      // 一時停止から再開
      updatedTimer.start_time = new Date(now - timer.elapsed_time).toISOString();
      updatedTimer.end_time = new Date(now - timer.elapsed_time + timer.duration).toISOString();
    } else {
      // 新規開始
      updatedTimer.start_time = new Date(now).toISOString();
      updatedTimer.end_time = new Date(now + timer.duration).toISOString();
      updatedTimer.elapsed_time = 0;
      
      // タイマーアクションをリセット（新規開始時のみ）
      await resetTimerActions(timerId);
    }
    
    // タイマー情報を更新
    const { data: updatedData, error: updateError } = await supabase
      .from('timers')
      .update(updatedTimer)
      .eq('id', timerId)
      .select()
      .single();
    
    if (updateError || !updatedData) {
      console.error('タイマー更新エラー:', updateError?.message);
      return null;
    }
    
    // クライアント側の命名規則に変換
    const clientTimer: TimerSettings = {
      id: updatedData.id,
      title: updatedData.title,
      type: updatedData.type,
      duration: updatedData.duration,
      state: updatedData.state,
      mode: updatedData.mode,
      startTime: updatedData.start_time ? new Date(updatedData.start_time).getTime() : undefined,
      endTime: updatedData.end_time ? new Date(updatedData.end_time).getTime() : undefined,
      pausedAt: updatedData.paused_at ? new Date(updatedData.paused_at).getTime() : undefined,
      elapsedTime: updatedData.elapsed_time,
      showSeconds: updatedData.show_seconds,
      playSound: updatedData.play_sound,
      color: updatedData.color,
      overtimeColor: updatedData.overtime_color,
      message: updatedData.message
    };
    
    // 現在のタイマーとして設定
    await saveTimer(clientTimer);
    
    return clientTimer;
  } catch (error) {
    console.error('startTimer エラー:', error);
    return null;
  }
}

/**
 * タイマーを一時停止
 */
export async function pauseTimer(timerId: string): Promise<TimerSettings | null> {
  try {
    const timer = await getCurrentTimer();
    
    if (!timer || timer.id !== timerId || timer.state !== 'running') {
      return null;
    }
    
    const now = Date.now();
    const updatedTimer = {
      paused_at: new Date(now).toISOString(),
      elapsed_time: timer.startTime ? now - timer.startTime : 0,
      state: 'paused' as TimerState,
      updated_at: new Date().toISOString()
    };
    
    // タイマー情報を更新
    const { error: updateError } = await supabase
      .from('timers')
      .update(updatedTimer)
      .eq('id', timerId);
    
    if (updateError) {
      console.error('タイマー一時停止エラー:', updateError.message);
      return null;
    }
    
    // 更新後のタイマー情報を取得
    return await getCurrentTimer();
  } catch (error) {
    console.error('pauseTimer エラー:', error);
    return null;
  }
}

/**
 * タイマーをリセット
 */
export async function resetTimer(timerId: string): Promise<TimerSettings | null> {
  try {
    // タイマー情報を取得
    const { data: timer, error: timerError } = await supabase
      .from('timers')
      .select('*')
      .eq('id', timerId)
      .single();
    
    if (timerError || !timer) {
      console.error('タイマー情報の取得エラー:', timerError?.message);
      return null;
    }
    
    const updatedTimer = {
      state: 'idle' as TimerState,
      start_time: null,
      end_time: null,
      paused_at: null,
      elapsed_time: 0,
      mode: 'normal' as TimerMode,
      updated_at: new Date().toISOString()
    };
    
    // タイマーアクションをリセット
    await resetTimerActions(timerId);
    
    // タイマー情報を更新
    const { error: updateError } = await supabase
      .from('timers')
      .update(updatedTimer)
      .eq('id', timerId);
    
    if (updateError) {
      console.error('タイマーリセットエラー:', updateError.message);
      return null;
    }
    
    // 更新後のタイマー情報を取得
    return await getCurrentTimer();
  } catch (error) {
    console.error('resetTimer エラー:', error);
    return null;
  }
}

/**
 * タイマーを作成
 */
export async function createTimer(settings: Partial<TimerSettings>): Promise<TimerSettings> {
  try {
    const id = settings.id || `timer_${Date.now()}`;
    
    const defaultTimer: TimerSettings = {
      id,
      title: settings.title || 'カウントダウン',
      type: settings.type || 'countdown',
      duration: settings.duration || 5 * 60 * 1000, // デフォルト5分
      state: 'idle',
      mode: 'normal',
      showSeconds: true,
      playSound: false,
      color: settings.color || '#3b82f6', // blue-500
      overtimeColor: settings.overtimeColor || '#ef4444', // red-500
      message: settings.message
    };
    
    const timer = { ...defaultTimer, ...settings };
    
    // Supabaseのカラム名に変換
    const timerData = {
      id: timer.id,
      title: timer.title,
      type: timer.type,
      duration: timer.duration,
      state: timer.state,
      mode: timer.mode,
      show_seconds: timer.showSeconds,
      play_sound: timer.playSound,
      color: timer.color,
      overtime_color: timer.overtimeColor,
      message: timer.message
    };
    
    // タイマー情報を保存
    const { error: insertError } = await supabase
      .from('timers')
      .insert(timerData);
    
    if (insertError) {
      throw new Error(`タイマー作成エラー: ${insertError.message}`);
    }
    
    return timer;
  } catch (error) {
    console.error('createTimer エラー:', error);
    throw error;
  }
}

/**
 * タイマーを削除
 */
export async function deleteTimer(timerId: string): Promise<boolean> {
  try {
    // 現在のタイマーを確認
    const currentTimer = await getCurrentTimer();
    if (currentTimer && currentTimer.id === timerId) {
      // 現在のタイマーを削除
      const { error: currentError } = await supabase
        .from('current_timer')
        .update({ timer_id: null })
        .eq('timer_id', timerId);
      
      if (currentError) {
        console.error('現在のタイマークリアエラー:', currentError.message);
      }
    }
    
    // タイマー設定を削除
    const { error: deleteError } = await supabase
      .from('timers')
      .delete()
      .eq('id', timerId);
    
    if (deleteError) {
      console.error('タイマー削除エラー:', deleteError.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('deleteTimer エラー:', error);
    return false;
  }
}

/**
 * 全タイマーのリストを取得
 */
export async function getAllTimers(): Promise<TimerSettings[]> {
  try {
    const { data: timers, error } = await supabase
      .from('timers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('タイマーリスト取得エラー:', error.message);
      return [];
    }
    
    if (!timers || timers.length === 0) {
      return [];
    }
    
    // Supabaseのカラム名をクライアント側の命名規則に変換
    return timers.map(timer => ({
      id: timer.id,
      title: timer.title,
      type: timer.type as TimerType,
      duration: timer.duration,
      state: timer.state as TimerState,
      mode: timer.mode as TimerMode,
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
  } catch (error) {
    console.error('getAllTimers エラー:', error);
    return [];
  }
}

/**
 * タイマーにメッセージを送信
 */
export async function sendTimerMessage(message: Partial<TimerMessage>): Promise<TimerMessage> {
  try {
    const id = message.id || `msg_${Date.now()}`;
    const timestamp = Date.now();
    
    const fullMessage: TimerMessage = {
      id,
      text: message.text || '',
      color: message.color || '#ffffff',
      flash: message.flash || false,
      timestamp,
      timerId: message.timerId
    };
    
    // Supabaseのカラム名に変換
    const messageData = {
      id: fullMessage.id,
      timer_id: fullMessage.timerId,
      text: fullMessage.text,
      color: fullMessage.color,
      flash: fullMessage.flash,
      timestamp: fullMessage.timestamp
    };
    
    // メッセージを保存
    const { error } = await supabase
      .from('timer_messages')
      .insert(messageData);
    
    if (error) {
      throw new Error(`メッセージ送信エラー: ${error.message}`);
    }
    
    return fullMessage;
  } catch (error) {
    console.error('sendTimerMessage エラー:', error);
    throw error;
  }
}

/**
 * メッセージを削除
 */
export async function deleteTimerMessage(messageId: string): Promise<boolean> {
  try {
    // メッセージを削除
    const { error } = await supabase
      .from('timer_messages')
      .delete()
      .eq('id', messageId);
    
    if (error) {
      console.error('メッセージ削除エラー:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('deleteTimerMessage エラー:', error);
    return false;
  }
}

/**
 * メッセージを取得
 */
export async function getTimerMessage(messageId: string): Promise<TimerMessage | null> {
  try {
    const { data: message, error } = await supabase
      .from('timer_messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (error || !message) {
      console.error('メッセージ取得エラー:', error?.message);
      return null;
    }
    
    // Supabaseのカラム名をクライアント側の命名規則に変換
    return {
      id: message.id,
      text: message.text,
      color: message.color,
      flash: message.flash,
      timestamp: message.timestamp,
      timerId: message.timer_id
    };
  } catch (error) {
    console.error('getTimerMessage エラー:', error);
    return null;
  }
}

/**
 * 全てのメッセージを取得
 */
export async function getAllTimerMessages(): Promise<TimerMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('timer_messages')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('メッセージリスト取得エラー:', error.message);
      return [];
    }
    
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Supabaseのカラム名をクライアント側の命名規則に変換
    return messages.map(message => ({
      id: message.id,
      text: message.text,
      color: message.color,
      flash: message.flash,
      timestamp: message.timestamp,
      timerId: message.timer_id
    }));
  } catch (error) {
    console.error('getAllTimerMessages エラー:', error);
    return [];
  }
}
