#!/usr/bin/env bash
# ============================================================================
# Repo cleanup: removes sensitive files, archives dev notes into docs/,
# and deletes build artifacts. Run from the repo root:  bash cleanup-repo.sh
#
# ⚠️  BEFORE running: rotate ALL staff passwords listed in
#     STAFF_PASSWORD_INFO.md — they are exposed in this public repo's history.
#     Deleting the file does NOT remove it from git history. After rotating
#     passwords, the old ones in history become harmless.
# ============================================================================
set -euo pipefail

echo "1/4 Deleting sensitive files (credentials, vulnerability roadmaps)..."
rm -f STAFF_PASSWORD_INFO.md \
      CRITICAL_SECURITY_VULNERABILITIES.md \
      MANUAL_SECURITY_STEPS.md \
      SECRETS_SANITIZED.md \
      STAFF_PANEL_ACCESS_GUIDE.md \
      QUICK_START_STAFF_ACCESS.md

echo "2/4 Archiving development notes into docs/dev-notes/ ..."
mkdir -p docs/dev-notes docs/sql-archive
# All the *_COMPLETE / *_FIX / report markdown files
find . -maxdepth 1 -name "*.md" ! -name "README.md" -exec mv {} docs/dev-notes/ \;
# Loose SQL experiment files (real migrations live in supabase/migrations/)
find . -maxdepth 1 -name "*.sql" -exec mv {} docs/sql-archive/ \;

echo "3/4 Deleting build artifacts and dev-only test pages..."
rm -f vite.config.ts.timestamp-*.mjs
rm -f test-twilio-config.html test-twilio-functions.html test-video-call.html
rm -f apply-fix.js apply_full_migration.js apply_migration_api.js
rm -f src/lib/creditSystem.legacy.bak src/screens/Welcome/Welcome.legacy.bak

echo "4/4 Done. Review changes, then commit:"
echo "    git add -A && git commit -m 'chore: repo cleanup, secure credit system, nav & landing overhaul'"
echo ""
echo "REMINDERS:"
echo "  • Rotate all staff passwords NOW (old ones are in public git history)."
echo "  • Consider making this repo private: Settings → General → Change visibility."
echo "  • Apply supabase/migrations/20260714000000_secure_credit_ledger.sql"
echo "    in the Supabase SQL editor or via 'supabase db push'."
