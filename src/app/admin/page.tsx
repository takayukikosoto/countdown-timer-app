'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { USER_ROLE_DISPLAY_NAMES } from '@/types/user';

// ロール集計のインターフェース
interface RoleCount {
  role: string;
  count: number;
}

// 会社集計のインターフェース
interface CompanyCount {
  company: string;
  count: number;
}

// 最近のユーザーのインターフェース
interface RecentUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

// 統計情報のインターフェース
interface AdminStats {
  roleCounts: RoleCount[];
  recentUsers: RecentUser[];
  companyStats: CompanyCount[];
}

// 日時のフォーマット
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// ロールカラーの定義
const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'staff':
      return 'bg-blue-100 text-blue-800';
    case 'attendee':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isLoading, isAdmin } = auth;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, isLoading, isAdmin, router]);

  // 統計情報の取得
  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // 統計情報を取得する関数
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      setError(null);
      
      // 認証情報がある場合はヘッダーに追加
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (auth.session?.access_token) {
        headers['Authorization'] = `Bearer ${auth.session.access_token}`;
      }
      
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers,
        credentials: 'include' // クッキーを自動的に送信
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '統計情報の取得に失敗しました');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('統計情報取得エラー:', err);
      setError(err instanceof Error ? err.message : '統計情報の取得に失敗しました');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // ロールごとの合計を表示するコンポーネント
  const RoleSummary = ({ roleCounts }: { roleCounts: RoleCount[] }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {roleCounts.map((item) => (
          <Card key={item.role} className="p-4 shadow-md">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">
                  {USER_ROLE_DISPLAY_NAMES[item.role as keyof typeof USER_ROLE_DISPLAY_NAMES] || item.role}
                </h3>
                <p className="text-gray-500">ユーザー数</p>
              </div>
              <div className={`text-3xl font-bold px-4 py-2 rounded-full ${getRoleColor(item.role)}`}>
                {item.count}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // 会社ごとの合計を表示するコンポーネント
  const CompanySummary = ({ companyStats }: { companyStats: CompanyCount[] }) => {
    return (
      <Card className="p-4 shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">所属会社別ユーザー数</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会社名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー数</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companyStats.map((item) => (
                <tr key={item.company}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  // 最近のユーザーを表示するコンポーネント
  const RecentUsersList = ({ recentUsers }: { recentUsers: RecentUser[] }) => {
    return (
      <Card className="p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-4">最近追加されたユーザー</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">表示名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ロール</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.display_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {USER_ROLE_DISPLAY_NAMES[user.role as keyof typeof USER_ROLE_DISPLAY_NAMES] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
        <div className="flex space-x-2">
          <Link href="/admin/users" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            ユーザー管理
          </Link>
          <Link href="/admin/staff" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            スタッフ管理
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {isLoadingStats ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">統計情報を読み込み中...</p>
        </div>
      ) : stats ? (
        <>
          <h2 className="text-xl font-semibold mb-4">ロール別ユーザー数</h2>
          <RoleSummary roleCounts={stats.roleCounts} />
          
          {stats.companyStats.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mb-4">会社別統計</h2>
              <CompanySummary companyStats={stats.companyStats} />
            </>
          )}
          
          <h2 className="text-xl font-semibold mb-4">最近のユーザー</h2>
          <RecentUsersList recentUsers={stats.recentUsers} />
        </>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>統計情報がありません</p>
        </div>
      )}
    </div>
  );
}
