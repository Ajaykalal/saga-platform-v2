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
  title: 'FoodLo | Local Food Delivery & Express Operations',
  description:
    'Bhookh Lagi? FoodLo se mangwa lo! Hyperlocal food delivery connecting diners, local cafes, student couriers, and kitchen operations.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FoodLo',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased overflow-x-hidden">
      <body className="min-h-full flex flex-col font-sans bg-[#F9FAFB] text-[#151C27] overflow-x-hidden w-full max-w-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
