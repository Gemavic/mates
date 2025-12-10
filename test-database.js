import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zdkxonufiuagkrhprnbd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpka3hvbnVmaXVhZ2tyaHBybmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjQ0NzQsImV4cCI6MjA2OTkwMDQ3NH0.auHwnh0siI7u95WN-4Fh0aESjge2S6Yks7MNSnivo-k';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing Supabase Database Connection...\n');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...\n');

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);

  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

async function runTests() {
  // Test 1: Database Connection
  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    if (error && error.code === 'PGRST116') {
      logTest('Database Connection', false, 'Table "user_profiles" does not exist. Run the migration first!');
    } else if (error) {
      logTest('Database Connection', false, error.message);
    } else {
      logTest('Database Connection', true, 'Successfully connected to Supabase');
    }
  } catch (err) {
    logTest('Database Connection', false, err.message);
  }

  // Test 2: Check Critical Tables
  const criticalTables = [
    'user_profiles',
    'credit_packages',
    'user_credits',
    'matches',
    'messages',
    'virtual_gifts',
    'user_verification',
    'blog_articles',
    'forum_posts'
  ];

  console.log('\n📊 Checking Database Tables...\n');

  for (const table of criticalTables) {
    try {
      const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

      if (error && error.code === 'PGRST116') {
        logTest(`Table: ${table}`, false, 'Table does not exist');
      } else if (error && error.code === '42501') {
        logTest(`Table: ${table}`, true, 'Table exists (RLS enabled)');
      } else if (error) {
        logTest(`Table: ${table}`, false, error.message);
      } else {
        logTest(`Table: ${table}`, true, 'Table exists and accessible');
      }
    } catch (err) {
      logTest(`Table: ${table}`, false, err.message);
    }
  }

  // Test 3: Check Default Credit Packages
  console.log('\n💰 Checking Default Data...\n');

  try {
    const { data: packages, error } = await supabase
      .from('credit_packages')
      .select('*');

    if (error) {
      logTest('Default Credit Packages', false, error.message);
    } else if (packages && packages.length > 0) {
      logTest('Default Credit Packages', true, `Found ${packages.length} credit packages`);
      packages.forEach(pkg => {
        console.log(`   - ${pkg.name}: $${pkg.price_usd} (${pkg.credits} credits)`);
      });
    } else {
      logTest('Default Credit Packages', false, 'No credit packages found');
    }
  } catch (err) {
    logTest('Default Credit Packages', false, err.message);
  }

  // Test 4: Check Default Virtual Gifts
  try {
    const { data: gifts, error } = await supabase
      .from('virtual_gifts')
      .select('*');

    if (error) {
      logTest('Default Virtual Gifts', false, error.message);
    } else if (gifts && gifts.length > 0) {
      logTest('Default Virtual Gifts', true, `Found ${gifts.length} virtual gifts`);
      gifts.slice(0, 3).forEach(gift => {
        console.log(`   - ${gift.name}: ${gift.credit_cost} credits`);
      });
      if (gifts.length > 3) console.log(`   ... and ${gifts.length - 3} more`);
    } else {
      logTest('Default Virtual Gifts', false, 'No virtual gifts found');
    }
  } catch (err) {
    logTest('Default Virtual Gifts', false, err.message);
  }

  // Test 5: Test Authentication (if available)
  console.log('\n🔐 Checking Authentication...\n');

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logTest('Authentication', false, error.message);
    } else if (session) {
      logTest('Authentication', true, `Logged in as: ${session.user.email}`);
    } else {
      logTest('Authentication', true, 'No active session (this is normal for tests)');
    }
  } catch (err) {
    logTest('Authentication', false, err.message);
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.tests.length}`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\n⚠️  ISSUES DETECTED:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`   - ${t.name}: ${t.details}`);
      });

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql/new');
    console.log('   2. Copy the contents of SAFE_MIGRATION_MASTER.sql');
    console.log('   3. Paste and run the migration');
    console.log('   4. Run this test script again\n');
  } else {
    console.log('\n🎉 ALL TESTS PASSED! Database is ready to use!\n');
  }
}

runTests().catch(console.error);
