import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { HeartButton } from "@/components/listing/heart-button";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    coverImage: string;
    city: string;
    province: string | null;
    pricePerNight: number;
  };
  rating?: number | null;
  favorited?: boolean;
  authenticated?: boolean;
}

export function ListingCard({
  listing,
  rating,
  favorited = false,
  authenticated = false,
}: ListingCardProps) {
  const t = useTranslations("listing");
  const locale = useLocale();

  return (
    <div className="group relative">
      <Link
        href={`/listings/${listing.id}`}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      >
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <Image
            src={listing.coverImage}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 font-medium">
              {listing.city}
              {listing.province ? `, ${listing.province}` : ""}
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
            </span>{" "}
            <span className="text-muted-foreground">{t("perNight")}</span>
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
  );
}

export function ListingCardSkeleton() {
  return (
    <div>
      <div className="aspect-square animate-pulse rounded-xl bg-muted" />
      <div className="mt-2 space-y-1.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
