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
  title: 'FoodLo | Sagwara’s Favorite Food Delivery & Express Operations',
  description:
    'Bhookh Lagi? FoodLo se mangwa lo! Order fresh pizzas, burgers, thalis, and cafe bites from Sagwara’s top kitchens with live tracking.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'FoodLo — Sagwara’s Favorite Local Food Delivery',
    description:
      'Bhookh Lagi? FoodLo se mangwa lo! Order online from Meesaavi Cafe, Sevakji, Mewar, and more with zero price markups.',
    url: 'https://saga-platform.vercel.app',
    siteName: 'FoodLo',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        width: 1200,
        height: 630,
        alt: 'FoodLo Local Food Delivery Sagwara',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FoodLo | Sagwara Food Delivery',
    description: 'Bhookh Lagi? FoodLo se mangwa lo! Direct express delivery from Sagwara cafes.',
    images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'],
  },
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
