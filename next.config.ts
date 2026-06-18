
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // 启用 standalone 模式用于 Docker
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;