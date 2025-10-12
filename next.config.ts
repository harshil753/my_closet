import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Turbopack configuration (simplified)
  turbopack: {
    // Resolve fallbacks for client-side only
    // Note: These are applied globally in Turbopack, but serverExternalPackages helps
    resolveAlias: {
      '@': '.',
      '@/components': './components',
      '@/lib': './lib',
      '@/app': './app',
      '@/types': './lib/types',
      '@/utils': './lib/utils',
      '@/services': './lib/services',
      // Removed fs, net, tls aliases to allow server-side usage
    },
  },

  // Server external packages (moved from experimental)
  // These packages will use Node.js runtime and won't be bundled
  serverExternalPackages: [
    'pillow',
    '@google/genai',
    'google-auth-library',
    'mime',
    'ws',
  ],

  // Image optimization settings
  images: {
    domains: [
      'localhost',
      'supabase.co',
      'storage.supabase.co',
      'example.com', // For testing
      // Add the specific Supabase project domain from environment
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname]
        : []),
    ],
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
