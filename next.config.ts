import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack configuration (simplified)
  turbopack: {
    // Resolve fallbacks for client-side
    resolveAlias: {
      '@': '.',
      '@/components': './components',
      '@/lib': './lib',
      '@/app': './app',
      '@/types': './lib/types',
      '@/utils': './lib/utils',
      '@/services': './lib/services',
      fs: 'false',
      net: 'false',
      tls: 'false',
    },
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ['pillow'],

  // Image optimization settings
  images: {
    domains: ['localhost', 'supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration for Python services (fallback for non-Turbopack builds)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
