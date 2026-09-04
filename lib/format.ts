import { FX, tomanToUsd } from "@/lib/fx";

/**
 * Formats a Toman amount for the given locale:
 * - fa: Persian digits + "تومان"
 * - en/ar: USD equivalent (guests in these locales pay via Stripe)
 * Accepts bigint too - long-term prices (deposits, sale prices) are BigInt
 * columns in Postgres.
 */
export function formatMoney(toman: number | bigint, locale: string): string {
  if (locale === "fa") {
    return `${new Intl.NumberFormat("fa-IR").format(toman)} تومان`;
  }
  const usd = Math.round(tomanToUsd(Number(toman)) * 100) / 100;
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar" : "en-US").format(value);
}

/** Formats a date according to locale: Jalali for fa, Gregorian otherwise. */
export function formatDate(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (locale === "fa") {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  }
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatUsdCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export { FX };
