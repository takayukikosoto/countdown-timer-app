// ユーザー関連の型定義

// ユーザーロールの定義
export type UserRole = 
  | 'admin'
  | 'staff'
  | 'organizer'
  | 'platinum_sponsor'
  | 'gold_sponsor'
  | 'agency'
  | 'production'
  | 'attendee'
  | 'vip_attendee';

// 全てのユーザーロール選択肢
export const USER_ROLES: UserRole[] = [
  'admin',
  'staff',
  'organizer',
  'platinum_sponsor',
  'gold_sponsor',
  'agency',
  'production',
  'attendee',
  'vip_attendee'
];

// ユーザーロールの表示名マッピング
export const USER_ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'admin': '管理者',
  'staff': 'スタッフ',
  'organizer': '主催者',
  'platinum_sponsor': 'プラチナスポンサー',
  'gold_sponsor': 'ゴールドスポンサー',
  'agency': '代理店',
  'production': '制作会社',
  'attendee': '参加者',
  'vip_attendee': 'VIP参加者'
};

// ユーザーの型定義
export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  company?: string;
  position?: string;
  level?: string;
}

// 認証済みユーザーの型定義
export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}
