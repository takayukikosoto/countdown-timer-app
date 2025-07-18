/**
 * タイマーアクション機能を管理するモジュール
 * Supabase実装
 */

import { supabase } from './supabase';
import { TimerAction, TimerActionType } from './timerActionTypes';
import { sendTimerMessage } from './countdownTimerSupabase';

// Supabase用のテーブル名
const TIMER_ACTIONS_TABLE = 'timer_actions';

/**
 * タイマーアクションを作成
 */
export async function createTimerAction(action: Partial<TimerAction>): Promise<TimerAction> {
  try {
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
    
    // Supabaseのカラム名に変換
    const actionData = {
      id: fullAction.id,
      timer_id: fullAction.timerId,
      trigger_time: fullAction.triggerTime,
      type: fullAction.type,
      message: fullAction.message,
      color: fullAction.color,
      flash: fullAction.flash,
      executed: fullAction.executed,
      enabled: fullAction.enabled
    };
    
    // アクションを保存
    const { error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .insert(actionData);
    
    if (error) {
      throw new Error(`アクション作成エラー: ${error.message}`);
    }
    
    return fullAction;
  } catch (error) {
    console.error('createTimerAction エラー:', error);
    throw error;
  }
}

/**
 * タイマーアクションを更新
 */
export async function updateTimerAction(action: Partial<TimerAction>): Promise<TimerAction | null> {
  try {
    if (!action.id) {
      throw new Error('アクションIDが必要です');
    }
    
    // 既存のアクションを取得
    const { data: existingAction, error: fetchError } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .select('*')
      .eq('id', action.id)
      .single();
    
    if (fetchError || !existingAction) {
      console.error('アクション取得エラー:', fetchError?.message);
      return null;
    }
    
    // クライアント側の命名規則に変換
    const currentAction: TimerAction = {
      id: existingAction.id,
      timerId: existingAction.timer_id,
      triggerTime: existingAction.trigger_time,
      type: existingAction.type as TimerActionType,
      message: existingAction.message,
      color: existingAction.color,
      flash: existingAction.flash,
      executed: existingAction.executed,
      enabled: existingAction.enabled
    };
    
    // 更新内容をマージ
    const updatedAction = { ...currentAction, ...action };
    
    // Supabaseのカラム名に変換
    const actionData = {
      timer_id: updatedAction.timerId,
      trigger_time: updatedAction.triggerTime,
      type: updatedAction.type,
      message: updatedAction.message,
      color: updatedAction.color,
      flash: updatedAction.flash,
      executed: updatedAction.executed,
      enabled: updatedAction.enabled
    };
    
    // アクションを更新
    const { error: updateError } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .update(actionData)
      .eq('id', action.id);
    
    if (updateError) {
      console.error('アクション更新エラー:', updateError.message);
      return null;
    }
    
    return updatedAction;
  } catch (error) {
    console.error('updateTimerAction エラー:', error);
    return null;
  }
}

/**
 * タイマーアクションを削除
 */
export async function deleteTimerAction(actionId: string): Promise<boolean> {
  try {
    // アクションを削除
    const { error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .delete()
      .eq('id', actionId);
    
    if (error) {
      console.error('アクション削除エラー:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('deleteTimerAction エラー:', error);
    return false;
  }
}

/**
 * タイマーアクションを取得
 */
export async function getTimerAction(actionId: string): Promise<TimerAction | null> {
  try {
    const { data: action, error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .select('*')
      .eq('id', actionId)
      .single();
    
    if (error || !action) {
      console.error('アクション取得エラー:', error?.message);
      return null;
    }
    
    // クライアント側の命名規則に変換
    return {
      id: action.id,
      timerId: action.timer_id,
      triggerTime: action.trigger_time,
      type: action.type as TimerActionType,
      message: action.message,
      color: action.color,
      flash: action.flash,
      executed: action.executed,
      enabled: action.enabled
    };
  } catch (error) {
    console.error('getTimerAction エラー:', error);
    return null;
  }
}

/**
 * タイマーのすべてのアクションを取得
 */
export async function getTimerActions(timerId: string): Promise<TimerAction[]> {
  try {
    const { data: actions, error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .select('*')
      .eq('timer_id', timerId);
    
    if (error) {
      console.error('アクションリスト取得エラー:', error.message);
      return [];
    }
    
    if (!actions || actions.length === 0) {
      return [];
    }
    
    // クライアント側の命名規則に変換
    return actions.map(action => ({
      id: action.id,
      timerId: action.timer_id,
      triggerTime: action.trigger_time,
      type: action.type as TimerActionType,
      message: action.message,
      color: action.color,
      flash: action.flash,
      executed: action.executed,
      enabled: action.enabled
    }));
  } catch (error) {
    console.error('getTimerActions エラー:', error);
    return [];
  }
}

/**
 * すべてのタイマーアクションを取得
 */
export async function getAllTimerActions(): Promise<TimerAction[]> {
  try {
    const { data: actions, error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .select('*');
    
    if (error) {
      console.error('全アクション取得エラー:', error.message);
      return [];
    }
    
    if (!actions || actions.length === 0) {
      return [];
    }
    
    // クライアント側の命名規則に変換
    return actions.map(action => ({
      id: action.id,
      timerId: action.timer_id,
      triggerTime: action.trigger_time,
      type: action.type as TimerActionType,
      message: action.message,
      color: action.color,
      flash: action.flash,
      executed: action.executed,
      enabled: action.enabled
    }));
  } catch (error) {
    console.error('getAllTimerActions エラー:', error);
    return [];
  }
}

/**
 * タイマーアクションを実行
 */
export async function executeTimerAction(actionId: string): Promise<boolean> {
  try {
    const action = await getTimerAction(actionId);
    
    if (!action || !action.enabled) {
      return false;
    }
    
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
        // 色変更イベントを発行（Supabaseでは別テーブルに記録するか、クライアント側でRealtimeを使用して処理）
        if (action.color) {
          // タイマーの色を更新
          const { error } = await supabase
            .from('timers')
            .update({ color: action.color })
            .eq('id', action.timerId);
          
          if (error) {
            console.error('タイマー色更新エラー:', error.message);
          }
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
          // タイマーの色を更新
          const { error } = await supabase
            .from('timers')
            .update({ color: action.color })
            .eq('id', action.timerId);
          
          if (error) {
            console.error('タイマー色更新エラー:', error.message);
          }
        }
        break;
    }
    
    // 実行済みフラグを設定
    await updateTimerAction({
      id: actionId,
      executed: true
    });
    
    // 実行結果を記録（オプション）
    const { error } = await supabase
      .from('timer_action_results')
      .insert({
        action_id: actionId,
        timer_id: action.timerId,
        action_type: action.type,
        message: action.message,
        color: action.color,
        flash: action.flash,
        executed_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('アクション実行結果記録エラー:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('executeTimerAction エラー:', error);
    return false;
  }
}

/**
 * タイマーアクションのリセット（実行済みフラグをクリア）
 */
export async function resetTimerActions(timerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .update({ executed: false })
      .eq('timer_id', timerId);
    
    if (error) {
      console.error('アクションリセットエラー:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('resetTimerActions エラー:', error);
    return false;
  }
}

/**
 * 残り時間に基づいてアクションをチェックし実行
 */
export async function checkAndExecuteActions(timerId: string, remainingTime: number): Promise<void> {
  try {
    // 有効で未実行のアクションを取得
    const { data: actions, error } = await supabase
      .from(TIMER_ACTIONS_TABLE)
      .select('*')
      .eq('timer_id', timerId)
      .eq('executed', false)
      .eq('enabled', true)
      .gte('trigger_time', remainingTime);
    
    if (error) {
      console.error('アクション取得エラー:', error.message);
      return;
    }
    
    if (!actions || actions.length === 0) {
      return;
    }
    
    // トリガー時間に最も近いアクションから実行
    const sortedActions = actions.sort((a, b) => b.trigger_time - a.trigger_time);
    
    for (const action of sortedActions) {
      // 残り時間がトリガー時間以下になったらアクションを実行
      if (remainingTime <= action.trigger_time) {
        await executeTimerAction(action.id);
      }
    }
  } catch (error) {
    console.error('checkAndExecuteActions エラー:', error);
  }
}
