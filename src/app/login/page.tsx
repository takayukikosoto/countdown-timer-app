'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import QRCodeScanner from '@/components/QRCodeScanner';

// useSearchParams()を使用するコンポーネントを分離
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAdmin, isStaff, user } = useAuth();

  // すでにログインしている場合は適切なページにリダイレクト
  useEffect(() => {
    if (!loading && user) {
      console.log('ログイン済みユーザーを検出:', user);
      if (isAdmin) {
        console.log('管理者権限を確認、ダッシュボードにリダイレクトします');
        router.push('/dashboard');
      } else if (isStaff) {
        console.log('スタッフ権限を確認、スタッフページにリダイレクトします');
        router.push('/staff');
      } else {
        console.log('一般ユーザー、ホームにリダイレクトします');
        router.push('/');
      }
    }
  }, [user, isAdmin, isStaff, loading, router]);
  
  // URLからQRコードトークンを取得
  useEffect(() => {
    const qrToken = searchParams.get('qr');
    if (qrToken) {
      handleQRLogin(qrToken);
    }
  }, [searchParams]);

  // 通常のログイン処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }
    
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        setShowSuccess(true);
        console.log('ログイン成功');
        // 成功メッセージを表示した後、ダッシュボードにリダイレクト
        setTimeout(() => {
          // 権限に応じて適切なページにリダイレクト
          if (isAdmin) {
            console.log('管理者権限を確認、ダッシュボードにリダイレクトします');
            router.push('/dashboard');
            window.location.href = '/dashboard';
          } else if (isStaff) {
            console.log('スタッフ権限を確認、スタッフページにリダイレクトします');
            router.push('/staff');
            window.location.href = '/staff';
          } else {
            console.log('一般ユーザー、ホームにリダイレクトします');
            router.push('/');
            window.location.href = '/';
          }
        }, 1000);
      } else {
        setError(result.message || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // QRコードによるログイン処理
  const handleQRLogin = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/qr-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setShowSuccess(true);
        console.log('QRコードログイン成功');
        
        // 成功メッセージを表示した後、適切なページにリダイレクト
        setTimeout(() => {
          const user = result.user;
          if (user.role === 'admin') {
            router.push('/dashboard');
            window.location.href = '/dashboard';
          } else if (user.role === 'staff') {
            router.push('/staff');
            window.location.href = '/staff';
          } else {
            router.push('/');
            window.location.href = '/';
          }
        }, 1000);
      } else {
        setError(result.error || 'QRコードログインに失敗しました');
      }
    } catch (err) {
      setError('QRコードログイン処理中にエラーが発生しました');
      console.error('QR login error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // QRコードスキャナーを表示
  const showScanner = () => {
    setShowQRScanner(true);
  };
  
  // QRコードスキャナーを閉じる
  const closeScanner = () => {
    setShowQRScanner(false);
  };
  
  // QRコードスキャン結果の処理
  const handleScan = (token: string) => {
    if (token) {
      handleQRLogin(token);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-black/50 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-gray-800">
          <h1 className="text-3xl font-bold text-center text-white mb-8">管理者ログイン</h1>
          
          {showSuccess ? (
            <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-6 text-center">
              <p>ログインに成功しました！</p>
              <p className="text-sm">ダッシュボードにリダイレクトします...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  ユーザー名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="ユーザー名を入力"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="パスワードを入力"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all ${
                    loading 
                      ? 'bg-blue-700/50 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      ログイン中...
                    </div>
                  ) : (
                    'ログイン'
                  )}
                </button>
              </div>
              
              <div className="mt-4">
                <button
                  type="button"
                  onClick={showScanner}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all ${
                    loading 
                      ? 'bg-gray-700/50 cursor-not-allowed' 
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QRコードでログイン
                  </div>
                </button>
              </div>
              
              <div className="text-center mt-4">
                <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  ホームに戻る
                </Link>
              </div>
              
              {/* QRコードスキャナー */}
              {showQRScanner && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                  <div className="w-full max-w-md px-4">
                    <QRCodeScanner 
                      onScan={handleScan} 
                      onClose={closeScanner} 
                    />
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
        
        <p className="text-center text-gray-500 text-xs mt-8">
          &copy; {new Date().getFullYear()} イベントタイマー管理システム
        </p>
      </div>
    </div>
  );
}

// メインページコンポーネント（Suspenseでラップ）
function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <LoginForm />
    </Suspense>
  );
}

export default LoginPage;
