import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/hanzi-pwa/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Hanzi Master',
        short_name: 'Hanzi',
        description: 'Learn Chinese characters with stroke-order practice',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/hanzi-pwa/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache app shell + the single merged stroke data file
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024, // allow 35MB for all-strokes.json
        additionalManifestEntries: [
          { url: '/hanzi-pwa/hanzi-data/all-strokes.json', revision: '1' },
        ],
        runtimeCaching: [
          // all-strokes.json is precached above — no runtime rule needed
          {
            urlPattern: /\/api\/characters\/all$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'characters-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
})
