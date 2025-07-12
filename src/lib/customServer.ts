import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { getSocketServer } from './socket';

// 環境変数からポート番号を取得（デフォルトは 3000）
const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

// Next.js アプリケーションの初期化
const app = next({ dev });
const handle = app.getRequestHandler();

export async function startCustomServer() {
  try {
    // Next.js の準備が整うまで待機
    await app.prepare();
    
    // HTTP サーバーの作成
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url || '', true);
      handle(req, res, parsedUrl);
    });
    
    // Socket.IO サーバーの初期化
    getSocketServer(server);
    
    // サーバーの起動
    server.listen(port, () => {
      console.log(`> Server listening at http://localhost:${port}`);
    });
    
    // プロセス終了時の処理
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, () => {
        console.log(`> ${signal} received, closing server...`);
        server.close(() => {
          console.log('> Server closed');
          process.exit(0);
        });
      });
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
