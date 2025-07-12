import { supabase } from './supabase';
import { getRedisClient } from './redis';
// 定数を直接定義（constants.tsからのインポートが解決されるまでの一時的な対応）
const REDIS_CHANNELS = {
  STATUS: 'event:status',
  VISITORS: 'event:visitors'
};

const REDIS_KEYS = {
  STATUS: 'status'
};

/**
 * Supabaseからイベントステータスを取得する
 */
export async function getStatusFromDB(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_current_status');
    
    if (error) {
      console.error('Supabaseからステータス取得エラー:', error);
      throw error;
    }
    
    return data || '準備中';
  } catch (error) {
    console.error('ステータス取得エラー:', error);
    return '準備中'; // エラー時はデフォルト値を返す
  }
}

/**
 * Supabaseでイベントステータスを更新する
 */
export async function setStatusInDB(status: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('update_event_status', {
      new_status: status
    });
    
    if (error) {
      console.error('Supabaseステータス更新エラー:', error);
      throw error;
    }
    
    // Redisにも通知（Socket.IOで使用）
    await publishStatusUpdate(status);
    
    return data || status;
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    throw error;
  }
}

/**
 * Redisを通じてステータス更新を通知する
 */
async function publishStatusUpdate(status: string): Promise<void> {
  try {
    const redis = getRedisClient();
    // 一時的にRedisにも保存（移行期間中の互換性のため）
    await redis.set(REDIS_KEYS.STATUS, status);
    // ステータス変更を通知
    await redis.publish(REDIS_CHANNELS.STATUS, JSON.stringify({ status }));
  } catch (error) {
    console.error('Redis通知エラー:', error);
  }
}
