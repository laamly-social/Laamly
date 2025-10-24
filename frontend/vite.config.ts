// @ts-nocheck

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:8080';


  return {
    plugins: [tailwindcss(), react()],
    server: {
      allowedHosts: ["localhost", "laamly.com"],
      port: 5177,
      proxy: {
        "/posts": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[PROXY] Proxying /posts request to:', apiUrl + req.url);
            });
          }
        },
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[PROXY] Proxying /api request to:', apiUrl + req.url);
            });
          }
        },
        // Only proxy /reels API endpoints, not the SPA route
        "^/reels/(create|get-all|toggle-like|toggle-save|delete|comments)": {
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
})