/**
 * Environment configuration with validation
 * Centralized environment variable management with type safety
 */

interface EnvironmentConfig {
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    storageBucket: string;
  };

  // Google AI Configuration
  gemini: {
    apiKey: string;
  };

  // Application Configuration
  app: {
    url: string;
    uploadMaxSize: number;
    debug: boolean;
    logLevel: string;
  };

  // Database Configuration
  database: {
    url?: string | undefined;
  };
}

/**
 * Validates required environment variables
 * More lenient during build time to prevent module resolution issues
 */
function validateEnvironment(): EnvironmentConfig {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  // Only warn in development when variables are actually missing
  if (missingVars.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `⚠️ Missing environment variables: ${missingVars.join(', ')}\n` +
        'Using placeholder values. Please check your .env.local file and restart the dev server.'
    );
  }

  return {
    supabase: {
      url:
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://placeholder.supabase.co',
      anonKey:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      serviceRoleKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
      storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'closet-images',
    },

    gemini: {
      apiKey: process.env.GEMINI_API_KEY || 'placeholder-gemini-key',
    },

    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '52428800'), // 50MB default
      debug: process.env.DEBUG === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
    },

    database: {
      url: process.env.DATABASE_URL || undefined,
    },
  };
}

// Export validated configuration
export const env = validateEnvironment();

// Export individual configs for convenience
export const { supabase, gemini, app, database } = env;

// Environment-specific settings
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';
