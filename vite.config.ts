import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { apiDevServer } from './api/_dev-server.ts';

// IMPORTANT: The Gemini API key is intentionally NOT exposed to the client.
// It is only ever read server-side (process.env.GEMINI_API_KEY) inside the
// /api functions. We load env here purely so the dev-server middleware can see
// the key in local development.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Surface the key to the dev middleware (which runs in Node, in-process).
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    plugins: [react(), apiDevServer()],
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
  };
});
