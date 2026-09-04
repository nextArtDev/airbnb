import Link from "next/link";
import { AdminDeleteButton, PublishToggleButton } from "@/components/dashboard/row-actions";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

const TYPE_FA = {
  nightly: "اقامتگاه",
  monthly: "رهن و اجاره",
  sale: "فروشی",
} as const;

function priceFa(listing: {
  type: "nightly" | "monthly" | "sale";
  pricePerNight: number | null;
  monthlyRent: bigint | null;
  mortgageAmount: bigint | null;
  salePrice: bigint | null;
}): string {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (listing.type === "monthly") {
    const rent = Number(listing.monthlyRent ?? 0);
    const deposit = Number(listing.mortgageAmount ?? 0);
    if (rent === 0) return `رهن کامل: ${fa(deposit)}`;
    if (deposit === 0) return `اجاره: ${fa(rent)}/ماه`;
    return `رهن ${fa(deposit)} / اجاره ${fa(rent)}`;
  }
  if (listing.type === "sale") return `${fa(Number(listing.salePrice ?? 0))}`;
  return `${fa(listing.pricePerNight ?? 0)}/شب`;
}

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
        type: true,
        pricePerNight: true,
        monthlyRent: true,
        mortgageAmount: true,
        salePrice: true,
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
      <h1 className="text-xl font-bold">آگهی‌ها ({count.toLocaleString("fa-IR")})</h1>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3 text-start">عنوان</th>
              <th className="p-3 text-start">میزبان</th>
              <th className="p-3 text-start">شهر</th>
              <th className="p-3 text-start">نوع آگهی</th>
              <th className="p-3 text-start">قیمت</th>
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
                <td className="p-3">
                  <Badge variant="outline">{TYPE_FA[l.type]}</Badge>
                </td>
                <td className="p-3 whitespace-nowrap" dir="auto">
                  {priceFa(l)}
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
