import { notFound } from 'next/navigation'
import localFont from 'next/font/local'
import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  getCommandIndex,
  getNavCounts,
  getNotifications,
} from '@/lib/dashboard/analytics'
import { faRelative } from '@/lib/dashboard/format'
import '../../globals.css'

const vazirmatn = localFont({
  src: '../../../app/fonts/Vazirmatn-Variable.woff2',
  weight: '100 900',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'پنل مدیریت | املاک آرات',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // First guard layer; every page and action re-checks independently.
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') notFound()

  const [counts, notifications, commandEntries] = await Promise.all([
    getNavCounts(),
    getNotifications(),
    getCommandIndex(),
  ])

  // Dates cannot cross the server -> client boundary, so resolve the relative
  // label here and hand the client plain strings.
  const items = notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    description: notification.description,
    href: notification.href,
    tone: notification.tone,
    time: faRelative(notification.createdAt),
  }))

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased font-sans`}
    >
      <body className="flex min-h-full flex-col bg-muted/30">
        <DashboardShell
          userName={user.name}
          counts={counts}
          notifications={items}
          commandEntries={commandEntries}
        >
          {children}
        </DashboardShell>
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
