import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SearchX } from 'lucide-react'
import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { SearchBar } from '@/components/home/search-bar'
import {
  ListingCard,
  ListingCardSkeleton,
} from '@/components/listing/listing-card'
import { CATEGORIES } from '@/constants/categories'
import { Link } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  averageRating,
  getFavoriteIds,
  getListings,
} from '@/lib/queries/listings'
import { Button } from '@/components/ui/button'

interface HomeFilters {
  city?: string
  category?: string
  guests?: number
  checkIn?: Date
  checkOut?: Date
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): HomeFilters {
  const one = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v[0] : v
  }
  const checkInRaw = one('checkIn')
  const checkOutRaw = one('checkOut')
  const guestsRaw = one('guests')

  return {
    city: one('city') || undefined,
    category: one('category') || undefined,
    guests: guestsRaw ? Number(guestsRaw) : undefined,
    checkIn: checkInRaw ? new Date(checkInRaw) : undefined,
    checkOut: checkOutRaw ? new Date(checkOutRaw) : undefined,
  }
}

async function ListingGrid({ filters }: { filters: HomeFilters }) {
  const user = await getCurrentUser()
  const [listings, favoriteIds] = await Promise.all([
    getListings(filters),
    getFavoriteIds(user?.id ?? null),
  ])

  if (listings.length === 0) return <EmptyResults />

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          rating={averageRating(listing.reviews)}
          favorited={favoriteIds.has(listing.id)}
          authenticated={Boolean(user)}
        />
      ))}
    </div>
  )
}

async function EmptyResults() {
  const t = await getTranslations('home')
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <SearchX className="size-10 text-muted-foreground" />
      <p className="text-lg font-medium">{t('emptyResults')}</p>
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/">{t('clearFilters')}</Link>
      </Button>
    </div>
  )
}

export default async function HomePage(props: PageProps<'/[locale]'>) {
  const [{ locale }, sp] = await Promise.all([props.params, props.searchParams])
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const filters = parseFilters(sp)

  function categoryHref(value: string): string {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.guests) params.set('guests', String(filters.guests))
    if (filters.category !== value) params.set('category', value)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-8 pb-4">
          <h1 className="mb-1 text-center text-2xl font-bold sm:text-3xl">
            {t('heroTitle')}
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {t('heroSubtitle')}
          </p>
          <SearchBar
            initialCity={filters.city}
            initialGuests={filters.guests}
          />
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-4">
          <div
            className="scrollbar-none flex gap-6 overflow-x-auto pb-2"
            dir="ltr"
          >
            {[...CATEGORIES].reverse().map(({ value, icon: Icon }) => (
              <Link
                key={value}
                href={categoryHref(value)}
                className={`flex shrink-0 flex-col items-center gap-1 border-b-2 pb-2 text-xs text-muted-foreground transition hover:text-foreground ${
                  filters.category === value
                    ? 'border-foreground text-foreground'
                    : 'border-transparent'
                }`}
                dir="auto"
              >
                <Icon className="size-5" />
                {t(`categories.${value}`)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="mb-5 text-lg font-semibold">
            {filters.city
              ? t('resultsFor', { query: filters.city })
              : t('allListings')}
          </h2>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <ListingGrid filters={filters} />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  )
}
