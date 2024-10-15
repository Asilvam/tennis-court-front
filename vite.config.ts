import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    outDir: 'dist', // Ensure this matches your deployment structure
  },
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 3000,
    host: true,
  },
})
