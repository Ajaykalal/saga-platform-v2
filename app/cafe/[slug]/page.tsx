import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SEED_CAFES, SEED_MENU_ITEMS } from '@/lib/data/mockData'
import CafeMenuView from './CafeMenuView'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return SEED_CAFES.map((cafe) => ({
    slug: cafe.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const cafe = SEED_CAFES.find((c) => c.slug === slug)

  if (!cafe) {
    return {
      title: 'Cafe Not Found | SAGA Delivery',
    }
  }

  return {
    title: `${cafe.name} - Order Online | SAGA Delivery`,
    description: cafe.description || `Explore ${cafe.name}'s gourmet artisan menu.`,
  }
}

export default async function CafePage({ params }: PageProps) {
  const { slug } = await params
  const cafe = SEED_CAFES.find((c) => c.slug === slug)

  if (!cafe) {
    notFound()
  }

  // Get menu items for this cafe (or fallback to related items if none)
  const menuItems = SEED_MENU_ITEMS.filter((item) => item.cafe_id === cafe.id)
  const itemsToDisplay = menuItems.length > 0 ? menuItems : SEED_MENU_ITEMS

  return <CafeMenuView cafe={cafe} menuItems={itemsToDisplay} />
}
