import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base path ensures seamless static hosting on GitHub Pages & Cloudflare Pages
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
