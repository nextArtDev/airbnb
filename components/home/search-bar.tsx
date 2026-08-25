'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Minus, Plus, Search } from 'lucide-react'
import { DatePicker } from '@/components/pl/date-picker'
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
  const [checkIn, setCheckIn] = useState<Date | null>(null)
  const [checkOut, setCheckOut] = useState<Date | null>(null)
  const [guests, setGuests] = useState(initialGuests ?? 1)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (city.trim()) params.set('city', city.trim())
    if (guests > 1) params.set('guests', String(guests))
    if (checkIn) params.set('checkIn', checkIn.toLocaleDateString('en-CA'))
    if (checkOut) params.set('checkOut', checkOut.toLocaleDateString('en-CA'))
    router.push(params.size > 0 ? `/?${params}` : '/')
  }

  const calendarType =
    locale === 'fa' ? ('shamsi' as const) : ('miladi' as const)

  const isRTL = locale === 'fa' || locale === 'ar'

  return (
    <>
      {/* ── Desktop: Airbnb-style pill search bar ── */}
      <form
        onSubmit={onSearch}
        className="mx-auto hidden w-full max-w-3xl items-stretch sm:flex"
      >
        <div
          className="flex w-full items-center rounded-full border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),_0_4px_12px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),_0_8px_16px_rgba(0,0,0,0.08)]"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* ── Where section ── */}
          <button
            type="button"
            onClick={() =>
              setActiveSection(activeSection === 'where' ? null : 'where')
            }
            className={`group flex min-w-0 flex-1 items-center rounded-full px-6 py-3 text-start transition-colors hover:bg-gray-100 ${
              activeSection === 'where'
                ? 'bg-gray-100 shadow-[inset_0_0_0_2px_#222]'
                : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-gray-900">
                {t('where')}
              </div>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('wherePlaceholder')}
                className="h-5 w-full border-0 bg-transparent p-0 text-sm text-gray-500 shadow-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:outline-none"
                onFocus={() => setActiveSection('where')}
              />
            </div>
          </button>

          {/* Divider */}
          <div className="h-8 w-px shrink-0 bg-gray-200" />

          {/* ── Check-in / Check-out section ── */}
          <button
            type="button"
            onClick={() =>
              setActiveSection(activeSection === 'dates' ? null : 'dates')
            }
            className={`flex items-center rounded-full px-4 py-3 text-start transition-colors hover:bg-gray-100 ${
              activeSection === 'dates'
                ? 'bg-gray-100 shadow-[inset_0_0_0_2px_#222]'
                : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <div>
                <div className="text-[13px] font-semibold text-gray-900">
                  {t('checkIn')}
                </div>
                <div className="text-sm text-gray-500" dir="ltr">
                  <DatePicker
                    calendarType={calendarType}
                    confirmLabel={tc('confirm')}
                    cancelLabel={tc('cancel')}
                    value={checkIn}
                    onValueChange={(v) => {
                      setCheckIn(v)
                      if (v && checkOut && v >= checkOut) setCheckOut(null)
                    }}
                    placeholder={t('checkIn')}
                    className="h-5 w-auto border-0 bg-transparent p-0 text-sm text-gray-500 shadow-none focus-visible:ring-0 focus-visible:outline-none"
                  />
                </div>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-900">
                  {t('checkOut')}
                </div>
                <div className="text-sm text-gray-500" dir="ltr">
                  <DatePicker
                    calendarType={calendarType}
                    confirmLabel={tc('confirm')}
                    cancelLabel={tc('cancel')}
                    value={checkOut}
                    onValueChange={setCheckOut}
                    placeholder={t('checkOut')}
                    className="h-5 w-auto border-0 bg-transparent p-0 text-sm text-gray-500 shadow-none focus-visible:ring-0 focus-visible:outline-none"
                  />
                </div>
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="h-8 w-px shrink-0 bg-gray-200" />

          {/* ── Guests section ── */}
          <div
            className={`flex items-center rounded-full py-3 pe-2 ps-4 transition-colors hover:bg-gray-100 ${
              activeSection === 'guests'
                ? 'bg-gray-100 shadow-[inset_0_0_0_2px_#222]'
                : ''
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setActiveSection(activeSection === 'guests' ? null : 'guests')
              }
              className="text-start"
            >
              <div className="text-[13px] font-semibold text-gray-900">
                {t('who')}
              </div>
              <div className="text-sm text-gray-500">
                {new Intl.NumberFormat(
                  locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en-US',
                ).format(guests)}{' '}
                {tc('guests')}
              </div>
            </button>

            {/* Guest counter – visible when guests section is active */}
            {activeSection === 'guests' && (
              <div className="flex items-center gap-2 ps-2" dir="ltr">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-8 rounded-full"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  aria-label={tc('decrease')}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span
                  className="min-w-6 text-center text-sm font-medium"
                  aria-live="polite"
                >
                  {new Intl.NumberFormat(
                    locale === 'fa'
                      ? 'fa-IR'
                      : locale === 'ar'
                        ? 'ar'
                        : 'en-US',
                  ).format(guests)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-8 rounded-full"
                  onClick={() => setGuests((g) => Math.min(16, g + 1))}
                  aria-label={tc('increase')}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Search button (round pink) ── */}
          <button
            type="submit"
            className="ms-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ff385c] text-white transition-colors hover:bg-[#e0314d]"
            aria-label={t('searchButton')}
          >
            <Search className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </form>

      {/* ── Mobile: Compact search button ── */}
      <form onSubmit={onSearch} className="mx-auto flex w-full px-4 sm:hidden">
        <div
          className="flex w-full items-center gap-3 rounded-full border border-border bg-white py-2 pe-2 ps-5 shadow-[0_2px_6px_rgba(0,0,0,0.08),_0_8px_24px_rgba(0,0,0,0.06)]"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-gray-900">
              {city.trim() || t('where')}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>
                {checkIn
                  ? checkIn.toLocaleDateString(
                      locale === 'fa'
                        ? 'fa-IR'
                        : locale === 'ar'
                          ? 'ar'
                          : 'en-US',
                      { month: 'short', day: 'numeric' },
                    )
                  : t('checkIn')}
              </span>
              <span className="text-gray-300">–</span>
              <span>
                {checkOut
                  ? checkOut.toLocaleDateString(
                      locale === 'fa'
                        ? 'fa-IR'
                        : locale === 'ar'
                          ? 'ar'
                          : 'en-US',
                      { month: 'short', day: 'numeric' },
                    )
                  : t('checkOut')}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                {new Intl.NumberFormat(
                  locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en-US',
                ).format(guests)}{' '}
                {tc('guests')}
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ff385c] text-white transition-colors hover:bg-[#e0314d]"
            aria-label={t('searchButton')}
          >
            <Search className="size-5" strokeWidth={2.5} />
          </button>
        </div>
      </form>

      {/* ── Expanded sections on mobile (inline below the bar) ── */}
      {activeSection && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:hidden">
          <div
            className="rounded-2xl border border-border bg-white p-4 shadow-lg"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {activeSection === 'where' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-900">
                  {t('where')}
                </label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('wherePlaceholder')}
                  className="h-10 rounded-xl text-sm"
                  autoFocus
                />
              </div>
            )}

            {activeSection === 'dates' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-900">
                    {t('checkIn')}
                  </label>
                  <div dir="ltr">
                    <DatePicker
                      calendarType={calendarType}
                      confirmLabel={tc('confirm')}
                      cancelLabel={tc('cancel')}
                      value={checkIn}
                      onValueChange={(v) => {
                        setCheckIn(v)
                        if (v && checkOut && v >= checkOut) setCheckOut(null)
                      }}
                      placeholder={t('checkIn')}
                      className="h-10 w-full rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-900">
                    {t('checkOut')}
                  </label>
                  <div dir="ltr">
                    <DatePicker
                      calendarType={calendarType}
                      confirmLabel={tc('confirm')}
                      cancelLabel={tc('cancel')}
                      value={checkOut}
                      onValueChange={setCheckOut}
                      placeholder={t('checkOut')}
                      className="h-10 w-full rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'guests' && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat(
                    locale === 'fa'
                      ? 'fa-IR'
                      : locale === 'ar'
                        ? 'ar'
                        : 'en-US',
                  ).format(guests)}{' '}
                  {tc('guests')}
                </span>
                <div className="flex items-center gap-3" dir="ltr">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-10 rounded-full"
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    aria-label={tc('decrease')}
                  >
                    <Minus />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-10 rounded-full"
                    onClick={() => setGuests((g) => Math.min(16, g + 1))}
                    aria-label={tc('increase')}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 w-full rounded-xl text-sm font-semibold"
              onClick={() => setActiveSection(null)}
            >
              {tc('confirm')}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
