import { notFound } from "next/navigation";
import localFont from "next/font/local";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUser } from "@/lib/auth-helpers";
import "../../globals.css";

const vazirmatn = localFont({
  src: "../../../app/fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "پنل مدیریت | سفرینو",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // First guard layer; every page and action re-checks independently.
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();

  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full antialiased font-sans`}>
      <body className="flex min-h-full flex-col bg-muted/30">
        <DashboardShell userName={user.name}>{children}</DashboardShell>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
