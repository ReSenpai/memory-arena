import { defineConfig } from 'vite'

export default defineConfig({
  base: '/memory-arena/',
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
