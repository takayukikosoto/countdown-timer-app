'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import VisitorCounterAdmin from '@/components/VisitorCounterAdmin';
import VisitorCounter from '@/components/VisitorCounter';
import VisitorHistoryTable from '@/components/VisitorHistoryTable';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { useVisitorHistory } from '@/hooks/useVisitorHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function VisitorsAdminPage() {
  const { user, isAdmin } = useAuth();
  const { count } = useVisitorCount();
  const { history, statistics } = useVisitorHistory(14);
  const [periodDays, setPeriodDays] = useState<number>(14);
  
  // 履歴データをグラフ用に整形
  const getChartData = () => {
    if (!history || history.length === 0) return [];
    
    return history
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .map(item => ({
        date: new Date(item.event_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        count: item.count
      }));
  };
  
  const visitorData = getChartData();

  // 期間を変更したときに履歴を再取得
  const handlePeriodChange = (days: number) => {
    setPeriodDays(days);
  };

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 bg-black/30 backdrop-blur-md rounded-lg">
            <h2 className="text-xl font-bold mb-2">ログインが必要です</h2>
            <p>この機能を利用するにはログインしてください。</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 bg-black/30 backdrop-blur-md rounded-lg">
            <h2 className="text-xl font-bold mb-2">権限がありません</h2>
            <p>この機能を利用するには管理者権限が必要です。</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">来場者数管理</h1>
          <p className="text-gray-400 mt-2">
            来場者数のリアルタイム管理と履歴の確認ができます。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 現在の来場者数 */}
          <Card>
            <CardHeader>
              <CardTitle>現在の来場者数</CardTitle>
              <CardDescription>
                現在の来場者数を表示します。リアルタイムで更新されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <VisitorCounter count={count || 0} size="xl" label="現在の来場者数" />
            </CardContent>
          </Card>

          {/* 来場者数管理 */}
          <Card>
            <CardHeader>
              <CardTitle>来場者数の管理</CardTitle>
              <CardDescription>
                来場者数の増減やリセットができます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisitorCounterAdmin />
            </CardContent>
          </Card>
        </div>

        {/* タブ切り替え */}
        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">グラフ</TabsTrigger>
            <TabsTrigger value="history">履歴</TabsTrigger>
          </TabsList>
          
          {/* 来場者数グラフ */}
          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>来場者数の推移</CardTitle>
                <CardDescription>
                  過去{periodDays}日間の来場者数の推移を表示します。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end space-x-2 mb-4">
                  <button 
                    onClick={() => handlePeriodChange(7)} 
                    className={`px-3 py-1 text-sm rounded ${periodDays === 7 ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    7日間
                  </button>
                  <button 
                    onClick={() => handlePeriodChange(14)} 
                    className={`px-3 py-1 text-sm rounded ${periodDays === 14 ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    14日間
                  </button>
                  <button 
                    onClick={() => handlePeriodChange(30)} 
                    className={`px-3 py-1 text-sm rounded ${periodDays === 30 ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    30日間
                  </button>
                </div>
                
                {visitorData.length === 0 ? (
                  <div className="h-[300px] w-full flex items-center justify-center bg-black/20 rounded-lg">
                    <p className="text-gray-400">データがありません</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={visitorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }} 
                          labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          name="来場者数" 
                          stroke="#8884d8" 
                          activeDot={{ r: 8 }} 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* 統計情報 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-black/30 p-3 rounded-lg">
                    <div className="text-xs text-gray-300 mb-1">合計</div>
                    <div className="text-xl font-bold">{statistics.total.toLocaleString('ja-JP')} 人</div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg">
                    <div className="text-xs text-gray-300 mb-1">平均</div>
                    <div className="text-xl font-bold">{statistics.average.toLocaleString('ja-JP')} 人/日</div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg">
                    <div className="text-xs text-gray-300 mb-1">最大</div>
                    <div className="text-xl font-bold">{statistics.max.toLocaleString('ja-JP')} 人</div>
                    <div className="text-xs text-gray-400">
                      {statistics.maxDate ? new Date(statistics.maxDate).toLocaleDateString('ja-JP') : '-'}
                    </div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg">
                    <div className="text-xs text-gray-300 mb-1">最小</div>
                    <div className="text-xl font-bold">{statistics.min.toLocaleString('ja-JP')} 人</div>
                    <div className="text-xs text-gray-400">
                      {statistics.minDate ? new Date(statistics.minDate).toLocaleDateString('ja-JP') : '-'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 来場者数履歴 */}
          <TabsContent value="history">
            <VisitorHistoryTable days={periodDays} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
