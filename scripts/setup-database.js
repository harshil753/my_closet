#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Database setup script
 * Sets up the complete database schema for My Closet Virtual Try-On
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Setup database schema
 */
async function setupDatabase() {
  log('🚀 My Closet Virtual Try-On - Database Setup', 'magenta');
  log('============================================', 'magenta');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ Missing required environment variables:', 'red');
    log('   NEXT_PUBLIC_SUPABASE_URL', 'red');
    log('   SUPABASE_SERVICE_ROLE_KEY', 'red');
    log('   Please check your .env.local file', 'red');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test connection
    log('🔍 Testing database connection...', 'blue');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      log('❌ Database connection failed:', 'red');
      log(`   ${testError.message}`, 'red');
      process.exit(1);
    }

    log('✅ Database connection successful', 'green');

    // Read migration file
    log('📋 Reading database schema...', 'blue');
    const migrationPath = path.join(
      __dirname,
      '..',
      'lib',
      'database',
      'migrations',
      '001_initial_schema.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      log('❌ Migration file not found:', 'red');
      log(`   ${migrationPath}`, 'red');
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    log('✅ Migration file loaded', 'green');

    // Execute migration
    log('⚡ Executing database migration...', 'blue');
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (migrationError) {
      log('❌ Migration failed:', 'red');
      log(`   ${migrationError.message}`, 'red');
      process.exit(1);
    }

    log('✅ Database migration completed successfully', 'green');

    // Verify schema
    log('🔍 Verifying database schema...', 'blue');
    await verifySchema(supabase);

    // Setup storage (instructions)
    log('📦 Storage Setup Instructions:', 'cyan');
    log('1. Go to your Supabase Dashboard > Storage', 'bright');
    log('2. Create a new bucket named "closet-images"', 'bright');
    log('3. Set it as public bucket', 'bright');
    log(
      '4. Configure the storage policies as shown in setup-supabase.md',
      'bright'
    );

    log('🎉 Database setup completed successfully!', 'green');
    log(
      '   You can now start the development server with: bun run dev',
      'bright'
    );
  } catch (error) {
    log('❌ Database setup failed:', 'red');
    log(`   ${error.message}`, 'red');
    process.exit(1);
  }
}

/**
 * Verify database schema
 */
async function verifySchema(supabase) {
  const tables = [
    'users',
    'user_base_photos',
    'clothing_items',
    'try_on_sessions',
    'try_on_session_items',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        log(`❌ Table ${table} verification failed: ${error.message}`, 'red');
        return false;
      }

      log(`✅ Table ${table} verified`, 'green');
    } catch (error) {
      log(`❌ Table ${table} verification failed: ${error.message}`, 'red');
      return false;
    }
  }

  return true;
}

/**
 * Main execution
 */
async function main() {
  try {
    await setupDatabase();
  } catch (error) {
    log('❌ Setup failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the setup
main();
