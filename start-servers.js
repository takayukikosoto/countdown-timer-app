#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 色付きログ出力のためのユーティリティ
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// ログ出力関数
function log(prefix, message, color) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

// プロセスを起動する関数
function startProcess(command, args, name, color) {
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true
  });
  
  log(name, `Starting... (PID: ${proc.pid})`, color);
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) log(name, line, color);
    });
  });
  
  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) log(name, line, colors.red);
    });
  });
  
  proc.on('close', (code) => {
    log(name, `Process exited with code ${code}`, code === 0 ? colors.green : colors.red);
    
    // 開発モードの場合、プロセスが終了したら再起動
    if (process.env.NODE_ENV !== 'production') {
      log(name, 'Restarting...', colors.yellow);
      setTimeout(() => {
        startProcess(command, args, name, color);
      }, 1000);
    }
  });
  
  return proc;
}

// 環境変数の読み込み
require('dotenv').config();

// 開発環境かどうか
const isDev = process.env.NODE_ENV !== 'production';

// Redisサーバーが起動しているか確認
function checkRedisServer() {
  return new Promise((resolve) => {
    const redis = spawn('redis-cli', ['ping']);
    
    redis.stdout.on('data', (data) => {
      if (data.toString().trim() === 'PONG') {
        log('Redis', 'Redis server is running', colors.green);
        resolve(true);
      }
    });
    
    redis.on('error', () => {
      log('Redis', 'Redis server is not running', colors.red);
      resolve(false);
    });
    
    redis.on('close', (code) => {
      if (code !== 0) {
        log('Redis', 'Redis server is not running', colors.red);
        resolve(false);
      }
    });
    
    // タイムアウト
    setTimeout(() => {
      redis.kill();
      log('Redis', 'Redis check timed out', colors.yellow);
      resolve(false);
    }, 2000);
  });
}

// メインの実行関数
async function main() {
  log('System', 'Starting all servers...', colors.cyan);
  
  // Redisサーバーの確認
  const redisRunning = await checkRedisServer();
  
  if (!redisRunning) {
    log('Redis', 'Starting Redis server...', colors.yellow);
    startProcess('redis-server', [], 'Redis', colors.magenta);
  }
  
  // カスタムサーバー（Socket.IO + Next.js）の起動
  const customServerCommand = isDev ? 'node' : 'NODE_ENV=production node';
  const customServerArgs = ['server.js'];
  startProcess(customServerCommand, customServerArgs, 'CustomServer', colors.green);
  
  log('System', 'All servers started successfully!', colors.cyan);
  log('System', 'Access the application at: http://localhost:3000', colors.cyan);
}

// スクリプト実行
main().catch(err => {
  log('System', `Error: ${err.message}`, colors.red);
  process.exit(1);
});
