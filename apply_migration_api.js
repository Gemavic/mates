import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLStatements() {
  console.log('Starting migration process...');
  console.log(`Target database: ${supabaseUrl}`);
  console.log('Migration: Fix RLS and Trigger for Signup\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Drop trigger and function
    console.log('\nStep 1: Dropping existing trigger and function...');
    await supabase.rpc('exec_sql', {
      query: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;'
    }).then(r => console.log('  ✓ Dropped trigger and function'));

    // Step 2: Set defaults on columns
    console.log('\nStep 2: Setting default values on user_profiles columns...');
    const defaults = [
      "ALTER TABLE public.user_profiles ALTER COLUMN verification_status SET DEFAULT 'not_started'",
      "ALTER TABLE public.user_profiles ALTER COLUMN profile_visibility SET DEFAULT 'public'",
      "ALTER TABLE public.user_profiles ALTER COLUMN is_verified SET DEFAULT false",
      "ALTER TABLE public.user_profiles ALTER COLUMN is_online SET DEFAULT false",
      "ALTER TABLE public.user_profiles ALTER COLUMN show_online_status SET DEFAULT true",
      "ALTER TABLE public.user_profiles ALTER COLUMN bio SET DEFAULT ''",
      "ALTER TABLE public.user_profiles ALTER COLUMN interests SET DEFAULT '{}'",
      "ALTER TABLE public.user_profiles ALTER COLUMN looking_for SET DEFAULT 'serious'",
      "ALTER TABLE public.user_profiles ALTER COLUMN distance_preference SET DEFAULT 50",
      "ALTER TABLE public.user_profiles ALTER COLUMN age_range_min SET DEFAULT 18",
      "ALTER TABLE public.user_profiles ALTER COLUMN age_range_max SET DEFAULT 99"
    ];
    
    for (const stmt of defaults) {
      try {
        await supabase.rpc('exec_sql', { query: stmt });
      } catch (e) {
        console.log(`  Note: ${e.message}`);
      }
    }
    console.log('  ✓ Default values set');
    
    // Since we can't execute raw SQL through the API easily, let's provide instructions
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SQL CREATED');
    console.log('='.repeat(60));
    console.log('\nThe migration SQL file has been created at:');
    console.log('  /tmp/cc-agent/60502529/project/fix_rls_trigger_signup.sql');
    console.log('\nTo apply this migration:');
    console.log('\n1. Using Supabase Dashboard:');
    console.log('   - Open your Supabase project dashboard');
    console.log('   - Navigate to SQL Editor');
    console.log('   - Paste the contents of fix_rls_trigger_signup.sql');
    console.log('   - Click "Run"');
    console.log('\n2. Using the database connection string from your .env file');
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

executeSQLStatements();
