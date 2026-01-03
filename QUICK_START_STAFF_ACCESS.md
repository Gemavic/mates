# Quick Start: Staff Panel Access

## Immediate Access Instructions

Your staff panel is now enabled with secure database authentication. Here's how to access it:

### Step 1: Navigate to Staff Login
- Open your app
- Go to Menu → Staff Login
- Or visit: `https://your-app.com/staff-login`

### Step 2: Use One of These Accounts

#### Option 1: Super User (Recommended for You)
```
Email: admin@dates.care
Password: AdminPass2025!
```
**Access Level:** Full system control - manage everything

#### Option 2: Credit Manager
```
Email: creditmanager@dates.care
Password: CreditPass2025!
```
**Access Level:** Manage credits + change staff passwords

#### Option 3: Support Agent
```
Email: support@dates.care
Password: SupportPass2025!
```
**Access Level:** Customer support functions

### Step 3: Login
1. Enter email and password (or click quick-access button)
2. Click "Access Staff Panel"
3. You're in!

---

## ⚠️ CRITICAL: Change Passwords Immediately

After first login:
1. Go to "Password" tab in Staff Panel
2. Change all three default passwords
3. Save new passwords securely

**Why?** These default passwords are documented and need to be changed for security.

---

## What You Can Do Now

### As Super User (admin@dates.care):
✅ Award credits to users
✅ View all user profiles
✅ Manage user accounts
✅ Change staff passwords
✅ View system statistics
✅ Access all features

### As Credit Manager (creditmanager@dates.care):
✅ Award/manage credits
✅ View financial reports
✅ Change ANY staff password (including admins)
✅ Reset passwords

### As Support Agent (support@dates.care):
✅ View user profiles
✅ Send messages
✅ Manage support tickets
✅ Help users

---

## Need Help?

**Forgot password?**
- Contact me to reset it OR
- Use Supabase dashboard to manually reset

**Can't login?**
- Make sure you're using the email format (admin@dates.care)
- Password is case-sensitive
- Check browser console for errors

**Want to add more staff?**
- Use Supabase dashboard SQL editor
- Or request staff creation UI implementation

---

## Files Created

📄 `STAFF_PANEL_ACCESS_GUIDE.md` - Complete documentation
📄 `QUICK_START_STAFF_ACCESS.md` - This quick reference

---

## Database Changes

✅ Created `staff_members` table
✅ Added 3 initial staff accounts
✅ Implemented password hashing (bcrypt)
✅ Set up authentication functions
✅ Enabled Row Level Security

---

## Current Staff Accounts in Database

| Email | Role | Active | Permissions |
|-------|------|--------|-------------|
| admin@dates.care | Super User | ✅ | All permissions |
| creditmanager@dates.care | Credit Manager | ✅ | Credits + Passwords |
| support@dates.care | Support Agent | ✅ | Support functions |

All passwords are: `[Role]Pass2025!` (e.g., AdminPass2025!)

---

**Start by logging in as admin@dates.care and changing all passwords!**
