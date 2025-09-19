import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages project sites, use relative paths:
export default defineConfig({
  plugins: [react()],
  base: './'
})
