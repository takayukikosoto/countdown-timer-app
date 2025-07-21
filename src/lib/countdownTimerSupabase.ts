/**
 * カウントダウンタイマー機能を管理するモジュール
 * Supabase実装（新テーブル・RPC関数対応版）
 */

import { supabase } from './supabase';
import {
  TimerSettings,
  TimerMessage,
  TimerState,
  TimerType,
  TimerMode
} from './timerTypes';

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

// Supabaseレスポンス型の定義
interface SupabaseTimer {
  id: string;
  name: string;
  title?: string;
  type: TimerType;
  duration_ms: number;
  state: TimerState;
  started_at?: string;
  paused_at?: string;
  completed_at?: string;
  show_seconds: boolean;
  color: string;
  overtime_color: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseTimerMessage {
  id: string;
  timer_id: string;
  text: string;
  color: string;
  flash: boolean;
  display_duration_ms: number;
  created_at: string;
}

// Supabase形式からTimerSettings形式に変換
function convertSupabaseToTimerSettings(supabaseTimer: SupabaseTimer): TimerSettings {
  return {
    id: supabaseTimer.id,
    title: supabaseTimer.title || supabaseTimer.name,
    type: supabaseTimer.type,
    duration: supabaseTimer.duration_ms,
    startTime: supabaseTimer.started_at ? new Date(supabaseTimer.started_at).getTime() : undefined,
    pausedAt: supabaseTimer.paused_at ? new Date(supabaseTimer.paused_at).getTime() : undefined,
    endTime: supabaseTimer.started_at ? new Date(supabaseTimer.started_at).getTime() + supabaseTimer.duration_ms : undefined,
    elapsedTime: 0, // 必要に応じて計算
    state: supabaseTimer.state,
    mode: 'normal' as TimerMode, // デフォルト値
    showSeconds: supabaseTimer.show_seconds,
    playSound: true, // デフォルト値（後で設定追加可能）
    color: supabaseTimer.color,
    overtimeColor: supabaseTimer.overtime_color,
    message: undefined // 必要に応じて別途取得
  };
}

// Supabase形式からTimerMessage形式に変換
function convertSupabaseToTimerMessage(supabaseMessage: SupabaseTimerMessage): TimerMessage {
  return {
    id: supabaseMessage.id,
    text: supabaseMessage.text,
    color: supabaseMessage.color,
    flash: supabaseMessage.flash,
    timestamp: new Date(supabaseMessage.created_at).getTime(),
    timerId: supabaseMessage.timer_id
  };
}

/**
 * 現在のタイマー設定を取得
 */
export async function getCurrentTimer(): Promise<TimerSettings | null> {
  try {
    // 新しいRPC関数get_current_timer()を使用
    const { data, error } = await supabase
      .rpc('get_current_timer');
    
    if (error) {
      console.error('現在のタイマー取得エラー:', error.message);
      return null;
    }
    
    // データが存在しない場合
    if (!data || data.length === 0) {
      console.log('現在のタイマーが設定されていません');
      return null;
    }
    
    // 配列の最初の要素を取得（RPCは配列で返す）
    const timerData = Array.isArray(data) ? data[0] : data;
    
    if (!timerData) {
      return null;
    }
    
    // Supabase形式からTimerSettings形式に変換
    return convertSupabaseToTimerSettings(timerData as SupabaseTimer);
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
      duration_ms: timer.duration,
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
    
    // カウントダウンタイマーの場合の処理（将来的にアクション機能を追加可能）
    if (timer.type === 'countdown' && timer.state === 'running') {
      const remainingTime = getRemainingTime(timer);
      // TODO: 将来的にタイマーアクション機能を実装予定
      console.log('タイマー開始:', { timerId: timer.id, remainingTime });
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
    // 新しいRPC関数start_timer()を使用
    const { data, error } = await supabase
      .rpc('start_timer', { p_timer_id: timerId });
    
    if (error) {
      console.error('タイマー開始エラー:', error.message);
      return null;
    }
    
    // JSON応答をパース
    if (!data?.success) {
      console.error('タイマー開始失敗:', data?.error);
      return null;
    }
    
    // タイマー情報を取得して返す
    const timerData = data.timer;
    if (!timerData) {
      console.error('タイマーデータが返されませんでした');
      return null;
    }
    
    // Supabase形式からTimerSettings形式に変換
    return convertSupabaseToTimerSettings(timerData as SupabaseTimer);
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
    // 新しいRPC関数pause_timer()を使用
    const { data, error } = await supabase
      .rpc('pause_timer', { p_timer_id: timerId });
    
    if (error) {
      console.error('タイマー一時停止エラー:', error.message);
      return null;
    }
    
    // JSON応答をパース
    if (!data?.success) {
      console.error('タイマー一時停止失敗:', data?.error);
      return null;
    }
    
    // タイマー情報を取得して返す
    const timerData = data.timer;
    if (!timerData) {
      console.error('タイマーデータが返されませんでした');
      return null;
    }
    
    // Supabase形式からTimerSettings形式に変換
    return convertSupabaseToTimerSettings(timerData as SupabaseTimer);
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
    // 新しいRPC関数reset_timer()を使用
    const { data, error } = await supabase
      .rpc('reset_timer', { p_timer_id: timerId });
    
    if (error) {
      console.error('タイマーリセットエラー:', error.message);
      return null;
    }
    
    // JSON応答をパース
    if (!data?.success) {
      console.error('タイマーリセット失敗:', data?.error);
      return null;
    }
    
    // タイマー情報を取得して返す
    const timerData = data.timer;
    if (!timerData) {
      console.error('タイマーデータが返されませんでした');
      return null;
    }
    
    // Supabase形式からTimerSettings形式に変換
    return convertSupabaseToTimerSettings(timerData as SupabaseTimer);
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
    // デフォルト設定
    const name = settings.title || 'カウントダウンタイマー';
    const title = settings.title || 'カウントダウン';
    const type = settings.type || 'countdown';
    const duration_ms = settings.duration || 5 * 60 * 1000; // デフォルト5分
    const color = settings.color || '#3B82F6';
    
    // 新しいRPC関数create_timer()を使用
    const { data: newTimerId, error } = await supabase
      .rpc('create_timer', {
        p_name: name,
        p_title: title,
        p_type: type,
        p_duration_ms: duration_ms,
        p_color: color
      });
    
    if (error) {
      throw new Error(`タイマー作成エラー: ${error.message}`);
    }
    
    if (!newTimerId) {
      throw new Error('タイマーIDが返されませんでした');
    }
    
    // 作成されたタイマーを取得して返す
    const { data: createdTimer, error: fetchError } = await supabase
      .from('timers')
      .select('*')
      .eq('id', newTimerId)
      .single();
    
    if (fetchError || !createdTimer) {
      throw new Error(`作成されたタイマーの取得エラー: ${fetchError?.message}`);
    }
    
    // Supabase形式からTimerSettings形式に変換
    return convertSupabaseToTimerSettings(createdTimer as SupabaseTimer);
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
      duration: timer.duration_ms,
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
      .order('created_at', { ascending: false });
    
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
