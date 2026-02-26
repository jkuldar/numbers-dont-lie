import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    // Allow all hosts in production (Railway, etc.)
    allowedHosts: [
      '.railway.app',
      '.up.railway.app',
      'localhost',
    ],
  },
});
