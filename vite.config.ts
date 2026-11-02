import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // expõe na rede local (0.0.0.0) para aceder pelo telemóvel
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