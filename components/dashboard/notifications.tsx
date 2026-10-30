"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "warning" | "info" | "success";
  time: string;
};

const TONE = {
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  info: {
    icon: Info,
    className: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  success: {
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
} as const;

export function Notifications({ items }: { items: NotificationItem[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label={`اعلان‌ها${items.length ? ` (${items.length})` : ""}`}
        >
          <Bell className="size-4" />
          {items.length > 0 && (
            <span className="absolute -top-1 -end-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white tabular-nums">
              {items.length.toLocaleString("fa-IR")}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-xs font-semibold">اعلان‌ها</p>
          <span className="text-[11px] text-muted-foreground">
            {items.length.toLocaleString("fa-IR")} مورد
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            اعلان جدیدی نیست.
          </p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {items.map((item) => {
              const tone = TONE[item.tone];
              const Icon = tone.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-2.5 px-3 py-2.5 transition hover:bg-muted/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                        tone.className,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {item.time}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t px-3 py-2">
          <Link
            href="/dashboard"
            className="text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            مشاهده نمای کلی →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
