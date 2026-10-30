"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CalendarDays, LayoutDashboard, Search, Users } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { FLAT_NAV } from "@/components/dashboard/nav";

export type CommandEntry = {
  id: string;
  group: "کاربران" | "اقامتگاه‌ها" | "رزروها";
  label: string;
  description: string;
  href: string;
};

const GROUP_ICON = {
  کاربران: Users,
  "اقامتگاه‌ها": BedDouble,
  "رزروها": CalendarDays,
} as const;

/**
 * Cmd/Ctrl+K palette: jump to any dashboard section or straight to a user,
 * listing or reservation. Entries are pre-indexed on the server and bounded, so
 * the palette opens instantly.
 */
export function CommandPalette({ entries }: { entries: CommandEntry[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }
      event.preventDefault();
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const groups = (["کاربران", "اقامتگاه‌ها", "رزروها"] as const).map((group) => ({
    group,
    items: entries.filter((entry) => entry.group === group),
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-8 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs text-muted-foreground transition hover:bg-accent sm:w-56"
        aria-label="جستجوی سریع"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden truncate sm:inline">جستجو یا پرش سریع…</span>
        <Kbd className="ms-auto hidden shrink-0 sm:inline-flex">⌘K</Kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="جستجوی سریع"
        description="جستجوی کاربران، اقامتگاه‌ها و رزروها"
        className="sm:max-w-xl"
      >
        <Command shouldFilter>
          <CommandInput placeholder="نام کاربر، اقامتگاه، مهمان…" />
          <CommandList className="max-h-80">
            <CommandEmpty>نتیجه‌ای پیدا نشد.</CommandEmpty>

            <CommandGroup heading="دسترسی سریع">
              {FLAT_NAV.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.href}`}
                  onSelect={() => go(item.href)}
                >
                  <item.icon className="text-muted-foreground" />
                  {item.label}
                </CommandItem>
              ))}
              <CommandItem
                value="سایت اصلی بازگشت"
                onSelect={() => go("/")}
              >
                <LayoutDashboard className="text-muted-foreground" />
                بازگشت به سایت
              </CommandItem>
            </CommandGroup>

            {groups.map(({ group, items }) =>
              items.length === 0 ? null : (
                <div key={group}>
                  <CommandSeparator />
                  <CommandGroup heading={group}>
                    {items.map((entry) => {
                      const Icon = GROUP_ICON[group];
                      return (
                        <CommandItem
                          key={entry.id}
                          value={`${entry.label} ${entry.description}`}
                          onSelect={() => go(entry.href)}
                        >
                          <Icon className="text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">
                            {entry.label}
                          </span>
                          <span className="ms-2 max-w-40 shrink-0 truncate text-[11px] text-muted-foreground">
                            {entry.description}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              ),
            )}
          </CommandList>
          <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              جابه‌جایی
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              باز کردن
            </span>
            <span className="ms-auto flex items-center gap-1">
              <Kbd>Esc</Kbd>
              بستن
            </span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
