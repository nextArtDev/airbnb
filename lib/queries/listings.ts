import "server-only";

import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

export interface ListingFilters {
  city?: string;
  category?: string;
  guests?: number;
  checkIn?: Date;
  checkOut?: Date;
}

export async function getListings(filters: ListingFilters = {}) {
  // Pending reservations also hold their dates until paid/cancelled/swept.
  const where = {
    published: true,
    ...(filters.city
      ? { city: { contains: filters.city, mode: "insensitive" as const } }
      : {}),
    ...(filters.category
      ? { category: filters.category as never }
      : {}),
    ...(filters.guests ? { guestCount: { gte: filters.guests } } : {}),
    ...(filters.checkIn && filters.checkOut
      ? {
          reservations: {
            none: {
              startDate: { lt: filters.checkOut },
              endDate: { gt: filters.checkIn },
              paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] },
            },
          },
        }
      : {}),
  };

  return prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      reviews: { select: { rating: true } },
    },
  });
}

export async function getFavoriteIds(userId: string | null) {
  if (!userId) return new Set<string>();
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(favorites.map((f) => f.listingId));
}

export function averageRating(ratings: { rating: number }[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export async function getListingDetail(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: { select: { id: true, name: true, image: true, createdAt: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });
  if (!listing) return null;

  const bookedRanges = await prisma.reservation.findMany({
    where: {
      listingId,
      paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] },
      endDate: { gt: new Date() },
    },
    select: { startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });

  return { listing, bookedRanges };
}
