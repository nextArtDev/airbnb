import type { Prisma } from "@/app/generated/prisma/client";
import { PaymentStatus, type Role } from "@/app/generated/prisma/client";
import { Ban, SearchX, Users } from "lucide-react";
import { DataTable, type BulkAction, type DataRow } from "@/components/dashboard/data-table";
import { DataToolbar } from "@/components/dashboard/data-toolbar";
import { UserDetail, type UserDetailData } from "@/components/dashboard/details";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CountBadge, PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { TableFooter } from "@/components/dashboard/table-footer";
import { BanButtons } from "@/components/dashboard/row-actions";
import { faDate, faMoney, faNumber } from "@/lib/dashboard/format";
import { ROLE_FA } from "@/lib/dashboard/labels";
import { firstParam, parsePage, parseSort } from "@/lib/dashboard/params";
import prisma from "@/lib/prisma";
import { bulkBanUsers, bulkUnbanUsers } from "../lib/actions/admin";

const PAGE_SIZE = 20;
const CSV_LIMIT = 500;

const ROLE_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "admin", label: "مدیر" },
  { value: "user", label: "کاربر" },
];

const STATE_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "banned", label: "مسدود" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "spent", label: "بیشترین خرید" },
  { value: "reservations", label: "بیشترین رزرو" },
  { value: "listings", label: "بیشترین آگهی" },
  { value: "name", label: "الفبا" },
];

const SORTS = SORT_OPTIONS.map((option) => option.value) as Array<
  "newest" | "spent" | "reservations" | "listings" | "name"
>;

const userSelect = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  role: true,
  banned: true,
  banReason: true,
  createdAt: true,
  _count: { select: { listings: true, reservations: true, reviews: true } },
  listings: {
    select: { id: true, title: true, published: true, city: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function buildWhere(q: string, role: string, state: string): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (role !== "all") where.role = role as Role;
  if (state === "active") where.banned = false;
  if (state === "banned") where.banned = true;

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phoneNumber: { contains: q } },
    ];
  }

  return where;
}

/** Lifetime paid spend per user for the visible page only. */
async function spendByUser(ids: string[]) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await prisma.reservation.groupBy({
    by: ["userId"],
    where: { userId: { in: ids }, paymentStatus: PaymentStatus.Paid },
    _sum: { totalPrice: true },
  });
  return new Map(rows.map((row) => [row.userId, row._sum.totalPrice ?? 0]));
}

export default async function DashboardUsersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const q = (firstParam(sp, "q") ?? "").trim();
  const role = firstParam(sp, "role") ?? "all";
  const state = firstParam(sp, "state") ?? "all";
  const sort = parseSort(sp, SORTS, "newest");
  const page = parsePage(sp);
  const where = buildWhere(q, role, state);

  const [count, adminCount, bannedCount, hostCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, role: "admin" } }),
    prisma.user.count({ where: { ...where, banned: true } }),
    prisma.user.count({ where: { ...where, listings: { some: {} } } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const skip = (safePage - 1) * PAGE_SIZE;

  let users: UserRow[];

  if (sort === "spent") {
    // Spend is a reservation aggregate, so rank ids first and hydrate the page.
    const allIds = await prisma.user.findMany({ where, select: { id: true } });
    const spend = await spendByUser(allIds.map((row) => row.id));
    const ordered = allIds
      .map((row) => ({ id: row.id, spend: spend.get(row.id) ?? 0 }))
      .sort((a, b) => b.spend - a.spend)
      .slice(skip, skip + PAGE_SIZE)
      .map((row) => row.id);

    const fetched = await prisma.user.findMany({
      where: { id: { in: ordered } },
      select: userSelect,
    });
    const byId = new Map(fetched.map((row) => [row.id, row]));
    users = ordered
      .map((id) => byId.get(id))
      .filter((row): row is UserRow => row !== undefined);
  } else {
    const orderBy: Prisma.UserOrderByWithRelationInput =
      sort === "name"
        ? { name: "asc" }
        : sort === "reservations"
          ? { reservations: { _count: "desc" } }
          : sort === "listings"
            ? { listings: { _count: "desc" } }
            : { createdAt: "desc" };

    users = await prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: userSelect,
    });
  }

  const [pageSpend, csvRows, totalRevenue] = await Promise.all([
    spendByUser(users.map((user) => user.id)),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: CSV_LIMIT,
      select: {
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        banned: true,
        createdAt: true,
        _count: { select: { listings: true, reservations: true } },
      },
    }),
    prisma.reservation.aggregate({
      where: { paymentStatus: PaymentStatus.Paid, user: where },
      _sum: { totalPrice: true },
    }),
  ]);

  const rows: DataRow[] = users.map((user) => {
    const spent = pageSpend.get(user.id) ?? 0;
    const detail: UserDetailData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      banned: Boolean(user.banned),
      banReason: user.banReason,
      createdAt: user.createdAt,
      listingCount: user._count.listings,
      reservationCount: user._count.reservations,
      reviewCount: user._count.reviews,
      totalSpent: spent,
      listings: user.listings,
    };

    return {
      id: user.id,
      cells: [
        <div key="user" className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
            {user.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
              {user.phoneNumber ?? user.email}
            </p>
          </div>
        </div>,
        <span key="role" className="text-xs">
          {ROLE_FA[user.role]}
        </span>,
        <span key="listings" className="tabular-nums">
          {faNumber(user._count.listings)}
        </span>,
        <span key="reservations" className="tabular-nums">
          {faNumber(user._count.reservations)}
        </span>,
        <span key="spent" className="whitespace-nowrap text-xs font-medium tabular-nums">
          {spent > 0 ? faMoney(spent) : "—"}
        </span>,
        <span
          key="state"
          className={
            user.banned
              ? "inline-flex items-center gap-1 text-[11px] text-destructive"
              : "inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"
          }
        >
          {user.banned ? (
            <>
              <Ban className="size-3" /> مسدود
            </>
          ) : (
            "فعال"
          )}
        </span>,
        <span key="joined" className="whitespace-nowrap text-[11px] text-muted-foreground">
          {faDate(user.createdAt)}
        </span>,
        <div key="actions" className="flex justify-end" data-no-row-click>
          {user.role !== "admin" && (
            <BanButtons userId={user.id} banned={Boolean(user.banned)} compact />
          )}
        </div>,
      ],
      detail: {
        title: user.name,
        subtitle: `${ROLE_FA[user.role]} · عضویت ${faDate(user.createdAt)}`,
        body: <UserDetail data={detail} />,
      },
    };
  });

  const bulkActions: BulkAction[] = [
    {
      id: "ban",
      label: "مسدودسازی",
      tone: "danger",
      confirm: "کاربران انتخاب‌شده مسدود شوند؟",
      successMessage: "{count} کاربر مسدود شد",
      action: bulkBanUsers,
    },
    {
      id: "unban",
      label: "رفع مسدودی",
      successMessage: "مسدودی {count} کاربر برداشته شد",
      action: bulkUnbanUsers,
    },
  ];

  const hasFilters = Boolean(q) || role !== "all" || state !== "all";

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="کاربران"
        description="میزبانان و مهمانان، دسترسی‌ها و ارزش خرید"
        badge={<CountBadge>{faNumber(count)} کاربر</CountBadge>}
      />

      <DataToolbar
        current={{
          q: q || undefined,
          role: role !== "all" ? role : undefined,
          state: state !== "all" ? state : undefined,
          sort: sort !== "newest" ? sort : undefined,
        }}
        searchPlaceholder="جستجوی نام، ایمیل یا شماره موبایل…"
        filters={[
          { key: "role", label: "نقش", options: ROLE_OPTIONS },
          { key: "state", label: "وضعیت", options: STATE_OPTIONS },
        ]}
        sort={{ label: "مرتب‌سازی", options: SORT_OPTIONS }}
        csv={{
          filename: `users-${new Date().toISOString().slice(0, 10)}.csv`,
          headers: ["نام", "ایمیل", "موبایل", "نقش", "اقامتگاه", "رزرو", "وضعیت", "عضویت"],
          rows: csvRows.map((row) => [
            row.name,
            row.email,
            row.phoneNumber ?? "",
            ROLE_FA[row.role],
            row._count.listings,
            row._count.reservations,
            row.banned ? "مسدود" : "فعال",
            row.createdAt.toISOString().slice(0, 10),
          ]),
        }}
        total={count}
        totalLabel="کاربر مطابق فیلتر"
      />

      <DataTable
        selectable
        bulkActions={bulkActions}
        columns={[
          { key: "user", label: "کاربر" },
          { key: "role", label: "نقش" },
          { key: "listings", label: "آگهی" },
          { key: "reservations", label: "رزرو" },
          { key: "spent", label: "خرید کل" },
          { key: "state", label: "وضعیت" },
          { key: "joined", label: "عضویت" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        minWidth="1040px"
        empty={
          <EmptyState
            icon={hasFilters ? SearchX : Users}
            title={hasFilters ? "کاربری پیدا نشد" : "هنوز کاربری ثبت‌نام نکرده"}
            description={
              hasFilters
                ? "نقش، وضعیت یا عبارت جستجو را تغییر دهید."
                : "به‌محض ثبت‌نام اولین کاربر، اینجا نمایش داده می‌شود."
            }
          />
        }
      />

      <TableFooter
        cells={[
          { label: "کاربر در این فیلتر", value: faNumber(count) },
          { label: "مدیر", value: faNumber(adminCount) },
          { label: "میزبان (دارای آگهی)", value: faNumber(hostCount) },
          {
            label: "خرید کل این فیلتر",
            value: faMoney(totalRevenue._sum.totalPrice ?? 0),
            emphasis: true,
          },
        ]}
      />

      {bannedCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {faNumber(bannedCount)} کاربر در این فیلتر مسدود است.
        </p>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/users"
        params={sp}
        total={count}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
