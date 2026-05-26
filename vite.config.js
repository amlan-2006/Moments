import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  plugins: [
    react({
      babel: {
        plugins: [
          // This safely activates the React Compiler preset directly through the Vite React plugin pipeline
          ['babel-plugin-react-compiler', {}]
        ]
      }
    })
  ],
  logLevel: 'info',
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  }
})