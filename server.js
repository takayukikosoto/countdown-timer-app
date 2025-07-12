#!/usr/bin/env node
require('dotenv').config();

// TypeScript のトランスパイルが必要
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true,
  },
});

// カスタムサーバーの起動
require('./src/lib/customServer').startCustomServer();
