import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  CalendarDays,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Star,
  Users,
} from "lucide-react";
import type {
  ListingCategory,
  ListingType,
  PaymentStatus,
  Role,
} from "@/app/generated/prisma/client";
import {
  AdminDeleteButton,
  BanButtons,
  PublishToggleButton,
} from "@/components/dashboard/row-actions";
import { SegmentBar } from "@/components/dashboard/segment-bar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  faDate,
  faMoney,
  faNumber,
  faRelative,
  listingPriceLabel,
} from "@/lib/dashboard/format";
import { CATEGORY_FA, ROLE_FA, TYPE_FA } from "@/lib/dashboard/labels";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

export function DetailSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b px-4 py-4 last:border-b-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3">{children}</dl>;
}

export function DetailField({
  label,
  value,
  dir,
  className,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium" dir={dir}>
        {value}
      </dd>
    </div>
  );
}

export function DetailStats({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    // Always two columns: the drawer is ~400px wide, so a 4-up grid would
    // crush long money values onto two lines.
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-muted/30 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "size-3",
            index < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Listing                                                                    */
/* -------------------------------------------------------------------------- */

export type ListingDetailData = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  images: string[];
  city: string;
  province: string | null;
  category: ListingCategory;
  type: ListingType;
  pricePerNight: number | null;
  monthlyRent: bigint | null;
  mortgageAmount: bigint | null;
  salePrice: bigint | null;
  published: boolean;
  createdAt: Date;
  guestCount: number;
  bedroomCount: number;
  bedCount: number;
  bathroomCount: number;
  amenities: string[];
  host: { id: string; name: string; email: string };
  reservationCount: number;
  revenue: number;
  reviewCount: number;
  rating: number;
};

function listingPrice(data: ListingDetailData) {
  return listingPriceLabel(data);
}

export function ListingDetail({ data }: { data: ListingDetailData }) {
  return (
    <div>
      <div className="relative aspect-[16/9] w-full bg-muted">
        {data.coverImage ? (
          <Image
            src={data.coverImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover"
          />
        ) : null}
        <span className="absolute top-3 start-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur">
          {data.published ? "منتشرشده" : "پیش‌نویس"}
        </span>
      </div>

      <DetailSection title="مشخصات">
        <DetailGrid>
          <DetailField label="نوع آگهی" value={TYPE_FA[data.type]} />
          <DetailField label="دسته" value={CATEGORY_FA[data.category]} />
          <DetailField
            label="موقعیت"
            value={
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                {data.city}
                {data.province ? `، ${data.province}` : ""}
              </span>
            }
          />
          <DetailField label="تاریخ ایجاد" value={faDate(data.createdAt)} />
          <DetailField label="قیمت" value={listingPrice(data)} className="col-span-2" />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="ظرفیت">
        <DetailGrid>
          <DetailField
            label="مهمان"
            value={
              <span className="inline-flex items-center gap-1">
                <Users className="size-3 text-muted-foreground" />
                {faNumber(data.guestCount)} نفر
              </span>
            }
          />
          <DetailField
            label="اتاق خواب"
            value={
              <span className="inline-flex items-center gap-1">
                <BedDouble className="size-3 text-muted-foreground" />
                {faNumber(data.bedroomCount)}
              </span>
            }
          />
          <DetailField label="تخت" value={faNumber(data.bedCount)} />
          <DetailField label="سرویس" value={faNumber(data.bathroomCount)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="عملکرد">
        <DetailStats
          items={[
            { label: "رزرو", value: faNumber(data.reservationCount) },
            { label: "درآمد", value: faMoney(data.revenue) },
            { label: "نظرات", value: faNumber(data.reviewCount) },
            {
              label: "امتیاز",
              value: data.reviewCount ? `${faNumber(data.rating)} / ۵` : "—",
            },
          ]}
        />
        {data.reviewCount > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>رضایت مهمانان</span>
              <span>{faNumber(Math.round((data.rating / 5) * 100))}٪</span>
            </div>
            <SegmentBar
              percent={(data.rating / 5) * 100}
              segments={24}
              tone="success"
              className="h-1.5"
              label="رضایت مهمانان"
            />
          </div>
        )}
      </DetailSection>

      <DetailSection title="میزبان">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">
            {data.host.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{data.host.name}</p>
            <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
              {data.host.email}
            </p>
          </div>
          <Link
            href={`/dashboard/users?q=${encodeURIComponent(data.host.email)}`}
            className="ms-auto text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            پروفایل میزبان
          </Link>
        </div>
      </DetailSection>

      {data.amenities.length > 0 && (
        <DetailSection title="امکانات">
          <div className="flex flex-wrap gap-1.5">
            {data.amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {amenity}
              </span>
            ))}
          </div>
        </DetailSection>
      )}

      <DetailSection title="توضیحات">
        <p className="line-clamp-6 text-xs leading-relaxed text-muted-foreground">
          {data.description}
        </p>
      </DetailSection>

      <div className="flex flex-wrap items-center gap-2 p-4">
        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
          <Link href={`/listings/${data.id}`} target="_blank">
            <ExternalLink className="size-3.5" />
            صفحه عمومی
          </Link>
        </Button>
        <PublishToggleButton listingId={data.id} published={data.published} />
        <div className="ms-auto">
          <AdminDeleteButton kind="listing" id={data.id} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reservation                                                                */
/* -------------------------------------------------------------------------- */

export type ReservationDetailData = {
  id: string;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  nights: number;
  guests: number;
  authority: string | null;
  guest: { name: string; email: string; phoneNumber: string | null };
  listing: { id: string; title: string; city: string; coverImage: string };
  transactionId: string | null;
};

export function ReservationDetail({ data }: { data: ReservationDetailData }) {
  const paid = data.paymentStatus === "Paid";
  return (
    <div>
      <DetailSection title="وضعیت پرداخت">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {faNumber(data.totalPrice)}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                تومان
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ثبت {faRelative(data.createdAt)}
              {data.paidAt ? ` · پرداخت ${faRelative(data.paidAt)}` : ""}
            </p>
          </div>
          <StatusBadge status={data.paymentStatus} />
        </div>
      </DetailSection>

      <DetailSection title="بازه اقامت">
        <DetailGrid>
          <DetailField label="ورود" value={faDate(data.startDate)} />
          <DetailField label="خروج" value={faDate(data.endDate)} />
          <DetailField label="شب" value={`${faNumber(data.nights)} شب`} />
          <DetailField label="مهمان" value={`${faNumber(data.guests)} نفر`} />
        </DetailGrid>
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarDays className="size-3" />
          میانگین هر شب{" "}
          {faNumber(Math.round(data.totalPrice / Math.max(1, data.nights)))} تومان
        </p>
      </DetailSection>

      <DetailSection title="اقامتگاه">
        <Link
          href={`/listings/${data.listing.id}`}
          target="_blank"
          className="flex items-center gap-3 rounded-xl border p-2 transition hover:bg-muted/40"
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            {data.listing.coverImage ? (
              <Image
                src={data.listing.coverImage}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {data.listing.title}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {data.listing.city}
            </span>
          </span>
          <ExternalLink className="ms-auto size-3.5 shrink-0 text-muted-foreground" />
        </Link>
      </DetailSection>

      <DetailSection title="مهمان">
        <div className="space-y-1.5 text-xs">
          <p className="font-medium">{data.guest.name}</p>
          <p className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Mail className="size-3" />
            <span dir="ltr">{data.guest.email}</span>
          </p>
          {data.guest.phoneNumber && (
            <p className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3" />
              <span dir="ltr">{data.guest.phoneNumber}</span>
            </p>
          )}
        </div>
      </DetailSection>

      <DetailSection title="جزئیات تراکنش">
        <DetailGrid>
          <DetailField label="درگاه" value={data.paymentMethod ?? "—"} dir="ltr" />
          <DetailField
            label="کد پیگیری"
            value={data.transactionId ?? "—"}
            dir="ltr"
          />
          <DetailField
            label="شناسه authority"
            value={
              data.authority ? (
                <span className="font-mono text-[11px]">
                  {data.authority.slice(0, 12)}…
                </span>
              ) : (
                "—"
              )
            }
            dir="ltr"
          />
          <DetailField
            label="وضعیت"
            value={paid ? "تأیید‌شده" : "نیازمند بررسی"}
          />
        </DetailGrid>
      </DetailSection>

      {data.paymentStatus === "Pending" && (
        <div className="flex justify-end p-4">
          <AdminDeleteButton kind="reservation" id={data.id} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* User                                                                       */
/* -------------------------------------------------------------------------- */

export type UserDetailData = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  listingCount: number;
  reservationCount: number;
  reviewCount: number;
  totalSpent: number;
  listings: Array<{ id: string; title: string; published: boolean; city: string }>;
};

export function UserDetail({ data }: { data: UserDetailData }) {
  return (
    <div>
      <DetailSection title="هویت">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-rose-50 text-lg font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {data.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{data.name}</p>
            <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
              {data.email}
            </p>
            {data.phoneNumber && (
              <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
                {data.phoneNumber}
              </p>
            )}
          </div>
          <span className="ms-auto rounded-full border bg-muted/40 px-2 py-0.5 text-[11px]">
            {ROLE_FA[data.role]}
          </span>
        </div>
      </DetailSection>

      <DetailSection title="فعالیت">
        <DetailStats
          items={[
            { label: "اقامتگاه", value: faNumber(data.listingCount) },
            { label: "رزرو", value: faNumber(data.reservationCount) },
            { label: "نظر", value: faNumber(data.reviewCount) },
            { label: "خرید کل", value: faMoney(data.totalSpent) },
          ]}
        />
        <p className="mt-3 text-[11px] text-muted-foreground">
          عضویت از {faDate(data.createdAt)}
        </p>
      </DetailSection>

      <DetailSection title="وضعیت حساب">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                data.banned ? "text-destructive" : "text-emerald-600",
              )}
            >
              {data.banned ? "مسدود" : "فعال"}
            </p>
            {data.banned && data.banReason && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {data.banReason}
              </p>
            )}
          </div>
          {data.role !== "admin" && (
            <BanButtons userId={data.id} banned={data.banned} />
          )}
        </div>
      </DetailSection>

      {data.listings.length > 0 && (
        <DetailSection
          title="اقامتگاه‌های اخیر"
          action={
            <Link
              href={`/dashboard/listings?q=${encodeURIComponent(data.name)}`}
              className="text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              همه
            </Link>
          }
        >
          <ul className="space-y-1.5">
            {data.listings.map((listing) => (
              <li
                key={listing.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {listing.title}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {listing.city}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px]",
                    listing.published
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {listing.published ? "منتشر" : "پیش‌نویس"}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Review                                                                     */
/* -------------------------------------------------------------------------- */

export type ReviewDetailData = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  guest: { name: string; email: string };
  listing: { id: string; title: string; city: string; coverImage: string };
};

export function ReviewDetail({ data }: { data: ReviewDetailData }) {
  return (
    <div>
      <DetailSection title="امتیاز">
        <div className="flex items-center gap-2">
          <Stars rating={data.rating} />
          <span className="text-lg font-bold tabular-nums">
            {faNumber(data.rating)}
          </span>
          <span className="text-xs text-muted-foreground">از ۵</span>
          <span className="ms-auto text-[11px] text-muted-foreground">
            {faDate(data.createdAt)}
          </span>
        </div>
        <SegmentBar
          percent={(data.rating / 5) * 100}
          segments={20}
          tone={data.rating >= 4 ? "success" : data.rating >= 3 ? "warning" : "danger"}
          className="mt-3 h-1.5"
          label="امتیاز"
        />
      </DetailSection>

      <DetailSection title="متن نظر">
        <p className="text-sm leading-relaxed whitespace-pre-line">{data.comment}</p>
      </DetailSection>

      <DetailSection title="مهمان و اقامتگاه">
        <div className="space-y-2 text-xs">
          <p className="font-medium">{data.guest.name}</p>
          <p className="text-muted-foreground" dir="ltr">
            {data.guest.email}
          </p>
          <Link
            href={`/listings/${data.listing.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-muted-foreground transition hover:text-foreground"
          >
            {data.listing.title} · {data.listing.city}
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </DetailSection>

      <div className="flex justify-end p-4">
        <AdminDeleteButton kind="review" id={data.id} />
      </div>
    </div>
  );
}
