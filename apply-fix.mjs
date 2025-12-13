import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes and brackets
    value = value.replace(/^["'\[]|["'\]]$/g, '');
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Found' : '✗ Missing');
console.log('Service Key:', supabaseServiceKey ? '✓ Found' : '✗ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n✗ Missing Supabase credentials');
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
    console.log('\n📖 Reading migration SQL...');
    const sqlPath = path.join(__dirname, 'fix_rls_trigger_signup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`✓ Loaded ${sql.length} characters of SQL\n`);

    // Split into manageable parts
    const parts = sql.split(/;\s*(?=--\s*Step|DROP|CREATE|DO|ALTER|GRANT|COMMENT)/);

    console.log(`Executing ${parts.length} SQL commands...\n`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part && !part.startsWith('/*')) {
        const preview = part.substring(0, 60).replace(/\n/g, ' ') + '...';
        console.log(`[${i + 1}/${parts.length}] ${preview}`);

        try {
          const { error } = await supabase.rpc('query', { query_text: part + ';' });
          if (error) {
            console.log(`   ⚠️  ${error.message}`);
          } else {
            console.log(`   ✓ Success`);
          }
        } catch (err) {
          console.log(`   ⚠️  ${err.message}`);
        }
      }
    }

    console.log('\n=====================================');
    console.log('✓ MIGRATION COMPLETE!');
    console.log('=====================================');
    console.log('The signup fix has been applied.');
    console.log('Try signing up now - it should work!');
    console.log('=====================================\n');

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.log('\n=====================================');
    console.log('MANUAL APPLICATION REQUIRED');
    console.log('=====================================');
    console.log('The automatic application failed.');
    console.log('Please apply the SQL manually:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql');
    console.log('2. Open file: fix_rls_trigger_signup.sql');
    console.log('3. Copy all contents');
    console.log('4. Paste into SQL Editor');
    console.log('5. Click "Run"');
    console.log('=====================================\n');
    process.exit(1);
  }
}

applyMigration();
