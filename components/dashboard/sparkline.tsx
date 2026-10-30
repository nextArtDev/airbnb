import { cn } from "@/lib/utils";

type SparklineProps = {
  values: number[];
  className?: string;
  /** Stroke + fill colour; defaults to the brand rose. */
  tone?: "brand" | "success" | "muted";
  width?: number;
  height?: number;
  /** Fills the area under the line. */
  area?: boolean;
};

const TONE_CLASS: Record<NonNullable<SparklineProps["tone"]>, string> = {
  brand: "text-rose-500",
  success: "text-emerald-500",
  muted: "text-muted-foreground",
};

/**
 * Catmull-Rom -> cubic bezier. Keeps small series from looking like a
 * zig-zag while staying deterministic on the server (no ids, no client JS).
 */
function buildSmoothPath(points: Array<[number, number]>) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0][0]} ${points[0][1]}`;
  }

  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return path;
}

export function Sparkline({
  values,
  className,
  tone = "brand",
  width = 120,
  height = 36,
  area = true,
}: SparklineProps) {
  const series = values.length > 0 ? values : [0];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const padding = 2;

  const points = series.map((value, index) => {
    const x =
      series.length === 1
        ? width / 2
        : (index / (series.length - 1)) * width;
    const y =
      height -
      padding -
      ((value - min) / span) * (height - padding * 2);
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as [
      number,
      number,
    ];
  });

  const line = buildSmoothPath(points);
  const fillPath = `${line} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", TONE_CLASS[tone], className)}
    >
      {area && (
        <path d={fillPath} fill="currentColor" opacity={0.12} stroke="none" />
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2}
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Tiny bar variant used where a line would imply continuity that does not
 * exist (e.g. per-month booking counts with empty months between).
 */
export function SparkBars({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <span
      aria-hidden
      dir="ltr"
      className={cn("flex h-9 items-end gap-[3px]", className)}
    >
      {values.map((value, index) => (
        <span
          key={index}
          className={cn(
            "w-1.5 rounded-[2px] transition-colors",
            value > 0 ? "bg-rose-500/80" : "bg-muted-foreground/20",
          )}
          style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}
