# Professionalization Upgrade — July 14, 2026

This package fixes the critical security, trust, and UX issues in the app.
Apply the files in this bundle to your repo (same paths), then follow the
steps below **in order**.

---

## ⚠️ STEP 0 — DO THIS FIRST (before anything else)

Your repo is **public** and `STAFF_PASSWORD_INFO.md` contains real staff
passwords in plaintext. Anyone on the internet can read them right now, and
they will remain readable in git history even after the file is deleted.

1. Log into your Supabase dashboard / staff panel and **change all three
   staff passwords** (admin, credit manager, support) to new, strong values.
2. Strongly consider making the repo **private**: GitHub → Settings →
   General → Danger Zone → Change visibility.

---

## What changed

### 1. Secure server-side credit system (the big one)

**New:** `supabase/migrations/20260714000000_secure_credit_ledger.sql`
**Rewritten:** `src/lib/creditSystem.tsx` (old version saved as `creditSystem.legacy.bak`)

Before: credits lived in localStorage — any user could open dev tools and
give themselves unlimited credits, and paying users lost balances when
clearing their browser.

Now:
- Balances live in a `credit_accounts` table. Row Level Security lets users
  **read only their own balance** and write **nothing**.
- Every spend goes through an atomic `spend_credits()` Postgres function
  that locks the row, validates the balance, deducts, and logs to an
  append-only `credit_transactions` ledger.
- `spend_message()` makes the **first message in every thread free**, then
  10 credits — enforced server-side, not in the browser.
- New users automatically get 20 welcome credits via a database trigger.
- Reward credits (`claim_reward_credits`) are capped at 25/claim and
  50/day per user — no more client-side self-granting.
- **Purchases can only be credited by `credit_purchase()`, which requires
  the service-role key** — i.e., your payment webhook backend, never the
  browser. It's idempotent per payment reference, so a replayed webhook
  can't double-credit.
- Staff status (`is_staff`) is a database column, not a check on whether
  the user-id string contains "staff" (yes, really — that was the old check,
  meaning anyone could sign up with "staff" in their ID for free features).

The client class keeps the **same method names** (`initializeUser`,
`canAfford`, `getTotalCredits`, `deductCredits`, `addCredits`,
`sendMessage`, `isStaffMember`, …) so all existing screens keep working
without modification. `canAfford`/`getTotalCredits` now read a short-lived
display cache that refreshes from the server; the server independently
re-validates every spend.

**To apply:** open the Supabase SQL editor, paste the migration file, and
run it (or `supabase db push` if you use the CLI). Then deploy the new
frontend. To mark a staff member:
`update credit_accounts set is_staff = true where user_id = '<uuid>';`

**Still TODO on your side:** wire your payment provider's webhook to call
`credit_purchase(user_id, credits, payment_ref)` with the service-role key
after a successful payment. Until then, purchases won't credit — which is
correct: never credit purchases from the browser.

### 2. Navigation overhaul — `src/components/Menu.tsx`

- **Staff Login removed from the public menu.** Staff can still reach it
  directly at `/#staff-panel` (unchanged auth flow behind it). A visible
  "Staff Access" entry in a consumer dating app signals "unfinished" and
  invites probing.
- Menu restructured around the core loop: **Discover → Matches → Likes You
  → Messages**, plus Profile/Settings and Credits/Gifts. Everything else
  (video/audio chat, VIP, blog, quizzes, counselling, help) is collapsed
  behind a "More features" toggle. Legal links sit in a quiet footer
  section, and Log Out is at the bottom instead of next to Profile.
- Removed the hacky `document.createElement` logout toast.

### 3. Professional landing page — `src/screens/Welcome/Welcome.tsx`

(Old version saved as `Welcome.legacy.bak`.)

- **All Pexels stock couple photos removed.** Users recognize stock
  photography instantly and associate it with scam dating sites.
- Bouncing/pulsing animation clutter replaced with a calm gradient and
  subtle glow.
- New copy leads with the honest value proposition and a clear price
  promise: *"Free to join. Browsing and your first message to every
  connection are always free"* — which the new server-side credit system
  actually enforces.
- A "Built on trust" section highlights the safety infrastructure you
  already built (verification, moderation, reporting, privacy policy) —
  this is your strongest differentiator, so the landing page now says so.
- Clean 3-step "How it works", proper footer with Terms / Privacy / Help.
- Logged-in users get a "Welcome back" state that routes straight to
  Discovery.

### 4. Repo hygiene — `cleanup-repo.sh` + `.gitignore`

Run `bash cleanup-repo.sh` from the repo root. It:
- Deletes credential and vulnerability-roadmap files
  (`STAFF_PASSWORD_INFO.md`, `CRITICAL_SECURITY_VULNERABILITIES.md`, etc.)
- Moves the ~90 dev-note markdown files into `docs/dev-notes/` and loose
  SQL experiments into `docs/sql-archive/` (real migrations stay in
  `supabase/migrations/`)
- Deletes committed Vite timestamp artifacts and dev-only Twilio test pages
- `.gitignore` updated so timestamps, env files, and backups never get
  committed again

---

## Apply order (checklist)

1. ☐ Rotate all staff passwords (Step 0)
2. ☐ Consider making the repo private
3. ☐ Copy the files from this bundle into your repo (same paths)
4. ☐ Run the SQL migration in Supabase
5. ☐ `bash cleanup-repo.sh`
6. ☐ `npm install && npm run build` — verify it builds
7. ☐ Test locally: sign up a fresh user → should show 20 credits from the
     server; first message in a thread free, second costs 10; editing
     localStorage should change **nothing**
8. ☐ Commit and deploy
9. ☐ (Next) Wire the payment webhook to `credit_purchase()`

## Recommended next steps (not included in this bundle)

- **Payment webhook**: a small serverless function (Vercel function works)
  that verifies the payment provider's signature and calls
  `credit_purchase()` with the service-role key.
- **Kobos**: the parallel "kobos" currency adds confusion for users; the new
  system treats everything as one credit balance. Remove kobos-specific UI
  when convenient.
- **Cold start**: with a small user base, consider launching city-by-city
  and leading with quizzes/community content so Discovery never looks empty.
- **Code splitting**: the main JS bundle is 1.27 MB; dynamic `import()` for
  heavy screens (VideoChat, StaffPanel) would speed up first load.
- **Type errors**: `tsc` reports ~129 pre-existing type errors in other
  files (the build works because Vite doesn't type-check). Worth burning
  down gradually.
