// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sefaz-direct': {
        target: 'https://menorpreco.notaparana.pr.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sefaz-direct/, '/api/v1/produtos'),
        headers: {
          'Referer': 'https://menorpreco.notaparana.pr.gov.br/app',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      },
    },
  },
});