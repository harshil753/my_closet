#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Environment setup script
 * Validates and configures environment variables for the project
 */

const fs = require('fs');
const path = require('path');

const ENV_EXAMPLE_PATH = path.join(process.cwd(), 'env.example');
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

/**
 * Required environment variables
 */
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  UPLOAD_MAX_SIZE: '52428800',
  DEBUG: 'true',
  LOG_LEVEL: 'debug',
  SUPABASE_STORAGE_BUCKET: 'closet-images',
};

/**
 * Colors for console output
 */
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

function checkEnvironmentFile() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    log('❌ .env.local file not found', 'red');
    log('📋 Creating .env.local from template...', 'yellow');

    if (fs.existsSync(ENV_EXAMPLE_PATH)) {
      fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_LOCAL_PATH);
      log('✅ .env.local created from template', 'green');
    } else {
      log('❌ env.example template not found', 'red');
      return false;
    }
  } else {
    log('✅ .env.local file exists', 'green');
  }
  return true;
}

function validateEnvironmentVariables() {
  const envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const envVars = {};

  // Parse environment variables
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });

  let hasErrors = false;

  // Check required variables
  log('\n🔍 Checking required environment variables...', 'blue');
  REQUIRED_VARS.forEach((varName) => {
    if (
      !envVars[varName] ||
      envVars[varName] === `your_${varName.toLowerCase()}`
    ) {
      log(`❌ ${varName} is not set or using placeholder value`, 'red');
      hasErrors = true;
    } else {
      log(`✅ ${varName} is configured`, 'green');
    }
  });

  // Check optional variables
  log('\n🔍 Checking optional environment variables...', 'blue');
  Object.entries(OPTIONAL_VARS).forEach(([varName, defaultValue]) => {
    if (!envVars[varName]) {
      log(
        `⚠️  ${varName} not set, will use default: ${defaultValue}`,
        'yellow'
      );
    } else {
      log(`✅ ${varName} is configured`, 'green');
    }
  });

  return !hasErrors;
}

function displaySetupInstructions() {
  log('\n📋 Environment Setup Instructions:', 'cyan');
  log('1. Edit .env.local file with your actual values:', 'bright');
  log('   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL', 'bright');
  log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon key', 'bright');
  log(
    '   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key',
    'bright'
  );
  log('   - GEMINI_API_KEY: Your Google AI API key', 'bright');

  log('\n2. Get your Supabase credentials:', 'cyan');
  log('   - Go to https://supabase.com/dashboard', 'bright');
  log('   - Create a new project or select existing one', 'bright');
  log('   - Go to Settings > API to find your URL and keys', 'bright');

  log('\n3. Get your Google AI API key:', 'cyan');
  log('   - Go to https://makersuite.google.com/app/apikey', 'bright');
  log('   - Create a new API key', 'bright');
  log('   - Copy the key to GEMINI_API_KEY in .env.local', 'bright');

  log('\n4. Run the setup again to verify configuration:', 'cyan');
  log('   npm run setup:env', 'bright');
}

function main() {
  log('🚀 My Closet Virtual Try-On - Environment Setup', 'magenta');
  log('================================================', 'magenta');

  // Check if .env.local exists
  if (!checkEnvironmentFile()) {
    process.exit(1);
  }

  // Validate environment variables
  const isValid = validateEnvironmentVariables();

  if (!isValid) {
    log('\n❌ Environment configuration incomplete', 'red');
    displaySetupInstructions();
    process.exit(1);
  }

  log('\n✅ Environment configuration is valid!', 'green');
  log('🎉 You can now run the development server:', 'green');
  log('   npm run dev', 'bright');
}

// Run the setup
main();
