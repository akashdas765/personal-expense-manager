import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Keep the bundled PDF.js worker in sync with the installed version.
// Vite dev mode can't serve node_modules .mjs files as plain static URLs
// (rewrites them to ?import), so we copy the worker to public/ where it
// is a plain fetch-able static file at /pdf.worker.min.mjs.
try {
  mkdirSync(resolve('./public'), { recursive: true });
  copyFileSync(
    resolve('./node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    resolve('./public/pdf.worker.min.mjs')
  );
} catch { /* ok if node_modules not installed yet */ }

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
