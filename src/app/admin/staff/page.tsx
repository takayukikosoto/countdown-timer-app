'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import StaffQRCodeGenerator from '@/components/StaffQRCodeGenerator';
import { StaffUser, NewStaffResponse, STAFF_POSITIONS, STAFF_LEVELS, StaffPosition, StaffLevel } from '@/types/staff';

// 型定義は src/types/staff.ts に移動しました

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

// 日時のフォーマット（秒数なし）
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

export default function StaffManagementPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffCompany, setNewStaffCompany] = useState('');
  const [newStaffPosition, setNewStaffPosition] = useState<StaffPosition | null>(null);
  const [newStaffLevel, setNewStaffLevel] = useState<StaffLevel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStaffCredentials, setNewStaffCredentials] = useState<{
    username: string;
    password: string;
    name: string;
    company?: string;
    position?: string;
    level?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeQRStaff, setActiveQRStaff] = useState<string | null>(null);
  
  // スタッフ編集用の状態
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPosition, setEditPosition] = useState<StaffPosition | null>(null);
  const [editLevel, setEditLevel] = useState<StaffLevel | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
      
      // スタッフ一覧とステータスを取得
      const staffStatusResponse = await fetch('/api/admin/staff/status');
      
      if (!staffStatusResponse.ok) {
        throw new Error('スタッフステータスの取得に失敗しました');
      }
      
      const staffStatusData = await staffStatusResponse.json();
      
      if (!staffStatusData.success) {
        throw new Error(staffStatusData.error || 'スタッフステータスの取得に失敗しました');
      }
      
      // スタッフデータを整形
      const formattedStaffList = staffStatusData.staff_status.map((staff: any) => {
        // 最新のステータスを取得
        const latestStatus = staff.status && staff.status.length > 0 ? staff.status[0] : null;
        
        return {
          id: staff.id,
          username: staff.username,
          display_name: staff.display_name,
          company: staff.company,
          staff_position: staff.staff_position,
          staff_level: staff.staff_level,
          created_at: staff.created_at,
          status: latestStatus?.status || '出発前',
          custom_status: latestStatus?.custom_status || null,
          updated_at: latestStatus?.updated_at || staff.created_at
        };
      });
      
      console.log('スタッフリスト取得成功:', formattedStaffList);
      setStaffUsers(formattedStaffList);
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
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: newStaffName,
          company: newStaffCompany || undefined,
          staff_position: newStaffPosition === null ? undefined : newStaffPosition,
          staff_level: newStaffLevel === null ? undefined : newStaffLevel
        }),
      });
      
      const data = await response.json();
      console.log('スタッフ作成レスポンス:', data); // レスポンスを確認
      
      if (!response.ok) {
        throw new Error(data.error || 'スタッフの作成に失敗しました');
      }
      
      if (data.success && data.staff) {
        // 新しいスタッフを追加
        setNewStaffCredentials(data.staff);
        setNewStaffName('');
        setNewStaffCompany('');
        setNewStaffPosition(null);
        setNewStaffLevel(null);
        
        // スタッフ一覧を更新
        await fetchStaffUsers();
        
        // QRコードを自動生成（少し遅延させて新しいスタッフが一覧に表示されるのを待つ）
        setTimeout(async () => {
          try {
            // 新しく作成されたスタッフのQRコードを生成
            const qrResponse = await fetch('/api/admin/staff/qr-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ staffId: data.staff.id }),
            });
            
            if (qrResponse.ok) {
              // QRコード生成成功後、そのスタッフのQRコードを表示
              setActiveQRStaff(data.staff.id);
            }
          } catch (qrErr) {
            console.error('QRコード自動生成エラー:', qrErr);
            // QRコード生成エラーはユーザー体験を妨げないよう、表示しない
          }
        }, 1000);
      } else {
        throw new Error(data.error || 'スタッフの作成に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('スタッフ作成エラー:', err);
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
  
  // 編集モーダルを開く
  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditDisplayName(staff.display_name);
    setEditCompany(staff.company || '');
    setEditPosition(staff.staff_position ? staff.staff_position as StaffPosition : null);
    setEditLevel(staff.staff_level ? staff.staff_level as StaffLevel : null);
  };
  
  // 編集モーダルを閉じる
  const closeEditModal = () => {
    setEditingStaff(null);
    setEditDisplayName('');
    setEditCompany('');
    setEditPosition(null);
    setEditLevel(null);
  };
  
  // スタッフ情報を更新する関数
  const updateStaffInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStaff) return;
    
    try {
      setIsEditing(true);
      setError(null);
      
      const response = await fetch('/api/admin/staff/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: editingStaff.id,
          display_name: editDisplayName,
          company: editCompany || undefined,
          staff_position: editPosition === null ? undefined : editPosition,
          staff_level: editLevel === null ? undefined : editLevel
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'スタッフ情報の更新に失敗しました');
      }
      
      // スタッフ一覧を更新
      setStaffUsers(prevList => {
        const newList = [...prevList];
        const index = newList.findIndex(item => item.id === editingStaff.id);
        
        if (index !== -1) {
          newList[index] = {
            ...newList[index],
            display_name: editDisplayName,
            company: editCompany,
            staff_position: editPosition === null ? undefined : editPosition,
            staff_level: editLevel === null ? undefined : editLevel
          };
        }
        
        return newList;
      });
      
      // モーダルを閉じる
      closeEditModal();
      
    } catch (error: any) {
      console.error('スタッフ情報更新エラー:', error);
      setError(error.message || 'スタッフ情報の更新に失敗しました');
    } finally {
      setIsEditing(false);
    }
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
        <form onSubmit={createStaffUser} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="staffName" className="block text-sm font-medium text-gray-700 mb-1">スタッフ名 *</label>
              <Input
                id="staffName"
                type="text"
                placeholder="スタッフ名"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div>
              <label htmlFor="staffCompany" className="block text-sm font-medium text-gray-700 mb-1">所属会社</label>
              <Input
                id="staffCompany"
                type="text"
                placeholder="所属会社名"
                value={newStaffCompany}
                onChange={(e) => setNewStaffCompany(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div>
              <label htmlFor="staffPosition" className="block text-sm font-medium text-gray-700 mb-1">ポジション</label>
              <select
                id="staffPosition"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newStaffPosition || ''}
                onChange={(e) => setNewStaffPosition(e.target.value ? e.target.value as StaffPosition : null)}
                disabled={isCreating}
              >
                <option value="">選択してください</option>
                {STAFF_POSITIONS.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="staffLevel" className="block text-sm font-medium text-gray-700 mb-1">レベル</label>
              <select
                id="staffLevel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newStaffLevel || ''}
                onChange={(e) => setNewStaffLevel(e.target.value ? e.target.value as StaffLevel : null)}
                disabled={isCreating}
              >
                <option value="">選択してください</option>
                {STAFF_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isCreating}>
              {isCreating ? '作成中...' : 'スタッフを作成'}
            </Button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
      </Card>
      
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
                    所属
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ポジション/レベル
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
                      {staff.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {staff.staff_position ? staff.staff_position : '-'}
                      {staff.staff_position && staff.staff_level ? ' / ' : ''}
                      {staff.staff_level ? staff.staff_level : ''}
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
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(staff)}
                      >
                        編集
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
      
      {/* スタッフ編集モーダル */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">スタッフ情報の編集</h3>
            {error && <p className="text-red-600 mb-4">{error}</p>}
            
            <form onSubmit={updateStaffInfo}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">表示名</label>
                <Input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">所属</label>
                <Input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="例: 株式会社XXX"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">ポジション</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editPosition || ''}
                  onChange={(e) => setEditPosition(e.target.value ? e.target.value as StaffPosition : null)}
                  disabled={isEditing}
                >
                  <option value="">選択してください</option>
                  {STAFF_POSITIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">レベル</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editLevel || ''}
                  onChange={(e) => setEditLevel(e.target.value ? e.target.value as StaffLevel : null)}
                  disabled={isEditing}
                >
                  <option value="">選択してください</option>
                  {STAFF_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
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
              {newStaffCredentials.company && (
                <p className="mb-2">
                  <span className="font-semibold">所属:</span> {newStaffCredentials.company}
                </p>
              )}
              {newStaffCredentials.position && (
                <p className="mb-2">
                  <span className="font-semibold">ポジション:</span> {newStaffCredentials.position}
                </p>
              )}
              {newStaffCredentials.level && (
                <p className="mb-2">
                  <span className="font-semibold">レベル:</span> {newStaffCredentials.level}
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
