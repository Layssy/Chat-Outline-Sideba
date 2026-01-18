import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: 'src/content/index.ts'
      },
      output: {
        entryFileNames: 'content/index.js',
        format: 'iife'
      }
    }
  }
});
