import type { Prisma } from "@/app/generated/prisma/client";
import { MessageSquareText, SearchX, Star } from "lucide-react";
import { DataTable, type BulkAction, type DataRow } from "@/components/dashboard/data-table";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { ReviewDetail, type ReviewDetailData } from "@/components/dashboard/details";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CountBadge, PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { TableFooter } from "@/components/dashboard/table-footer";
import { AdminDeleteButton } from "@/components/dashboard/row-actions";
import { faDate, faNumber } from "@/lib/dashboard/format";
import { firstParam, parsePage, parseSort } from "@/lib/dashboard/params";
import prisma from "@/lib/prisma";
import { bulkDeleteReviews } from "../lib/actions/admin";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const CSV_LIMIT = 500;

const RATING_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "5", label: "۵ ستاره" },
  { value: "4", label: "۴ ستاره" },
  { value: "3", label: "۳ ستاره" },
  { value: "2", label: "۲ ستاره" },
  { value: "1", label: "۱ ستاره" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "highest", label: "بیشترین امتیاز" },
  { value: "lowest", label: "کمترین امتیاز" },
];

const SORTS = SORT_OPTIONS.map((option) => option.value) as Array<
  "newest" | "highest" | "lowest"
>;

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
  listing: { select: { id: true, title: true, city: true, coverImage: true } },
} satisfies Prisma.ReviewSelect;

function buildWhere(q: string, rating: string): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = {};

  const parsed = Number(rating);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) {
    where.rating = parsed;
  }

  if (q) {
    where.OR = [
      { comment: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { listing: { title: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr" title={`${rating} از ۵`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "size-3",
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25",
          )}
        />
      ))}
    </span>
  );
}

export default async function DashboardReviewsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const q = (firstParam(sp, "q") ?? "").trim();
  const rating = firstParam(sp, "rating") ?? "all";
  const sort = parseSort(sp, SORTS, "newest");
  const page = parsePage(sp);
  const where = buildWhere(q, rating);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [count, aggregate, fiveStar, thisMonth] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.count({ where: { ...where, rating: 5 } }),
    prisma.review.count({ where: { ...where, createdAt: { gte: monthStart } } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const skip = (safePage - 1) * PAGE_SIZE;

  const orderBy: Prisma.ReviewOrderByWithRelationInput =
    sort === "highest"
      ? { rating: "desc" }
      : sort === "lowest"
        ? { rating: "asc" }
        : { createdAt: "desc" };

  const [reviews, csvRows] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: reviewSelect,
    }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: CSV_LIMIT,
      select: {
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        listing: { select: { title: true, city: true } },
      },
    }),
  ]);

  const rows: DataRow[] = reviews.map((review) => {
    const detail: ReviewDetailData = {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      guest: review.user,
      listing: review.listing,
    };

    return {
      id: review.id,
      cells: [
        <div key="guest" className="min-w-0">
          <p className="truncate font-medium">{review.user.name}</p>
          <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
            {review.user.email}
          </p>
        </div>,
        <div key="listing" className="max-w-48 min-w-0">
          <p className="truncate text-xs">{review.listing.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {review.listing.city}
          </p>
        </div>,
        <div key="rating" className="flex items-center gap-1.5">
          <Stars rating={review.rating} />
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {faNumber(review.rating)}
          </span>
        </div>,
        <p
          key="comment"
          className="line-clamp-2 max-w-80 text-xs text-muted-foreground"
        >
          {review.comment}
        </p>,
        <span key="date" className="whitespace-nowrap text-[11px] text-muted-foreground">
          {faDate(review.createdAt)}
        </span>,
        <div key="actions" className="flex justify-end" data-no-row-click>
          <AdminDeleteButton kind="review" id={review.id} compact />
        </div>,
      ],
      detail: {
        title: `${faNumber(review.rating)} از ۵ · ${review.user.name}`,
        subtitle: `${review.listing.title} · ${faDate(review.createdAt)}`,
        body: <ReviewDetail data={detail} />,
      },
    };
  });

  const bulkActions: BulkAction[] = [
    {
      id: "delete",
      label: "حذف نظرات",
      tone: "danger",
      confirm: "نظرات انتخاب‌شده برای همیشه حذف شوند؟",
      successMessage: "{count} نظر حذف شد",
      action: bulkDeleteReviews,
    },
  ];

  const hasFilters = Boolean(q) || rating !== "all";

  return (
    <div className="space-y-4">
      <PageHeader
        icon={MessageSquareText}
        title="نظرات"
        description="بازخورد مهمانان و کیفیت اقامتگاه‌ها"
        badge={
          <>
            <CountBadge>{faNumber(count)} نظر</CountBadge>
            {count > 0 && (
              <CountBadge>
                میانگین {faNumber(Math.round((aggregate._avg.rating ?? 0) * 10) / 10)}
              </CountBadge>
            )}
          </>
        }
      />

      <DataToolbar
        current={{
          q: q || undefined,
          rating: rating !== "all" ? rating : undefined,
          sort: sort !== "newest" ? sort : undefined,
        }}
        searchPlaceholder="جستجوی متن نظر، مهمان یا اقامتگاه…"
        filters={[{ key: "rating", label: "امتیاز", options: RATING_OPTIONS }]}
        sort={{ label: "مرتب‌سازی", options: SORT_OPTIONS }}
        csv={{
          filename: `reviews-${new Date().toISOString().slice(0, 10)}.csv`,
          headers: ["مهمان", "ایمیل", "اقامتگاه", "شهر", "امتیاز", "متن", "تاریخ"],
          rows: csvRows.map((row) => [
            row.user.name,
            row.user.email,
            row.listing.title,
            row.listing.city,
            row.rating,
            row.comment,
            row.createdAt.toISOString().slice(0, 10),
          ]),
        }}
        total={count}
        totalLabel="نظر مطابق فیلتر"
      />

      <DataTable
        selectable
        bulkActions={bulkActions}
        columns={[
          { key: "guest", label: "مهمان" },
          { key: "listing", label: "اقامتگاه" },
          { key: "rating", label: "امتیاز" },
          { key: "comment", label: "متن نظر" },
          { key: "date", label: "تاریخ" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        minWidth="980px"
        empty={
          <EmptyState
            icon={hasFilters ? SearchX : MessageSquareText}
            title={hasFilters ? "نظری پیدا نشد" : "هنوز نظری ثبت نشده"}
            description={
              hasFilters
                ? "امتیاز یا عبارت جستجو را تغییر دهید."
                : "پس از اولین اقامت، نظر مهمانان اینجا نمایش داده می‌شود."
            }
          />
        }
      />

      <TableFooter
        cells={[
          { label: "نظر در این فیلتر", value: faNumber(count) },
          {
            label: "میانگین امتیاز",
            value: count
              ? `${faNumber(Math.round((aggregate._avg.rating ?? 0) * 10) / 10)} از ۵`
              : "—",
          },
          { label: "۵ ستاره", value: faNumber(fiveStar) },
          {
            label: "این ماه",
            value: faNumber(thisMonth),
            emphasis: true,
          },
        ]}
      />

      <Pagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/reviews"
        params={sp}
        total={count}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
