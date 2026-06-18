import type { NextConfig } from 'next';

const allowedOrigins = [
  'localhost:3000',
  'localhost:3588',
  '127.0.0.1:3000',
  '127.0.0.1:3588',
  '192.168.*.*:3588',
  '10.*.*.*:3588',
  '172.16.*.*:3588',
  '172.17.*.*:3588',
  '172.18.*.*:3588',
  '172.19.*.*:3588',
  '172.20.*.*:3588',
  '*.local:3588',
  '*.lan:3588',
  '*.synology.me',
  '*.myqnapcloud.com',
  '*.quickconnect.to',
];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
