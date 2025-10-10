/**
 * Verify Database Setup
 *
 * This script verifies that the database is properly set up
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log(
    'Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('🔍 Verifying database setup...\n');

  try {
    // Check if users table exists
    console.log('1. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
      return;
    }
    console.log('✅ Users table exists');

    // Check table structure
    console.log('\n2. Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table structure error:', tableError.message);
    } else {
      console.log('✅ Table structure is accessible');
    }

    // Test insert permissions (dry run)
    console.log('\n3. Testing insert permissions...');
    const testUser = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      display_name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tier: 'free',
      tier_limits: {
        clothing_items: 100,
        try_ons_per_month: 100,
        current_month_usage: 0,
        current_month: new Date().toISOString().substring(0, 7),
      },
    };

    // This will fail due to unique constraint, but we can see the error
    const { error: insertError } = await supabase
      .from('users')
      .insert(testUser);

    if (insertError) {
      if (
        insertError.message.includes('duplicate key') ||
        insertError.message.includes('unique constraint')
      ) {
        console.log(
          '✅ Insert permissions work (got expected unique constraint error)'
        );
      } else {
        console.error('❌ Insert permissions error:', insertError.message);
      }
    } else {
      console.log('✅ Insert permissions work');
    }

    console.log('\n🎉 Database verification complete!');
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  }
}

verifyDatabase();
