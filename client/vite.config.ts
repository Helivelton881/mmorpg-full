import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // important for Electron (relative paths)
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
