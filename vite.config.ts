import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// FIX: __dirname is not available in ESM. Using url for path resolution.
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: Replaced path.resolve with ESM-compatible URL resolver.
          '@': fileURLToPath(new URL('.', import.meta.url))
        }
      }
    };
});
