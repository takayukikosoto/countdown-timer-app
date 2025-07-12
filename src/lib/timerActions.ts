/**
 * タイマーアクション機能を管理するモジュール
 * サーバーサイド専用の実装
 */

import { getRedisClient, REDIS_CHANNELS } from './redis';
import { TimerAction, TimerActionType } from './timerActionTypes';
import { sendTimerMessage } from './countdownTimer';

// Redis キー
const TIMER_ACTIONS_KEY = 'timer:actions';

/**
 * タイマーアクションを作成
 */
export async function createTimerAction(action: Partial<TimerAction>): Promise<TimerAction> {
  const redis = getRedisClient();
  
  const id = action.id || `action_${Date.now()}`;
  
  const defaultAction: TimerAction = {
    id,
    timerId: action.timerId || '',
    triggerTime: action.triggerTime || 60000, // デフォルト1分
    type: action.type || 'message',
    message: action.message || '',
    color: action.color || '#ffffff',
    flash: action.flash || false,
    executed: false,
    enabled: true
  };
  
  const fullAction = { ...defaultAction, ...action };
  
  // アクションを保存
  await redis.hset(TIMER_ACTIONS_KEY, id, JSON.stringify(fullAction));
  
  // 変更を通知
  await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
    type: 'timer:action:create',
    action: fullAction
  }));
  
  return fullAction;
}

/**
 * タイマーアクションを更新
 */
export async function updateTimerAction(action: Partial<TimerAction>): Promise<TimerAction | null> {
  if (!action.id) {
    throw new Error('アクションIDが必要です');
  }
  
  const redis = getRedisClient();
  const actionJson = await redis.hget(TIMER_ACTIONS_KEY, action.id);
  
  if (!actionJson) {
    return null;
  }
  
  const existingAction = JSON.parse(actionJson) as TimerAction;
  const updatedAction = { ...existingAction, ...action };
  
  // アクションを保存
  await redis.hset(TIMER_ACTIONS_KEY, action.id, JSON.stringify(updatedAction));
  
  // 変更を通知
  await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
    type: 'timer:action:update',
    action: updatedAction
  }));
  
  return updatedAction;
}

/**
 * タイマーアクションを削除
 */
export async function deleteTimerAction(actionId: string): Promise<boolean> {
  const redis = getRedisClient();
  
  // アクションを削除
  await redis.hdel(TIMER_ACTIONS_KEY, actionId);
  
  // 削除を通知
  await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
    type: 'timer:action:delete',
    actionId
  }));
  
  return true;
}

/**
 * タイマーアクションを取得
 */
export async function getTimerAction(actionId: string): Promise<TimerAction | null> {
  const redis = getRedisClient();
  const actionJson = await redis.hget(TIMER_ACTIONS_KEY, actionId);
  
  if (!actionJson) {
    return null;
  }
  
  return JSON.parse(actionJson);
}

/**
 * タイマーのすべてのアクションを取得
 */
export async function getTimerActions(timerId: string): Promise<TimerAction[]> {
  const redis = getRedisClient();
  const allActions = await redis.hgetall(TIMER_ACTIONS_KEY);
  
  if (!allActions) {
    return [];
  }
  
  const actions = Object.values(allActions)
    .map(json => JSON.parse(json) as TimerAction)
    .filter(action => action.timerId === timerId);
  
  return actions;
}

/**
 * すべてのタイマーアクションを取得
 */
export async function getAllTimerActions(): Promise<TimerAction[]> {
  const redis = getRedisClient();
  const allActions = await redis.hgetall(TIMER_ACTIONS_KEY);
  
  if (!allActions) {
    return [];
  }
  
  return Object.values(allActions).map(json => JSON.parse(json) as TimerAction);
}

/**
 * タイマーアクションを実行
 */
export async function executeTimerAction(actionId: string): Promise<boolean> {
  const action = await getTimerAction(actionId);
  
  if (!action || !action.enabled) {
    return false;
  }
  
  try {
    switch (action.type) {
      case 'message':
        if (action.message) {
          await sendTimerMessage({
            text: action.message,
            color: action.color,
            flash: action.flash,
            timerId: action.timerId
          });
        }
        break;
        
      case 'color':
        // 色変更イベントを発行
        if (action.color) {
          const redis = getRedisClient();
          await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
            type: 'timer:color:change',
            timerId: action.timerId,
            color: action.color
          }));
        }
        break;
        
      case 'both':
        // メッセージと色の両方を変更
        if (action.message) {
          await sendTimerMessage({
            text: action.message,
            color: action.color,
            flash: action.flash,
            timerId: action.timerId
          });
        }
        
        if (action.color) {
          const redis = getRedisClient();
          await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
            type: 'timer:color:change',
            timerId: action.timerId,
            color: action.color
          }));
        }
        break;
    }
    
    // 実行済みフラグを設定
    await updateTimerAction({
      id: actionId,
      executed: true
    });
    
    // 実行結果を通知
    const redis = getRedisClient();
    await redis.publish(REDIS_CHANNELS.TIMER, JSON.stringify({
      type: 'timer:action:executed',
      actionId,
      timerId: action.timerId,
      actionType: action.type,
      message: action.message,
      color: action.color,
      flash: action.flash,
      timestamp: Date.now()
    }));
    
    return true;
  } catch (error) {
    console.error('アクション実行エラー:', error);
    return false;
  }
}

/**
 * タイマーアクションのリセット（実行済みフラグをクリア）
 */
export async function resetTimerActions(timerId: string): Promise<boolean> {
  const actions = await getTimerActions(timerId);
  
  for (const action of actions) {
    await updateTimerAction({
      id: action.id,
      executed: false
    });
  }
  
  return true;
}

/**
 * 残り時間に基づいてアクションをチェックし実行
 */
export async function checkAndExecuteActions(timerId: string, remainingTime: number): Promise<void> {
  const actions = await getTimerActions(timerId);
  
  // 有効で未実行のアクションをフィルタリング
  const pendingActions = actions.filter(
    action => action.enabled && !action.executed && action.triggerTime >= remainingTime
  );
  
  // トリガー時間に最も近いアクションから実行
  for (const action of pendingActions.sort((a, b) => b.triggerTime - a.triggerTime)) {
    // 残り時間がトリガー時間以下になったらアクションを実行
    if (remainingTime <= action.triggerTime) {
      await executeTimerAction(action.id);
    }
  }
}
