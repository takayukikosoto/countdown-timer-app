/**
 * サーバー時刻との同期を管理するモジュール
 */

// サーバー時刻とクライアント時刻のオフセット
let timeOffset = 0;

// 最後に同期した時刻
let lastSyncTime = 0;

/**
 * サーバー時刻を取得して同期する
 * @returns {Promise<number>} サーバー時刻（ミリ秒）
 */
export async function syncWithServerTime(): Promise<number> {
  try {
    // リクエスト開始時刻を記録
    const requestStartTime = Date.now();
    
    // サーバーから時刻を取得（タイムアウト設定を追加）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒でタイムアウト（延長）
    
    try {
      // キャッシュを防止するためにクエリパラメータを追加
      const cacheBuster = `?_=${Date.now()}`;
      const response = await fetch(`/api/time${cacheBuster}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Server time sync response not OK: ${response.status}`);
        // 最後の同期から5分以内なら現在のオフセットを使用
        if (Date.now() - lastSyncTime < 5 * 60 * 1000) {
          console.info('Using previous time offset due to server error');
          return getAdjustedTime();
        }
        // それ以外は現在の時刻を使用
        return Date.now();
      }
      
      const data = await response.json();
      const serverTime = data.now;
      
      if (!serverTime || typeof serverTime !== 'number') {
        console.warn('Invalid server time received:', data);
        return getAdjustedTime();
      }
      
      // リクエスト終了時刻を記録
      const requestEndTime = Date.now();
      
      // 往復の遅延を計算し、その半分をネットワーク遅延として推定
      const roundTripTime = requestEndTime - requestStartTime;
      const networkDelay = Math.floor(roundTripTime / 2);
      
      // サーバー時刻 + ネットワーク遅延 - クライアント時刻 = オフセット
      const estimatedServerTimeNow = serverTime + networkDelay;
      timeOffset = estimatedServerTimeNow - Date.now();
      
      // 同期時刻を更新
      lastSyncTime = Date.now();
      
      console.log(`Server time synced. Offset: ${timeOffset}ms, RTT: ${roundTripTime}ms`);
      
      return estimatedServerTimeNow;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.warn('Failed to sync with server time, using local time:', error instanceof Error ? error.message : 'Unknown error');
    
    // エラー時は現在のオフセットを使用（最後の同期から10分以上経過している場合はオフセットをリセット）
    if (Date.now() - lastSyncTime > 10 * 60 * 1000) {
      console.warn('Time offset reset due to long period without sync');
      timeOffset = 0;
    } else if (lastSyncTime > 0) {
      console.info('Using previous time offset');
    }
    
    return getAdjustedTime();
  }
}

/**
 * 調整済みの現在時刻を取得
 * @returns {number} サーバー時刻に調整された現在時刻（ミリ秒）
 */
export function getAdjustedTime(): number {
  return Date.now() + timeOffset;
}

/**
 * 時刻同期が必要かどうかを判断
 * @returns {boolean} 同期が必要な場合は true
 */
export function shouldSync(): boolean {
  // 30秒以上経過していれば再同期
  const timeSinceLastSync = Date.now() - lastSyncTime;
  return timeSinceLastSync > 30000;
}

/**
 * フォーマットされた時刻文字列を取得
 * @param {number} time ミリ秒単位のタイムスタンプ
 * @param {boolean} showSeconds 秒を表示するかどうか
 * @returns {string} フォーマットされた時刻文字列 (HH:MM:SS または HH:MM)
 */
export function formatTime(time: number, showSeconds: boolean = true): string {
  const date = new Date(time);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: false
  });
}

/**
 * 日付を含むフォーマットされた時刻文字列を取得
 * @param {number} time ミリ秒単位のタイムスタンプ
 * @returns {string} フォーマットされた日時文字列 (YYYY/MM/DD HH:MM:SS)
 */
export function formatDateTime(time: number): string {
  const date = new Date(time);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
