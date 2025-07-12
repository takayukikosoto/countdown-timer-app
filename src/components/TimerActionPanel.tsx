'use client';

import React, { useState, useEffect } from 'react';
import { useTimerActions } from '@/hooks/useTimerActions';
import { useTimerData } from '@/hooks/useTimerData';
import { TimerAction, TimerActionType } from '@/lib/timerActionTypes';
import { formatTimeClient } from '@/lib/timerTypes';

interface TimerActionPanelProps {
  className?: string;
}

export default function TimerActionPanel({ className = '' }: TimerActionPanelProps) {
  const { currentTimer } = useTimerData();
  const { actions, loading, createAction, updateAction, deleteAction } = useTimerActions(
    currentTimer?.id
  );
  
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [newAction, setNewAction] = useState<Partial<TimerAction>>({
    type: 'message',
    triggerTime: 60000, // デフォルト1分
    message: '',
    color: '#ffffff',
    flash: false,
    enabled: true
  });
  
  const [editingAction, setEditingAction] = useState<TimerAction | null>(null);
  
  // タイマーが変更されたら新しいアクションのタイマーIDを更新
  useEffect(() => {
    if (currentTimer) {
      setNewAction(prev => ({ ...prev, timerId: currentTimer.id }));
    }
  }, [currentTimer]);
  
  // 編集モードを開始
  const handleEditAction = (action: TimerAction) => {
    setEditingAction(action);
    setIsCreatingAction(false);
  };
  
  // 編集をキャンセル
  const handleCancelEdit = () => {
    setEditingAction(null);
  };
  
  // アクションを更新
  const handleUpdateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction) return;
    
    await updateAction(editingAction);
    setEditingAction(null);
  };
  
  // アクションを作成
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTimer) return;
    
    await createAction({
      ...newAction,
      timerId: currentTimer.id
    });
    
    // フォームをリセット
    setNewAction({
      type: 'message',
      triggerTime: 60000,
      message: '',
      color: '#ffffff',
      flash: false,
      enabled: true,
      timerId: currentTimer.id
    });
    
    setIsCreatingAction(false);
  };
  
  // アクションを削除
  const handleDeleteAction = async (actionId: string) => {
    if (window.confirm('このアクションを削除してもよろしいですか？')) {
      await deleteAction(actionId);
    }
  };
  
  // アクションの有効/無効を切り替え
  const handleToggleEnabled = async (action: TimerAction) => {
    await updateAction({
      id: action.id,
      enabled: !action.enabled
    });
  };
  
  // トリガー時間をフォーマット
  const formatTriggerTime = (ms: number): string => {
    return formatTimeClient(ms, true, true);
  };
  
  // アクションタイプの表示名を取得
  const getActionTypeName = (type: TimerActionType): string => {
    switch (type) {
      case 'message':
        return 'メッセージ';
      case 'color':
        return '色変更';
      case 'both':
        return 'メッセージ＆色変更';
      default:
        return '不明';
    }
  };
  
  if (!currentTimer) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <h2 className="text-xl font-bold mb-4">タイマーアクション</h2>
        <p className="text-gray-500 dark:text-gray-400">
          タイマーが選択されていません
        </p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">タイマーアクション</h2>
        {!isCreatingAction && !editingAction && (
          <button
            onClick={() => setIsCreatingAction(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            新規アクション
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        カウントダウン中に特定の残り時間でメッセージ表示や画面色変更を行います
      </p>
      
      {/* アクション作成フォーム */}
      {isCreatingAction && (
        <form onSubmit={handleCreateAction} className="mb-6 p-4 border rounded">
          <h3 className="font-bold mb-3">新規アクション</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">アクションタイプ</label>
            <select
              value={newAction.type}
              onChange={(e) => setNewAction({...newAction, type: e.target.value as TimerActionType})}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700"
            >
              <option value="message">メッセージ</option>
              <option value="color">画面色変更</option>
              <option value="both">メッセージ＆色変更</option>
            </select>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              トリガー時間（残り時間 mm:ss）
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={Math.floor(newAction.triggerTime! / 60000)}
                onChange={(e) => {
                  const minutes = parseInt(e.target.value) || 0;
                  const seconds = (newAction.triggerTime! % 60000) / 1000;
                  setNewAction({
                    ...newAction,
                    triggerTime: minutes * 60000 + seconds * 1000
                  });
                }}
                className="w-20 px-3 py-2 border rounded dark:bg-gray-700 mr-2"
                min="0"
                max="59"
              />
              <span className="mx-1">:</span>
              <input
                type="number"
                value={Math.floor((newAction.triggerTime! % 60000) / 1000)}
                onChange={(e) => {
                  const minutes = Math.floor(newAction.triggerTime! / 60000);
                  const seconds = parseInt(e.target.value) || 0;
                  setNewAction({
                    ...newAction,
                    triggerTime: minutes * 60000 + seconds * 1000
                  });
                }}
                className="w-20 px-3 py-2 border rounded dark:bg-gray-700"
                min="0"
                max="59"
              />
            </div>
          </div>
          
          {(newAction.type === 'message' || newAction.type === 'both') && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">メッセージ</label>
              <textarea
                value={newAction.message}
                onChange={(e) => setNewAction({...newAction, message: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700"
                rows={2}
                placeholder="表示するメッセージ"
              />
              
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="flash-new"
                  checked={newAction.flash}
                  onChange={(e) => setNewAction({...newAction, flash: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="flash-new" className="text-sm">点滅表示</label>
              </div>
            </div>
          )}
          
          {(newAction.type === 'color' || newAction.type === 'both') && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">画面色</label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={newAction.color}
                  onChange={(e) => setNewAction({...newAction, color: e.target.value})}
                  className="w-12 h-8 border rounded"
                />
                <input
                  type="text"
                  value={newAction.color}
                  onChange={(e) => setNewAction({...newAction, color: e.target.value})}
                  className="ml-2 px-3 py-2 border rounded dark:bg-gray-700 w-32"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsCreatingAction(false)}
              className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              作成
            </button>
          </div>
        </form>
      )}
      
      {/* アクション編集フォーム */}
      {editingAction && (
        <form onSubmit={handleUpdateAction} className="mb-6 p-4 border rounded">
          <h3 className="font-bold mb-3">アクション編集</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">アクションタイプ</label>
            <select
              value={editingAction.type}
              onChange={(e) => setEditingAction({
                ...editingAction,
                type: e.target.value as TimerActionType
              })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700"
            >
              <option value="message">メッセージ</option>
              <option value="color">画面色変更</option>
              <option value="both">メッセージ＆色変更</option>
            </select>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              トリガー時間（残り時間 mm:ss）
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={Math.floor(editingAction.triggerTime / 60000)}
                onChange={(e) => {
                  const minutes = parseInt(e.target.value) || 0;
                  const seconds = (editingAction.triggerTime % 60000) / 1000;
                  setEditingAction({
                    ...editingAction,
                    triggerTime: minutes * 60000 + seconds * 1000
                  });
                }}
                className="w-20 px-3 py-2 border rounded dark:bg-gray-700 mr-2"
                min="0"
                max="59"
              />
              <span className="mx-1">:</span>
              <input
                type="number"
                value={Math.floor((editingAction.triggerTime % 60000) / 1000)}
                onChange={(e) => {
                  const minutes = Math.floor(editingAction.triggerTime / 60000);
                  const seconds = parseInt(e.target.value) || 0;
                  setEditingAction({
                    ...editingAction,
                    triggerTime: minutes * 60000 + seconds * 1000
                  });
                }}
                className="w-20 px-3 py-2 border rounded dark:bg-gray-700"
                min="0"
                max="59"
              />
            </div>
          </div>
          
          {(editingAction.type === 'message' || editingAction.type === 'both') && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">メッセージ</label>
              <textarea
                value={editingAction.message || ''}
                onChange={(e) => setEditingAction({
                  ...editingAction,
                  message: e.target.value
                })}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700"
                rows={2}
                placeholder="表示するメッセージ"
              />
              
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="flash-edit"
                  checked={editingAction.flash}
                  onChange={(e) => setEditingAction({
                    ...editingAction,
                    flash: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="flash-edit" className="text-sm">点滅表示</label>
              </div>
            </div>
          )}
          
          {(editingAction.type === 'color' || editingAction.type === 'both') && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">画面色</label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={editingAction.color || '#ffffff'}
                  onChange={(e) => setEditingAction({
                    ...editingAction,
                    color: e.target.value
                  })}
                  className="w-12 h-8 border rounded"
                />
                <input
                  type="text"
                  value={editingAction.color || '#ffffff'}
                  onChange={(e) => setEditingAction({
                    ...editingAction,
                    color: e.target.value
                  })}
                  className="ml-2 px-3 py-2 border rounded dark:bg-gray-700 w-32"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              更新
            </button>
          </div>
        </form>
      )}
      
      {/* アクションリスト */}
      <div className="space-y-3">
        <h3 className="font-medium text-lg">登録済みアクション</h3>
        
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
        ) : actions.length > 0 ? (
          <div className="space-y-2">
            {actions
              .sort((a, b) => b.triggerTime - a.triggerTime)
              .map(action => (
                <div 
                  key={action.id} 
                  className={`p-3 border rounded ${
                    action.executed ? 'bg-gray-100 dark:bg-gray-700' : ''
                  } ${
                    !action.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">
                        {formatTriggerTime(action.triggerTime)}
                      </span>
                      <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                        {getActionTypeName(action.type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleEnabled(action)}
                        className={`px-2 py-1 text-xs rounded ${
                          action.enabled 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {action.enabled ? '有効' : '無効'}
                      </button>
                      <button
                        onClick={() => handleEditAction(action)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    {action.type === 'message' || action.type === 'both' ? (
                      <div className="mb-1">
                        <span className="font-medium">メッセージ: </span>
                        <span>{action.message}</span>
                        {action.flash && (
                          <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                            点滅
                          </span>
                        )}
                      </div>
                    ) : null}
                    
                    {action.type === 'color' || action.type === 'both' ? (
                      <div className="flex items-center">
                        <span className="font-medium mr-2">色: </span>
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: action.color }}
                        />
                        <span className="ml-1">{action.color}</span>
                      </div>
                    ) : null}
                  </div>
                  
                  {action.executed && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      実行済み
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            アクションがありません
          </p>
        )}
      </div>
    </div>
  );
}
