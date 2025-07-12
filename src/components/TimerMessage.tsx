'use client';

import React, { useState, useEffect } from 'react';
import { TimerMessage as TimerMessageType } from '@/lib/countdownTimer';

interface TimerMessageProps {
  message: TimerMessageType | null;
  className?: string;
}

export default function TimerMessage({ message, className = '' }: TimerMessageProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  
  // フラッシュ効果
  useEffect(() => {
    if (!message || !message.flash) return;
    
    let flashInterval: NodeJS.Timeout;
    
    if (message.flash) {
      setIsFlashing(true);
      flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 500); // 500ms間隔でフラッシュ
    }
    
    return () => {
      if (flashInterval) clearInterval(flashInterval);
    };
  }, [message]);
  
  if (!message) return null;
  
  const messageStyle = {
    color: message.color || '#ffffff',
    opacity: message.flash && isFlashing ? 0.3 : 1,
    transition: 'opacity 0.2s ease-in-out'
  };
  
  return (
    <div className={`timer-message text-center my-4 ${className}`}>
      <h2 
        className="text-2xl md:text-3xl font-medium transition-all px-6 py-3 rounded-md"
        style={{
          ...messageStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'inline-block',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '90%',
          margin: '0 auto'
        }}
      >
        {message.text}
      </h2>
    </div>
  );
}
