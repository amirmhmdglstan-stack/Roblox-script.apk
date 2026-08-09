import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths so the build works when loaded straight from the APK
  // (file:///android_asset/www/index.html), not just from a web server.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // WebViews cannot execute ES-module scripts from file:// URLs (CORS).
    // A classic IIFE script runs everywhere, even on older Android WebViews.
    target: 'es2017',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
