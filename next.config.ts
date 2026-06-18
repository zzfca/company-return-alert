import type { NextConfig } from 'next';

const configuredAllowedOrigins = process.env.SERVER_ACTION_ALLOWED_ORIGINS
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: [
        ...configuredAllowedOrigins,
        'localhost:3588',
        '127.0.0.1:3588',
        '*.synology.me',
        '*.myqnapcloud.com',
        '*.quickconnect.to',
        '*.local',
      ],
    },
  },
};

export default nextConfig;
