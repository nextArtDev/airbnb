import Link from "next/link";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { AdminDeleteButton } from "@/components/dashboard/row-actions";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

const STATUS_FA: Record<PaymentStatus, string> = {
  Pending: "در انتظار پرداخت",
  Paid: "پرداخت شده",
  Failed: "ناموفق",
  Declined: "رد شده",
  Cancelled: "لغو شده",
  Refunded: "بازپرداخت شده",
  PartiallyRefunded: "بازپرداخت جزئی",
  Chargeback: "چارج‌بک",
};

export default async function DashboardReservationsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [reservations, count] = await prisma.$transaction([
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        nights: true,
        guests: true,
        totalPrice: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAt: true,
        user: { select: { name: true } },
        listing: { select: { title: true } },
      },
    }),
    prisma.reservation.count(),
  ]);

  return (
    <>
      <h1 className="text-xl font-bold">رزروها ({count.toLocaleString("fa-IR")})</h1>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3 text-start">مهمان</th>
              <th className="p-3 text-start">اقامتگاه</th>
              <th className="p-3 text-start">بازه</th>
              <th className="p-3 text-start">مبلغ (تومان)</th>
              <th className="p-3 text-start">درگاه</th>
              <th className="p-3 text-start">وضعیت</th>
              <th className="p-3 text-start"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{r.user.name}</td>
                <td className="max-w-52 p-3">
                  <span className="line-clamp-1 text-muted-foreground">
                    {r.listing.title}
                  </span>
                </td>
                <td className="p-3" dir="ltr">
                  {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                    month: "short",
                    day: "numeric",
                  }).format(r.startDate)}
                  {" → "}
                  {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                    month: "short",
                    day: "numeric",
                  }).format(r.endDate)}
                </td>
                <td className="p-3 font-semibold" dir="ltr">
                  {r.totalPrice.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-muted-foreground" dir="ltr">
                  {r.paymentMethod ?? "-"}
                </td>
                <td className="p-3">
                  <Badge
                    variant="secondary"
                    className={
                      r.paymentStatus === PaymentStatus.Paid
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : r.paymentStatus === PaymentStatus.Pending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {STATUS_FA[r.paymentStatus]}
                  </Badge>
                </td>
                <td className="p-3">
                  {r.paymentStatus === PaymentStatus.Pending && (
                    <AdminDeleteButton kind="reservation" id={r.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} hasMore={count > skip + reservations.length} />
    </>
  );
}

function Pagination({ page, hasMore }: { page: number; hasMore: boolean }) {
  return (
    <div className="flex items-center justify-between">
      {page > 1 ? (
        <Link
          href={`/dashboard/reservations?page=${page - 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          قبلی
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link
          href={`/dashboard/reservations?page=${page + 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          بعدی
        </Link>
      )}
    </div>
  );
}
