import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Connection string from .env
const connectionString = "postgresql://postgres:GMdare@3728#@db.zdkxonufiuagkrhprnbd.supabase.co:5432/postgres";

async function applyMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected successfully!');
    console.log('='.repeat(60));
    
    console.log('Reading migration file...');
    const sql = readFileSync('/tmp/fix_rls_trigger_signup.sql', 'utf8');
    
    console.log('Applying migration...');
    console.log('='.repeat(60));
    
    // Execute the SQL migration
    const result = await client.query(sql);
    
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION APPLIED SUCCESSFULLY!');
    console.log('='.repeat(60));
    
    console.log('\n' + '='.repeat(60));
    console.log('Summary of changes:');
    console.log('='.repeat(60));
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
    if (error.detail) {
      console.error('\nDetail:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

console.log('Starting migration process...');
console.log('Target database: zdkxonufiuagkrhprnbd.supabase.co');
console.log('Migration: Fix RLS and Trigger for Signup\n');

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
