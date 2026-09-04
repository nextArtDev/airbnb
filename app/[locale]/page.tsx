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
import {
  CATEGORIES,
  LISTING_TYPE_TABS,
  isListingTypeValue,
  type ListingTypeTab,
} from '@/constants/categories'
import { ListingType } from '@/app/generated/prisma/client'
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
  listingType?: ListingType
  guests?: number
  checkIn?: Date
  checkOut?: Date
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): { filters: HomeFilters; tab: ListingTypeTab } {
  const one = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v[0] : v
  }
  const checkInRaw = one('checkIn')
  const checkOutRaw = one('checkOut')
  const guestsRaw = one('guests')
  const typeRaw = one('type')

  const checkIn = checkInRaw ? new Date(checkInRaw) : undefined
  const checkOut = checkOutRaw ? new Date(checkOutRaw) : undefined

  let tab: ListingTypeTab = 'all'
  if (typeRaw && isListingTypeValue(typeRaw)) tab = typeRaw

  // Monthly rentals and sales are inquiry-based; check-in/check-out only make
  // sense for nightly stays. When dates are present without an explicit type,
  // the visitor is looking for a bookable stay.
  let listingType: ListingType | undefined
  let appliesDates = false
  if (tab === 'monthly' || tab === 'sale') {
    listingType = tab
  } else if (tab === 'nightly') {
    listingType = ListingType.nightly
    appliesDates = true
  } else if (checkIn && checkOut) {
    // 'all' with dates -> the visitor is looking for a bookable stay.
    listingType = ListingType.nightly
    appliesDates = true
  }

  return {
    filters: {
      city: one('city') || undefined,
      category: one('category') || undefined,
      listingType,
      guests: guestsRaw ? Number(guestsRaw) : undefined,
      checkIn: appliesDates ? checkIn : undefined,
      checkOut: appliesDates ? checkOut : undefined,
    },
    tab,
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
  const { filters, tab } = parseFilters(sp)

  function typeHref(value: ListingTypeTab): string {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.guests) params.set('guests', String(filters.guests))
    // Dates only survive on tabs where they are meaningful.
    if (filters.checkIn && filters.checkOut && value !== 'monthly' && value !== 'sale') {
      params.set('checkIn', filters.checkIn.toISOString())
      params.set('checkOut', filters.checkOut.toISOString())
    }
    if (value !== 'all') params.set('type', value)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  function categoryHref(value: string): string {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.guests) params.set('guests', String(filters.guests))
    if (tab !== 'all') params.set('type', tab)
    if (filters.category !== value) params.set('category', value)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-8 pb-4 ">
          <h1 className="mb-1 text-center text-2xl font-bold sm:text-3xl">
            {t('heroTitle')}
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {t('heroSubtitle')}
          </p>
          <SearchBar
            initialCity={filters.city}
            initialGuests={filters.guests}
            activeTab={tab}
          />
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-4 ">
          {/* Ad-type tabs (All / Homes / Monthly rent / For sale) */}
          <div
            className="scrollbar-none flex gap-6 overflow-x-auto pb-2 justify-center border-b border-border/60"
            dir="ltr"
          >
            {LISTING_TYPE_TABS.map(({ value, icon: Icon }) => (
              <Link
                key={value}
                href={typeHref(value)}
                className={`flex shrink-0 flex-col items-center gap-1 border-b-2 pb-2 pt-1 text-xs text-muted-foreground transition hover:text-foreground ${
                  tab === value
                    ? '-mb-[9px] border-foreground font-medium text-foreground'
                    : 'border-transparent'
                }`}
                dir="auto"
              >
                <Icon className="size-5" />
                {t(`tabs.${value}`)}
              </Link>
            ))}
          </div>

          {/* Property categories (orthogonal to the ad type) */}
          <div
            className="scrollbar-none mt-3 flex gap-6 overflow-x-auto pb-2   justify-center"
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
              : tab === 'all'
                ? t('allListings')
                : t(`tabs.${tab}`)}
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
