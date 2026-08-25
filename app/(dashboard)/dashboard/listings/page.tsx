import Link from "next/link";
import { AdminDeleteButton, PublishToggleButton } from "@/components/dashboard/row-actions";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

export default async function DashboardListingsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [listings, count] = await prisma.$transaction([
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        city: true,
        pricePerNight: true,
        published: true,
        createdAt: true,
        user: { select: { name: true } },
        _count: { select: { reservations: true } },
      },
    }),
    prisma.listing.count(),
  ]);

  return (
    <>
      <h1 className="text-xl font-bold">اقامتگاه‌ها ({count.toLocaleString("fa-IR")})</h1>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3 text-start">عنوان</th>
              <th className="p-3 text-start">میزبان</th>
              <th className="p-3 text-start">شهر</th>
              <th className="p-3 text-start">قیمت/شب</th>
              <th className="p-3 text-start">رزروها</th>
              <th className="p-3 text-start">انتشار</th>
              <th className="p-3 text-start"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="max-w-64 p-3">
                  <Link
                    href={`/listings/${l.id}`}
                    target="_blank"
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {l.title}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{l.user.name}</td>
                <td className="p-3">{l.city}</td>
                <td className="p-3" dir="ltr">
                  {l.pricePerNight.toLocaleString("fa-IR")}
                </td>
                <td className="p-3">{l._count.reservations}</td>
                <td className="p-3">
                  <Badge variant={l.published ? "default" : "secondary"}>
                    {l.published ? "منتشر شده" : "پیش‌نویس"}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <PublishToggleButton listingId={l.id} published={l.published} />
                    <AdminDeleteButton kind="listing" id={l.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} hasMore={count > skip + listings.length} />
    </>
  );
}

function Pagination({ page, hasMore }: { page: number; hasMore: boolean }) {
  return (
    <div className="flex items-center justify-between">
      {page > 1 ? (
        <Link
          href={`/dashboard/listings?page=${page - 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          قبلی
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link
          href={`/dashboard/listings?page=${page + 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          بعدی
        </Link>
      )}
    </div>
  );
}
