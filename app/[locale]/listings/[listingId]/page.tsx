import { notFound } from "next/navigation";
import {
  BedDouble,
  Bath,
  DoorOpen,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { BookingSidebar } from "@/components/listing/booking-sidebar";
import { ImageGallery } from "@/components/listing/image-gallery";
import { HeartButton } from "@/components/listing/heart-button";
import { MapLoader } from "@/components/listing/map-loader";
import { CATEGORIES, AMENITIES } from "@/constants/categories";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatDate, formatNumber } from "@/lib/format";
import {
  averageRating,
  getFavoriteIds,
  getListingDetail,
} from "@/lib/queries/listings";

export default async function ListingDetailPage(
  props: PageProps<"/[locale]/listings/[listingId]">,
) {
  const [{ locale }, { listingId }] = await Promise.all([
    props.params,
    props.params,
  ]);
  setRequestLocale(locale);

  const detail = await getListingDetail(listingId);
  if (!detail) notFound();

  return <ListingContent locale={locale} listingId={listingId} detail={detail} />;
}

async function ListingContent({
  locale,
  listingId,
  detail,
}: {
  locale: string;
  listingId: string;
  detail: NonNullable<Awaited<ReturnType<typeof getListingDetail>>>;
}) {
  const t = await getTranslations("listing");
  const th = await getTranslations("home");
  const user = await getCurrentUser();
  const favoriteIds = await getFavoriteIds(user?.id ?? null);
  const rating = averageRating(detail.listing.reviews);

  const categoryDef = CATEGORIES.find((c) => c.value === detail.listing.category);
  const CategoryIcon = categoryDef?.icon;
  const images = [detail.listing.coverImage, ...detail.listing.images];

  const stats = [
    { icon: Users, label: `${formatNumber(detail.listing.guestCount, locale)} ${t("guests")}` },
    { icon: DoorOpen, label: `${formatNumber(detail.listing.bedroomCount, locale)} ${t("bedrooms")}` },
    { icon: BedDouble, label: `${formatNumber(detail.listing.bedCount, locale)} ${t("beds")}` },
    { icon: Bath, label: `${formatNumber(detail.listing.bathroomCount, locale)} ${t("baths")}` },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{detail.listing.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {rating != null && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Star className="size-4 fill-foreground" />
                  {rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {detail.listing.city}
                {detail.listing.province ? `, ${detail.listing.province}` : ""}
              </span>
              {CategoryIcon && (
                <span className="flex items-center gap-1">
                  <CategoryIcon className="size-4" />
                  {th(`categories.${detail.listing.category}`)}
                </span>
              )}
            </p>
          </div>
          <HeartButton
            listingId={listingId}
            initialFavorited={favoriteIds.has(listingId)}
            path={`/listings/${listingId}`}
            authenticated={Boolean(user)}
          />
        </div>

        <ImageGallery images={images} alt={detail.listing.title} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold">{t("hostedBy", { name: detail.listing.user.name ?? "?" })}</h2>
              <Link
                href={`/inbox?to=${detail.listing.userId}&listing=${listingId}`}
                className="mt-1 inline-block text-sm text-rose-500 hover:underline"
              >
                {t("contactHost")}
              </Link>
            </section>

            <section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-xl border p-3 text-sm">
                    <Icon className="mb-1.5 size-5 text-muted-foreground" />
                    {label}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">{t("about")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {detail.listing.description}
              </p>
            </section>

            {detail.listing.amenities.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">{t("amenities")}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {detail.listing.amenities.map((key) => {
                    const amenity = AMENITIES.find((a) => a.key === key);
                    const AmenityIcon = amenity?.icon;
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {AmenityIcon && (
                          <AmenityIcon className="size-4 text-muted-foreground" />
                        )}
                        {t(`amenities.${key}`)}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {detail.listing.latitude != null && detail.listing.longitude != null && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">{t("location")}</h2>
                <MapLoader
                  latitude={detail.listing.latitude}
                  longitude={detail.listing.longitude}
                  label={`${detail.listing.city}${detail.listing.province ? `, ${detail.listing.province}` : ""}`}
                />
              </section>
            )}

            <section>
              <h2 className="mb-3 text-lg font-semibold">
                {rating != null ? `${t("reviews")} (${rating.toFixed(1)})` : t("reviews")}
              </h2>
              {detail.listing.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
              ) : (
                <div className="space-y-4">
                  {detail.listing.reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border p-4">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="font-medium">{review.user.name}</span>
                        <span className="flex items-center gap-0.5 text-sm">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {formatNumber(review.rating, locale)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {formatDate(review.createdAt, locale)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookingSidebar
              listingId={listingId}
              pricePerNight={detail.listing.pricePerNight}
              guestCount={detail.listing.guestCount}
              isOwner={user?.id === detail.listing.userId}
              bookedRanges={detail.bookedRanges.map((r) => ({
                start: r.startDate.toISOString(),
                end: r.endDate.toISOString(),
              }))}
            />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
