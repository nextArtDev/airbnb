import type { PaymentStatus } from "@/app/generated/prisma/client";
import { STATUS_FA, statusTone } from "@/lib/dashboard/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        statusTone(status),
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "Paid" && "bg-emerald-500",
          status === "Pending" && "bg-amber-500",
          (status === "Failed" ||
            status === "Declined" ||
            status === "Chargeback") &&
            "bg-rose-500",
          (status === "Refunded" || status === "PartiallyRefunded") &&
            "bg-sky-500",
          status === "Cancelled" && "bg-muted-foreground/50",
        )}
      />
      {STATUS_FA[status]}
    </span>
  );
}

/** Soft pill for a listing's publish state - lighter than a solid badge. */
export function PublishBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        published
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          published ? "bg-emerald-500" : "bg-muted-foreground/50",
        )}
      />
      {published ? "منتشرشده" : "پیش‌نویس"}
    </span>
  );
}
