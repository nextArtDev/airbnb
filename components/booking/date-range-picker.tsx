"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/pl/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onChange: (range: { from?: Date; to?: Date }) => void;
  /** Returns true for unbookable days (past / already reserved). */
  disabledMatcher?: (date: Date) => boolean;
  /** Small caption inside the field, e.g. "When" / "Dates". */
  label: string;
  /** Shown when no dates are selected. */
  placeholder: string;
  /** Accessible label for the clear button. */
  clearLabel: string;
  className?: string;
}

/**
 * Airbnb-style single-field date RANGE picker built on persianlabs/ui's
 * bilingual Calendar (Shamsi for fa with Iranian holidays, Gregorian
 * otherwise). The field shows a live "Sep 8 - 23" style summary; the popover
 * stays open until dismissed so users can adjust both ends freely.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  disabledMatcher,
  label,
  placeholder,
  clearLabel,
  className,
}: DateRangePickerProps) {
  const locale = useLocale();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  const range: DateRange = { from: from ?? undefined, to: to ?? undefined };
  const calendarType = locale === "fa" ? ("shamsi" as const) : ("miladi" as const);

  const short = new Intl.DateTimeFormat(
    locale === "fa" ? "fa-IR-u-ca-persian" : locale === "ar" ? "ar" : "en-US",
    { month: "short", day: "numeric" },
  );

  const summary =
    from && to
      ? `${short.format(from)} - ${short.format(to)}`
      : from
        ? short.format(from)
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${summary}`}
          className={cn(
            "flex min-h-[52px] w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-start transition hover:border-foreground/40",
            open && "border-foreground/60 ring-2 ring-ring/40",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-muted-foreground">
              {label}
            </span>
            <span
              className={cn(
                "block truncate text-xs",
                !from && "text-muted-foreground/70",
              )}
            >
              {summary}
            </span>
          </span>
          {from && (
            <span
              role="button"
              tabIndex={0}
              aria-label={clearLabel}
              onClick={(e) => {
                e.stopPropagation();
                onChange({});
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange({});
                }
              }}
              className="grid size-6 shrink-0 place-items-center rounded-full bg-muted-foreground/15 transition hover:bg-muted-foreground/30"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto rounded-2xl p-2 shadow-lg"
        align="start"
        dir={locale === "ar" ? "rtl" : undefined}
      >
        <Calendar
          calendarType={calendarType}
          mode="range"
          selected={range}
          numberOfMonths={isDesktop ? 2 : 1}
          showHolidays={calendarType === "shamsi"}
          disabled={disabledMatcher}
          onSelect={(selected: DateRange | undefined) => {
            // Deliberately keep the popover open (Airbnb behavior) so the
            // user can tweak either end; it closes on outside click / Esc.
            onChange({
              from: selected?.from ?? undefined,
              to: selected?.to ?? undefined,
            });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
