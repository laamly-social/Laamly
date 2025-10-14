import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    allowedHosts: ["localhost", "laamly.hnasheralneam.dev"],
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/posts": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/reels": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
    },
      "/auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/github": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // optional: hit health routes etc.
      "/is-logged-in": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/api/me": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
