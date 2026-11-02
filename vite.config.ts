import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sefaz': {
        target: 'https://menorpreco.notaparana.pr.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sefaz/, '/api/v1'),
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://menorpreco.notaparana.pr.gov.br/',
        },
      },
    },
  },
});