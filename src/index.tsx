import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./components/ui/toast";
import { initializeConfig } from "./lib/config";
import { supabase } from "./lib/supabase";
import "./tailwind.css";

// Initialize configuration on app start
initializeConfig();

// Clear any stale auth sessions on app start
const clearStaleSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Clearing stale session on startup:', error.message);
      await supabase.auth.signOut();
      localStorage.clear();
    }
  } catch (error) {
    console.warn('Error checking session on startup, clearing storage:', error);
    try {
      await supabase.auth.signOut();
      localStorage.clear();
    } catch {}
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
