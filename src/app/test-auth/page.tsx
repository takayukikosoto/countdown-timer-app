'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestAuthPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testUser, setTestUser] = useState<{username: string, password: string, role: string} | null>(null);

  // テストユーザーを作成
  const handleCreateTestUser = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      // ランダムなユーザー名を生成
      const randomUsername = `test_${Math.floor(Math.random() * 10000)}`;
      const randomPassword = `pass_${Math.floor(Math.random() * 10000)}`;
      
      const response = await fetch('/api/auth/test-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username || randomUsername, 
          password: password || randomPassword,
          role
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(`ユーザー作成エラー: ${data.error || '不明なエラー'}`);
        return;
      }
      
      setMessage(`テストユーザーを作成しました: ${username || randomUsername}`);
      setTestUser({
        username: username || randomUsername,
        password: password || randomPassword,
        role
      });
    } catch (error) {
      setError(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // テストユーザーでログイン
  const handleLoginWithTestUser = async () => {
    if (!testUser) {
      setError('先にテストユーザーを作成してください');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('テストユーザーでログインを試行:', {
        username: testUser.username,
        passwordLength: testUser.password.length
      });
      
      // 直接APIを呼び出してログイン
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username: testUser.username, 
          password: testUser.password 
        }),
      });
      
      const data = await response.json();
      console.log('ログインレスポンス:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      if (!response.ok) {
        setError(`ログインエラー: ${data.error || '不明なエラー'}`);
        return;
      }
      
      // セッション情報をローカルストレージに保存
      localStorage.setItem('auth_session', JSON.stringify(data.session));
      
      setMessage('ログイン成功！リダイレクトします...');
      
      // ロールに応じてリダイレクト
      setTimeout(() => {
        const role = data.user?.role;
        const redirectPath = role === 'admin' ? '/dashboard' : '/staff';
        console.log(`リダイレクト先: ${redirectPath}`);
        window.location.href = redirectPath;
      }, 1000);
      
    } catch (error) {
      console.error('ログイン処理中にエラーが発生しました:', error);
      setError(`エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-6">認証テストページ</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">テストユーザー作成</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">ユーザー名 (空の場合はランダム生成)</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="username"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">パスワード (空の場合はランダム生成)</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="password"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">ロール</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="staff">スタッフ</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        
        <button
          onClick={handleCreateTestUser}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '処理中...' : 'テストユーザーを作成'}
        </button>
      </div>
      
      {testUser && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
          <h3 className="font-semibold text-green-800 mb-2">テストユーザー情報</h3>
          <p><span className="font-medium">ユーザー名:</span> {testUser.username}</p>
          <p><span className="font-medium">パスワード:</span> {testUser.password}</p>
          <p><span className="font-medium">ロール:</span> {testUser.role}</p>
          
          <button
            onClick={handleLoginWithTestUser}
            className="mt-3 w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            このユーザーでログイン
          </button>
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 text-green-800 p-3 rounded mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">認証方法</h2>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-800">
            <span className="font-medium">注意:</span> ハードコード認証は廃止されました。
          </p>
          <p className="text-yellow-800 mt-2">
            すべてのユーザーはSupabaseデータベースに登録されている必要があります。
          </p>
          <p className="text-yellow-800 mt-2">
            管理者にユーザーアカウントの作成を依頼してください。
          </p>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <a href="/login" className="text-blue-600 hover:underline">
          ログインページに戻る
        </a>
      </div>
    </div>
  );
}
