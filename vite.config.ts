import { fileURLToPath, URL } from 'node:url'

import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Proxy same-origin para baixar avatares externos na captura da tier. */
function imageProxyPlugin(): Plugin {
  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/image-proxy', async (req, res, next) => {
        try {
          const requestUrl = new URL(req.url || '', 'http://localhost')
          const target = requestUrl.searchParams.get('url')
          if (!target) {
            res.statusCode = 400
            res.end('Missing url')
            return
          }

          let parsed: URL
          try {
            parsed = new URL(target)
          } catch {
            res.statusCode = 400
            res.end('Invalid url')
            return
          }

          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            res.statusCode = 400
            res.end('Invalid protocol')
            return
          }

          const upstream = await fetch(parsed.toString(), {
            headers: {
              Accept: 'image/*,*/*',
              'User-Agent': 'TierlistImageProxy/1.0',
            },
          })

          if (!upstream.ok) {
            res.statusCode = upstream.status
            res.end(`Upstream error: ${upstream.status}`)
            return
          }

          const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
          if (!contentType.startsWith('image/')) {
            res.statusCode = 415
            res.end('URL is not an image')
            return
          }

          const buffer = Buffer.from(await upstream.arrayBuffer())
          res.statusCode = 200
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', 'public, max-age=3600')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(buffer)
        } catch (error) {
          console.error('[image-proxy]', error)
          res.statusCode = 502
          res.end('Proxy failed')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), imageProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
