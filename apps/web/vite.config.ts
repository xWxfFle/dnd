import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '../..')
const sharedSrc = path.resolve(__dirname, '../../packages/shared/src')

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/web',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@dnd/shared': path.resolve(sharedSrc, 'index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['@dnd/shared'],
  },
  server: {
    port: 4200,
    host: true,
    fs: {
      allow: [searchForWorkspaceRoot(__dirname), workspaceRoot, sharedSrc],
    },
    watch: {
      ignored: ['!**/packages/shared/src/**'],
    },
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
