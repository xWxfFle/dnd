import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/web',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@dnd/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 4200,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        rewrite: p => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
  },
})
