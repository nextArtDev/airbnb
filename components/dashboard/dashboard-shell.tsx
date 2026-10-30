"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { CommandPalette, type CommandEntry } from "@/components/dashboard/command-palette";
import { Notifications, type NotificationItem } from "@/components/dashboard/notifications";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

export type DashboardCounts = {
  users: number;
  listings: number;
  reservations: number;
  reviews: number;
  pending: number;
};

export function DashboardShell({
  userName,
  counts,
  notifications,
  commandEntries,
  children,
}: {
  userName: string;
  counts: DashboardCounts;
  notifications: NotificationItem[];
  commandEntries: CommandEntry[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex w-full flex-1 items-stretch">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-e bg-card/40 lg:flex lg:flex-col">
        <SidebarNav counts={counts} userName={userName} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-64 gap-0 p-0">
          <SheetTitle className="sr-only">ناوبری پنل</SheetTitle>
          <SheetDescription className="sr-only">
            بخش‌های پنل مدیریت
          </SheetDescription>
          <SidebarNav
            counts={counts}
            userName={userName}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="باز کردن منو"
          >
            <Menu className="size-4" />
          </button>

          <CommandPalette entries={commandEntries} />

          <div className="ms-auto flex items-center gap-1.5">
            <Notifications items={notifications} />
            <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
            <Link
              href="/"
              className="flex h-8 items-center gap-2 rounded-lg border bg-card px-1.5 pe-2.5 text-xs font-medium transition hover:bg-accent"
            >
              <span className="grid size-5 place-items-center rounded-md bg-rose-500 text-[10px] font-bold text-white">
                {userName.slice(0, 1)}
              </span>
              <span className="hidden max-w-28 truncate sm:inline">{userName}</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
