import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Relative paths so the build works when loaded straight from the APK
  // (file:///android_asset/www/index.html), not just from a web server.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    // WebViews cannot execute ES-module scripts from file:// URLs (CORS).
    // A classic IIFE script runs everywhere, even on older Android WebViews.
    // inlineDynamicImports merges the lazy-loaded pages into that one file.
    target: 'es2017',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});
