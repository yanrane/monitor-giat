import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Monitor Kegiatan — Divisi Hukum PT Timah',
    short_name: 'Monitor Giat',
    description: 'Sistem monitoring kegiatan Divisi Hukum PT Timah Tbk',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f3ef',
    theme_color: '#0b1929',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
