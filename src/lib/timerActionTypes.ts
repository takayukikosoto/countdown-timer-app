/**
 * タイマーアクション関連の型定義
 * 特定の残り時間でトリガーされるアクションを定義
 */

// アクションのタイプ
export type TimerActionType = 'message' | 'color' | 'both';

// アクションの設定
export interface TimerAction {
  id: string;
  timerId: string;
  triggerTime: number;  // 残り時間（ミリ秒）でトリガー
  type: TimerActionType;
  message?: string;     // メッセージアクションの場合
  color?: string;       // 色変更アクションの場合
  flash?: boolean;      // メッセージを点滅させるかどうか
  executed?: boolean;   // 実行済みかどうか
  enabled: boolean;     // 有効/無効
}

// アクション実行結果
export interface TimerActionResult {
  actionId: string;
  timerId: string;
  success: boolean;
  timestamp: number;
  type: TimerActionType;
}
