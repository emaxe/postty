import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'postty-entry-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url) {
            const parsed = new URL(req.url, 'http://localhost:3000');
            if (parsed.pathname === '/main.ts' || parsed.pathname === '/src/main.ts') {
              parsed.pathname = '/src/main.tsx';
              req.url = parsed.pathname + parsed.search;
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
  },
});
