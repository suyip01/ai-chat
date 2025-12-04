import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/uploads': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/admin': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/ws': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            ws: true,
          },
        },
      },
      build: {
        sourcemap: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'lucide-react': 'lucide-react/dist/esm/lucide-react.js',
        },
        dedupe: ['react', 'react-dom']
      },
      preview: {
        host: '0.0.0.0',
      },
    };
});
