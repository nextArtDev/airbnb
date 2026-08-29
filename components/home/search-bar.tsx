'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Minus, Plus, Search } from 'lucide-react'
import { DateRangePicker } from '@/components/booking/date-range-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'

export function SearchBar({
  initialCity = '',
  initialGuests,
}: {
  initialCity?: string
  initialGuests?: number
}) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()

  const [city, setCity] = useState(initialCity)
  const [from, setFrom] = useState<Date | undefined>()
  const [to, setTo] = useState<Date | undefined>()
  const [guests, setGuests] = useState(initialGuests ?? 1)

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (city.trim()) params.set('city', city.trim())
    if (guests > 1) params.set('guests', String(guests))
    if (from) params.set('checkIn', from.toISOString())
    if (to) params.set('checkOut', to.toISOString())
    router.push(params.size > 0 ? `/?${params}` : '/')
  }

  return (
    <form
      onSubmit={onSearch}
      // overflow-hidden ensures the hover backgrounds don't break the rounded pill shape on desktop
      className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl md:rounded-full border border-border/50 bg-card shadow-sm transition-all hover:shadow-md hover:border-border sm:flex-row sm:items-center"
    >
      {/* WHERE */}
      <div className="group flex-1 px-4 py-3 md:py-2 max-sm:border-b sm:border-e border-border/50 transition-colors hover:bg-accent/50 focus-within:bg-transparent cursor-pointer">
        <label
          htmlFor="search-city"
          className="block text-xs font-bold text-foreground"
        >
          {t('where')}
        </label>
        <Input
          id="search-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('wherePlaceholder')}
          className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
        />
      </div>

      {/* WHEN */}
      <div className="group px-4 py-3 md:py-2 max-sm:border-b sm:border-e border-border/50 transition-colors hover:bg-accent/50 cursor-pointer">
        <DateRangePicker
          className="mt-0"
          from={from}
          to={to}
          onChange={({ from: f, to: t2 }) => {
            setFrom(f)
            setTo(t2)
          }}
          label={t('when')}
          placeholder={t('addDates')}
          clearLabel={tc('clear')}
        />
      </div>

      {/* WHO */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:py-2 flex-1 sm:flex-initial">
        <div className="flex flex-col justify-center">
          <span className="block text-xs font-bold text-foreground">
            {t('who')}
          </span>
          <span className="text-sm text-muted-foreground mt-0.5">
            {new Intl.NumberFormat(
              locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en-US',
            ).format(guests)}{' '}
            {tc('guests')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full border-border hover:border-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            disabled={guests <= 1}
            aria-label={tc('decrease')}
          >
            <Minus className="size-3.5" strokeWidth={2.5} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full border-border hover:border-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={() => setGuests((g) => Math.min(16, g + 1))}
            disabled={guests >= 16}
            aria-label={tc('increase')}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
          </Button>

          {/* SEARCH BUTTON */}
          <Button
            variant={'destructive'}
            type="submit"
            className="shrink-0 size-12 rounded-full bg-red-500 text-primary-foreground shadow-md transition-all hover:shadow-lg hover:bg-red-300"
          >
            <Search className="size-5" strokeWidth={2.5} />
            <span className="sr-only">{t('searchButton')}</span>
          </Button>
        </div>
      </div>
    </form>
  )
}
