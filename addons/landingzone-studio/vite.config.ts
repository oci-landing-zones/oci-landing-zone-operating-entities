/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const GITHUB_PAGES_BASE = '/oci-landing-zone-operating-entities/';

// Landing Zone Studio Vite config.
//   - dev server binds 0.0.0.0 so LAN hosts can hit it
//   - github-pages mode builds for this repository's project-site path
//   - vitest scans src for *.test.{ts,tsx}
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? GITHUB_PAGES_BASE : '/',
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
}));
