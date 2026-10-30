import { cn } from "@/lib/utils";

export type FooterCell = {
  label: string;
  value: string;
  /** Highlights the cell as the headline aggregate. */
  emphasis?: boolean;
};

/**
 * Aggregate strip under a table - the CRM's "N companies in view / Sum of
 * pipeline" row. Values are computed on the server from the *filtered* set, so
 * they stay honest while paging.
 */
export function TableFooter({ cells }: { cells: FooterCell[] }) {
  return (
    <div className="grid shrink-0 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{cell.label}</p>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold tabular-nums",
              cell.emphasis && "text-rose-600 dark:text-rose-400",
            )}
          >
            {cell.value}
          </p>
        </div>
      ))}
    </div>
  );
}
