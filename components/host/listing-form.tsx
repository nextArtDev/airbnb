'use client'

import { useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import Image from 'next/image'
import { Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/i18n/navigation'
import { CATEGORIES, AMENITIES } from '@/constants/categories'
import {
  uploadListingImages,
  createListing,
  updateListing,
} from '@/lib/actions/listings'
import {
  listingFormSchema,
  type ListingFormValues,
} from '@/lib/schemas/listing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface ListingFormProps {
  listingId?: string
  defaultValues?: Partial<ListingFormValues>
}

const STEPS = [
  'category',
  'location',
  'details',
  'amenitiesStep',
  'images',
  'pricing',
] as const

const STEP_FIELDS: Record<(typeof STEPS)[number], string[]> = {
  category: ['category'],
  location: ['city', 'province', 'address'],
  details: [
    'title',
    'description',
    'guestCount',
    'bedroomCount',
    'bedCount',
    'bathroomCount',
  ],
  amenitiesStep: ['amenities'],
  images: ['coverImage', 'images'],
  pricing: ['pricePerNight'],
}

export function ListingForm({ listingId, defaultValues }: ListingFormProps) {
  const t = useTranslations('hosting')
  const th = useTranslations('home')
  const tl = useTranslations('listing')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()

  const [stepIndex, setStepIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [galleryUrls, setGalleryUrls] = useState<string[]>(() => {
    const cover = defaultValues?.coverImage ? [defaultValues.coverImage] : []
    return [...cover, ...(defaultValues?.images ?? [])]
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
      amenities: [],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: undefined,
      country: 'IR',
      province: '',
      city: '',
      address: '',
      latitude: null,
      longitude: null,
      coverImage: undefined,
      images: [],
      ...defaultValues,
    },
  })
  const selectedCategory = useWatch({
    control: form.control,
    name: 'category',
  })

  const [pending, startTransition] = useTransition()
  const step = STEPS[stepIndex]

  async function nextStep() {
    if (step === 'images') {
      // Materialize gallery urls into the schema fields before validating.
      if (galleryUrls.length === 0) {
        toast.error(t('form.imagesHint'))
        return
      }
      form.setValue('coverImage', galleryUrls[0], { shouldValidate: true })
      form.setValue('images', galleryUrls.slice(1), { shouldValidate: true })
    }

    const valid = await form.trigger(STEP_FIELDS[step] as never)
    if (!valid) return

    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    if (galleryUrls.length + files.length > 10) {
      toast.error(t('form.imagesHint'))
      return
    }
    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('files', f))
    const result = await uploadListingImages(formData)
    setUploading(false)
    if (!result.success || !result.urls) {
      toast.error(tc('tryAgain'))
      return
    }
    setGalleryUrls((prev) => [...prev, ...result.urls!])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImage(url: string) {
    setGalleryUrls((prev) => prev.filter((u) => u !== url))
  }

  function makeCover(url: string) {
    setGalleryUrls((prev) => [url, ...prev.filter((u) => u !== url)])
  }

  const onSubmit = form.handleSubmit((values) => {
    if (galleryUrls.length === 0) {
      toast.error(t('form.imagesHint'))
      setStepIndex(4)
      return
    }
    const payload = {
      ...values,
      latitude:
        values.latitude === null || values.latitude === undefined
          ? null
          : Number(values.latitude),
      longitude:
        values.longitude === null || values.longitude === undefined
          ? null
          : Number(values.longitude),
      coverImage: galleryUrls[0],
      images: galleryUrls.slice(1),
    }

    startTransition(async () => {
      const result = listingId
        ? await updateListing(listingId, payload)
        : await createListing(payload)

      if (!result.success) {
        const key = result.message ?? ''
        toast.error(
          tc.has(`errors.${key}`) ? tc(`errors.${key}`) : tc('tryAgain'),
        )
        return
      }
      toast.success(listingId ? t('updated') : t('created'))
      router.push('/hostings')
      router.refresh()
    })
  })

  const counterFields = [
    { name: 'guestCount' as const, min: 1, max: 16, label: 'form.guestsLabel' },
    {
      name: 'bedroomCount' as const,
      min: 0,
      max: 20,
      label: 'form.bedroomsLabel',
    },
    { name: 'bedCount' as const, min: 1, max: 40, label: 'form.bedsLabel' },
    {
      name: 'bathroomCount' as const,
      min: 1,
      max: 10,
      label: 'form.bathsLabel',
    },
  ]

  const err = (name: keyof ListingFormValues): string | undefined => {
    const e = form.formState.errors[name]
    return typeof e?.message === 'string' ? e.message : undefined
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => i < stepIndex && setStepIndex(i)}
              disabled={pending}
              className={cn(
                'rounded-full px-3 py-1',
                i === stepIndex &&
                  'bg-foreground text-background font-semibold',
                i < stepIndex && 'text-muted-foreground hover:bg-accent',
                i > stepIndex && 'text-muted-foreground/50',
              )}
            >
              {t(`step.${s}`)}
            </button>
          </li>
        ))}
      </ol>

      {step === 'category' && (
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  form.setValue('category', value, { shouldValidate: true })
                }
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition hover:border-foreground/50',
                  selectedCategory === value &&
                    'border-foreground bg-accent font-semibold',
                )}
              >
                <Icon className="size-6" />
                {th(`categories.${value}`)}
              </button>
            ))}
          </div>
          {err('category') && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {err('category')}
            </p>
          )}
        </section>
      )}

      {step === 'location' && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="city">{t('form.cityLabel')} *</Label>
            <Input id="city" {...form.register('city')} />
            {err('city') && (
              <p role="alert" className="text-sm text-destructive">
                {err('city')}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="province">{t('form.provinceLabel')}</Label>
            <Input id="province" {...form.register('province')} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="address">{t('form.addressLabel')}</Label>
            <Input id="address" {...form.register('address')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="latitude">{t('form.latitudeLabel')}</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              dir="ltr"
              {...form.register('latitude', {
                setValueAs: (v) =>
                  v === '' || v === null || Number.isNaN(Number(v))
                    ? null
                    : Number(v),
              })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="longitude">{t('form.longitudeLabel')}</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              dir="ltr"
              {...form.register('longitude', {
                setValueAs: (v) =>
                  v === '' || v === null || Number.isNaN(Number(v))
                    ? null
                    : Number(v),
              })}
            />
          </div>
        </section>
      )}

      {step === 'details' && (
        <section className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="title">{t('form.titleLabel')} *</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder={t('form.titlePlaceholder')}
            />
            {err('title') && (
              <p role="alert" className="text-sm text-destructive">
                {err('title')}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{t('form.descriptionLabel')} *</Label>
            <Textarea
              id="description"
              rows={6}
              {...form.register('description')}
              placeholder={t('form.descriptionPlaceholder')}
            />
            {err('description') && (
              <p role="alert" className="text-sm text-destructive">
                {err('description')}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {counterFields.map(({ name, min, max, label }) => (
              <div key={name} className="grid gap-1.5">
                <Label htmlFor={name}>{t(label)}*</Label>
                <Input
                  id={name}
                  type="number"
                  min={min}
                  max={max}
                  {...form.register(name, {
                    setValueAs: (v) => (v === '' ? undefined : Number(v)),
                  })}
                  dir="ltr"
                  className="text-center"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 'amenitiesStep' && (
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AMENITIES.map(({ key, icon: Icon }) => {
              const current = form.watch('amenities') ?? []
              const checked = current.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const nextValue = checked
                      ? current.filter((a) => a !== key)
                      : [...current, key]
                    form.setValue('amenities', nextValue as never, {
                      shouldValidate: false,
                    })
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-3 text-sm transition hover:border-foreground/50',
                    checked && 'border-foreground bg-accent',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {tl(`amenities.${key}`)}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 'images' && (
        <section className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void onFilesSelected(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
          >
            {uploading ? (
              <Spinner aria-label={tc('loading')} />
            ) : (
              <Upload className="size-6" />
            )}
            <span className="text-sm">{t('form.imagesHint')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => void onFilesSelected(e.target.files)}
            />
          </div>

          {galleryUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {galleryUrls.map((url, i) => (
                <div
                  key={url}
                  className="group relative overflow-hidden rounded-xl border"
                >
                  <div className="relative aspect-square w-full">
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  {i === 0 ? (
                    <span className="absolute start-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                      ★ {t('form.coverLabel')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeCover(url)}
                      className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs text-white group-hover:flex"
                    >
                      ★
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    aria-label={tc('delete')}
                    className="absolute end-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 'pricing' && (
        <section className="max-w-sm space-y-2">
          <Label htmlFor="pricePerNight">{t('form.priceLabel')} *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pricePerNight"
              type="number"
              min={50000}
              step={10000}
              dir="ltr"
              {...form.register('pricePerNight', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
              className="text-center"
            />
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {tc('toman')} / {tc('night')}
            </span>
          </div>
          {err('pricePerNight') && (
            <p role="alert" className="text-sm text-destructive">
              {err('pricePerNight')}
            </p>
          )}
          {form.watch('pricePerNight') != null && (
            <p className="text-sm text-muted-foreground" dir="auto">
              ≈{' '}
              {new Intl.NumberFormat(
                locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : 'en-US',
              ).format(Number(form.watch('pricePerNight')))}
            </p>
          )}
        </section>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0 || pending}
        >
          {tc('back')}
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={() => void nextStep()}
            disabled={pending}
          >
            {tc('next')}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={pending}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {pending && <Spinner aria-label={tc('loading')} />}
            {listingId ? t('form.submitUpdate') : t('form.submitCreate')}
          </Button>
        )}
      </div>
    </form>
  )
}
