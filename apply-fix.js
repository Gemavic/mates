const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config = function() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
};

require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('Reading migration SQL...');
    const sql = fs.readFileSync(path.join(__dirname, 'fix_rls_trigger_signup.sql'), 'utf8');

    console.log('Applying migration to Supabase...');

    // Execute the SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error applying migration:', error);
      console.log('\nTrying alternative method...');

      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('--'));

      console.log(`Found ${statements.length} SQL statements to execute`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt) {
          console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: stmt });
          if (stmtError) {
            console.error(`Error in statement ${i + 1}:`, stmtError.message);
          } else {
            console.log(`✓ Statement ${i + 1} executed successfully`);
          }
        }
      }
    } else {
      console.log('✓ Migration applied successfully!');
      console.log(data);
    }

    console.log('\n✓ Signup fix has been applied!');
    console.log('You can now try signing up again.');

  } catch (err) {
    console.error('Unexpected error:', err.message);
    console.log('\n=====================================');
    console.log('MANUAL APPLICATION REQUIRED');
    console.log('=====================================');
    console.log('Please apply the SQL manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql');
    console.log('2. Copy the contents of: fix_rls_trigger_signup.sql');
    console.log('3. Paste into SQL Editor and click "Run"');
    console.log('=====================================\n');
    process.exit(1);
  }
}

applyMigration();
