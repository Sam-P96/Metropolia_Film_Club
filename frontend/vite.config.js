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
      '/api': 'http://localhost:3000'
    }
  }
})

