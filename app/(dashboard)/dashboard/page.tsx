import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

async function getStats() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, listings, paid, pending, monthRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.reservation.findMany({
      where: { paymentStatus: PaymentStatus.Paid },
      select: { totalPrice: true },
    }),
    prisma.reservation.count({ where: { paymentStatus: PaymentStatus.Pending } }),
    prisma.reservation.aggregate({
      where: { paymentStatus: PaymentStatus.Paid, paidAt: { gte: since30 } },
      _sum: { totalPrice: true },
    }),
  ]);

  return {
    users,
    listings,
    paidCount: paid.length,
    totalToman: paid.reduce((sum, r) => sum + r.totalPrice, 0),
    pending,
    monthToman: monthRevenue._sum.totalPrice ?? 0,
  };
}

export default async function DashboardOverviewPage() {
  const stats = await getStats();
  const fa = (n: number) => n.toLocaleString("fa-IR");

  return (
    <>
      <h1 className="text-xl font-bold">نمای کلی</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="کاربران" value={fa(stats.users)} />
        <StatCard label="اقامتگاه‌ها" value={fa(stats.listings)} />
        <StatCard
          label="رزروهای در انتظار پرداخت"
          value={fa(stats.pending)}
        />
        <StatCard
          label="رزروهای پرداخت‌شده"
          value={fa(stats.paidCount)}
        />
        <StatCard
          label="درآمد کل (تومان)"
          value={fa(stats.totalToman)}
          hint="مجموع رزروهای Paid"
        />
        <StatCard
          label="درآمد ۳۰ روز اخیر (تومان)"
          value={fa(stats.monthToman)}
        />
      </div>
    </>
  );
}
