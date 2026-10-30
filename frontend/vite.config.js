import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    modulePreload: { polyfill: false },
  },
  server: {
    // Lets the dev server load files from the repo's shared/ folder, which
    // sits outside frontend/. The production build doesn't need this.
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
      // Play Live's connection (backend/games/farkle/live.js). ws: true
      // lets the WebSocket upgrade through, not just ordinary requests.
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    }
  }
})

