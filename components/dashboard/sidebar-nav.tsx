"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, LogOut } from "lucide-react";
import { NAV_GROUPS } from "@/components/dashboard/nav";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavCounts = {
  users: number;
  listings: number;
  reservations: number;
  reviews: number;
  pending: number;
};

export function SidebarNav({
  counts,
  userName,
  onNavigate,
}: {
  counts: NavCounts;
  userName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  function signOut() {
    startSignOut(async () => {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b px-4 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-500 text-sm font-black text-white">
          آ
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">املاک آرات</p>
          <p className="truncate text-[11px] text-muted-foreground">
            پنل مدیریت · {userName}
          </p>
        </div>
      </div>

      <nav aria-label="ناوبری اصلی" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, countKey, alertKey }) => {
                const active =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);
                const count = countKey ? counts[countKey] : undefined;
                const alert = alertKey === "pending" && counts.pending > 0;

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                        active
                          ? "bg-rose-50 font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-rose-500" />
                      )}
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-rose-500" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{label}</span>
                      {count !== undefined && (
                        <span
                          className={cn(
                            "ms-auto rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                            active
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {count.toLocaleString("fa-IR")}
                        </span>
                      )}
                      {alert && (
                        <span
                          aria-label="رزرو در انتظار"
                          className={cn(
                            "size-1.5 rounded-full bg-amber-500",
                            count === undefined && "ms-auto",
                          )}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t px-2 py-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
          بازگشت به سایت
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          {signingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          خروج
        </button>
      </div>
    </div>
  );
}
