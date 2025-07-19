'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { USER_ROLES, USER_ROLE_DISPLAY_NAMES, UserRole } from '@/types/user';

interface UserData {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  company?: string;
  updated_at?: string;
}

// 日時のフォーマット（秒数まで表示）
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

export default function UserManagementPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isLoading, isAdmin } = auth;
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserLevel, setNewUserLevel] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('attendee');
  const [isCreating, setIsCreating] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{
    username: string;
    password: string;
    name: string;
    role: string;
    company?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 編集用の状態
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('attendee');
  const [isEditing, setIsEditing] = useState(false);

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, isLoading, isAdmin, router]);

  // ユーザー一覧の取得
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // 注意: auth変数は既に上部で取得済み
  
  // ユーザー一覧を取得する関数
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);
      
      // 認証情報がある場合はヘッダーに追加
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (auth.session?.access_token) {
        headers['Authorization'] = `Bearer ${auth.session.access_token}`;
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers,
        credentials: 'include' // クッキーを自動的に送信
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザー一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('ユーザー一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 新しいユーザーを作成する関数
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setError(null);
      setNewUserCredentials(null);
      
      // 認証情報がなければログインページへリダイレクト
      if (!auth.session || !auth.session.access_token) {
        console.error('認証情報がありません');
        setError('認証情報がありません。再ログインしてください。');
        router.push('/login');
        return;
      }
      
      // ロールが選択されているか確認
      if (!newUserRole) {
        setError('ロールを選択してください');
        return;
      }
      
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        credentials: 'include', // クッキーを自動的に送信
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.session.access_token}`
        },
        body: JSON.stringify({
          display_name: newUserName,
          company: newUserCompany || undefined,
          staff_position: newUserPosition || undefined,
          staff_level: newUserLevel || undefined,
          role: newUserRole
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザー作成に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // ユーザー一覧を再取得
        fetchUsers();
        
        // 認証情報を表示
        setNewUserCredentials({
          username: data.user.username,
          password: data.user.password,
          name: data.user.name,
          role: USER_ROLE_DISPLAY_NAMES[data.user.role as UserRole],
          company: data.user.company
        });
        
        // フォームをリセット
        setNewUserName('');
        setNewUserCompany('');
        setNewUserPosition('');
        setNewUserLevel('');
        setNewUserRole('attendee');
      } else {
        throw new Error(data.error || 'ユーザー作成に失敗しました');
      }
    } catch (err) {
      console.error('ユーザー作成エラー:', err);
      setError(err instanceof Error ? err.message : 'ユーザー作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  // ユーザーを削除する関数
  const deleteUser = async (userId: string) => {
    if (!confirm('このユーザーを削除しますか？この操作は元に戻せません。')) {
      return;
    }
    
    try {
      setError(null);
      
      // 認証情報がなければログインページへリダイレクト
      if (!auth.session || !auth.session.access_token) {
        console.error('認証情報がありません');
        setError('認証情報がありません。再ログインしてください。');
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include', // クッキーを自動的に送信
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザー削除に失敗しました');
      }
      
      // 成功時はユーザー一覧を再取得
      fetchUsers();
      
    } catch (err) {
      console.error('ユーザー削除エラー:', err);
      setError(err instanceof Error ? err.message : 'ユーザー削除に失敗しました');
    }
  };

  // 認証情報モーダルを閉じる
  const closeCredentialsModal = () => {
    setNewUserCredentials(null);
  };

  // 編集モーダルを開く
  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setEditDisplayName(user.display_name);
    setEditCompany(user.company || '');
    setEditRole(user.role);
  };

  // 編集モーダルを閉じる
  const closeEditModal = () => {
    setEditingUser(null);
    setEditDisplayName('');
    setEditCompany('');
    setEditRole('attendee');
    setIsEditing(false);
  };

  // ユーザー情報を更新する関数
  const updateUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    if (!editDisplayName.trim()) {
      setError('表示名は必須です');
      return;
    }
    
    try {
      setIsEditing(true);
      setError(null);
      
      // 認証情報がなければログインページへリダイレクト
      if (!auth.session || !auth.session.access_token) {
        console.error('認証情報がありません');
        setError('認証情報がありません。再ログインしてください。');
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        credentials: 'include', // クッキーを自動的に送信
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.session.access_token}`
        },
        body: JSON.stringify({
          display_name: editDisplayName,
          company: editCompany || undefined,
          role: editRole
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザー情報の更新に失敗しました');
      }
      
      // 成功時はユーザー一覧を再取得し、モーダルを閉じる
      fetchUsers();
      closeEditModal();
      
    } catch (err) {
      console.error('ユーザー情報更新エラー:', err);
      setError(err instanceof Error ? err.message : 'ユーザー情報の更新に失敗しました');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">新しいユーザーを作成</h2>
        <form onSubmit={createUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">表示名</label>
              <Input
                type="text"
                value={newUserName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUserName(e.target.value)}
                placeholder="ユーザー名"
                disabled={isCreating}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">所属（任意）</label>
              <Input
                type="text"
                value={newUserCompany}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUserCompany(e.target.value)}
                placeholder="例: 株式会社XXX"
                disabled={isCreating}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">ポジション（任意）</label>
              <Input
                type="text"
                value={newUserPosition}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUserPosition(e.target.value)}
                placeholder="例: マネージャー、ディレクター"
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">レベル（任意）</label>
              <Input
                type="text"
                value={newUserLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUserLevel(e.target.value)}
                placeholder="例: シニア、ジュニア"
                disabled={isCreating}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ロール</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              disabled={isCreating}
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>{USER_ROLE_DISPLAY_NAMES[role]}</option>
              ))}
            </select>
          </div>
          
          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? 'ユーザー作成中...' : 'ユーザーを作成'}
          </Button>
        </form>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">ユーザー一覧</h2>
        
        {isLoadingUsers ? (
          <p className="text-center py-4">読み込み中...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-4">ユーザーがいません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">表示名</th>
                  <th className="py-2 px-4 text-left">ユーザーID</th>
                  <th className="py-2 px-4 text-left">ロール</th>
                  <th className="py-2 px-4 text-left">所属</th>
                  <th className="py-2 px-4 text-left">作成日時</th>
                  <th className="py-2 px-4 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-4">{user.display_name}</td>
                    <td className="py-2 px-4">{user.username}</td>
                    <td className="py-2 px-4">{USER_ROLE_DISPLAY_NAMES[user.role]}</td>
                    <td className="py-2 px-4">{user.company || '-'}</td>
                    <td className="py-2 px-4">{formatDate(user.created_at)}</td>
                    <td className="py-2 px-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditModal(user)}
                        >
                          編集
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* ユーザー編集モーダル */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">ユーザー情報を編集</h3>
            <form onSubmit={updateUserInfo}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">表示名</label>
                <Input
                  type="text"
                  value={editDisplayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDisplayName(e.target.value)}
                  disabled={isEditing}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">所属（任意）</label>
                <Input
                  type="text"
                  value={editCompany}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCompany(e.target.value)}
                  placeholder="例: 株式会社XXX"
                  disabled={isEditing}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">ロール</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={isEditing}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>{USER_ROLE_DISPLAY_NAMES[role]}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={closeEditModal} disabled={isEditing}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isEditing}>
                  {isEditing ? '更新中...' : '更新'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 新しいユーザーの認証情報モーダル */}
      {newUserCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">新しいユーザーの認証情報</h3>
            <p className="mb-2 text-red-600 font-semibold">
              この情報は一度だけ表示されます。必ずメモしてください。
            </p>
            <div className="bg-gray-100 p-4 rounded mb-4">
              <p className="mb-2">
                <span className="font-semibold">ユーザー名:</span> {newUserCredentials.name}
              </p>
              <p className="mb-2">
                <span className="font-semibold">ユーザーID:</span> {newUserCredentials.username}
              </p>
              <p className="mb-2">
                <span className="font-semibold">パスワード:</span> {newUserCredentials.password}
              </p>
              <p className="mb-2">
                <span className="font-semibold">ロール:</span> {newUserCredentials.role}
              </p>
              {newUserCredentials.company && (
                <p className="mb-2">
                  <span className="font-semibold">所属:</span> {newUserCredentials.company}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={closeCredentialsModal}>閉じる</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
