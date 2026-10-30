import type { ListingType } from "@/app/generated/prisma/client";

/**
 * Pure formatting helpers, deliberately free of any Prisma/database import so
 * both server components and client components can use them. Anything that
 * touches `prisma` belongs in `analytics.ts` instead.
 */

export const faNumber = (value: number | bigint) =>
  new Intl.NumberFormat("fa-IR").format(value);

export const faMoney = (value: number | bigint) =>
  `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;

export const faCompactMoney = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(
      value / 1_000_000_000,
    )} میلیارد`;
  }
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(
      value / 1_000_000,
    )} میلیون`;
  }
  return new Intl.NumberFormat("fa-IR").format(value);
};

export const faPercent = (value: number) =>
  `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value)}٪`;

export const faDate = (date: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);

export const faMonth = (date: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "short" }).format(date);

export const faRelative = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${faNumber(minutes)} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${faNumber(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${faNumber(days)} روز پیش`;
  return faDate(date);
};

/** Price label that respects the three listing pricing shapes. */
export function listingPriceLabel(listing: {
  type: ListingType;
  pricePerNight: number | null;
  monthlyRent: bigint | null;
  mortgageAmount: bigint | null;
  salePrice: bigint | null;
}) {
  if (listing.type === "monthly") {
    const rent = Number(listing.monthlyRent ?? 0);
    const deposit = Number(listing.mortgageAmount ?? 0);
    if (rent === 0) return `رهن کامل ${faMoney(deposit)}`;
    if (deposit === 0) return `اجاره ${faMoney(rent)} در ماه`;
    return `رهن ${faMoney(deposit)} + اجاره ${faMoney(rent)}`;
  }
  if (listing.type === "sale") return faMoney(listing.salePrice ?? 0);
  return `${faMoney(listing.pricePerNight ?? 0)} / شب`;
}

/**
 * A single comparable number for the three pricing shapes, used for sorting.
 * Monthly listings are annualised (deposit + 12 months of rent) so a 1B deposit
 * ranks above a 50M/night stay instead of comparing across units.
 */
export function listingComparablePrice(listing: {
  type: ListingType;
  pricePerNight: number | null;
  monthlyRent: bigint | null;
  mortgageAmount: bigint | null;
  salePrice: bigint | null;
}) {
  if (listing.type === "monthly") {
    return (
      Number(listing.mortgageAmount ?? 0) + Number(listing.monthlyRent ?? 0) * 12
    );
  }
  if (listing.type === "sale") return Number(listing.salePrice ?? 0);
  return listing.pricePerNight ?? 0;
}

export type Delta = {
  /** Percentage change vs the previous period, null when there is no baseline. */
  percent: number | null;
  direction: "up" | "down" | "flat";
};

export function computeDelta(current: number, previous: number): Delta {
  if (previous === 0 && current === 0) {
    return { percent: 0, direction: "flat" };
  }
  if (previous === 0) {
    return { percent: null, direction: "up" };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    percent,
    direction: Math.abs(percent) < 0.5 ? "flat" : percent > 0 ? "up" : "down",
  };
}
