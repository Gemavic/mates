import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/ui/toast";
import { initializeConfig } from "./lib/config";
import { logEnvironmentStatus } from "./lib/debug";
import "./tailwind.css";

// Log environment status for debugging
logEnvironmentStatus();

// Initialize configuration on app start
initializeConfig();

// NOTE: a clearStaleSession() helper used to call supabase.auth.getSession()
// here at module load. AuthContext already performs that call and already
// handles refresh_token_not_found by signing out. Because GoTrue serialises
// concurrent auth calls behind an internal lock, this duplicate ran first and
// the one the UI actually waits on queued behind it — an extra round trip on
// the critical path of every single page load.

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
