import { PaymentStatus } from "@/app/generated/prisma/client";
import { faMoney, faMonth, faNumber } from "@/lib/dashboard/format";
import prisma from "@/lib/prisma";

/**
 * Read-only aggregates for the admin dashboard.
 *
 * Everything here is server-only and intentionally narrow: the overview needs
 * one round of counts, one 6-month window and a handful of "top N" lists. All
 * heavy lifting stays in Postgres (groupBy/aggregate) so the page cost does not
 * grow with the size of the reservation table.
 */

const DAY = 24 * 60 * 60 * 1000;
const TREND_MONTHS = 6;

export type TrendPoint = {
  key: string;
  label: string;
  /** Full label used in tooltips, e.g. "مهر ۱۴۰۵". */
  fullLabel: string;
  revenue: number;
  bookings: number;
  users: number;
  listings: number;
};

/** Builds the last `TREND_MONTHS` calendar months, oldest first. */
function monthWindows(now = new Date()) {
  return Array.from({ length: TREND_MONTHS }, (_, index) => {
    const offset = TREND_MONTHS - 1 - index;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    return { start, end };
  });
}

async function getTrend(): Promise<TrendPoint[]> {
  const windows = monthWindows();
  const rangeStart = windows[0].start;

  const [paidReservations, users, listings] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        paymentStatus: PaymentStatus.Paid,
        OR: [
          { paidAt: { gte: rangeStart } },
          { paidAt: null, createdAt: { gte: rangeStart } },
        ],
      },
      select: { totalPrice: true, paidAt: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.listing.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
  ]);

  return windows.map(({ start, end }) => {
    const inWindow = (date: Date | null) =>
      date !== null && date >= start && date < end;

    const monthReservations = paidReservations.filter((reservation) =>
      inWindow(reservation.paidAt ?? reservation.createdAt),
    );

    return {
      key: `${start.getFullYear()}-${start.getMonth() + 1}`,
      label: faMonth(start),
      fullLabel: new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        month: "long",
        year: "numeric",
      }).format(start),
      revenue: monthReservations.reduce(
        (sum, reservation) => sum + reservation.totalPrice,
        0,
      ),
      bookings: monthReservations.length,
      users: users.filter((user) => inWindow(user.createdAt)).length,
      listings: listings.filter((listing) => inWindow(listing.createdAt))
        .length,
    };
  });
}

export type OverviewData = Awaited<ReturnType<typeof getOverview>>;

export async function getOverview() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since60 = new Date(now.getTime() - 60 * DAY);

  const [
    userCount,
    bannedUsers,
    listingCount,
    publishedListings,
    reservationCount,
    reviewCount,
    paidAgg,
    paidCount,
    pendingCount,
    failedCount,
    refundedCount,
    revenue30,
    revenuePrev30,
    users30,
    usersPrev30,
    listings30,
    listingsPrev30,
    reservations30,
    reservationsPrev30,
    ratingAgg,
    byType,
    byStatus,
    byCategory,
    cityRows,
    topListingRows,
    recentReservations,
    upcomingStays,
    stalePendings,
    draftListings,
    ratedListings,
    trend,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { published: true } }),
    prisma.reservation.count(),
    prisma.review.count(),
    prisma.reservation.aggregate({
      where: { paymentStatus: PaymentStatus.Paid },
      _sum: { totalPrice: true },
      _avg: { totalPrice: true, nights: true },
    }),
    prisma.reservation.count({ where: { paymentStatus: PaymentStatus.Paid } }),
    prisma.reservation.count({ where: { paymentStatus: PaymentStatus.Pending } }),
    prisma.reservation.count({ where: { paymentStatus: PaymentStatus.Failed } }),
    prisma.reservation.count({
      where: {
        paymentStatus: {
          in: [
            PaymentStatus.Refunded,
            PaymentStatus.PartiallyRefunded,
            PaymentStatus.Chargeback,
          ],
        },
      },
    }),
    prisma.reservation.aggregate({
      where: { paymentStatus: PaymentStatus.Paid, paidAt: { gte: since30 } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    prisma.reservation.aggregate({
      where: {
        paymentStatus: PaymentStatus.Paid,
        paidAt: { gte: since60, lt: since30 },
      },
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.count({ where: { createdAt: { gte: since60, lt: since30 } } }),
    prisma.listing.count({ where: { createdAt: { gte: since30 } } }),
    prisma.listing.count({
      where: { createdAt: { gte: since60, lt: since30 } },
    }),
    prisma.reservation.count({ where: { createdAt: { gte: since30 } } }),
    prisma.reservation.count({
      where: { createdAt: { gte: since60, lt: since30 } },
    }),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.listing.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.reservation.groupBy({
      by: ["paymentStatus"],
      _count: { _all: true },
      _sum: { totalPrice: true },
    }),
    prisma.listing.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.listing.groupBy({
      by: ["city"],
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: 6,
    }),
    prisma.reservation.groupBy({
      by: ["listingId"],
      where: { paymentStatus: PaymentStatus.Paid },
      _sum: { totalPrice: true },
      _count: { _all: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        totalPrice: true,
        paymentStatus: true,
        createdAt: true,
        startDate: true,
        endDate: true,
        nights: true,
        guests: true,
        user: { select: { name: true } },
        listing: { select: { id: true, title: true, city: true } },
      },
    }),
    prisma.reservation.findMany({
      where: {
        paymentStatus: PaymentStatus.Paid,
        startDate: { gte: now },
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        nights: true,
        guests: true,
        totalPrice: true,
        user: { select: { name: true } },
        listing: { select: { title: true, city: true } },
      },
    }),
    prisma.reservation.findMany({
      where: {
        paymentStatus: PaymentStatus.Pending,
        createdAt: { lt: new Date(now.getTime() - DAY) },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        startDate: true,
        user: { select: { name: true } },
        listing: { select: { title: true } },
      },
    }),
    prisma.listing.findMany({
      where: { published: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        city: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.listing.findMany({
      where: { reviews: { some: {} } },
      select: {
        id: true,
        title: true,
        city: true,
        reviews: { select: { rating: true } },
      },
    }),
    getTrend(),
  ]);

  const listingTitles = await prisma.listing.findMany({
    where: { id: { in: topListingRows.map((row) => row.listingId) } },
    select: { id: true, title: true, city: true, type: true, coverImage: true },
  });
  const titleById = new Map(listingTitles.map((listing) => [listing.id, listing]));

  const totalRevenue = paidAgg._sum.totalPrice ?? 0;
  const nightsBooked = await prisma.reservation.aggregate({
    where: {
      paymentStatus: PaymentStatus.Paid,
      startDate: { gte: since30 },
    },
    _sum: { nights: true },
  });
  const capacity = Math.max(1, publishedListings) * 30;

  const lowRated = ratedListings
    .map((listing) => {
      const average =
        listing.reviews.reduce((sum, review) => sum + review.rating, 0) /
        listing.reviews.length;
      return { ...listing, average, count: listing.reviews.length };
    })
    .filter((listing) => listing.average < 4 && listing.count >= 1)
    .sort((a, b) => a.average - b.average)
    .slice(0, 4);

  // Plain object (not a Map) so the value survives the server -> client boundary.
  const statusMap: Partial<Record<PaymentStatus, number>> = Object.fromEntries(
    byStatus.map((row) => [row.paymentStatus, row._count._all]),
  );

  return {
    counts: {
      users: userCount,
      bannedUsers,
      listings: listingCount,
      publishedListings,
      reservations: reservationCount,
      reviews: reviewCount,
      paidCount,
      pendingCount,
      failedCount,
      refundedCount,
    },
    revenue: {
      total: totalRevenue,
      last30: revenue30._sum.totalPrice ?? 0,
      prev30: revenuePrev30._sum.totalPrice ?? 0,
      avgBooking: Math.round(paidAgg._avg.totalPrice ?? 0),
      avgNights: Math.round((paidAgg._avg.nights ?? 0) * 10) / 10,
      bookings30: revenue30._count._all,
      bookingsPrev30: revenuePrev30._count._all,
    },
    growth: {
      users30,
      usersPrev30,
      listings30,
      listingsPrev30,
      reservations30,
      reservationsPrev30,
    },
    quality: {
      averageRating: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
      occupancy: Math.min(
        100,
        Math.round(((nightsBooked._sum.nights ?? 0) / capacity) * 100),
      ),
      paidRatio:
        reservationCount === 0
          ? 0
          : Math.round((paidCount / reservationCount) * 100),
    },
    distribution: {
      byType: byType.map((row) => ({
        key: row.type,
        count: row._count._all,
      })),
      byStatus: statusMap,
      byCategory: byCategory
        .map((row) => ({ key: row.category, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      byCity: cityRows.map((row) => ({
        city: row.city,
        count: row._count._all,
      })),
    },
    topListings: topListingRows.map((row) => ({
      id: row.listingId,
      title: titleById.get(row.listingId)?.title ?? "—",
      city: titleById.get(row.listingId)?.city ?? "—",
      coverImage: titleById.get(row.listingId)?.coverImage ?? null,
      revenue: row._sum.totalPrice ?? 0,
      bookings: row._count._all,
    })),
    recentReservations,
    upcomingStays,
    attention: {
      stalePendings,
      draftListings,
      lowRated,
    },
    trend,
  };
}

/** Small counts used by the sidebar and the command palette. */
export async function getNavCounts() {
  const [users, listings, reservations, reviews, pending] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.reservation.count(),
    prisma.review.count(),
    prisma.reservation.count({ where: { paymentStatus: PaymentStatus.Pending } }),
  ]);

  return { users, listings, reservations, reviews, pending };
}

export type DashboardNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "warning" | "info" | "success";
  createdAt: Date;
};

/**
 * Notifications are derived from real state instead of being stored: anything
 * that needs an admin decision shows up here and disappears once handled.
 */
export async function getNotifications(): Promise<DashboardNotification[]> {
  const now = new Date();
  const [pending, drafts, freshReviews] = await Promise.all([
    prisma.reservation.findMany({
      where: { paymentStatus: PaymentStatus.Pending },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        totalPrice: true,
        user: { select: { name: true } },
        listing: { select: { title: true } },
      },
    }),
    prisma.listing.findMany({
      where: { published: false },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        user: { select: { name: true } },
        listing: { select: { title: true } },
      },
    }),
  ]);

  return [
    ...pending.map((row) => ({
      id: `pending-${row.id}`,
      title: "رزرو در انتظار پرداخت",
      description: `${row.user.name} · ${row.listing.title} · ${faMoney(row.totalPrice)}`,
      href: "/dashboard/reservations?status=Pending",
      tone: "warning" as const,
      createdAt: row.createdAt,
    })),
    ...drafts.map((row) => ({
      id: `draft-${row.id}`,
      title: "آگهی منتشر نشده",
      description: `${row.title} · ${row.user.name}`,
      href: "/dashboard/listings?published=draft",
      tone: "info" as const,
      createdAt: row.updatedAt,
    })),
    ...freshReviews.map((row) => ({
      id: `review-${row.id}`,
      title: `نظر جدید با امتیاز ${faNumber(row.rating)}`,
      description: `${row.user.name} · ${row.listing.title}`,
      href: "/dashboard/reviews",
      tone: "success" as const,
      createdAt: row.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export type CommandEntry = {
  id: string;
  group: "کاربران" | "اقامتگاه‌ها" | "رزروها";
  label: string;
  description: string;
  href: string;
};

/** Flat, bounded index for the command palette. */
export async function getCommandIndex(): Promise<CommandEntry[]> {
  const [users, listings, reservations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, title: true, city: true, type: true },
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        totalPrice: true,
        user: { select: { name: true } },
        listing: { select: { title: true } },
      },
    }),
  ]);

  return [
    ...users.map((user) => ({
      id: `user-${user.id}`,
      group: "کاربران" as const,
      label: user.name,
      description: user.email,
      href: `/dashboard/users?q=${encodeURIComponent(user.email)}`,
    })),
    ...listings.map((listing) => ({
      id: `listing-${listing.id}`,
      group: "اقامتگاه‌ها" as const,
      label: listing.title,
      description: listing.city,
      href: `/dashboard/listings?q=${encodeURIComponent(listing.title)}`,
    })),
    ...reservations.map((reservation) => ({
      id: `reservation-${reservation.id}`,
      group: "رزروها" as const,
      label: `${reservation.user.name} → ${reservation.listing.title}`,
      description: faMoney(reservation.totalPrice),
      href: `/dashboard/reservations?q=${encodeURIComponent(reservation.user.name)}`,
    })),
  ];
}
