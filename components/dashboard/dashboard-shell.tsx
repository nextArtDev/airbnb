'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  MessageSquareText,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'کاربران', icon: Users },
  { href: '/dashboard/listings', label: 'اقامتگاه‌ها', icon: BedDouble },
  { href: '/dashboard/reservations', label: 'رزروها', icon: CalendarDays },
  { href: '/dashboard/reviews', label: 'نظرات', icon: MessageSquareText },
]

export function DashboardShell({
  userName,
  children,
}: {
  userName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4">
      <aside className="sticky top-4 hidden h-fit w-56 shrink-0 rounded-2xl border bg-card p-3 md:block">
        <p className="mb-1 px-3 pt-2 text-lg font-bold text-rose-500">
          املاک آرات
        </p>
        <p className="mb-4 px-3 pb-2 text-xs text-muted-foreground">
          پنل مدیریت · {userName}
        </p>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-accent',
                  active && 'bg-accent font-semibold',
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="my-3 h-px bg-border" />
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
        >
          ← بازگشت به سایت
        </Link>
      </aside>

      <main className="min-w-0 flex-1 space-y-4">
        {/* Mobile nav */}
        <nav className="flex gap-2 overflow-x-auto md:hidden">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs"
            >
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  )
}
