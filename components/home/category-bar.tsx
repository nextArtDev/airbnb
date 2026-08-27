'use client'

import { useRef, useState, useEffect } from 'react'
// import { useLocale, useTranslations } from 'next-intl'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface Category {
  value: string
  icon: React.ComponentType<{ className?: string }>
}

interface CategoryBarProps {
  categories: Category[]
  activeCategory?: string
  filters: {
    city?: string
    guests?: number
    category?: string
  }
}

export function CategoryBar({
  categories,
  activeCategory,
  filters,
}: CategoryBarProps) {
  const t = useTranslations('home')
  // const locale = useLocale()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  function categoryHref(value: string): string {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.guests) params.set('guests', String(filters.guests))
    if (filters.category !== value) params.set('category', value)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  function updateArrows() {
    const el = scrollRef.current
    if (!el) return

    const canScrollLeft = el.scrollLeft > 0
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1

    setShowLeftArrow(canScrollLeft)
    setShowRightArrow(canScrollRight)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro.disconnect()
    }
  }, [])

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.7
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative">
      {/* Left arrow */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute start-0 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:border-foreground hover:shadow-md"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Scrollable categories */}
      <div
        ref={scrollRef}
        className="scrollbar-none flex gap-8 overflow-x-auto pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {categories.map(({ value, icon: Icon }) => (
          <Link
            key={value}
            href={categoryHref(value)}
            className={`group flex shrink-0 flex-col items-center gap-2 border-b-2 pb-2 pt-1 transition-all ${
              activeCategory === value
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
            }`}
            style={{ scrollSnapAlign: 'start', minWidth: 'fit-content' }}
            dir="auto"
          >
            <Icon className="size-6 transition-transform group-hover:scale-110" />
            <span className="whitespace-nowrap text-xs font-medium">
              {t(`categories.${value}`)}
            </span>
          </Link>
        ))}
      </div>

      {/* Right arrow */}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute end-0 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:border-foreground hover:shadow-md"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}
