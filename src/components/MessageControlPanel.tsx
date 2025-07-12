'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { TimerMessage as TimerMessageType } from '@/lib/countdownTimer';

interface MessageControlPanelProps {
  className?: string;
}

export default function MessageControlPanel({ className = '' }: MessageControlPanelProps) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<TimerMessageType[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageColor, setMessageColor] = useState('#ffffff');
  const [flash, setFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // メッセージ一覧を取得
  useEffect(() => {
    if (!socket || !connected) return;

    // 初期メッセージを取得
    socket.emit('message:getAll', {}, (response: { success: boolean; messages: TimerMessageType[] }) => {
      if (response.success) {
        setMessages(response.messages);
      }
    });

    // 新しいメッセージを受信
    const handleNewMessage = (data: { message: TimerMessageType }) => {
      setMessages(prev => [...prev.filter(m => m.id !== data.message.id), data.message]);
    };

    // メッセージ削除を受信
    const handleDeleteMessage = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:delete', handleDeleteMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:delete', handleDeleteMessage);
    };
  }, [socket, connected]);

  // メッセージを送信
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !connected || !messageText.trim()) return;

    setIsLoading(true);
    socket.emit(
      'message:send',
      {
        text: messageText,
        color: messageColor,
        flash
      },
      (response: { success: boolean }) => {
        setIsLoading(false);
        if (response.success) {
          setMessageText('');
          setFlash(false);
        }
      }
    );
  };

  // メッセージを削除
  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !connected) return;

    socket.emit('message:delete', { messageId }, () => {
      // 削除は Socket.IO イベントで処理されるため、ここでは何もしない
    });
  };

  return (
    <div className={`message-control-panel p-5 bg-gray-700 rounded-lg shadow-lg ${className}`}>
      <h2 className="text-2xl font-bold mb-5 text-white border-b border-gray-500 pb-2">メッセージ管理</h2>

      <form onSubmit={handleSendMessage} className="mb-6">
        <div className="mb-4">
          <label htmlFor="messageText" className="block text-sm font-medium mb-1 text-white">
            メッセージ
          </label>
          <input
            type="text"
            id="messageText"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3 bg-gray-600 rounded border border-gray-400 text-white placeholder-gray-300 text-lg"
            placeholder="表示するメッセージを入力..."
            disabled={!connected || isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="messageColor" className="block text-sm font-medium mb-1 text-white">
              文字色
            </label>
            <div className="flex items-center">
              <input
                type="color"
                id="messageColor"
                value={messageColor}
                onChange={(e) => setMessageColor(e.target.value)}
                className="w-10 h-10 rounded border border-gray-400"
                disabled={!connected || isLoading}
              />
              <span className="ml-2 text-sm text-white">{messageColor}</span>
            </div>
          </div>

          <div>
            <label className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={flash}
                onChange={(e) => setFlash(e.target.checked)}
                className="mr-2"
                disabled={!connected || isLoading}
              />
              <span className="text-sm text-white">点滅効果</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-3 px-4 rounded-md font-medium text-lg ${
            !connected || isLoading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 transition-colors duration-200 shadow-md'
          }`}
          disabled={!connected || isLoading || !messageText.trim()}
        >
          {isLoading ? '送信中...' : 'メッセージを送信 →'}
        </button>
      </form>

      <div className="message-list mt-6 border-t border-gray-600 pt-4">
        <h3 className="text-lg font-medium mb-3 text-white bg-gray-600 inline-block px-3 py-1 rounded-t-lg">最近のメッセージ</h3>
        {messages.length === 0 ? (
          <p className="text-gray-200 text-sm bg-gray-600 p-2 rounded">メッセージはありません</p>
        ) : (
          <ul className="space-y-3">
            {messages
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 5)
              .map((msg) => (
                <li
                  key={msg.id}
                  className="flex justify-between items-center p-3 bg-gray-500 rounded shadow-inner border border-gray-400"
                >
                  <div className="flex-1">
                    <p style={{ 
                      color: msg.color, 
                      textShadow: '0 0 3px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.7)',
                      fontWeight: 600,
                      fontSize: '1.05rem'
                    }}>{msg.text}</p>
                    <p className="text-xs text-gray-100 mt-1">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="ml-3 p-2 text-white hover:text-red-200 bg-red-600 hover:bg-red-700 rounded-full shadow-md transition-all duration-200"
                    disabled={!connected}
                    title="削除"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
