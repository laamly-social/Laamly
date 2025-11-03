// @ts-nocheck

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
   const env = loadEnv(mode, process.cwd(), '');
   const apiUrl = env.VITE_BACKEND_URL;


   return {
      plugins: [tailwindcss(), react()],
      server: {
         allowedHosts: ["localhost", "laamly.com"],
         port: 5177,
         proxy: {
            "/posts": {
               target: apiUrl,
               changeOrigin: true,
               secure: false
            },
            "/api": {
               target: apiUrl,
               changeOrigin: true,
               secure: false
            },
            // Proxy all /reels API endpoints (note: plural, not to be confused with /reel/:id frontend route)
            "/reels": {
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
      }
   };
});