"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Search } from "lucide-react";
import { DatePicker } from "@/components/pl/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

export function SearchBar({
  initialCity = "",
  initialGuests,
}: {
  initialCity?: string;
  initialGuests?: number;
}) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [city, setCity] = useState(initialCity);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(initialGuests ?? 1);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (guests > 1) params.set("guests", String(guests));
    if (checkIn) params.set("checkIn", checkIn.toISOString());
    if (checkOut) params.set("checkOut", checkOut.toISOString());
    router.push(params.size > 0 ? `/?${params}` : "/");
  }

  const calendarType = locale === "fa" ? ("shamsi" as const) : ("miladi" as const);

  return (
    <form
      onSubmit={onSearch}
      className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:divide-x sm:rtl:divide-x-reverse sm:divide-border"
    >
      <div className="flex-1 px-3 py-1">
        <label className="block text-xs font-semibold">{t("where")}</label>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("wherePlaceholder")}
          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="px-3 py-1 max-sm:border-t max-sm:border-border max-sm:pt-2">
        <span className="block text-xs font-semibold">{t("when")}</span>
        <div className="mt-1 flex items-center gap-2" dir="ltr">
          <DatePicker
            calendarType={calendarType}
            value={checkIn}
            onValueChange={(v) => {
              setCheckIn(v);
              if (v && checkOut && v >= checkOut) setCheckOut(null);
            }}
            placeholder={t("checkIn")}
            className="h-8 flex-1 text-xs"
          />
          <DatePicker
            calendarType={calendarType}
            value={checkOut}
            onValueChange={setCheckOut}
            placeholder={t("checkOut")}
            className="h-8 flex-1 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-1 max-sm:border-t max-sm:border-border max-sm:pt-2">
        <div>
          <span className="block text-xs font-semibold">{t("who")}</span>
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              aria-label="-"
            >
              <Minus />
            </Button>
            <span className="min-w-10 text-center text-sm">
              {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar" : "en-US").format(guests)}{" "}
              {tc("guests")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setGuests((g) => Math.min(16, g + 1))}
              aria-label="+"
            >
              <Plus />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          className="rounded-xl bg-rose-500 hover:bg-rose-600"
        >
          <Search className="size-4" />
          {t("searchButton")}
        </Button>
      </div>
    </form>
  );
}
