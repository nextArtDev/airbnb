// components/listing/listing-card.tsx  (updated with image carousel dots)
'use client'

import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatMoney } from '@/lib/format'
import { HeartButton } from '@/components/listing/heart-button'
import { useRef, useState, useEffect, useCallback } from 'react'

interface ListingCardProps {
  listing: {
    id: string
    title: string
    coverImage: string
    images?: string[]
    city: string
    province: string | null
    pricePerNight: number
  }
  rating?: number | null
  favorited?: boolean
  authenticated?: boolean
}

export function ListingCard({
  listing,
  rating,
  favorited = false,
  authenticated = false,
}: ListingCardProps) {
  const t = useTranslations('listing')
  const locale = useLocale()
  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : [listing.coverImage]
  const [currentImage, setCurrentImage] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateIndex = useCallback(() => {
    const el = containerRef.current
    if (!el || images.length <= 1) return
    const scrollLeft = el.scrollLeft
    const width = el.clientWidth
    const idx = Math.round(scrollLeft / width)
    setCurrentImage(Math.min(idx, images.length - 1))
  }, [images.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', updateIndex, { passive: true })
    return () => el.removeEventListener('scroll', updateIndex)
  }, [updateIndex])

  function scrollImage(dir: 'prev' | 'next') {
    const el = containerRef.current
    if (!el) return
    const width = el.clientWidth
    const next =
      dir === 'next'
        ? Math.min(currentImage + 1, images.length - 1)
        : Math.max(currentImage - 1, 0)
    el.scrollTo({ left: next * width, behavior: 'smooth' })
  }

  return (
    <div className="group relative w-full">
      <Link
        href={`/listings/${listing.id}`}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      >
        {/* Image carousel */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <div
            ref={containerRef}
            className="scrollbar-none flex h-full w-full snap-x snap-mandatory overflow-x-auto"
            onClick={(e) => {
              // Prevent navigation when clicking arrows
              if ((e.target as HTMLElement).closest('[data-carousel-arrow]')) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            {images.map((img, i) => (
              <div
                key={i}
                className="relative h-full w-full shrink-0 snap-start"
              >
                <Image
                  src={img}
                  alt={`${listing.title} - ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 280px, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
            ))}
          </div>

          {/* Navigation arrows – visible on hover (desktop) or always on mobile */}
          {images.length > 1 && (
            <>
              {currentImage > 0 && (
                <button
                  type="button"
                  data-carousel-arrow
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    scrollImage('prev')
                  }}
                  className="absolute start-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/90 shadow-sm opacity-0 transition hover:bg-white hover:shadow-md group-hover:opacity-100 sm:opacity-0"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
              )}
              {currentImage < images.length - 1 && (
                <button
                  type="button"
                  data-carousel-arrow
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    scrollImage('next')
                  }}
                  className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/90 shadow-sm opacity-0 transition hover:bg-white hover:shadow-md group-hover:opacity-100 sm:opacity-0"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === currentImage ? 'bg-white scale-110' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Card info */}
        <div className="mt-3 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 font-medium text-[15px]">
              {listing.city}
              {listing.province ? `, ${listing.province}` : ''}
            </p>
            {rating != null && (
              <span className="flex shrink-0 items-center gap-1 text-sm">
                <Star className="size-3.5 fill-foreground" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {listing.title}
          </p>
          <p className="pt-1 text-sm">
            <span className="font-semibold">
              {formatMoney(listing.pricePerNight, locale)}
            </span>{' '}
            <span className="text-muted-foreground">{t('perNight')}</span>
          </p>
        </div>
      </Link>
      <HeartButton
        listingId={listing.id}
        initialFavorited={favorited}
        path="/"
        authenticated={authenticated}
      />
    </div>
  )
}

export function ListingCardSkeleton() {
  return (
    <div className="w-full">
      <div className="aspect-square animate-pulse rounded-xl bg-muted" />
      <div className="mt-3 space-y-1.5">
        <div className="flex items-start justify-between">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
