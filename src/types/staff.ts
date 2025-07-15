// スタッフ関連の型定義

// スタッフポジション（役割）の定義
export type StaffPosition = 
  | '主催'
  | '協賛'
  | '代理店'
  | '制作'
  | '運営'
  | '進行'
  | '音響'
  | '照明'
  | '映像'
  | '配信'
  | '施工'
  | '会場'
  | 'その他';

// スタッフレベル（役職）の定義
export type StaffLevel = 
  | 'マネージャー'
  | 'プロデューサー'
  | 'ディレクター'
  | 'AD'
  | 'オペレーター'
  | 'カメラマン'
  | 'その他';

// 全てのポジション選択肢
export const STAFF_POSITIONS: StaffPosition[] = [
  '主催',
  '協賛',
  '代理店',
  '制作',
  '運営',
  '進行',
  '音響',
  '照明',
  '映像',
  '配信',
  '施工',
  '会場',
  'その他'
];

// 全てのレベル選択肢
export const STAFF_LEVELS: StaffLevel[] = [
  'マネージャー',
  'プロデューサー',
  'ディレクター',
  'AD',
  'オペレーター',
  'カメラマン',
  'その他'
];

// スタッフユーザーの型定義
export interface StaffUser {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  company?: string;
  staff_position?: StaffPosition;
  staff_level?: StaffLevel;
  status?: string;
  custom_status?: string | null;
  updated_at?: string;
  // 開発用に一時的に追加したパスワードハッシュ
  password_hash?: string;
}

// 新しいスタッフ作成レスポンスの型定義
export interface NewStaffResponse {
  success: boolean;
  staff?: {
    username: string;
    password: string;
    name: string;
    company?: string;
    position?: StaffPosition;
    level?: StaffLevel;
  };
  error?: string;
}
