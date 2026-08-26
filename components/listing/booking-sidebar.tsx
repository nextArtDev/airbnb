"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { DateRangePicker } from "@/components/booking/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
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

  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [guests, setGuests] = useState(1);
  const [pending, startTransition] = useTransition();

  const ranges = useMemo(
    () =>
      bookedRanges.map((r) => ({
        start: new Date(r.start),
        end: new Date(r.end),
      })),
    [bookedRanges],
  );

  const disabledMatcher = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    return ranges.some((r) => date >= r.start && date < r.end);
  };

  function onReserve() {
    if (!from || !to) {
      toast.error(t("selectDates"));
      return;
    }
    startTransition(async () => {
      const result = await createReservation({
        listingId,
        checkIn: from.toISOString(),
        checkOut: to.toISOString(),
        guests,
      });
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
  if (from && to && to > from) {
    nights = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    total = nights * pricePerNight;
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="mb-4">
        <span className="text-lg font-bold">
          {formatMoney(pricePerNight, locale)}
        </span>{" "}
        <span className="text-sm text-muted-foreground">{t("pricePerNight")}</span>
      </p>

      <DateRangePicker
        from={from}
        to={to}
        onChange={({ from: f, to: t2 }) => {
          setFrom(f);
          setTo(t2);
        }}
        disabledMatcher={disabledMatcher}
        label={t("dates")}
        placeholder={t("selectDates")}
        clearLabel={tc("clear")}
      />
      {ranges.length > 0 && (
        <span className="mt-1.5 block text-start text-[11px] text-muted-foreground ltr:text-left rtl:text-right">
          <span className="line-through">■</span> {t("booked")}
        </span>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Label htmlFor="guests" className="text-sm font-medium">{tc("guests")}</Label>
        <Input
          id="guests"
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
        {pending && <Spinner />}
        {isOwner ? t("selfBookingError") : t("reserve")}
      </Button>
    </div>
  );
}
