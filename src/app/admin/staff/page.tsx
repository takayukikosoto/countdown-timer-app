'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import StaffQRCodeGenerator from '@/components/StaffQRCodeGenerator';

interface StaffUser {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  status?: string;
  custom_status?: string | null;
  updated_at?: string;
}

interface NewStaffResponse {
  success: boolean;
  staff?: {
    username: string;
    password: string;
    name: string;
  };
  error?: string;
}

// ステータスに応じた背景色を取得
const getStatusBgColor = (status: string) => {
  switch (status) {
    case '出発前': return 'bg-gray-100';
    case '出発OK': return 'bg-green-100';
    case '到着': return 'bg-blue-100';
    case '勤務中': return 'bg-indigo-100';
    case '業務終了': return 'bg-purple-100';
    case 'カスタム': return 'bg-yellow-100';
    default: return 'bg-gray-100';
  }
};

// 日時のフォーマット
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

export default function StaffManagementPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [newStaffName, setNewStaffName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newStaffCredentials, setNewStaffCredentials] = useState<{
    username: string;
    password: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeQRStaff, setActiveQRStaff] = useState<string | null>(null);

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, isLoading, isAdmin, router]);

  // スタッフ一覧の取得
  useEffect(() => {
    if (isAdmin) {
      fetchStaffUsers();
    }
  }, [isAdmin]);
  
  // Socket.IOイベントリスナーの設定
  useEffect(() => {
    if (!socket || !connected) return;

    // スタッフステータス更新イベント
    const handleStaffStatusUpdate = (data: { 
      staff_id: string;
      status: string;
      custom_status: string | null;
      updated_at: string;
    }) => {
      setStaffUsers(prevList => {
        const newList = [...prevList];
        const index = newList.findIndex(item => item.id === data.staff_id);
        
        if (index !== -1) {
          newList[index] = {
            ...newList[index],
            status: data.status,
            custom_status: data.custom_status,
            updated_at: data.updated_at
          };
        }
        
        return newList;
      });
    };
    
    socket.on('staff:status_update', handleStaffStatusUpdate);
    
    return () => {
      socket.off('staff:status_update', handleStaffStatusUpdate);
    };
  }, [socket, connected]);

  // スタッフ一覧とステータスを取得する関数
  const fetchStaffUsers = async () => {
    try {
      setIsLoadingStaff(true);
      
      // スタッフ一覧を取得
      const staffResponse = await fetch('/api/admin/staff');
      
      if (!staffResponse.ok) {
        throw new Error('スタッフ一覧の取得に失敗しました');
      }
      
      const staffData = await staffResponse.json();
      const staffList = staffData.staff || [];
      
      // スタッフステータス一覧を取得
      console.log('スタッフステータス一覧取得開始');
      const statusResponse = await fetch('/api/admin/staff/status');
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('スタッフステータスレスポンス:', statusData);
        
        const statusList = statusData.staff_status || [];
        console.log('スタッフステータス一覧:', statusList);
        
        // スタッフ一覧とステータス情報を統合
        const mergedList = staffList.map((staff: StaffUser) => {
          console.log('スタッフデータ処理中:', staff.id, staff.display_name);
          // staff_idとidの値を比較してデバッグ
          const matchingStatus = statusList.filter((status: any) => {
            console.log('ステータス比較:', status.staff_id, staff.id, status.staff_id === staff.id);
            return status.staff_id === staff.id;
          });
          
          const statusInfo = matchingStatus.length > 0 ? matchingStatus[0] : null;
          console.log('ステータス情報見つかったか:', !!statusInfo, statusInfo);
          
          return {
            ...staff,
            status: statusInfo?.status || '出発前',
            custom_status: statusInfo?.custom_status || null,
            updated_at: statusInfo?.updated_at || staff.created_at
          };
        });
        
        console.log('統合後のスタッフリスト:', mergedList);
        setStaffUsers(mergedList);
      } else {
        // ステータス取得に失敗した場合のエラー詳細を取得
        const errorText = await statusResponse.text();
        console.error('スタッフステータス取得エラー:', statusResponse.status, errorText);
        setStaffUsers(staffList);
      }
    } catch (error) {
      console.error('スタッフ一覧取得エラー:', error);
      setError('スタッフ一覧の取得に失敗しました');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // 新しいスタッフを作成する関数
  const createStaffUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStaffName.trim()) {
      setError('スタッフ名を入力してください');
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newStaffName }),
      });
      
      const data: NewStaffResponse = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'スタッフの作成に失敗しました');
      }
      
      // 成功した場合、新しい認証情報を表示
      if (data.staff) {
        setNewStaffCredentials(data.staff);
        setNewStaffName('');
        // スタッフ一覧を更新
        fetchStaffUsers();
      }
    } catch (error: any) {
      console.error('スタッフ作成エラー:', error);
      setError(error.message || 'スタッフの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  // スタッフを削除する関数
  const deleteStaffUser = async (staffId: string) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('スタッフの削除に失敗しました');
      }
      
      // 成功した場合、スタッフ一覧を更新
      fetchStaffUsers();
    } catch (error) {
      console.error('スタッフ削除エラー:', error);
      setError('スタッフの削除に失敗しました');
    }
  };

  // 認証情報モーダルを閉じる
  const closeCredentialsModal = () => {
    setNewStaffCredentials(null);
  };

  if (isLoading) {
    return <div className="p-8 text-center">読み込み中...</div>;
  }

  if (!user || !isAdmin) {
    return null; // useEffectでリダイレクトするため
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">スタッフ管理</h1>
      
      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 新しいスタッフ作成フォーム */}
      <Card className="p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">新しいスタッフを追加</h2>
        <form onSubmit={createStaffUser} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="staffName" className="block text-sm font-medium mb-1">
              スタッフ名
            </label>
            <Input
              id="staffName"
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="スタッフの名前を入力"
              disabled={isCreating}
            />
          </div>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? '作成中...' : 'スタッフを作成'}
          </Button>
        </form>
      </Card>
      
      {/* スタッフ一覧にステータス情報を統合表示 */}
      
      {/* スタッフ一覧 */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">スタッフ一覧</h2>
        
        {isLoadingStaff ? (
          <p className="text-center py-4">読み込み中...</p>
        ) : staffUsers.length === 0 ? (
          <p className="text-center py-4">スタッフが登録されていません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    スタッフ名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザーID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終更新
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffUsers.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {staff.display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {staff.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBgColor(staff.status || '出発前')}`}>
                        {staff.status === 'カスタム' && staff.custom_status ? staff.custom_status : staff.status || '出発前'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {staff.updated_at ? formatDate(staff.updated_at) : new Date(staff.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveQRStaff(staff.id === activeQRStaff ? null : staff.id)}
                      >
                        QRコード
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteStaffUser(staff.id)}
                      >
                        削除
                      </Button>
                      
                      {activeQRStaff === staff.id && (
                        <div className="mt-2">
                          <StaffQRCodeGenerator 
                            staffId={staff.id} 
                            username={staff.username} 
                            displayName={staff.display_name} 
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* 新しいスタッフの認証情報モーダル */}
      {newStaffCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">新しいスタッフの認証情報</h3>
            <p className="mb-2 text-red-600 font-semibold">
              この情報は一度だけ表示されます。必ずメモしてください。
            </p>
            <div className="bg-gray-100 p-4 rounded mb-4">
              <p className="mb-2">
                <span className="font-semibold">スタッフ名:</span> {newStaffCredentials.name}
              </p>
              <p className="mb-2">
                <span className="font-semibold">ユーザーID:</span> {newStaffCredentials.username}
              </p>
              <p className="mb-2">
                <span className="font-semibold">パスワード:</span> {newStaffCredentials.password}
              </p>
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
