/**
 * タイマー関連の型定義
 * クライアントとサーバー間で共有される型情報
 */

// タイマーの状態を表す型
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

// タイマーの種類
export type TimerType = 'countdown' | 'countup' | 'clock';

// タイマーのモード
export type TimerMode = 'normal' | 'overtime';

// タイマー設定の型
export interface TimerSettings {
  id: string;
  title: string;
  type: TimerType;
  duration: number; // ミリ秒単位
  endTime?: number; // 終了予定時刻（ミリ秒単位のタイムスタンプ）
  startTime?: number; // 開始時刻（ミリ秒単位のタイムスタンプ）
  pausedAt?: number; // 一時停止した時刻
  elapsedTime?: number; // 経過時間（一時停止時に使用）
  state: TimerState;
  mode: TimerMode;
  showSeconds: boolean;
  playSound: boolean;
  color: string;
  overtimeColor: string;
  message?: string;
}

/**
 * タイマーメッセージの型
 */
export interface TimerMessage {
  id: string;
  text: string;
  color?: string;
  flash?: boolean;
  timestamp: number;
  timerId?: string;
}

// クライアント側でも使用できるユーティリティ関数
export function getRemainingTimeClient(timer: TimerSettings): number {
  if (timer.state === 'idle' || !timer.endTime) {
    return timer.duration;
  }
  
  if (timer.state === 'paused' && timer.elapsedTime !== undefined) {
    return timer.duration - timer.elapsedTime;
  }
  
  const now = Date.now();
  const remaining = timer.endTime - now;
  
  return Math.max(0, remaining);
}

export function getElapsedTimeClient(timer: TimerSettings): number {
  if (timer.state === 'idle') {
    return 0;
  }
  
  if (timer.state === 'paused' && timer.elapsedTime !== undefined) {
    return timer.elapsedTime;
  }
  
  if (!timer.startTime) {
    return 0;
  }
  
  const now = Date.now();
  return now - timer.startTime;
}

export function formatTimeClient(ms: number, showHours = true, showSeconds = true): string {
  if (ms < 0) ms = 0;
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let result = '';
  
  if (showHours || hours > 0) {
    result += `${hours.toString().padStart(2, '0')}:`;
  }
  
  result += `${minutes.toString().padStart(2, '0')}`;
  
  if (showSeconds) {
    result += `:${seconds.toString().padStart(2, '0')}`;
  }
  
  return result;
}

export function getTimerStateTextClient(timer: TimerSettings): string {
  switch (timer.state) {
    case 'idle':
      return '待機中';
    case 'running':
      return '実行中';
    case 'paused':
      return '一時停止';
    case 'completed':
      return '完了';
    default:
      return '不明';
  }
}
