
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Permet d'utiliser process.env.API_KEY dans le frontend comme demandé par le SDK Gemini
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
