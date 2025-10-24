import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    allowedHosts: ["localhost", "laamly.com"],
    port: 5177,
    proxy: {
      "/posts": {
        target: "https://api.laamly.com",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "https://api.laamly.com",
        changeOrigin: true,
        secure: false,
      },
      // Only proxy /reels API endpoints, not the SPA route
      "^/reels/(create|get-all|toggle-like|toggle-save|delete)": {
        target: "https://api.laamly.com",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "https://api.laamly.com",
        changeOrigin: true,
        secure: false,
      },
      "/github": {
        target: "https://api.laamly.com",
        changeOrigin: true,
        secure: false,
      },
      "/is-logged-in": {
        target: "https://api.laamly.com",
        changeOrigin: true,
        secure: false,
      },
    },
  }
})
