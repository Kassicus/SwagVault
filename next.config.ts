import type { NextConfig } from 'next';
import path from 'node:path';
import { withBotId } from 'botid/next/config';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default withBotId(nextConfig);
