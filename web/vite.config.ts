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
  },
});
