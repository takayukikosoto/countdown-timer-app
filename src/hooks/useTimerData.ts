'use client';

import { useState, useEffect } from 'react';
import { TimerSettings, TimerMessage } from '@/lib/countdownTimer';

// タイマーデータを取得するためのカスタムフック
export function useTimerData() {
  const [currentTimer, setCurrentTimer] = useState<TimerSettings | null>(null);
  const [allTimers, setAllTimers] = useState<TimerSettings[]>([]);
  const [messages, setMessages] = useState<TimerMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 現在のタイマーを取得
  const fetchCurrentTimer = async () => {
    try {
      const response = await fetch('/api/timer?action=current');
      if (!response.ok) {
        throw new Error('タイマー情報の取得に失敗しました');
      }
      const data = await response.json();
      setCurrentTimer(data.timer);
      return data.timer;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return null;
    }
  };

  // 全てのタイマーを取得
  const fetchAllTimers = async () => {
    try {
      const response = await fetch('/api/timer?action=all');
      if (!response.ok) {
        throw new Error('タイマーリストの取得に失敗しました');
      }
      const data = await response.json();
      setAllTimers(data.timers);
      return data.timers;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return [];
    }
  };

  // 全てのメッセージを取得
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/timer?action=messages');
      if (!response.ok) {
        throw new Error('メッセージの取得に失敗しました');
      }
      const data = await response.json();
      setMessages(data.messages);
      return data.messages;
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return [];
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchCurrentTimer(),
          fetchAllTimers(),
          fetchMessages()
        ]);
      } catch (err) {
        console.error('データ読み込みエラー:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    currentTimer,
    allTimers,
    messages,
    loading,
    error,
    fetchCurrentTimer,
    fetchAllTimers,
    fetchMessages
  };
}
