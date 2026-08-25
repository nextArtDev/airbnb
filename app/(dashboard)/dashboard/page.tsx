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

export default async function DashboardOverviewPage() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, listings, paid, pending, revenueAgg, monthRevenue] =
    await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.reservation.findMany({
        where: { paymentStatus: PaymentStatus.Paid },
        select: { totalPrice: true },
      }),
      prisma.reservation.count({ where: { paymentStatus: PaymentStatus.Pending } }),
      prisma.paymentDetails.aggregate({
        where: { status: "Paid", method: "zarinpal" },
        _sum: { amount: true },
      }),
      prisma.reservation.aggregate({
        where: { paymentStatus: PaymentStatus.Paid, paidAt: { gte: since30 } },
        _sum: { totalPrice: true },
      }),
    ]);

  const totalToman = paid.reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <>
      <h1 className="text-xl font-bold">نمای کلی</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="کاربران" value={users.toLocaleString("fa-IR")} />
        <StatCard label="اقامتگاه‌ها" value={listings.toLocaleString("fa-IR")} />
        <StatCard
          label="رزروهای در انتظار پرداخت"
          value={pending.toLocaleString("fa-IR")}
        />
        <StatCard
          label="رزروهای پرداخت‌شده"
          value={paid.length.toLocaleString("fa-IR")}
        />
        <StatCard
          label="درآمد کل (تومان)"
          value={totalToman.toLocaleString("fa-IR")}
          hint="مجموع رزروهای Paid"
        />
        <StatCard
          label="درآمد ۳۰ روز اخیر (تومان)"
          value={(monthRevenue._sum.totalPrice ?? 0).toLocaleString("fa-IR")}
        />
      </div>
    </>
  );
}
