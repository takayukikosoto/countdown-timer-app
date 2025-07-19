'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession } from '@/lib/supabase';

// 認証コンテキストの型定義
export type AuthContextType = {
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  loading: boolean;
  isLoading: boolean; // isLoadingはloadingと同じ値（互換性のため）
  isAdmin: boolean;
  isStaff: boolean;
  userRole: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<boolean>;
};

// デフォルト値
const defaultAuthContext: AuthContextType = {
  session: null,
  user: null,
  loading: true,
  isLoading: true,
  isAdmin: false,
  isStaff: false,
  userRole: null,
  login: async () => ({ success: false }),
  logout: async () => false,
};

// コンテキストの作成
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// AuthProviderの型定義
type AuthProviderProps = {
  children: ReactNode;
};

// AuthProviderコンポーネント
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // 初期認証状態の確認
  useEffect(() => {
    async function getInitialSession() {
      try {
        console.log('初期認証状態を確認中...');
        // ローカルストレージからセッションを取得
        const storedSession = localStorage.getItem('auth_session');
        
        if (storedSession) {
          const session = JSON.parse(storedSession) as AuthSession;
          console.log('ローカルストレージから取得したセッション:', session);
          
          // トークンの有効期限をチェック
          const tokenData = parseJwt(session.access_token);
          const isTokenExpired = tokenData.exp * 1000 < Date.now();
          
          if (isTokenExpired) {
            console.log('トークンの有効期限が切れています。ログアウトします。');
            localStorage.removeItem('auth_session');
            setSession(null);
            setUser(null);
            setIsAdmin(false);
          } else {
            setSession(session);
            setUser(session?.user || null);
            
            // ユーザーロールと権限の確認
            const role = session?.user?.user_metadata?.role;
            const hasAdminRole = role === 'admin';
            const hasStaffRole = role === 'staff' || role === 'admin'; // 管理者はスタッフ権限も持つ
            console.log('ユーザーロール:', role, '管理者権限:', hasAdminRole, 'スタッフ権限:', hasStaffRole);
            setIsAdmin(hasAdminRole);
            setIsStaff(hasStaffRole);
            setUserRole(role || null);
          }
        } else {
          console.log('セッションが見つかりませんでした');
        }
      } catch (error) {
        console.error('初期認証状態の確認中にエラーが発生しました:', error);
        localStorage.removeItem('auth_session');
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();
  }, []);
  
  // JWTトークンをデコードする関数
  function parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('JWTトークンのパースに失敗しました:', error);
      return { exp: 0 };
    }
  }

  // ログイン関数
  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    console.log('ログイン処理開始:', { username });
    
    try {
      console.log('ログインAPIを呼び出し中...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // クッキーを含める
      });
      
      console.log('ログインAPIレスポンス受信:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok
      });
      
      let data;
      try {
        data = await response.json();
        console.log('レスポンスデータ:', { 
          hasData: !!data,
          hasSession: !!(data && data.session),
          hasUser: !!(data && data.user),
          hasError: !!(data && data.error),
          error: data?.error
        });
      } catch (e) {
        console.error('レスポンスのJSON解析エラー:', e);
        return { success: false, message: 'APIレスポンスの解析に失敗しました' };
      }
      
      if (!response.ok) {
        // エラーメッセージの取得とフォールバック
        let errorMessage = 'ログインに失敗しました';
        
        if (data && typeof data === 'object') {
          if (data.error && typeof data.error === 'string' && data.error.trim() !== '') {
            errorMessage = data.error;
          } else if (response.status === 401) {
            errorMessage = 'ユーザー名またはパスワードが正しくありません';
          } else if (response.status === 500) {
            errorMessage = 'サーバーエラーが発生しました。後ほど再度お試しください';
          }
        }
        
        console.error('ログインに失敗しました:');
        console.error('ステータス:', response.status);
        console.error('ステータステキスト:', response.statusText);
        console.error('エラー:', data?.error || 'エラー詳細なし');
        console.error('エラーメッセージ:', errorMessage);
        console.error('レスポンスデータ:', JSON.stringify(data, null, 2));
        
        return { success: false, message: errorMessage };
      }
      
      console.log('ログイン成功:', { 
        hasSession: !!(data && data.session),
        hasUser: !!(data && data.user),
        user: data?.user
      });
      
      // セッションを保存
      const { session, user } = data;
      
      if (!session || !user) {
        console.error('ログイン成功しましたが、セッションまたはユーザー情報がありません');
        return { success: false, message: '認証に成功しましたが、セッション情報が不完全です' };
      }
      
      setSession(session);
      setUser(user);
      
      // ユーザーロールの設定
      const role = user?.role || null;
      setUserRole(role);
      setIsAdmin(role === 'admin');
      setIsStaff(role === 'staff');
      
      console.log('ユーザーロール設定:', { role, isAdmin: role === 'admin', isStaff: role === 'staff' });
      
      // セッション情報とトークンをlocalStorageに保存
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token);
        localStorage.setItem('auth_session', JSON.stringify(session));
        console.log('セッション情報とトークンを保存しました');
      } else {
        console.warn('アクセストークンがありません');
      }
      // ログイン成功時のみダッシュボードにリダイレクト
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = '/dashboard';
        }
      }, 1000);
      
      return { success: true };
    } catch (error) {
      console.error('ログイン処理中にエラーが発生しました:');
      console.error('エラータイプ:', typeof error);
      console.error('エラー内容:', error);
      if (error instanceof Error) {
        console.error('エラーメッセージ:', error.message);
        console.error('スタックトレース:', error.stack);
      }
      return { success: false, message: 'ログイン処理中にエラーが発生しました' };
    } finally {
      setLoading(false);
    }
  };

  // ログアウト関数
  const handleLogout = async () => {
    try {
      // ローカルストレージからセッション情報とトークンを削除
      localStorage.removeItem('auth_session');
      localStorage.removeItem('auth_token');
      
      // クッキーからトークンを削除
      document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict; Secure';
      
      // 状態をリセット
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setIsStaff(false);
      setUserRole(null);
      
      console.log('ログアウトしました');
      return true;
    } catch (error) {
      console.error('ログアウト処理中にエラーが発生しました:', error);
      return false;
    }
  };

  // コンテキスト値
  const value = {
    session,
    user,
    loading,
    isLoading: loading, // isLoadingとloadingを同期
    isAdmin,
    isStaff,
    userRole,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 認証コンテキストを使用するためのフック
export const useAuth = () => useContext(AuthContext);
