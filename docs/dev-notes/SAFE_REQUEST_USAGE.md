# Safe Request Utility - Usage Guide

The `safeRequest` utility automatically handles all Supabase errors and displays user-friendly toast notifications instead of crashing the app.

## Setup Complete

1. **ErrorBoundary** - Already wrapping the entire app in `App.tsx:421`
2. **ToastProvider** - Already set up in `index.tsx:59`
3. **safeRequest utility** - Available in `src/lib/utils.ts`

## How to Use

### Before (Unsafe - Can Crash)
```typescript
// This can crash if there's an error
const { data } = await supabase
  .from('users')
  .update({ name: 'New Name' })
  .eq('id', userId);

console.log(data); // Might be undefined if error occurred
```

### After (Safe - Won't Crash)
```typescript
import { safeRequest } from '@/lib/utils';

// Wrap the Supabase query with safeRequest
const { data, success } = await safeRequest(
  supabase.from('users').update({ name: 'New Name' }).eq('id', userId),
  "Updating profile"
);

if (!success) return; // Stop execution if failed

// Safely use data
console.log(data);
```

## Real Examples

### Example 1: Update User Profile
```typescript
import { safeRequest } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

async function updateUserProfile(userId: string, updates: any) {
  const { data, success, error } = await safeRequest(
    supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single(),
    "Updating profile"
  );

  if (!success) {
    console.error('Update failed:', error);
    return null;
  }

  return data;
}
```

### Example 2: Fetch User Data
```typescript
import { safeRequest } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

async function fetchUserProfile(userId: string) {
  const { data, success } = await safeRequest(
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    "Loading profile"
  );

  if (!success) return null;

  return data;
}
```

### Example 3: Insert New Record
```typescript
import { safeRequest } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

async function sendMessage(recipientId: string, content: string) {
  const { data, success } = await safeRequest(
    supabase
      .from('mail_messages')
      .insert({
        recipient_id: recipientId,
        content,
        sent_at: new Date().toISOString()
      })
      .select()
      .single(),
    "Sending message"
  );

  if (!success) return false;

  return true;
}
```

### Example 4: Delete Record
```typescript
import { safeRequest } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

async function deleteMessage(messageId: string) {
  const { success } = await safeRequest(
    supabase
      .from('mail_messages')
      .delete()
      .eq('id', messageId),
    "Deleting message"
  );

  return success;
}
```

## Benefits

1. **No More Crashes** - All Supabase errors are caught and handled
2. **User-Friendly Feedback** - Toast notifications show what went wrong
3. **Better Error Logging** - Errors are logged to console for debugging
4. **Cleaner Code** - No need for try-catch blocks everywhere
5. **Type-Safe** - Full TypeScript support with proper typing

## What It Does

When a Supabase query fails, `safeRequest`:
1. Catches the error
2. Logs it to console for debugging
3. Shows a toast notification to the user
4. Returns `{ data: null, success: false, error }`

This prevents crashes and provides better UX.
