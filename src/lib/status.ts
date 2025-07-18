import { supabase } from './supabase';

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
    
    return data || status;
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    throw error;
  }
}


