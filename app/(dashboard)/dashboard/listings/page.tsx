import Link from "next/link";
import type { Prisma } from "@/app/generated/prisma/client";
import { PaymentStatus, type ListingType } from "@/app/generated/prisma/client";
import { BedDouble, ImageOff, Plus, SearchX } from "lucide-react";
import { DataTable, type BulkAction, type DataRow } from "@/components/dashboard/data-table";
import { ListingDetail, type ListingDetailData } from "@/components/dashboard/details";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CountBadge, PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { PublishBadge } from "@/components/dashboard/status-badge";
import { TableFooter } from "@/components/dashboard/table-footer";
import { AdminDeleteButton, PublishToggleButton } from "@/components/dashboard/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  faDate,
  faMoney,
  faNumber,
  listingComparablePrice,
  listingPriceLabel,
} from "@/lib/dashboard/format";
import { TYPE_FA } from "@/lib/dashboard/labels";
import { firstParam, parsePage, parseSort } from "@/lib/dashboard/params";
import prisma from "@/lib/prisma";
import { bulkPublishListings, bulkUnpublishListings } from "../lib/actions/admin";
import Image from "next/image";

const PAGE_SIZE = 20;
const CSV_LIMIT = 500;

const TYPE_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "nightly", label: "اقامت شبانه" },
  { value: "monthly", label: "رهن و اجاره" },
  { value: "sale", label: "فروش" },
];

const PUBLISHED_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "published", label: "منتشرشده" },
  { value: "draft", label: "پیش‌نویس" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "revenue", label: "بیشترین درآمد" },
  { value: "reservations", label: "بیشترین رزرو" },
  { value: "price", label: "گران‌ترین" },
  { value: "title", label: "الفبا" },
];

const SORTS = SORT_OPTIONS.map((option) => option.value) as Array<
  "newest" | "revenue" | "reservations" | "price" | "title"
>;

const listingSelect = {
  id: true,
  title: true,
  description: true,
  coverImage: true,
  images: true,
  city: true,
  province: true,
  category: true,
  type: true,
  pricePerNight: true,
  monthlyRent: true,
  mortgageAmount: true,
  salePrice: true,
  published: true,
  createdAt: true,
  guestCount: true,
  bedroomCount: true,
  bedCount: true,
  bathroomCount: true,
  amenities: true,
  user: { select: { id: true, name: true, email: true } },
  reviews: { select: { rating: true } },
  _count: { select: { reservations: true } },
} satisfies Prisma.ListingSelect;

type ListingRow = Prisma.ListingGetPayload<{ select: typeof listingSelect }>;

function buildWhere(
  q: string,
  type: string,
  published: string,
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};

  if (type !== "all") where.type = type as ListingType;
  if (published === "published") where.published = true;
  if (published === "draft") where.published = false;

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { province: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}

/** Revenue per listing for the given ids - one grouped query, no N+1. */
async function revenueByListing(ids: string[]) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await prisma.reservation.groupBy({
    by: ["listingId"],
    where: { listingId: { in: ids }, paymentStatus: PaymentStatus.Paid },
    _sum: { totalPrice: true },
  });
  return new Map(rows.map((row) => [row.listingId, row._sum.totalPrice ?? 0]));
}

export default async function DashboardListingsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const q = (firstParam(sp, "q") ?? "").trim();
  const type = firstParam(sp, "type") ?? "all";
  const published = firstParam(sp, "published") ?? "all";
  const sort = parseSort(sp, SORTS, "newest");
  const page = parsePage(sp);
  const where = buildWhere(q, type, published);

  const [count, publishedCount, revenueAgg] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.count({ where: { ...where, published: true } }),
    prisma.reservation.aggregate({
      where: { paymentStatus: PaymentStatus.Paid, listing: where },
      _sum: { totalPrice: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const skip = (safePage - 1) * PAGE_SIZE;

  let listings: ListingRow[];

  if (sort === "revenue" || sort === "price") {
    // Neither revenue (on reservations) nor price (three columns depending on
    // type) can be expressed as a single column orderBy. Rank cheap ids first,
    // then hydrate only the visible page.
    const allIds = await prisma.listing.findMany({ where, select: { id: true } });
    const ids = allIds.map((row) => row.id);

    const scores = new Map<string, number>();

    if (sort === "revenue") {
      const sums = await revenueByListing(ids);
      for (const id of ids) scores.set(id, sums.get(id) ?? 0);
    } else {
      const priced = await prisma.listing.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          type: true,
          pricePerNight: true,
          monthlyRent: true,
          mortgageAmount: true,
          salePrice: true,
        },
      });
      for (const row of priced) scores.set(row.id, listingComparablePrice(row));
    }

    const ordered = ids
      .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0))
      .slice(skip, skip + PAGE_SIZE);

    const fetched = await prisma.listing.findMany({
      where: { id: { in: ordered } },
      select: listingSelect,
    });
    const byId = new Map(fetched.map((row) => [row.id, row]));
    listings = ordered
      .map((id) => byId.get(id))
      .filter((row): row is ListingRow => row !== undefined);
  } else {
    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === "title"
        ? { title: "asc" }
        : sort === "reservations"
          ? { reservations: { _count: "desc" } }
          : { createdAt: "desc" };

    listings = await prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: listingSelect,
    });
  }

  const [pageRevenue, csvRows] = await Promise.all([
    revenueByListing(listings.map((listing) => listing.id)),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: CSV_LIMIT,
      select: {
        title: true,
        city: true,
        type: true,
        published: true,
        createdAt: true,
        pricePerNight: true,
        monthlyRent: true,
        mortgageAmount: true,
        salePrice: true,
        user: { select: { name: true } },
        _count: { select: { reservations: true } },
      },
    }),
  ]);

  const rows: DataRow[] = listings.map((listing) => {
    const revenue = pageRevenue.get(listing.id) ?? 0;
    const rating =
      listing.reviews.length > 0
        ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) /
          listing.reviews.length
        : 0;

    const detail: ListingDetailData = {
      ...listing,
      host: listing.user,
      reservationCount: listing._count.reservations,
      revenue,
      reviewCount: listing.reviews.length,
      rating,
    };

    return {
      id: listing.id,
      cells: [
        <div key="title" className="flex items-center gap-2.5">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
            {listing.coverImage ? (
              <Image
                src={listing.coverImage}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <ImageOff className="absolute inset-0 m-auto size-3.5 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0">
            <p className="max-w-56 truncate font-medium">{listing.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {listing.city}
              {listing.province ? `، ${listing.province}` : ""}
            </p>
          </div>
        </div>,
        <span key="host" className="text-xs text-muted-foreground">
          {listing.user.name}
        </span>,
        <Badge key="type" variant="outline" className="text-[11px]">
          {TYPE_FA[listing.type]}
        </Badge>,
        <span key="price" className="whitespace-nowrap text-xs">
          {listingPriceLabel(listing)}
        </span>,
        <span key="reservations" className="tabular-nums">
          {faNumber(listing._count.reservations)}
        </span>,
        <span key="revenue" className="whitespace-nowrap font-medium tabular-nums">
          {revenue > 0 ? faMoney(revenue) : "—"}
        </span>,
        <PublishBadge key="published" published={listing.published} />,
        <div key="actions" className="flex justify-end gap-1.5" data-no-row-click>
          <PublishToggleButton
            listingId={listing.id}
            published={listing.published}
            compact
          />
          <AdminDeleteButton kind="listing" id={listing.id} compact />
        </div>,
      ],
      detail: {
        title: listing.title,
        subtitle: `${TYPE_FA[listing.type]} · ${listing.city} · ${faDate(listing.createdAt)}`,
        body: <ListingDetail data={detail} />,
      },
    };
  });

  const bulkActions: BulkAction[] = [
    {
      id: "publish",
      label: "انتشار",
      successMessage: "{count} آگهی منتشر شد",
      action: bulkPublishListings,
    },
    {
      id: "unpublish",
      label: "لغو انتشار",
      successMessage: "{count} آگهی از انتشار خارج شد",
      action: bulkUnpublishListings,
    },
  ];

  const hasFilters = Boolean(q) || type !== "all" || published !== "all";

  return (
    <div className="space-y-4">
      <PageHeader
        icon={BedDouble}
        title="اقامتگاه‌ها"
        description="مدیریت آگهی‌ها، وضعیت انتشار و درآمد هر اقامتگاه"
        badge={<CountBadge>{faNumber(count)} آگهی</CountBadge>}
        actions={
          <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href="/hostings/new">
              <Plus className="size-3.5" />
              آگهی جدید
            </Link>
          </Button>
        }
      />

      <DataToolbar
        current={{
          q: q || undefined,
          type: type !== "all" ? type : undefined,
          published: published !== "all" ? published : undefined,
          sort: sort !== "newest" ? sort : undefined,
        }}
        searchPlaceholder="جستجوی عنوان، شهر یا میزبان…"
        filters={[
          { key: "type", label: "نوع", options: TYPE_OPTIONS },
          { key: "published", label: "انتشار", options: PUBLISHED_OPTIONS },
        ]}
        sort={{ label: "مرتب‌سازی", options: SORT_OPTIONS }}
        csv={{
          filename: `listings-${new Date().toISOString().slice(0, 10)}.csv`,
          headers: [
            "عنوان",
            "میزبان",
            "شهر",
            "نوع",
            "قیمت",
            "رزرو",
            "وضعیت",
            "تاریخ ایجاد",
          ],
          rows: csvRows.map((row) => [
            row.title,
            row.user.name,
            row.city,
            TYPE_FA[row.type],
            listingPriceLabel(row),
            row._count.reservations,
            row.published ? "منتشرشده" : "پیش‌نویس",
            row.createdAt.toISOString().slice(0, 10),
          ]),
        }}
        total={count}
        totalLabel="آگهی مطابق فیلتر"
      />

      <DataTable
        selectable
        bulkActions={bulkActions}
        columns={[
          { key: "title", label: "اقامتگاه" },
          { key: "host", label: "میزبان" },
          { key: "type", label: "نوع" },
          { key: "price", label: "قیمت" },
          { key: "reservations", label: "رزرو" },
          { key: "revenue", label: "درآمد" },
          { key: "published", label: "انتشار" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        minWidth="1080px"
        empty={
          <EmptyState
            icon={hasFilters ? SearchX : BedDouble}
            title={hasFilters ? "نتیجه‌ای پیدا نشد" : "هنوز آگهی‌ای ثبت نشده"}
            description={
              hasFilters
                ? "فیلترها یا عبارت جستجو را تغییر دهید."
                : "اولین اقامتگاه را از دکمه «آگهی جدید» اضافه کنید."
            }
          />
        }
      />

      <TableFooter
        cells={[
          { label: "آگهی در این فیلتر", value: faNumber(count) },
          { label: "منتشرشده", value: faNumber(publishedCount) },
          { label: "پیش‌نویس", value: faNumber(count - publishedCount) },
          {
            label: "درآمد کل این فیلتر",
            value: faMoney(revenueAgg._sum.totalPrice ?? 0),
            emphasis: true,
          },
        ]}
      />

      <Pagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/listings"
        params={sp}
        total={count}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
