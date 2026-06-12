// src/app/manifest.ts — PWA Manifest para Bolão Copa 2026
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bolão Copa 2026',
    short_name: 'Bolão 2026',
    description: 'O bolão da Copa do Mundo 2026 do seu trabalho',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0f',
    theme_color: '#10b981',
    categories: ['sports', 'entertainment'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [],
  };
}
