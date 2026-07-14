# React + Vite Auth Protection Guide

This document explains the authentication and route protection system implemented for your React + Vite dating app.

## Architecture Overview

Unlike Next.js which has middleware that runs on the server, React + Vite apps run entirely in the browser. Instead of middleware, we use:

1. **Protected Route Components** - Wrap screens that require authentication
2. **Public Route Components** - Wrap auth pages (signin/signup) to redirect authenticated users
3. **Route Configuration** - Centralized route access rules
4. **useAuth Hook** - Provides authentication state and methods

---

## Core Components

### 1. ProtectedRoute Component

**Location:** `src/components/ProtectedRoute.tsx`

Wraps screens that require authentication. Automatically redirects to signin if:
- User is not authenticated
- User is anonymous (when `allowAnonymous: false`)

**Props:**
```typescript
{
  children: React.ReactNode;
  onNavigate: (screen: string) => void;
  requireAuth?: boolean;              // Default: true
  redirectTo?: string;                // Default: 'signin'
  allowAnonymous?: boolean;           // Default: false
}
```

**Example:**
```tsx
<ProtectedRoute
  onNavigate={handleNavigate}
  requireAuth={true}
  allowAnonymous={false}
  redirectTo="signin"
>
  <Profile onNavigate={handleNavigate} />
</ProtectedRoute>
```

### 2. PublicRoute Component

**Location:** `src/components/PublicRoute.tsx`

Wraps public pages (signin/signup) to redirect authenticated users away.

**Props:**
```typescript
{
  children: React.ReactNode;
  onNavigate: (screen: string) => void;
  redirectIfAuthenticated?: boolean;  // Default: true
  redirectTo?: string;                // Default: 'discovery'
}
```

**Example:**
```tsx
<PublicRoute
  onNavigate={handleNavigate}
  redirectIfAuthenticated={true}
  redirectTo="discovery"
>
  <SignIn onNavigate={handleNavigate} />
</PublicRoute>
```

### 3. Route Configuration

**Location:** `src/lib/routeConfig.ts`

Centralized configuration for all routes. Defines access rules for each screen.

**Configuration Options:**
```typescript
{
  requireAuth: boolean;           // Requires authentication
  allowAnonymous: boolean;        // Allows anonymous users
  isPublicOnly: boolean;          // Auth users redirected away
  redirectIfAuthenticated: string; // Where to redirect auth users
}
```

**Example Route Configs:**
```typescript
// Public pages
signin: {
  requireAuth: false,
  isPublicOnly: true,
  redirectIfAuthenticated: 'discovery',
}

// Anonymous-friendly pages
discovery: {
  requireAuth: true,
  allowAnonymous: true,
}

// Full auth required
mail: {
  requireAuth: true,
  allowAnonymous: false,
}

// Fully public pages
'care-blog': {
  requireAuth: false,
  allowAnonymous: true,
}
```

---

## How It Works

### 1. App.tsx Integration

The `App.tsx` file automatically applies route protection based on configuration:

```tsx
const renderScreen = () => {
  const config = getRouteConfig(currentScreen);
  const content = renderScreenContent();

  // Public-only pages (signin/signup)
  if (config.isPublicOnly) {
    return (
      <PublicRoute
        onNavigate={handleNavigate}
        redirectIfAuthenticated={true}
        redirectTo={config.redirectIfAuthenticated}
      >
        {content}
      </PublicRoute>
    );
  }

  // Protected pages
  if (config.requireAuth) {
    return (
      <ProtectedRoute
        onNavigate={handleNavigate}
        requireAuth={true}
        allowAnonymous={config.allowAnonymous}
        redirectTo="signin"
      >
        {content}
      </ProtectedRoute>
    );
  }

  // Fully public pages
  return content;
};
```

### 2. Authentication Flow

**User visits protected page without auth:**
```
1. User navigates to 'mail'
2. ProtectedRoute checks authentication
3. No user found
4. Redirect to 'signin'
```

**Authenticated user visits signin:**
```
1. User navigates to 'signin'
2. PublicRoute checks authentication
3. User is authenticated
4. Redirect to 'discovery'
```

**Anonymous user visits mixed page:**
```
1. Anonymous user navigates to 'discovery'
2. ProtectedRoute checks authentication
3. User exists but is anonymous
4. allowAnonymous: true
5. Access granted
```

**Anonymous user visits full-auth page:**
```
1. Anonymous user navigates to 'mail'
2. ProtectedRoute checks authentication
3. User exists but is anonymous
4. allowAnonymous: false
5. Redirect to 'signin'
```

---

## Route Access Levels

### Level 1: Fully Public (No Auth Required)
Pages anyone can access without authentication:
- `welcome`, `help`, `care-blog`, `quizzes`
- Legal pages: `terms`, `privacy`, `consent`, etc.

**Config:**
```typescript
requireAuth: false,
allowAnonymous: true,
```

### Level 2: Public Only (Auth Users Redirected)
Auth pages that redirect logged-in users:
- `signin`, `signup`

**Config:**
```typescript
requireAuth: false,
isPublicOnly: true,
redirectIfAuthenticated: 'discovery',
```

### Level 3: Auth Required (Anonymous Allowed)
Pages that require some form of authentication:
- `discovery`, `browse-profiles`, `gift-shop`, `view-profile`

**Config:**
```typescript
requireAuth: true,
allowAnonymous: true,
```

### Level 4: Full Auth Required (No Anonymous)
Pages that require full registered accounts:
- `mail`, `matches`, `likes`, `credits`, `profile`
- `video-chat`, `audio-chat`, `verification`

**Config:**
```typescript
requireAuth: true,
allowAnonymous: false,
```

---

## Edge Function Integration

All Edge Functions already have proper authentication:

**Edge Function Auth Flow:**
```typescript
// 1. Get JWT from Authorization header
const authHeader = req.headers.get("Authorization");

// 2. Create Supabase client with JWT
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  {
    global: {
      headers: { Authorization: authHeader },
    },
  }
);

// 3. Verify user
const { data: { user }, error: authError } =
  await supabaseClient.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({ success: false, error: "Unauthorized" }),
    { status: 401 }
  );
}
```

**Frontend calls Edge Functions with auth:**
```typescript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/like-user`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetUserId, likeType }),
  }
);
```

---

## Adding New Routes

### 1. Add Screen Component
```tsx
// src/screens/NewFeature/NewFeature.tsx
export const NewFeature = ({ onNavigate }) => {
  return <div>New Feature</div>;
};
```

### 2. Import in App.tsx
```tsx
import { NewFeature } from '@/screens/NewFeature/NewFeature';
```

### 3. Add to renderScreenContent
```tsx
case 'new-feature':
  return <NewFeature onNavigate={handleNavigate} />;
```

### 4. Configure Route Access
```typescript
// src/lib/routeConfig.ts
'new-feature': {
  requireAuth: true,
  allowAnonymous: false,
}
```

That's it! The route protection is automatically applied.

---

## Security Best Practices

### ✅ DO:
- Always use `ProtectedRoute` for sensitive pages
- Set `allowAnonymous: false` for critical features (messaging, payments)
- Use Edge Functions for credit-sensitive operations
- Validate authentication on both frontend AND Edge Functions
- Check user permissions in RLS policies

### ❌ DON'T:
- Don't trust frontend auth alone - always validate on backend
- Don't expose sensitive data to anonymous users
- Don't skip route configuration for new pages
- Don't use local state for authentication decisions

---

## Testing Routes

### Test Protected Route (Should Redirect)
1. Sign out
2. Navigate to `/mail`
3. Should redirect to `/signin`

### Test Public Route (Should Redirect Auth Users)
1. Sign in
2. Navigate to `/signin`
3. Should redirect to `/discovery`

### Test Anonymous Route (Should Allow)
1. Sign in anonymously
2. Navigate to `/discovery`
3. Should show discovery page

### Test Full Auth Route (Should Block Anonymous)
1. Sign in anonymously
2. Navigate to `/mail`
3. Should redirect to `/signin`

---

## Comparison: Next.js vs React + Vite

| Feature | Next.js (Your Shared Code) | React + Vite (Your App) |
|---------|---------------------------|------------------------|
| **Auth Protection** | `middleware.ts` (server) | `ProtectedRoute` (client) |
| **Route Matching** | `matcher` config | Route config object |
| **Redirect Logic** | `NextResponse.redirect()` | `onNavigate()` function |
| **Session Management** | Server-side cookies | Client-side Supabase auth |
| **When It Runs** | Before page load (server) | During render (client) |
| **Protected Routes** | `/app/*` pattern | Individual screen components |
| **Public Routes** | `/login`, `/signup` | `isPublicOnly` flag |

**Key Difference:** Next.js middleware runs on the server before the page loads, while React + Vite protection runs in the browser during component render. Both achieve the same goal but use different mechanisms.

---

## Troubleshooting

### Issue: Route not protected
**Solution:** Add route to `routeConfig.ts`:
```typescript
'my-route': {
  requireAuth: true,
  allowAnonymous: false,
}
```

### Issue: Auth loop (redirecting back and forth)
**Solution:** Check `isPublicOnly` and `redirectIfAuthenticated` settings don't conflict.

### Issue: Anonymous users accessing protected content
**Solution:** Set `allowAnonymous: false` in route config.

### Issue: Edge Function returns 401
**Solution:** Check Authorization header is being sent:
```typescript
headers: {
  'Authorization': `Bearer ${session?.access_token}`,
}
```

---

## Summary

Your React + Vite app now has comprehensive route protection:

✅ **Protected Routes** - Require authentication
✅ **Public Routes** - Redirect authenticated users
✅ **Anonymous Support** - Configurable per route
✅ **Centralized Config** - Easy to manage
✅ **Edge Function Auth** - Server-side validation
✅ **Type-Safe** - Full TypeScript support

The system automatically protects routes based on configuration, similar to Next.js middleware but designed for client-side React apps.
