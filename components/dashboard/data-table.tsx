"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DataColumn = {
  key: string;
  label: string;
  /** Classes for both the header cell and body cells. */
  className?: string;
};

export type BulkAction = {
  id: string;
  label: string;
  tone?: "default" | "danger";
  /** Optional window.confirm() copy. */
  confirm?: string;
  /** `{count}` is replaced with the number of affected rows. */
  successMessage: string;
  action: (ids: string[]) => Promise<{ success: boolean; count: number }>;
};

export type DataRow = {
  id: string;
  cells: React.ReactNode[];
  detail?: {
    title: string;
    subtitle?: string;
    body: React.ReactNode;
  };
};

type DataTableProps = {
  columns: DataColumn[];
  rows: DataRow[];
  selectable?: boolean;
  bulkActions?: BulkAction[];
  empty?: React.ReactNode;
  /** Minimum table width so columns do not crush on mobile. */
  minWidth?: string;
};

/**
 * Table with optional multi-select and a row detail drawer.
 *
 * Selection and the open row live in the client, while filtering, sorting and
 * paging stay on the server (URL-driven) - so a filtered view is shareable and
 * survives a refresh.
 */
export function DataTable({
  columns,
  rows,
  selectable = false,
  bulkActions = [],
  empty,
  minWidth = "900px",
}: DataTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Selection is stored by id and intersected with the current rows on every
  // render, so a filter/page change can never act on a row that is not visible.
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selectedVisible = visibleIds.filter((id) => selected.has(id));
  const allSelected = rows.length > 0 && selectedVisible.length === rows.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;
  const openRow = rows.find((row) => row.id === openId);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(action: BulkAction) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    const ids = selectedVisible;
    startTransition(async () => {
      try {
        const result = await action.action(ids);
        if (result.success) {
          toast.success(
            action.successMessage.replace(
              "{count}",
              result.count.toLocaleString("fa-IR"),
            ),
          );
          setSelected(new Set());
        } else {
          toast.error("هیچ موردی تغییر نکرد");
        }
      } catch {
        toast.error("خطای دسترسی یا سرور");
      }
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth }}>
            <thead className="border-b bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                {selectable && (
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox
                      checked={
                        allSelected ? true : someSelected ? "indeterminate" : false
                      }
                      onCheckedChange={toggleAll}
                      aria-label="انتخاب همه"
                      disabled={rows.length === 0}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-2.5 text-start font-medium whitespace-nowrap",
                      column.className,
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    onClick={(event) => {
                      if (
                        (event.target as HTMLElement).closest(
                          "button, a, input, [data-no-row-click]",
                        )
                      ) {
                        return;
                      }
                      if (row.detail) setOpenId(row.id);
                    }}
                    className={cn(
                      "transition-colors",
                      row.detail && "cursor-pointer hover:bg-muted/40",
                      isSelected && "bg-rose-50/60 dark:bg-rose-500/5",
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5" data-no-row-click>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(row.id)}
                          aria-label="انتخاب ردیف"
                        />
                      </td>
                    )}
                    {row.cells.map((cell, index) => (
                      <td
                        key={columns[index]?.key ?? index}
                        className={cn(
                          "px-4 py-2.5 align-middle",
                          columns[index]?.className,
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && empty}
      </div>

      {selectable && selectedVisible.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 rounded-2xl border bg-popover p-2.5 shadow-lg">
          <div className="flex items-center gap-2 ps-1">
            <span className="grid size-7 place-items-center rounded-full bg-rose-500 text-xs font-bold text-white tabular-nums">
              {selectedVisible.length.toLocaleString("fa-IR")}
            </span>
            <span className="text-xs text-muted-foreground">ردیف انتخاب شد</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSelected(new Set())}
            >
              <X className="size-3" />
              لغو
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.tone === "danger" ? "destructive" : "outline"}
                className="h-7 text-xs"
                disabled={pending}
                onClick={() => runBulk(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Sheet
        open={openRow !== undefined && openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
      >
        <SheetContent
          side="left"
          className="w-full gap-0 p-0 sm:max-w-lg"
          showCloseButton={false}
        >
          {openRow?.detail && (
            <>
              <SheetHeader className="gap-1 border-b p-4 pe-12">
                <SheetTitle className="text-sm">{openRow.detail.title}</SheetTitle>
                {openRow.detail.subtitle && (
                  <SheetDescription className="text-xs">
                    {openRow.detail.subtitle}
                  </SheetDescription>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute end-2 top-2"
                  onClick={() => setOpenId(null)}
                  aria-label="بستن"
                >
                  <X className="size-4" />
                </Button>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {openRow.detail.body}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
