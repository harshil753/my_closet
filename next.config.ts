import type { NextConfig } from 'next';
import path from 'path';

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
    // Add path aliases for webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/types': path.resolve(__dirname, './lib/types'),
      '@/utils': path.resolve(__dirname, './lib/utils'),
      '@/services': path.resolve(__dirname, './lib/services'),
    };

    // Ensure webpack resolves .tsx and .ts extensions
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      ...(config.resolve.extensions || []),
    ];

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
