import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./components/ui/toast";
import { initializeConfig } from "./lib/config";
import { supabase, supabaseConfigError } from "./lib/supabase";
import "./tailwind.css";

// Initialize configuration on app start
initializeConfig();

// Clear only invalid refresh tokens on app start
const clearStaleSession = async () => {
  // Skip if Supabase isn't configured
  if (supabaseConfigError) {
    console.warn('Skipping session check - Supabase not configured');
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    // Only clear if there's a specific refresh token error
    if (error && error.message && error.message.includes('refresh_token_not_found')) {
      console.warn('Clearing stale refresh token on startup');
      await supabase.auth.signOut();

      // Only remove auth-related keys, not everything
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth-token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.warn('Error checking session on startup:', error);
  }
};

clearStaleSession().catch(console.warn);

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
