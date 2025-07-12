'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession } from '@/lib/supabase';

// 認証コンテキストの型定義
type AuthContextType = {
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<boolean>;
};

// デフォルト値
const defaultAuthContext: AuthContextType = {
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
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
            
            // 管理者権限の確認
            const role = session?.user?.user_metadata?.role;
            const hasAdminRole = role === 'admin';
            console.log('ユーザーロール:', role, '管理者権限:', hasAdminRole);
            setIsAdmin(hasAdminRole);
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
    try {
      console.log('ログイン処理を開始します:', { username });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('ログインに失敗しました:', data.error);
        return { success: false, message: data.error || 'ログインに失敗しました' };
      }
      
      console.log('ログイン成功:', data);
      
      // セッション情報を保存
      const session = data.session as AuthSession;
      localStorage.setItem('auth_session', JSON.stringify(session));
      
      // クッキーにトークンを保存
      document.cookie = `auth_token=${session.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict; Secure`;
      
      setSession(session);
      setUser(session.user);
      
      // ユーザーロールを確認
      const role = session.user.user_metadata?.role;
      console.log('ユーザーロール:', role);
      setIsAdmin(role === 'admin');
      
      // ログイン成功時のみダッシュボードにリダイレクト
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = '/dashboard';
        }
      }, 1000);
      
      return { success: true };
    } catch (error) {
      console.error('ログイン処理中にエラーが発生しました:', error);
      return { success: false, message: 'ログイン処理中にエラーが発生しました' };
    }
  };

  // ログアウト関数
  const handleLogout = async () => {
    try {
      // ローカルストレージからセッション情報を削除
      localStorage.removeItem('auth_session');
      
      // クッキーからトークンを削除
      document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict; Secure';
      
      // 状態をリセット
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      
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
    isAdmin,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 認証コンテキストを使用するためのフック
export const useAuth = () => useContext(AuthContext);
