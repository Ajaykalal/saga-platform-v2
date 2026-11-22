import type { Metadata, Viewport } from 'next'
import './globals-compiled.css'
import Providers from '@/components/Providers'

export const viewport: Viewport = {
  themeColor: '#10B981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'SAGA Platform | Hyperlocal Food Delivery & Operations PWA',
  description:
    'Where Food Meets Play — Hyperlocal multi-cafe delivery, student rider courier network, and real-time kitchen operations.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SAGA Cafe',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#F9FAFB] text-[#151C27] pb-24">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
