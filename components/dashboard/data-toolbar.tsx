"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, RotateCcw, Search, X } from "lucide-react";
import { FilterMenu, type FilterOption } from "@/components/dashboard/filter-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/dashboard/csv";
import { cn } from "@/lib/utils";

export type ToolbarFilter = {
  key: string;
  label: string;
  /** First option is treated as "no filter". */
  options: FilterOption[];
};

export type ToolbarCsv = {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number>>;
};

type DataToolbarProps = {
  /** Current URL params, passed from the server component. */
  current: Record<string, string | undefined>;
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
  /** Sort control reuses the filter menu UI. */
  sort?: { label: string; options: FilterOption[] };
  csv?: ToolbarCsv;
  total: number;
  totalLabel: string;
  className?: string;
};

export function DataToolbar({
  current,
  searchKey = "q",
  searchPlaceholder = "جستجو…",
  filters = [],
  sort,
  csv,
  total,
  totalLabel,
  className,
}: DataToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);
  const initialQuery = current[searchKey] ?? "";
  const [query, setQuery] = useState(initialQuery);
  const lastPushed = useRef(initialQuery);

  const navigate = useCallback(
    (key: string, value: string | undefined, defaultValue?: string) => {
      const params = new URLSearchParams();
      for (const [paramKey, paramValue] of Object.entries(current)) {
        if (paramValue) params.set(paramKey, paramValue);
      }

      if (!value || value === defaultValue) params.delete(key);
      else params.set(key, value);
      // Any filter change invalidates the current page offset.
      params.delete("page");

      const search = params.toString();
      router.replace(`${pathname}${search ? `?${search}` : ""}`, {
        scroll: false,
      });
    },
    [current, pathname, router],
  );

  // Keep the input in sync when the URL changes from elsewhere (reset, links).
  useEffect(() => {
    const urlQuery = current[searchKey] ?? "";
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [current, searchKey]);

  // Debounced write-back so typing does not spam the router.
  useEffect(() => {
    if (query === lastPushed.current) return;
    const timer = setTimeout(() => {
      lastPushed.current = query;
      navigate(searchKey, query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, searchKey, navigate]);

  // "/" focuses search, Escape clears it - same affordance as the CRM.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeCount =
    filters.filter((filter) => {
      const value = current[filter.key];
      return value !== undefined && value !== filter.options[0]?.value;
    }).length + (current[searchKey] ? 1 : 0);

  function reset() {
    lastPushed.current = "";
    setQuery("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 ps-9 pe-9"
            aria-label={searchPlaceholder}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 end-2 my-auto grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted"
              aria-label="پاک کردن جستجو"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute inset-y-0 end-2.5 my-auto hidden h-5 items-center rounded border bg-muted px-1.5 text-[10px] text-muted-foreground sm:flex">
              /
            </kbd>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((filter) => (
            <FilterMenu
              key={filter.key}
              label={filter.label}
              value={current[filter.key] ?? filter.options[0].value}
              options={filter.options}
              onChange={(value) =>
                navigate(filter.key, value, filter.options[0].value)
              }
            />
          ))}

          {sort && (
            <FilterMenu
              label={sort.label}
              value={current.sort ?? sort.options[0].value}
              options={sort.options}
              onChange={(value) => navigate("sort", value, sort.options[0].value)}
              align="end"
            />
          )}

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-8 gap-1 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              بازنشانی
            </Button>
          )}

          {csv && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => downloadCsv(csv.filename, [csv.headers, ...csv.rows])}
            >
              <Download className="size-3.5" />
              خروجی CSV
            </Button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {total.toLocaleString("fa-IR")}
        </span>{" "}
        {totalLabel}
        {activeCount > 0 && " · فیلتر فعال"}
      </p>
    </div>
  );
}
