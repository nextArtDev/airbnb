import type { Prisma } from "@/app/generated/prisma/client";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { CalendarDays, SearchX } from "lucide-react";
import { DataTable, type BulkAction, type DataRow } from "@/components/dashboard/data-table";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { ReservationDetail, type ReservationDetailData } from "@/components/dashboard/details";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CountBadge, PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TableFooter } from "@/components/dashboard/table-footer";
import { AdminDeleteButton } from "@/components/dashboard/row-actions";
import { faDate, faMoney, faNumber } from "@/lib/dashboard/format";
import { STATUS_FA, STATUS_ORDER } from "@/lib/dashboard/labels";
import { firstParam, parsePage, parseSort } from "@/lib/dashboard/params";
import prisma from "@/lib/prisma";
import { bulkCancelReservations } from "../lib/actions/admin";

const PAGE_SIZE = 20;
const CSV_LIMIT = 500;

const STATUS_OPTIONS = [
  { value: "all", label: "همه" },
  ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_FA[status] })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "amount", label: "بیشترین مبلغ" },
  { value: "start", label: "نزدیک‌ترین اقامت" },
  { value: "nights", label: "بیشترین شب" },
];

const SORTS = SORT_OPTIONS.map((option) => option.value) as Array<
  "newest" | "amount" | "start" | "nights"
>;

const reservationSelect = {
  id: true,
  totalPrice: true,
  paymentStatus: true,
  paymentMethod: true,
  paidAt: true,
  createdAt: true,
  startDate: true,
  endDate: true,
  nights: true,
  guests: true,
  authority: true,
  user: { select: { name: true, email: true, phoneNumber: true } },
  listing: { select: { id: true, title: true, city: true, coverImage: true } },
  paymentDetail: { select: { transactionId: true } },
} satisfies Prisma.ReservationSelect;


function buildWhere(q: string, status: string): Prisma.ReservationWhereInput {
  const where: Prisma.ReservationWhereInput = {};

  if (status !== "all") where.paymentStatus = status as PaymentStatus;

  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phoneNumber: { contains: q } } },
      { listing: { title: { contains: q, mode: "insensitive" } } },
      { listing: { city: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export default async function DashboardReservationsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const q = (firstParam(sp, "q") ?? "").trim();
  const status = firstParam(sp, "status") ?? "all";
  const sort = parseSort(sp, SORTS, "newest");
  const page = parsePage(sp);
  const where = buildWhere(q, status);

  const [count, paidAgg, pendingCount, paidCount] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.aggregate({
      where: { ...where, paymentStatus: PaymentStatus.Paid },
      _sum: { totalPrice: true },
      _avg: { totalPrice: true, nights: true },
    }),
    prisma.reservation.count({ where: { ...where, paymentStatus: PaymentStatus.Pending } }),
    prisma.reservation.count({ where: { ...where, paymentStatus: PaymentStatus.Paid } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const skip = (safePage - 1) * PAGE_SIZE;

  const orderBy: Prisma.ReservationOrderByWithRelationInput =
    sort === "amount"
      ? { totalPrice: "desc" }
      : sort === "start"
        ? { startDate: "desc" }
        : sort === "nights"
          ? { nights: "desc" }
          : { createdAt: "desc" };

  const [reservations, csvRows] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: reservationSelect,
    }),
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: CSV_LIMIT,
      select: {
        id: true,
        totalPrice: true,
        paymentStatus: true,
        paymentMethod: true,
        startDate: true,
        endDate: true,
        nights: true,
        guests: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        listing: { select: { title: true } },
      },
    }),
  ]);

  const rows: DataRow[] = reservations.map((reservation) => {
    const detail: ReservationDetailData = {
      ...reservation,
      guest: reservation.user,
      transactionId: reservation.paymentDetail?.transactionId ?? null,
    };

    return {
      id: reservation.id,
      cells: [
        <div key="guest" className="min-w-0">
          <p className="truncate font-medium">{reservation.user.name}</p>
          <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
            {reservation.user.phoneNumber ?? reservation.user.email}
          </p>
        </div>,
        <div key="listing" className="max-w-52 min-w-0">
          <p className="truncate text-xs">{reservation.listing.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {reservation.listing.city}
          </p>
        </div>,
        <span
          key="range"
          className="whitespace-nowrap text-[11px] text-muted-foreground"
        >
          {faDate(reservation.startDate)}
          <span className="mx-1 text-muted-foreground/50">→</span>
          {faDate(reservation.endDate)}
        </span>,
        <span key="nights" className="text-xs tabular-nums">
          {faNumber(reservation.nights)} شب · {faNumber(reservation.guests)} نفر
        </span>,
        <span key="amount" className="whitespace-nowrap font-semibold tabular-nums">
          {faNumber(reservation.totalPrice)}
        </span>,
        <span
          key="method"
          className="text-[11px] text-muted-foreground"
          dir="ltr"
        >
          {reservation.paymentMethod ?? "—"}
        </span>,
        <StatusBadge key="status" status={reservation.paymentStatus} />,
        <div key="actions" className="flex justify-end" data-no-row-click>
          {reservation.paymentStatus === PaymentStatus.Pending && (
            <AdminDeleteButton kind="reservation" id={reservation.id} compact />
          )}
        </div>,
      ],
      detail: {
        title: `${reservation.user.name} · ${reservation.listing.title}`,
        subtitle: `${faDate(reservation.startDate)} → ${faDate(reservation.endDate)}`,
        body: <ReservationDetail data={detail} />,
      },
    };
  });

  const bulkActions: BulkAction[] = [
    {
      id: "cancel",
      label: "لغو رزروهای معطل",
      tone: "danger",
      confirm: "رزروهای در انتظار پرداختِ انتخاب‌شده لغو شوند؟",
      successMessage: "{count} رزرو لغو شد",
      action: bulkCancelReservations,
    },
  ];

  const hasFilters = Boolean(q) || status !== "all";

  return (
    <div className="space-y-4">
      <PageHeader
        icon={CalendarDays}
        title="رزروها"
        description="پیگیری پرداخت‌ها، بازه اقامت و جزئیات تراکنش"
        badge={
          <>
            <CountBadge>{faNumber(count)} رزرو</CountBadge>
            {pendingCount > 0 && (
              <CountBadge>{faNumber(pendingCount)} در انتظار</CountBadge>
            )}
          </>
        }
      />

      <DataToolbar
        current={{
          q: q || undefined,
          status: status !== "all" ? status : undefined,
          sort: sort !== "newest" ? sort : undefined,
        }}
        searchPlaceholder="جستجوی مهمان، ایمیل، موبایل یا اقامتگاه…"
        filters={[{ key: "status", label: "وضعیت", options: STATUS_OPTIONS }]}
        sort={{ label: "مرتب‌سازی", options: SORT_OPTIONS }}
        csv={{
          filename: `reservations-${new Date().toISOString().slice(0, 10)}.csv`,
          headers: [
            "مهمان",
            "ایمیل",
            "اقامتگاه",
            "ورود",
            "خروج",
            "شب",
            "مهمان",
            "مبلغ",
            "درگاه",
            "وضعیت",
            "تاریخ ثبت",
          ],
          rows: csvRows.map((row) => [
            row.user.name,
            row.user.email,
            row.listing.title,
            row.startDate.toISOString().slice(0, 10),
            row.endDate.toISOString().slice(0, 10),
            row.nights,
            row.guests,
            row.totalPrice,
            row.paymentMethod ?? "",
            STATUS_FA[row.paymentStatus],
            row.createdAt.toISOString().slice(0, 10),
          ]),
        }}
        total={count}
        totalLabel="رزرو مطابق فیلتر"
      />

      <DataTable
        selectable
        bulkActions={bulkActions}
        columns={[
          { key: "guest", label: "مهمان" },
          { key: "listing", label: "اقامتگاه" },
          { key: "range", label: "بازه اقامت" },
          { key: "nights", label: "شب / نفر" },
          { key: "amount", label: "مبلغ (تومان)" },
          { key: "method", label: "درگاه" },
          { key: "status", label: "وضعیت" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        minWidth="1120px"
        empty={
          <EmptyState
            icon={hasFilters ? SearchX : CalendarDays}
            title={hasFilters ? "رزروی با این فیلتر نیست" : "هنوز رزروی ثبت نشده"}
            description={
              hasFilters
                ? "وضعیت یا عبارت جستجو را تغییر دهید."
                : "به‌محض اولین رزرو، اینجا نمایش داده می‌شود."
            }
          />
        }
      />

      <TableFooter
        cells={[
          { label: "رزرو در این فیلتر", value: faNumber(count) },
          { label: "پرداخت‌شده", value: faNumber(paidCount) },
          { label: "در انتظار پرداخت", value: faNumber(pendingCount) },
          {
            label: "مجموع مبلغ پرداخت‌شده",
            value: faMoney(paidAgg._sum.totalPrice ?? 0),
            emphasis: true,
          },
        ]}
      />

      <Pagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/reservations"
        params={sp}
        total={count}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
