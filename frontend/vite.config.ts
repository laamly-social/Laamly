// @ts-nocheck

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
   const env = loadEnv(mode, process.cwd(), '');
   const apiUrl = env.VITE_BACKEND_URL;


   return {
      plugins: [
         tailwindcss(),
         react(),
         VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'vite.svg'],
            manifest: {
               name: 'Laamly - Instagram but Sharia Compliant',
               short_name: 'Laamly',
               description: 'A Sharia-compliant social media platform for sharing posts, reels, and connecting with others',
               theme_color: '#1a1a1a',
               background_color: '#ffffff',
               display: 'standalone',
               orientation: 'portrait-primary',
               start_url: '/',
               icons: [
                  {
                     src: '/icon-192x192.png',
                     sizes: '192x192',
                     type: 'image/png',
                     purpose: 'any maskable'
                  },
                  {
                     src: '/icon-512x512.png',
                     sizes: '512x512',
                     type: 'image/png',
                     purpose: 'any maskable'
                  }
               ],
               categories: ['social', 'lifestyle'],
               prefer_related_applications: false
            },
            workbox: {
               globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
               runtimeCaching: [
                  {
                     urlPattern: /^https:\/\/api\.laamly\.com\/.*/i,
                     handler: 'NetworkFirst',
                     options: {
                        cacheName: 'api-cache',
                        expiration: {
                           maxEntries: 100,
                           maxAgeSeconds: 60 * 60 * 24 // 24 hours
                        },
                        cacheableResponse: {
                           statuses: [0, 200]
                        }
                     }
                  }
               ]
            }
         })
      ],
      server: {
         allowedHosts: ["localhost", "laamly.com"],
         port: 5177,
         proxy: {
            "^/posts/.*": {
               target: apiUrl,
               changeOrigin: true,
               secure: false
            },
            "/api": {
               target: apiUrl,
               changeOrigin: true,
               secure: false
            },
            // Proxy only /reels API endpoints with subpaths (not the bare /reels route)
            // This allows /reels page navigation to work while proxying API calls like /reels/create
            "^/reels/.+": {
               target: apiUrl,
               changeOrigin: true,
               secure: false,
            },
            "/auth": {
               target: apiUrl,
               changeOrigin: true,
               secure: false,
            },
            "/github": {
               target: apiUrl,
               changeOrigin: true,
               secure: false,
            },
            "/google": {
                target: apiUrl,
                changeOrigin: true,
                secure: false,
            },
            "/is-logged-in": {
               target: apiUrl,
               changeOrigin: true,
               secure: false,
            },
            "/logout": {
               target: apiUrl,
               changeOrigin: true,
               secure: false,
            },
         },
      },
      preview: {
         port: 5177
      }
   };
});