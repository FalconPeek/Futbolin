import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Picado',
    short_name: 'Picado',
    description: 'Organizá el fútbol con tus amigos: partidos, cartas, ranking y torneos.',
    lang: 'es-AR',
    start_url: '/grupos',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Dark theme colors from design-system/tokens.json
    background_color: '#0a0e0c',
    theme_color: '#0a0e0c',
    icons: [
      {
        src: '/icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
