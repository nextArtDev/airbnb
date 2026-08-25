"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { DatePicker } from "@/components/pl/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createReservation } from "@/lib/actions/reservations";
import { formatMoney } from "@/lib/format";

interface BookingSidebarProps {
  listingId: string;
  pricePerNight: number;
  guestCount: number;
  isOwner: boolean;
  bookedRanges: { start: string; end: string }[];
}

export function BookingSidebar({
  listingId,
  pricePerNight,
  guestCount,
  isOwner,
  bookedRanges,
}: BookingSidebarProps) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(1);
  const [pending, startTransition] = useTransition();

  const ranges = useMemo(
    () =>
      bookedRanges.map((r) => ({
        // Normalize stored UTC-midnight instants to local calendar days so the
        // disabled matcher compares like-for-like with the picker's local dates.
        start: new Date(r.start).toDateString(),
        end: new Date(r.end).toDateString(),
      })),
    [bookedRanges],
  );

  const disabledMatcher = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    const day = date.toDateString();
    return ranges.some(
      (r) => day >= r.start && day < r.end,
    );
  };

  function onReserve() {
    if (!checkIn || !checkOut) {
      toast.error(t("selectDates"));
      return;
    }
    startTransition(async () => {
      const result = await createReservation(
        {
          listingId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests,
        },
      );
      if (result.success && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      if (result.message && result.message !== "unauthorized") {
        toast.error(t(result.message as never));
      } else if (result.message === "unauthorized") {
        router.push("/sign-in");
      }
    });
  }

  let nights = 0;
  let total = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    total = nights * pricePerNight;
  }

  const calendarType = locale === "fa" ? ("shamsi" as const) : ("miladi" as const);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="mb-4">
        <span className="text-lg font-bold">
          {formatMoney(pricePerNight, locale)}
        </span>{" "}
        <span className="text-sm text-muted-foreground">{t("pricePerNight")}</span>
      </p>

      <div className="grid grid-cols-2 gap-2" dir="ltr">
        <DatePicker
          calendarType={calendarType}
          confirmLabel={tc("confirm")}
          cancelLabel={tc("cancel")}
          value={checkIn}
          onValueChange={(v) => {
            setCheckIn(v);
            if (v && checkOut && v >= checkOut) setCheckOut(null);
          }}
          placeholder={t("selectDates")}
          calendarProps={{ disabled: disabledMatcher }}
          className="h-9 text-xs"
        />
        <DatePicker
          calendarType={calendarType}
          confirmLabel={tc("confirm")}
          cancelLabel={tc("cancel")}
          value={checkOut}
          onValueChange={setCheckOut}
          placeholder={t("selectDates")}
          calendarProps={{ disabled: disabledMatcher }}
          className="h-9 text-xs"
        />
      </div>
      {ranges.length > 0 && (
        <span className="mt-1.5 block text-start text-[11px] text-muted-foreground ltr:text-left rtl:text-right">
          <span className="line-through">■</span> {t("booked")}
        </span>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{tc("guests")}</label>
        <Input
          type="number"
          min={1}
          max={guestCount}
          value={guests}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) setGuests(Math.max(1, Math.min(guestCount, Math.floor(v))));
          }}
          className="h-9 w-20 text-center"
        />
      </div>

      {nights > 0 && (
        <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span>
              {t("nightsCount", {
                count: nights,
                price: formatMoney(pricePerNight, locale),
              })}
            </span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
            <span>{t("total")}</span>
            <span>{formatMoney(total, locale)}</span>
          </div>
        </div>
      )}

      <Button
        onClick={onReserve}
        disabled={pending || nights === 0 || isOwner}
        className="mt-4 w-full rounded-xl bg-rose-600 hover:bg-rose-700"
      >
        {pending && <Spinner aria-label={tc("loading")} />}
        {isOwner ? t("selfBookingError") : t("reserve")}
      </Button>
    </div>
  );
}
