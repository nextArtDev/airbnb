import { cn } from "@/lib/utils";

export type SegmentTone = "brand" | "danger" | "warning" | "success" | "auto";

type SegmentBarProps = {
  percent: number;
  segments?: number;
  tone?: SegmentTone;
  className?: string;
  segmentClassName?: string;
  trackClassName?: string;
  /** Accessible label, e.g. "نرخ اشغال". */
  label?: string;
};

const TONE_CLASS: Record<Exclude<SegmentTone, "auto">, string> = {
  brand: "bg-rose-500",
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
};

/**
 * Auto tone mirrors the CRM's pipeline meter: the first third of the filled
 * segments reads as risk, the last third as healthy. Useful for any
 * "lower is worse" metric such as occupancy or paid ratio.
 */
function autoTone(index: number, filled: number) {
  const danger = Math.floor(filled / 3);
  const warning = Math.ceil(filled / 3);
  if (index < danger) return TONE_CLASS.danger;
  if (index < danger + warning) return TONE_CLASS.warning;
  return TONE_CLASS.success;
}

export function SegmentBar({
  percent,
  segments = 24,
  tone = "auto",
  className,
  segmentClassName,
  trackClassName = "bg-muted",
  label,
}: SegmentBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((clamped / 100) * segments);

  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(
        "flex h-2.5 items-center gap-[2px] overflow-hidden rounded-[3px]",
        className,
      )}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-full min-w-px flex-1 rounded-[1px]",
            segmentClassName,
            index < filled
              ? tone === "auto"
                ? autoTone(index, filled)
                : TONE_CLASS[tone]
              : trackClassName,
          )}
        />
      ))}
    </span>
  );
}
