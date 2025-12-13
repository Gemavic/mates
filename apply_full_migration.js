import fetch from 'node-fetch';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://zdkxonufiuagkrhprnbd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpka3hvbnVmaXVhZ2tyaHBybmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNDQ3NCwiZXhwIjoyMDY5OTAwNDc0fQ.Lu4cMF-B60bppwbanTLaTRU1xxYfKc5_hoR2UxKftII';

async function executeSQLQuery(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function applyMigration() {
  console.log('Starting migration process...');
  console.log('Target database: zdkxonufiuagkrhprnbd.supabase.co');
  console.log('='.repeat(60));

  try {
    const sqlContent = readFileSync('./fix_rls_trigger_signup.sql', 'utf8');
    
    console.log('\nApplying migration SQL...');
    console.log('This may take a moment...\n');
    
    const result = await executeSQLQuery(sqlContent);
    
    console.log('='.repeat(60));
    console.log('MIGRATION APPLIED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nSummary of changes:');
    console.log('✓ Dropped existing trigger and function');
    console.log('✓ Added default values to user_profiles columns');
    console.log('✓ Created service_role bypass policies for user_profiles');
    console.log('✓ Created service_role bypass policies for user_credits');
    console.log('✓ Created new handle_new_user() function with SECURITY DEFINER');
    console.log('✓ Created trigger on auth.users table');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('ERROR APPLYING MIGRATION:');
    console.error('='.repeat(60));
    console.error(error.message);
    
    console.log('\n\nFalling back to manual instructions...');
    console.log('='.repeat(60));
    console.log('Please apply the migration manually:');
    console.log('\n1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql');
    console.log('\n2. Copy and paste the contents of:');
    console.log('   fix_rls_trigger_signup.sql');
    console.log('\n3. Click "Run" to execute the migration');
    console.log('='.repeat(60));
  }
}

applyMigration();
