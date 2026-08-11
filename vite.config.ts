import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: true,
    port: 5173,
    open: true,
    hmr: {
      port: 5173,
    },
    fs: {
      strict: false
    }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // Strip debug logging from production bundles. The app carries ~390
  // console.* calls, many inside render and data-loading paths, several
  // printing full profile arrays and user IDs. At scale that is both a
  // measurable main-thread cost on low-end phones and an unnecessary
  // disclosure of user data in the browser console. console.error and
  // console.warn are kept so real failures remain visible.
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["debugger"] : [],
    pure:
      process.env.NODE_ENV === "production"
        ? ["console.log", "console.info", "console.debug"]
        : [],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'lucide-react']
  },
  publicDir: 'public'
});