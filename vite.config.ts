import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'zr-proxy',
          configureServer(server) {
            server.middlewares.use('/zr/', async (req, res) => {
              const targetUrl = `https://api.zrexpress.app/api/v1.0${req.url!.replace(/^\/zr/, '')}`;
              try {
                const headers: Record<string, string> = {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                };
                if (req.headers['x-tenant']) headers['X-Tenant'] = req.headers['x-tenant'] as string;
                if (req.headers['x-api-key']) headers['X-Api-Key'] = req.headers['x-api-key'] as string;

                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = Buffer.concat(chunks).toString() || undefined;

                const proxyRes = await fetch(targetUrl, {
                  method: req.method,
                  headers,
                  body: body || undefined,
                });

                res.statusCode = proxyRes.status;
                res.statusMessage = proxyRes.statusText;
                proxyRes.headers.forEach((value, key) => res.setHeader(key, value));
                const text = await proxyRes.text();
                res.end(text);
              } catch (err: any) {
                res.statusCode = 502;
                res.end(`ZR proxy error: ${err.message}`);
              }
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
