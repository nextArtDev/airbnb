import type {
  ListingCategory,
  ListingType,
  PaymentStatus,
} from "@/app/generated/prisma/client";

export const STATUS_FA: Record<PaymentStatus, string> = {
  Pending: "در انتظار پرداخت",
  Paid: "پرداخت‌شده",
  Failed: "ناموفق",
  Declined: "رد شده",
  Cancelled: "لغو شده",
  Refunded: "بازپرداخت",
  PartiallyRefunded: "بازپرداخت جزئی",
  Chargeback: "چارج‌بک",
};

export const STATUS_ORDER: PaymentStatus[] = [
  "Paid",
  "Pending",
  "Failed",
  "Cancelled",
  "Refunded",
  "Declined",
  "PartiallyRefunded",
  "Chargeback",
];

export const TYPE_FA: Record<ListingType, string> = {
  nightly: "اقامت شبانه",
  monthly: "رهن و اجاره",
  sale: "فروش",
};

export const CATEGORY_FA: Record<ListingCategory, string> = {
  beach: "ساحلی",
  villa: "ویلا",
  ecoLodge: "بوم‌گردی",
  traditional: "سنتی",
  apartment: "آپارتمان",
  desert: "کویری",
  mountain: "کوهستانی",
  luxury: "لوکس",
};

export const ROLE_FA = {
  admin: "مدیر",
  user: "کاربر",
} as const;

/** Tailwind classes for a reservation status pill. */
export function statusTone(status: PaymentStatus) {
  switch (status) {
    case "Paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
    case "Failed":
    case "Declined":
    case "Chargeback":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400";
    case "Refunded":
    case "PartiallyRefunded":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** Solid colour used by charts/segment bars per status. */
export function statusColor(status: PaymentStatus) {
  switch (status) {
    case "Paid":
      return "bg-emerald-500";
    case "Pending":
      return "bg-amber-500";
    case "Failed":
    case "Declined":
    case "Chargeback":
      return "bg-rose-500";
    case "Refunded":
    case "PartiallyRefunded":
      return "bg-sky-500";
    default:
      return "bg-muted-foreground/40";
  }
}
