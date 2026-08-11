/**
 * Auth state now lives in a single shared provider.
 *
 * This file previously defined the hook itself with useState, which meant
 * every component calling useAuth() got its own isolated auth state, its own
 * getSession() call, and its own listener. Re-exported here so all existing
 * `import { useAuth } from '@/hooks/useAuth'` call sites keep working.
 */
export { useAuth, AuthProvider } from '@/contexts/AuthContext';
