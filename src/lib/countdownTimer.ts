/**
 * カウントダウンタイマー機能を管理するモジュール
 * サーバーサイド専用の実装
 */

import { getRedisClient, REDIS_CHANNELS } from './redis';
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

// Redis キー
const TIMER_KEY = 'timer:current';
const TIMER_SETTINGS_KEY = 'timer:settings';
const TIMER_LIST_KEY = 'timer:list';
const TIMER_MESSAGE_KEY = 'timer:message';

/**
 * 現在のタイマー設定を取得
 */
export async function getCurrentTimer(): Promise<TimerSettings | null> {
  const redis = getRedisClient();
  const timerJson = await redis.get(TIMER_KEY);
  
  if (!timerJson) {
    return null;
  }
  
  return JSON.parse(timerJson);
}

/**
 * タイマー設定を保存
 */
export async function saveTimer(timer: TimerSettings): Promise<void> {
  const redis = getRedisClient();
  await redis.set(TIMER_KEY, JSON.stringify(timer));
  
  // タイマー設定も保存
  await redis.hset(TIMER_SETTINGS_KEY, timer.id, JSON.stringify(timer));
  
  // カウントダウンタイマーの場合、残り時間に基づいてアクションをチェック
  if (timer.type === 'countdown' && timer.state === 'running') {
    const remainingTime = getRemainingTime(timer);
    await checkAndExecuteActions(timer.id, remainingTime);
  }
  
  // 変更を通知
  await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
    type: 'timer:update',
    timer
  }));
}

/**
 * タイマーを開始
 */
export async function startTimer(timerId: string): Promise<TimerSettings | null> {
  const redis = getRedisClient();
  const timerJson = await redis.hget(TIMER_SETTINGS_KEY, timerId);
  
  if (!timerJson) {
    return null;
  }
  
  const timer = JSON.parse(timerJson) as TimerSettings;
  const now = Date.now();
  
  // タイマーの状態を更新
  if (timer.state === 'paused' && timer.pausedAt && timer.elapsedTime) {
    // 一時停止から再開
    timer.startTime = now - timer.elapsedTime;
    timer.endTime = timer.startTime + timer.duration;
  } else {
    // 新規開始
    timer.startTime = now;
    timer.endTime = now + timer.duration;
    timer.elapsedTime = 0;
    
    // タイマーアクションをリセット（新規開始時のみ）
    await resetTimerActions(timerId);
  }
  
  timer.state = 'running';
  timer.mode = 'normal';
  
  // 現在のタイマーとして設定
  await saveTimer(timer);
  
  return timer;
}

/**
 * タイマーを一時停止
 */
export async function pauseTimer(timerId: string): Promise<TimerSettings | null> {
  const timer = await getCurrentTimer();
  
  if (!timer || timer.id !== timerId || timer.state !== 'running') {
    return null;
  }
  
  const now = Date.now();
  timer.pausedAt = now;
  timer.elapsedTime = now - (timer.startTime || 0);
  timer.state = 'paused';
  
  await saveTimer(timer);
  
  return timer;
}

/**
 * タイマーをリセット
 */
export async function resetTimer(timerId: string): Promise<TimerSettings | null> {
  const redis = getRedisClient();
  const timerJson = await redis.hget(TIMER_SETTINGS_KEY, timerId);
  
  if (!timerJson) {
    return null;
  }
  
  const timer = JSON.parse(timerJson) as TimerSettings;
  
  timer.state = 'idle';
  timer.startTime = undefined;
  timer.endTime = undefined;
  timer.pausedAt = undefined;
  timer.elapsedTime = 0;
  timer.mode = 'normal';
  
  // タイマーアクションをリセット
  await resetTimerActions(timerId);
  
  await saveTimer(timer);
  
  return timer;
}

/**
 * タイマーを作成
 */
export async function createTimer(settings: Partial<TimerSettings>): Promise<TimerSettings> {
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
  const redis = getRedisClient();
  
  // タイマー設定を保存
  await redis.hset(TIMER_SETTINGS_KEY, id, JSON.stringify(timer));
  
  // タイマーリストに追加
  await redis.sadd(TIMER_LIST_KEY, id);
  
  return timer;
}

/**
 * タイマーを削除
 */
export async function deleteTimer(timerId: string): Promise<boolean> {
  const redis = getRedisClient();
  
  // 現在のタイマーを確認
  const currentTimer = await getCurrentTimer();
  if (currentTimer && currentTimer.id === timerId) {
    await redis.del(TIMER_KEY);
  }
  
  // タイマー設定を削除
  await redis.hdel(TIMER_SETTINGS_KEY, timerId);
  
  // タイマーリストから削除
  await redis.srem(TIMER_LIST_KEY, timerId);
  
  // 変更を通知
  await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
    type: 'timer:delete',
    timerId
  }));
  
  return true;
}

/**
 * 全タイマーのリストを取得
 */
export async function getAllTimers(): Promise<TimerSettings[]> {
  const redis = getRedisClient();
  const timerIds = await redis.smembers(TIMER_LIST_KEY);
  
  if (!timerIds.length) {
    return [];
  }
  
  const timers: TimerSettings[] = [];
  
  for (const id of timerIds) {
    const timerJson = await redis.hget(TIMER_SETTINGS_KEY, id);
    if (timerJson) {
      timers.push(JSON.parse(timerJson));
    }
  }
  
  return timers;
}

/**
 * タイマーにメッセージを送信
 */
export async function sendTimerMessage(message: Partial<TimerMessage>): Promise<TimerMessage> {
  const redis = getRedisClient();
  
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
  
  // メッセージを保存
  await redis.hset(TIMER_MESSAGE_KEY, id, JSON.stringify(fullMessage));
  
  // メッセージを通知
  await redis.publish(REDIS_CHANNELS.MESSAGE, JSON.stringify({
    type: 'timer:message',
    message: fullMessage
  }));
  
  return fullMessage;
}

/**
 * メッセージを削除
 */
export async function deleteTimerMessage(messageId: string): Promise<boolean> {
  const redis = getRedisClient();
  
  // メッセージを削除
  await redis.hdel(TIMER_MESSAGE_KEY, messageId);
  
  // 削除を通知
  await redis.publish(REDIS_CHANNELS.MESSAGE, JSON.stringify({
    type: 'timer:message:delete',
    messageId
  }));
  
  return true;
}

/**
 * メッセージを取得
 */
export async function getTimerMessage(messageId: string): Promise<TimerMessage | null> {
  const redis = getRedisClient();
  const messageJson = await redis.hget(TIMER_MESSAGE_KEY, messageId);
  
  if (!messageJson) {
    return null;
  }
  
  return JSON.parse(messageJson);
}

/**
 * 全てのメッセージを取得
 */
export async function getAllTimerMessages(): Promise<TimerMessage[]> {
  const redis = getRedisClient();
  const messages = await redis.hgetall(TIMER_MESSAGE_KEY);
  
  if (!messages) {
    return [];
  }
  
  return Object.values(messages).map(json => JSON.parse(json));
}
