import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildQuery, type SearchParamsRecord } from "@/lib/dashboard/params";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  basePath: string;
  params: SearchParamsRecord;
  /** Total rows, shown next to the page links. */
  total: number;
  pageSize: number;
};

function pageWindow(page: number, pageCount: number) {
  const pages = new Set<number>([1, pageCount, page]);
  for (let offset = 1; offset <= 1; offset += 1) {
    pages.add(page - offset);
    pages.add(page + offset);
  }
  return [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
}

export function Pagination({
  page,
  pageCount,
  basePath,
  params,
  total,
  pageSize,
}: PaginationProps) {
  if (pageCount <= 1) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        {total.toLocaleString("fa-IR")} مورد · همه در یک صفحه
      </p>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = pageWindow(page, pageCount);

  return (
    <nav
      aria-label="صفحه‌بندی"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        نمایش {from.toLocaleString("fa-IR")}–{to.toLocaleString("fa-IR")} از{" "}
        {total.toLocaleString("fa-IR")}
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={`${basePath}${buildQuery(params, { page: page - 1 })}`}
          disabled={page <= 1}
          label="قبلی"
        >
          <ChevronRight className="size-4" />
        </PageLink>

        {pages.map((value, index) => {
          const previous = pages[index - 1];
          const gap = previous !== undefined && value - previous > 1;
          return (
            <span key={value} className="flex items-center gap-1">
              {gap && (
                <span className="px-1 text-xs text-muted-foreground">…</span>
              )}
              <Link
                href={`${basePath}${buildQuery(params, { page: value })}`}
                aria-current={value === page ? "page" : undefined}
                className={cn(
                  "grid size-8 place-items-center rounded-lg border text-xs tabular-nums transition",
                  value === page
                    ? "border-transparent bg-rose-500 font-semibold text-white"
                    : "bg-card hover:bg-accent",
                )}
              >
                {value.toLocaleString("fa-IR")}
              </Link>
            </span>
          );
        })}

        <PageLink
          href={`${basePath}${buildQuery(params, { page: page + 1 })}`}
          disabled={page >= pageCount}
          label="بعدی"
        >
          <ChevronLeft className="size-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        aria-label={label}
        className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground/40"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg border bg-card transition hover:bg-accent"
    >
      {children}
    </Link>
  );
}
