import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fa", "en", "ar"],
  defaultLocale: "fa",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: Locale[] = ["fa", "ar"];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}
