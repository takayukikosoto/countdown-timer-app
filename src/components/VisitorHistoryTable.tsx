import React, { useState } from 'react';
import { useVisitorHistory, VisitorHistoryItem } from '@/hooks/useVisitorHistory_fixed';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowUpDown, Download } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

interface VisitorHistoryTableProps {
  days?: number;
  className?: string;
}

export default function VisitorHistoryTable({ days = 7, className = '' }: VisitorHistoryTableProps) {
  const { history, loading, error, refreshHistory, fetchByPeriod, getStatistics } = useVisitorHistory(days);
  const statistics = getStatistics();
  const [sortField, setSortField] = useState<keyof VisitorHistoryItem>('event_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // 日付範囲が変更されたときの処理
  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    fetchByPeriod(startDate, endDate);
  };

  // ソート処理
  const handleSort = (field: keyof VisitorHistoryItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ソートされたデータを取得
  const getSortedData = () => {
    if (!history) return [];
    
    return [...history].sort((a, b) => {
      if (sortField === 'count') {
        return sortDirection === 'asc' 
          ? a.count - b.count 
          : b.count - a.count;
      } else {
        // 日付でソート
        return sortDirection === 'asc'
          ? new Date(a[sortField] as string).getTime() - new Date(b[sortField] as string).getTime()
          : new Date(b[sortField] as string).getTime() - new Date(a[sortField] as string).getTime();
      }
    });
  };

  // CSVダウンロード
  const downloadCSV = () => {
    if (!history || history.length === 0) return;
    
    const headers = ['日付', '来場者数', '更新日時'];
    const csvData = history.map(item => [
      item.event_date,
      item.count,
      new Date(item.updated_at).toLocaleString('ja-JP')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `来場者数履歴_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 日付をフォーマット
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 時刻をフォーマット
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>来場者数履歴</CardTitle>
        <div className="flex space-x-2">
          <DateRangePicker 
            onDateRangeChange={handleDateRangeChange} 
            className="mr-2 w-64"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshHistory}
            disabled={loading}
          >
            更新
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadCSV}
            disabled={loading || history.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-2 rounded mb-4">
            エラー: {error}
          </div>
        )}
        
        {/* 統計情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
            <div className="text-xs text-gray-400">{statistics.maxDate ? formatDate(statistics.maxDate) : '-'}</div>
          </div>
          <div className="bg-black/30 p-3 rounded-lg">
            <div className="text-xs text-gray-300 mb-1">最小</div>
            <div className="text-xl font-bold">{statistics.min.toLocaleString('ja-JP')} 人</div>
            <div className="text-xs text-gray-400">{statistics.minDate ? formatDate(statistics.minDate) : '-'}</div>
          </div>
        </div>
        
        {/* テーブル */}
        <div className="rounded-md border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/40">
              <tr>
                <th className="py-3 px-4 text-left font-medium text-white">
                  <button 
                    className="flex items-center"
                    onClick={() => handleSort('event_date')}
                  >
                    日付
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'event_date' ? 'opacity-100' : 'opacity-50'}`} />
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-medium text-white">
                  <button 
                    className="flex items-center"
                    onClick={() => handleSort('count')}
                  >
                    来場者数
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'count' ? 'opacity-100' : 'opacity-50'}`} />
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-medium text-white">
                  <button 
                    className="flex items-center"
                    onClick={() => handleSort('updated_at')}
                  >
                    更新日時
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'updated_at' ? 'opacity-100' : 'opacity-50'}`} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-4 px-4 text-center text-gray-300">
                    データを読み込み中...
                  </td>
                </tr>
              ) : getSortedData().length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 px-4 text-center text-gray-300">
                    データがありません
                  </td>
                </tr>
              ) : (
                getSortedData().map((item) => (
                  <tr key={item.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="py-3 px-4">{formatDate(item.event_date)}</td>
                    <td className="py-3 px-4">{item.count.toLocaleString('ja-JP')} 人</td>
                    <td className="py-3 px-4">{formatDateTime(item.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
