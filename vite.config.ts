import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Gestão Financeira',
          short_name: 'Gestão Financeira',
          description: 'Controle de dívidas e caixa',
          theme_color: '#0f172a',
          background_color: '#f5f5f5',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait',
          icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Separa vendor em chunks cacheados (reduz o bundle inicial ~600 kB).
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@supabase')) return 'supabase';
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('/react-is/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion') || id.includes('/motion/')) return 'motion';
            if (id.includes('lucide-react')) return 'lucide';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
