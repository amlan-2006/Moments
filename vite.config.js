import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  logLevel: 'info', // Minimizes terminal log memory allocation in cloud containers
  build: {
    sourcemap: false, // Disables heavy .map generation
    chunkSizeWarningLimit: 1600, // Loosens internal size tracking overhead
    rollupOptions: {
      output: {
        // Splitting code into individual granular chunks so Render doesn't hold one massive file in RAM
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  }
})