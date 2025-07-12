import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Socket.IOサーバーとの統合をサポート
  webpack: (config) => {
    config.externals = [...(config.externals || []), { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' }];
    return config;
  },
  // 環境変数をクライアントに公開
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/socket',
  },
};

export default nextConfig;
