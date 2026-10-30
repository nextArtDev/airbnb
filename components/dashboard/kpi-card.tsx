import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/dashboard/sparkline";
import { faPercent, type Delta } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Secondary line under the value. */
  hint?: string;
  delta?: Delta;
  deltaLabel?: string;
  /** Higher-is-worse metrics (e.g. pending bookings) flip the colour. */
  invertDelta?: boolean;
  trend?: number[];
  accent?: "brand" | "emerald" | "amber" | "sky" | "violet";
};

const ACCENT: Record<
  NonNullable<KpiCardProps["accent"]>,
  { chip: string; spark: "brand" | "success" | "muted" }
> = {
  brand: {
    chip: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    spark: "brand",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    spark: "success",
  },
  amber: {
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    spark: "brand",
  },
  sky: {
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    spark: "brand",
  },
  violet: {
    chip: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    spark: "brand",
  },
};

function DeltaPill({
  delta,
  invert,
}: {
  delta: Delta;
  invert?: boolean;
}) {
  const positive = delta.direction === "up";
  const negative = delta.direction === "down";
  const good = invert ? negative : positive;
  const bad = invert ? positive : negative;

  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        good && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        bad && "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
        !good && !bad && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3" />
      {delta.percent === null ? "جدید" : faPercent(Math.abs(delta.percent))}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  deltaLabel,
  invertDelta,
  trend,
  accent = "brand",
}: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums sm:text-[28px]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            ACCENT[accent].chip,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {delta && (
            <div className="flex items-center gap-1.5">
              <DeltaPill delta={delta} invert={invertDelta} />
              {deltaLabel && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {deltaLabel}
                </span>
              )}
            </div>
          )}
          {hint && (
            <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
          )}
        </div>
        {trend && trend.length > 1 && (
          <Sparkline
            values={trend}
            tone={ACCENT[accent].spark}
            className="h-8 w-20 shrink-0 sm:w-24"
          />
        )}
      </div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-card/50 px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
        {hint && (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground/60" />}
    </div>
  );
}
