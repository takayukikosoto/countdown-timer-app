/**
 * 来場者数管理機能
 * Supabaseデータベースを使用して来場者数を管理
 */

import { supabase } from './supabase';
import { getRedisClient, REDIS_CHANNELS } from './redis';

// 今日の日付を取得（YYYY-MM-DD形式）
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * 今日の来場者数を取得
 */
export async function getVisitorsFromDB(): Promise<number> {
  try {
    const today = getTodayDate();
    
    // 今日の日付のレコードを取得
    const { data, error } = await supabase
      .from('visitors')
      .select('count')
      .eq('event_date', today)
      .single();
    
    if (error) {
      console.error('来場者数の取得エラー:', error);
      
      // レコードが存在しない場合は新規作成
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('visitors')
          .insert({ count: 0, event_date: today })
          .select('count')
          .single();
        
        if (insertError) {
          console.error('来場者数の初期化エラー:', insertError);
          return 0;
        }
        
        return newData?.count || 0;
      }
      
      return 0;
    }
    
    return data?.count || 0;
  } catch (err) {
    console.error('来場者数の取得中にエラーが発生しました:', err);
    return 0;
  }
}

/**
 * 来場者数を増加
 */
export async function incrementVisitorsInDB(increment: number = 1): Promise<number> {
  try {
    // Supabase関数を使用して来場者数を増加
    const { data, error } = await supabase
      .rpc('increment_visitor_count', { increment_by: increment });
    
    if (error) {
      console.error('来場者数の更新エラー:', error);
      return await getVisitorsFromDB(); // エラー時は現在の値を返す
    }
    
    // Redis経由で他のクライアントに通知
    const redis = getRedisClient();
    await redis.publish(REDIS_CHANNELS.VISITORS, JSON.stringify({ visitors: data }));
    
    return data || 0;
  } catch (err) {
    console.error('来場者数の更新中にエラーが発生しました:', err);
    return await getVisitorsFromDB(); // エラー時は現在の値を返す
  }
}

/**
 * 来場者数を設定
 */
export async function setVisitorsInDB(count: number): Promise<number> {
  try {
    const today = getTodayDate();
    
    // 今日の日付のレコードを更新
    const { data, error } = await supabase
      .from('visitors')
      .upsert({ 
        count, 
        event_date: today,
        updated_at: new Date().toISOString()
      })
      .select('count')
      .single();
    
    if (error) {
      console.error('来場者数の設定エラー:', error);
      return await getVisitorsFromDB(); // エラー時は現在の値を返す
    }
    
    // Redis経由で他のクライアントに通知
    const redis = getRedisClient();
    await redis.publish(REDIS_CHANNELS.VISITORS, JSON.stringify({ visitors: count }));
    
    return data?.count || count;
  } catch (err) {
    console.error('来場者数の設定中にエラーが発生しました:', err);
    return await getVisitorsFromDB(); // エラー時は現在の値を返す
  }
}

/**
 * 来場者数をリセット
 */
export async function resetVisitorsInDB(): Promise<number> {
  try {
    // Supabase関数を使用して来場者数をリセット
    const { data, error } = await supabase.rpc('reset_visitor_count');
    
    if (error) {
      console.error('来場者数のリセットエラー:', error);
      return await getVisitorsFromDB(); // エラー時は現在の値を返す
    }
    
    // Redis経由で他のクライアントに通知
    const redis = getRedisClient();
    await redis.publish(REDIS_CHANNELS.VISITORS, JSON.stringify({ visitors: 0 }));
    
    return data || 0;
  } catch (err) {
    console.error('来場者数のリセット中にエラーが発生しました:', err);
    return await getVisitorsFromDB(); // エラー時は現在の値を返す
  }
}

/**
 * 来場者数の履歴を取得
 */
export async function getVisitorHistory(limit: number = 30): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('来場者数履歴の取得エラー:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('来場者数履歴の取得中にエラーが発生しました:', err);
    return [];
  }
}
