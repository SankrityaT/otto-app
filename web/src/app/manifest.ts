// Otto's logo and app icons were drawn by Havi (@Havishea), from https://github.com/Havishea/Otto.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Otto',
    short_name: 'Otto',
    description: 'A calm pond for the things you started.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#F3EEE6',
    theme_color: '#F3EEE6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
