import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DROMONEY_API = process.env.DROMONEY_API_PROXY || 'http://127.0.0.1:5001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: DROMONEY_API,
        changeOrigin: true,
      },
      '/socket.io': {
        target: DROMONEY_API,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  }
})
