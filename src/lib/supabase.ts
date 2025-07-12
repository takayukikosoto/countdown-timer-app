import { createClient } from '@supabase/supabase-js';

// Supabaseの設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// サーバーサイドではサービスロールキーを使用する
const isServer = typeof window === 'undefined';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseKey = isServer 
  ? supabaseServiceRoleKey
  : supabaseAnonKey;

// 環境変数が設定されていない場合の警告
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isServer && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.warn('一部のSupabase環境変数が設定されていません。デフォルト値を使用します。');
}

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseKey);

// 認証関連の型定義
export type AuthSession = {
  user: {
    id: string;
    email?: string;
    user_metadata: {
      name?: string;
      role?: string;
    };
  };
  access_token: string;
};

// 簡易的なセッション管理
const SESSION_KEY = 'timer_admin_session';
let currentSession: AuthSession | null = null;

// セッションをローカルストレージから読み込む
function loadSessionFromStorage(): AuthSession | null {
  // サーバーサイドではローカルストレージにアクセスできない
  if (typeof window === 'undefined') {
    console.log('サーバーサイドでの実行のため、セッションは読み込みません');
    return null;
  }
  
  try {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (!savedSession) {
      console.log('保存されたセッションがありません');
      return null;
    }
    
    const parsedSession = JSON.parse(savedSession) as AuthSession;
    console.log('ローカルストレージからセッションを読み込みました:', parsedSession);
    return parsedSession;
  } catch (e) {
    console.error('セッションの読み込みエラー:', e);
    // 無効なセッションをクリア
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

// セッションをローカルストレージに保存
function saveSessionToStorage(session: AuthSession | null): void {
  // サーバーサイドではローカルストレージにアクセスできない
  if (typeof window === 'undefined') {
    console.log('サーバーサイドでの実行のため、セッションは保存しません');
    return;
  }
  
  try {
    if (session) {
      console.log('セッションをローカルストレージに保存します:', session);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      console.log('セッションをクリアします');
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('セッションの保存エラー:', e);
  }
}

// 認証状態を確認する関数
export async function checkAuthStatus(): Promise<AuthSession | null> {
  console.log('認証状態を確認中...');
  
  // サーバーサイドの場合は空のセッションを返す
  if (typeof window === 'undefined') {
    console.log('サーバーサイドでの実行のため、nullを返します');
    return null;
  }
  
  // メモリにセッションがあればそれを返す
  if (currentSession) {
    console.log('メモリにセッションがあります:', currentSession);
    return currentSession;
  }
  
  // メモリになければストレージから読み込む
  const storedSession = loadSessionFromStorage();
  if (storedSession) {
    console.log('ストレージからセッションを読み込みました:', storedSession);
    currentSession = storedSession;
    return storedSession;
  }
  
  // ストレージにもなければ、テスト用に簡易的なセッション確認を行う
  // 実際のアプリでは、ここでSupabaseのセッションを確認する
  console.log('セッションが見つかりませんでした');
  return null;
}

// 簡易ログイン（アクセスコードによるログイン）
export async function loginWithAccessCode(accessCode: string) {
  // テスト用の固定アクセスコード
  const validAccessCodes = {
    'admin123': 'admin',
    'staff456': 'staff'
  };
  
  try {
    // アクセスコードの検証
    const role = validAccessCodes[accessCode as keyof typeof validAccessCodes];
    
    if (role) {
      // 有効なアクセスコードの場合、セッションを作成
      const mockSession: AuthSession = {
        user: {
          id: `user-${Date.now()}`,
          user_metadata: {
            name: role === 'admin' ? '管理者' : 'スタッフ',
            role: role
          }
        },
        access_token: `mock-token-${Date.now()}`
      };
      
      // セッションを保存
      currentSession = mockSession;
      saveSessionToStorage(mockSession);
      
      return {
        success: true,
        session: mockSession,
        role: role
      };
    } else {
      return { success: false, message: 'アクセスコードが無効です' };
    }
  } catch (error) {
    console.error('ログイン中にエラーが発生しました:', error);
    return { success: false, message: 'ログイン処理中にエラーが発生しました' };
  }
}

// ログアウト
export async function logout() {
  try {
    // Supabaseのログアウト処理
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // セッションをクリア
    currentSession = null;
    saveSessionToStorage(null);
    
    return true;
  } catch (error) {
    console.error('ログアウト中にエラーが発生しました:', error);
    return false;
  }
}
