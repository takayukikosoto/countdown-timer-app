import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold text-white flex items-center">
            <span className="text-blue-400 mr-2">⏱</span>
            タイマー管理システム
          </Link>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center">
                <span className="mr-4 text-sm text-gray-300">
                  {user.email} {isAdmin ? '(管理者)' : ''}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* サイドバーとメインコンテンツ */}
      <div className="flex flex-1">
        {/* サイドバー */}
        <aside className="w-64 bg-gray-800 shadow-md">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dashboard" 
                  className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  ダッシュボード
                </Link>
              </li>
              <li>
                <Link 
                  href="/timer" 
                  className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  タイマー管理
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/visitors" 
                  className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  来場者数管理
                </Link>
              </li>
              <li className="pt-4 border-t border-gray-700 mt-4">
                <Link 
                  href="/?mode=view" 
                  className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                  target="_blank"
                >
                  表示モード
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        
        {/* メインコンテンツ */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
