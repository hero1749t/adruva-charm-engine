import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@tanstack/react-query")) {
            return "query";
          }
          if (id.includes("react-router") || id.includes("@remix-run/router")) {
            return "router";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          if (
            id.includes("/react/") ||
            id.includes("\\react\\") ||
            id.includes("react-dom") ||
            id.includes("scheduler")
          ) {
            return "react-core";
          }
          if (id.includes("@supabase")) {
            return "supabase";
          }
          if (id.includes("@radix-ui")) {
            return "radix-ui";
          }
          if (id.includes("framer-motion")) {
            return "motion";
          }
          if (id.includes("qrcode.react")) {
            return "qr";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png"],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/~oauth/],
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "Adruvaa — Restaurant Management",
        short_name: "Adruvaa",
        description: "QR menu, orders, analytics aur payments — sab kuch ek app mein.",
        theme_color: "#F97316",
        background_color: "#0C0A09",
        display: "standalone",
        orientation: "portrait",
        start_url: "/owner/dashboard",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
}));
