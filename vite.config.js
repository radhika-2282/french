import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import injectHTML from 'vite-plugin-html-inject';
import path from 'path'

export default defineConfig({
  plugins: [
    injectHTML()
  ],
  build: {
    rollupOptions: {
      input: {
        // Define your main entry point
        main: path.resolve(import.meta.dirname, 'index.html'),
        lesson1: path.resolve(import.meta.dirname, 'lesson1.html'),
        lesson2: path.resolve(import.meta.dirname, 'lesson2.html'),
        lesson3: path.resolve(import.meta.dirname, 'lesson3.html'),
        lesson4: path.resolve(import.meta.dirname, 'lesson4.html'),
        lesson5: path.resolve(import.meta.dirname, 'lesson5.html'),
        lesson6: path.resolve(import.meta.dirname, 'lesson6.html'),
        lesson7: path.resolve(import.meta.dirname, 'lesson7.html'),
        lesson8: path.resolve(import.meta.dirname, 'lesson8.html'),
        lesson9: path.resolve(import.meta.dirname, 'lesson9.html'),
      },
    },
  },
})
