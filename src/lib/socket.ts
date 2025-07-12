import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { REDIS_CHANNELS } from './constants';
import { getRedisClient } from './redis';
import { getStatusFromDB, setStatusInDB } from './status';
import { getVisitorsFromDB, incrementVisitorsInDB } from './visitors';
import { 
  getCurrentTimer,
  saveTimer, 
  startTimer, 
  pauseTimer, 
  resetTimer, 
  createTimer, 
  deleteTimer, 
  getAllTimers,
  TimerSettings,
  sendTimerMessage,
  deleteTimerMessage,
  getAllTimerMessages,
  TimerMessage
} from './countdownTimer';

// Socket.IO サーバーのシングルトンインスタンス
declare global {
  var _io: SocketIOServer | undefined;
}

// ユーザーロールの型定義
type UserRole = 'viewer' | 'staff' | 'admin';

// 接続ユーザー情報の型定義
interface UserInfo {
  id: string;
  role: UserRole;
}

export function getSocketServer(server: NetServer): SocketIOServer {
  if (globalThis._io) {
    return globalThis._io;
  }

  const io = new SocketIOServer(server, {
    path: '/socket.io',  // デフォルトのSocket.IOパスを使用
    cors: {
      origin: '*',  // 開発環境ではすべてのオリジンを許可
      methods: ['GET', 'POST'],
      credentials: true
    },
    // WebSocketとPollingの両方をサポート
    transports: ['websocket', 'polling'],  // WebSocketを優先し、Pollingにフォールバック
    // 接続の安定性を向上させる設定
    pingTimeout: 60000,      // pingタイムアウト
    pingInterval: 25000,     // ping間隔
    connectTimeout: 45000,   // 接続タイムアウト
    allowEIO3: true,         // Socket.IO v2クライアントとの互換性を確保
    maxHttpBufferSize: 1e8,  // 大きなメッセージを許可（100MB）
    perMessageDeflate: {
      threshold: 1024        // 圧縮を適用する閾値
    },
    cleanupEmptyChildNamespaces: true  // 使用されていない名前空間を自動的にクリーンアップ
  });
  
  console.log('Socket.IOサーバー設定:', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  console.log('%c Socket.IOサーバーを初期化しました ', 'background: #4CAF50; color: white; font-size: 12px; padding: 3px;');
  console.log('トランスポート:', ['websocket', 'polling']);
  console.log('Socket.IOパス:', '/socket.io');

  // Redis アダプターを設定
  try {
    const redisClient = getRedisClient();
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis アダプターを設定しました');
  } catch (error) {
    console.error('Redis アダプターの設定に失敗しました:', error);
  }

  // 認証ミドルウェア
  io.use((socket, next) => {
    // 本番環境では JWT 検証を行う
    // 開発環境では簡易的に role パラメータを使用
    try {
      // TODO: JWT 検証ロジックを実装
      // 開発用の簡易認証
      const role = socket.handshake.auth.role || 'viewer';
      
      // ユーザー情報をソケットに保存
      socket.data.user = {
        id: socket.id,
        role: role as UserRole
      };
      
      next();
    } catch (error) {
      next(new Error('認証に失敗しました'));
    }
  });

  // 接続イベント
  io.on('connection', async (socket) => {
    const user = socket.data.user as UserInfo;
    console.log(`クライアント接続: ${socket.id}, ロール: ${user.role}`);

    // 現在の状態を取得（ステータスと来場者数はSupabaseから）
    const status = await getStatusFromDB();
    const visitorCount = await getVisitorsFromDB();
    const serverTime = Date.now();

    // 初期状態をクライアントに送信
    socket.emit('state', {
      status,
      visitors: visitorCount,
      serverTime
    });

    // join イベント処理
    socket.on('join', (data) => {
      const { role = user.role } = data;
      console.log(`クライアント ${socket.id} が ${role} として参加`);
      
      // ロールに応じたルームに参加
      socket.join(`role:${role}`);
    });

    // status:update イベント処理
    socket.on('status:update', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        const { status } = data;
        console.log(`ステータス更新: ${status} (by ${socket.id})`);
        
        // ステータスを更新（Supabase）
        await setStatusInDB(status);
        
        // 全クライアントに通知（Socket.IOイベント）
        io.emit('status:update', { status });
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });

    // count:increment イベント処理
    socket.on('count:increment', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        const { increment = 1 } = data;
        console.log(`来場者数増加: +${increment} (by ${socket.id})`);
        
        // Supabaseで来場者数を増加
        const newCount = await incrementVisitorsInDB(increment);
        
        // 全クライアントに通知
        io.emit('count:update', { visitors: newCount });
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });

    // visitor:increment    // 来場者数を増加
    socket.on('visitor:increment', async (data, callback) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { increment = 1 } = data;
          console.log(`来場者数増加: +${increment} (by ${socket.id})`);
          
          // Supabaseで来場者数を増加
          const newCount = await incrementVisitorsInDB(increment);
          
          // 全クライアントに通知
          io.emit('count:update', { visitors: newCount });
          
          // Supabaseにも通知
          socket.emit('visitor:update', { count: newCount });
          
          if (callback) callback({ success: true, count: newCount });
        } catch (error) {
          console.error('来場者数更新エラー:', error);
          if (callback) callback({ success: false, error: '来場者数の更新に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
        if (callback) callback({ success: false, error: '権限がありません' });
      }
    });
    
    // Supabaseからの来場者数更新を処理
    socket.on('visitor:update', async (data, callback) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { count } = data;
          console.log(`Supabaseからの来場者数更新: ${count} (by ${socket.id})`);
          
          // 全クライアントに通知
          io.emit('visitor:update', { count });
          
          if (callback) callback({ success: true });
        } catch (error) {
          console.error('Supabase来場者数更新エラー:', error);
          if (callback) callback({ success: false, error: '来場者数の更新に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
        if (callback) callback({ success: false, error: '権限がありません' });
      }
    });
    
    // 来場者数をリセット
    socket.on('visitor:reset', async (data, callback) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          console.log(`来場者数リセット (by ${socket.id})`);
          
          // 全クライアントに通知
          io.emit('visitor:update', { count: 0 });
          
          if (callback) callback({ success: true });
        } catch (error) {
          console.error('来場者数リセットエラー:', error);
          if (callback) callback({ success: false, error: '来場者数のリセットに失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
        if (callback) callback({ success: false, error: '権限がありません' });
      }
    });

    // 切断イベント
    socket.on('disconnect', () => {
      console.log(`クライアント切断: ${socket.id}`);
    });

    // タイマー関連のイベントハンドラー
    
    // 現在のタイマーを取得
    socket.on('timer:get-current', async (data, callback) => {
      const timer = await getCurrentTimer();
      callback({ timer });
    });
    
    // タイマーリストを取得
    socket.on('timer:get-list', async (data, callback) => {
      const timers = await getAllTimers();
      callback({ timers });
    });
    
    // タイマーを作成
    socket.on('timer:create', async (data, callback) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const timer = await createTimer(data);
          callback({ timer });
          
          // 全クライアントに通知
          io.emit('timer:update', { timer });
        } catch (error) {
          console.error('タイマー作成エラー:', error);
          socket.emit('error', { message: 'タイマーの作成に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });
    
    // タイマーを開始
    socket.on('timer:start', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { timerId } = data;
          const timer = await startTimer(timerId);
          
          if (timer) {
            // 全クライアントに通知
            io.emit('timer:update', { timer });
          } else {
            socket.emit('error', { message: 'タイマーが見つかりません' });
          }
        } catch (error) {
          console.error('タイマー開始エラー:', error);
          socket.emit('error', { message: 'タイマーの開始に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });
    
    // タイマーを一時停止
    socket.on('timer:pause', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { timerId } = data;
          const timer = await pauseTimer(timerId);
          
          if (timer) {
            // 全クライアントに通知
            io.emit('timer:update', { timer });
          } else {
            socket.emit('error', { message: 'タイマーが見つかりません' });
          }
        } catch (error) {
          console.error('タイマー一時停止エラー:', error);
          socket.emit('error', { message: 'タイマーの一時停止に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });
    
    // タイマーをリセット
    socket.on('timer:reset', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { timerId } = data;
          const timer = await resetTimer(timerId);
          
          if (timer) {
            // 全クライアントに通知
            io.emit('timer:update', { timer });
          } else {
            socket.emit('error', { message: 'タイマーが見つかりません' });
          }
        } catch (error) {
          console.error('タイマーリセットエラー:', error);
          socket.emit('error', { message: 'タイマーのリセットに失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });
    
    // タイマーを選択（現在のタイマーに設定）
    socket.on('timer:select', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { timerId } = data;
          const timers = await getAllTimers();
          const selectedTimer = timers.find(t => t.id === timerId);
          
          if (selectedTimer) {
            await saveTimer(selectedTimer);
            // 全クライアントに通知
            io.emit('timer:update', { timer: selectedTimer });
          } else {
            socket.emit('error', { message: 'タイマーが見つかりません' });
          }
        } catch (error) {
          console.error('タイマー選択エラー:', error);
          socket.emit('error', { message: 'タイマーの選択に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });
    
    // タイマーを削除
    socket.on('timer:delete', async (data) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { timerId } = data;
          const success = await deleteTimer(timerId);
          
          if (success) {
            // 全クライアントに通知
            io.emit('timer:delete', { timerId });
          } else {
            socket.emit('error', { message: 'タイマーの削除に失敗しました' });
          }
        } catch (error) {
          console.error('タイマー削除エラー:', error);
          socket.emit('error', { message: 'タイマーの削除に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
      }
    });
    
    // メッセージを送信
    socket.on('message:send', async (data, callback) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { text, color, flash, timerId } = data;
          const message = await sendTimerMessage({
            text,
            color,
            flash,
            timerId
          });
          
          // 全クライアントに通知（Socket.IOイベント）
          io.emit('message:new', { message });
          
          if (callback) callback({ success: true, message });
        } catch (error) {
          console.error('メッセージ送信エラー:', error);
          socket.emit('error', { message: 'メッセージの送信に失敗しました' });
          if (callback) callback({ success: false, error: 'メッセージの送信に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
        if (callback) callback({ success: false, error: '権限がありません' });
      }
    });
    
    // メッセージを削除
    socket.on('message:delete', async (data, callback) => {
      // 管理者またはスタッフのみ許可
      if (user.role === 'admin' || user.role === 'staff') {
        try {
          const { messageId } = data;
          const success = await deleteTimerMessage(messageId);
          
          if (success) {
            // 全クライアントに通知
            io.emit('message:delete', { messageId });
            if (callback) callback({ success: true });
          } else {
            socket.emit('error', { message: 'メッセージの削除に失敗しました' });
            if (callback) callback({ success: false, error: 'メッセージの削除に失敗しました' });
          }
        } catch (error) {
          console.error('メッセージ削除エラー:', error);
          socket.emit('error', { message: 'メッセージの削除に失敗しました' });
          if (callback) callback({ success: false, error: 'メッセージの削除に失敗しました' });
        }
      } else {
        socket.emit('error', { message: '権限がありません' });
        if (callback) callback({ success: false, error: '権限がありません' });
      }
    });
    
    // 全メッセージを取得
    socket.on('message:getAll', async (data, callback) => {
      try {
        const messages = await getAllTimerMessages();
        if (callback) callback({ success: true, messages });
      } catch (error) {
        console.error('メッセージ取得エラー:', error);
        if (callback) callback({ success: false, error: 'メッセージの取得に失敗しました' });
      }
    });
  });

  // Redis Pub/Sub からのメッセージを処理
  const redisClient = getRedisClient();
  const subClient = redisClient.duplicate();
  
  // タイマーイベント
  subClient.subscribe(REDIS_CHANNELS.TIMER);
  subClient.on('message', (channel: string, message: string) => {
    if (channel === REDIS_CHANNELS.TIMER) {
      const data = JSON.parse(message);
      io.emit('timer:sync', data);
    }
  });
  
  // ステータスイベント
  subClient.subscribe(REDIS_CHANNELS.STATUS);
  subClient.on('message', (channel: string, message: string) => {
    if (channel === REDIS_CHANNELS.STATUS) {
      const data = JSON.parse(message);
      io.emit('status:update', data);
    }
  });
  
  // 来場者数イベント
  subClient.subscribe(REDIS_CHANNELS.VISITORS);
  subClient.on('message', (channel: string, message: string) => {
    if (channel === REDIS_CHANNELS.VISITORS) {
      const data = JSON.parse(message);
      io.emit('count:update', data);
    }
  });
  
  // メッセージイベント
  subClient.subscribe(REDIS_CHANNELS.MESSAGE);
  subClient.on('message', (channel: string, message: string) => {
    if (channel === REDIS_CHANNELS.MESSAGE) {
      const data = JSON.parse(message);
      
      if (data.type === 'timer:message') {
        io.emit('message:new', { message: data.message });
      } else if (data.type === 'timer:message:delete') {
        io.emit('message:delete', { messageId: data.messageId });
      }
    }
  });

  // グローバル変数に保存
  globalThis._io = io;
  
  return io;
}
