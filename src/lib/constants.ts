// Redis Pub/Sub チャンネル
export const REDIS_CHANNELS = {
  STATUS: 'event:status',
  VISITORS: 'event:visitors',
  SERVER_TIME: 'server:time',
  TIMER: 'timer:events',
  MESSAGE: 'timer:message'
};

// Redis キー
export const REDIS_KEYS = {
  STATUS: 'status',
  VISITOR_COUNT: 'visitor_count',
  SOCKET_ROOM: (roomId: string) => `socket_room:${roomId}`,
};
