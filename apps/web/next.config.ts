import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@kitchenflow/ui', '@kitchenflow/types', '@kitchenflow/utils'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts']
  }
};

export default nextConfig;
