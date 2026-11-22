import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SAGA Cafe & Delivery — Where Food Meets Play',
    short_name: 'SAGA',
    description:
      'Hyperlocal multi-cafe delivery and operations PWA connecting diners, cafes, student couriers, and platform admins.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#10B981',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
