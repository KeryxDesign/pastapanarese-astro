// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://keryxdesign.github.io',
  base: '/pastapanarese-astro',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    optimizeDeps: {
      include: ['nanostores', '@nanostores/react'],
    },
  },
  server: {
    port: 4329,
  },
  output: 'static',
});
