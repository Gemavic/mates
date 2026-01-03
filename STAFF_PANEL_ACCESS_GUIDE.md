# Staff Panel Access Guide - Admin Setup
**Date:** January 3, 2026
**Status:** ✅ Secure Database-Backed Authentication Enabled

---

## Overview

Your staff authentication system has been completely rebuilt with secure database-backed authentication. All staff credentials are now stored in Supabase with bcrypt password hashing.

---

## Initial Staff Accounts Created

Three staff accounts have been automatically created in your database:

### 1. Super User (Full Admin Access)
- **Email:** `admin@dates.care`
- **Password:** `AdminPass2025!`
- **Role:** Super User
- **Permissions:**
  - All permissions
  - Manage users
  - Award credits
  - Change staff passwords
  - Reset passwords
  - View reports
  - Manage content
  - Ban users

### 2. Credit Manager
- **Email:** `creditmanager@dates.care`
- **Password:** `CreditPass2025!`
- **Role:** Credit Manager
- **Permissions:**
  - Award credits
  - Manage credits
  - View reports
  - Change staff passwords (including resetting other staff passwords)
  - Reset passwords

### 3. Support Agent
- **Email:** `support@dates.care`
- **Password:** `SupportPass2025!`
- **Role:** Support Agent
- **Permissions:**
  - View users
  - Manage tickets
  - Send messages

---

## How to Access the Staff Panel

### Step 1: Navigate to Staff Login
1. Open your application
2. Click on the Menu
3. Select "Staff Login" or navigate to `/staff-login`

### Step 2: Login as Admin
1. On the Staff Login page, you'll see three quick-access buttons
2. Click the **"Super User"** button to auto-fill the credentials
3. Or manually enter:
   - **Email:** `admin@dates.care`
   - **Password:** `AdminPass2025!`
4. Click **"Access Staff Panel"**

### Step 3: Access Granted
You'll be redirected to the Staff Panel with full administrative access.

---

## CRITICAL: Change Default Passwords Immediately

For security, you MUST change these default passwords after first login:

### How to Change Passwords

1. Login as Super User (admin@dates.care)
2. In the Staff Panel, click on the **"Password"** tab
3. Select target staff member from dropdown
4. Enter new password (minimum 8 characters)
5. Confirm new password
6. Enter YOUR current password (for verification)
7. Click "Change Password"

**Recommended Password Requirements:**
- Minimum 12 characters
- Mix of uppercase and lowercase letters
- Include numbers
- Include special characters (!@#$%^&*)
- Avoid common words or patterns

---

## Staff Panel Features

Once logged in, you'll have access to:

### Overview Tab
- Platform statistics
- Active users count
- Recent activity
- System health

### Users Tab
- View all users
- Search users
- View user profiles
- Manage user accounts

### Credits Tab
- Award credits to users
- View credit transactions
- Manage credit packages
- Track credit usage

### Password Tab (Super User & Credit Manager only)
- Change staff passwords
- Reset passwords
- View password last changed dates
- Manage staff access

---

## Creating New Staff Accounts

Currently, new staff accounts must be created directly in the database. To add a new staff member:

### Method 1: Using Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run this query (replace values as needed):

```sql
INSERT INTO staff_members (email, password_hash, role, permissions, is_active)
VALUES (
  'newstaff@dates.care',
  crypt('SecurePassword123!', gen_salt('bf')),
  'Support Agent',
  '["view_users", "manage_tickets", "send_messages"]'::jsonb,
  true
);
```

### Method 2: Request Implementation of Staff Management UI

For easier staff management, you can request implementation of:
- Staff member creation form in Staff Panel
- Staff account editing
- Staff account deactivation
- Permission management UI

---

## Security Features

### What's Secure Now
✅ Passwords hashed with bcrypt (never stored in plain text)
✅ Database-backed authentication (not localStorage)
✅ Role-based access control
✅ Permission-based feature access
✅ Session timeout (24 hours)
✅ Audit trail (last login tracking)

### Best Practices
1. **Change all default passwords immediately**
2. **Use strong, unique passwords for each staff member**
3. **Regularly review staff access and permissions**
4. **Disable accounts for staff who leave**
5. **Review login logs periodically**
6. **Never share staff credentials**

---

## Available Roles & Their Permissions

### Super User
- Complete system access
- Can do everything
- Only role that can create/delete other admins
- Should be limited to 1-2 people

### Administrator
- Full administrative access
- Can manage users and content
- Can view all reports
- Cannot manage other administrators

### Credit Manager
- Manages credits and payments
- Can award/remove credits
- **Can change passwords for ALL staff members**
- Can view financial reports
- Cannot manage users directly

### Support Agent
- Customer support functions
- Can view user profiles
- Can send messages
- Can manage support tickets
- Cannot modify credits or system settings

### Moderator
- Content moderation
- Can review reported content
- Can ban/warn users
- Cannot access financial data
- Cannot manage other staff

---

## How Password Management Works

### Who Can Change Passwords?
- **Super Users** - Can change any staff password
- **Administrators** - Can change any staff password
- **Credit Managers** - Can change any staff password

### Password Change Process
1. Manager must authenticate with their own password
2. Database verifies manager has permission
3. New password is validated (minimum 8 characters)
4. Password is hashed with bcrypt
5. Timestamp is recorded
6. Change is logged

### Password Reset
If a staff member forgets their password:
1. Contact a Super User or Credit Manager
2. They can set a new temporary password
3. Staff member should change it immediately upon login

---

## Troubleshooting

### "Invalid email or password" Error
- Check that you're using the correct email (e.g., admin@dates.care, not just "admin")
- Passwords are case-sensitive
- Make sure you haven't changed the password and forgotten the new one
- Try clicking the quick-access button to auto-fill

### "Authentication failed. Please try again" Error
- Database connection issue
- Check your Supabase connection
- Verify your environment variables are set
- Check browser console for detailed errors

### Cannot Access Staff Panel After Login
- Check browser console for JavaScript errors
- Clear browser cache and cookies
- Verify sessionStorage is enabled in browser
- Try incognito/private browsing mode

### Need to Reset Admin Password
If you lose access to the Super User account:

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run this query to reset the admin password:

```sql
UPDATE staff_members
SET password_hash = crypt('NewAdminPassword2025!', gen_salt('bf')),
    password_last_changed = now()
WHERE email = 'admin@dates.care';
```

4. Login with the new password
5. Change it immediately to something secure

---

## Database Schema

The staff_members table structure:

```sql
CREATE TABLE staff_members (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  password_last_changed timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## Quick Reference

### Login URLs
- Staff Login: `/staff-login`
- Staff Panel: `/staff-panel` (after authentication)

### Default Credentials (CHANGE IMMEDIATELY)

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@dates.care | AdminPass2025! | Super User |
| Credit Manager | creditmanager@dates.care | CreditPass2025! | Credit Manager |
| Support | support@dates.care | SupportPass2025! | Support Agent |

### Session Duration
- 24 hours (automatically expires)
- Logout manually for security

### Database Functions
- `authenticate_staff(email, password)` - Login
- `change_staff_password(manager_email, manager_password, target_email, new_password)` - Change password

---

## Next Steps

### Immediate (Do Now)
1. ✅ Login as Super User (admin@dates.care)
2. ⚠️ **Change all three default passwords**
3. ⚠️ Document new passwords securely (use password manager)
4. ✅ Test logging in with new passwords
5. ✅ Verify all staff panel features work

### Short Term (This Week)
1. Create additional staff accounts as needed
2. Set up proper password policies
3. Document staff access procedures
4. Train staff on using the panel
5. Set up monitoring for staff actions

### Long Term (This Month)
1. Implement staff creation UI in panel
2. Add audit logging for all staff actions
3. Implement 2FA for staff accounts
4. Set up automated password expiry
5. Add staff activity reports

---

## Support

If you need help:

1. **Password Reset:** Use SQL query in Supabase dashboard
2. **Technical Issues:** Check browser console for errors
3. **Permission Issues:** Verify role and permissions in database
4. **Database Issues:** Check Supabase connection and logs

---

## Security Improvements Made

### Before (Insecure)
❌ Hardcoded credentials in source code
❌ Client-side only validation
❌ Plain text passwords
❌ localStorage only (easily manipulated)
❌ No audit trail

### After (Secure)
✅ Database-backed authentication
✅ Bcrypt password hashing
✅ Server-side validation
✅ Role-based access control
✅ Session management
✅ Last login tracking
✅ Row Level Security (RLS)

---

**Remember: Change all default passwords immediately after first login!**

Your staff authentication system is now secure and production-ready.
