import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    allowedHosts: ["localhost", "laamly.hnasheralneam.dev"],
    port: 5175,
    proxy: {
      "/posts": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
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
      "/is-logged-in": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  }
})