/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Landing Zone Studio Vite config.
//   - dev server binds 0.0.0.0 so LAN hosts can hit it
//   - vitest scans src for *.test.{ts,tsx}
export default defineConfig({
  plugins: [react()],
  // Ship the licenses that accompany the committed Jsonnet runtime.
  publicDir: '3rd/go-jsonnet/public',
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    host: true,
    open: '/',
  },
  envPrefix: 'VITE_',
});
