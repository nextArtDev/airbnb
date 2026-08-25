import Link from "next/link";
import { Star } from "lucide-react";
import { AdminDeleteButton } from "@/components/dashboard/row-actions";
import { formatDate } from "@/lib/format";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

export default async function DashboardReviewsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [reviews, count] = await prisma.$transaction([
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true } },
        listing: { select: { id: true, title: true } },
      },
    }),
    prisma.review.count(),
  ]);

  return (
    <>
      <h1 className="text-xl font-bold">نظرات ({count.toLocaleString("fa-IR")})</h1>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{r.user.name}</span>
                <span className="text-muted-foreground">در</span>
                <Link
                  href={`/listings/${r.listing.id}`}
                  target="_blank"
                  className="text-muted-foreground hover:underline"
                >
                  {r.listing.title}
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-0.5 text-sm">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  {r.rating.toLocaleString("fa-IR")}
                </span>
                <AdminDeleteButton kind="review" id={r.id} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{r.comment}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {formatDate(r.createdAt, "fa")}
            </p>
          </div>
        ))}
      </div>

      <Pagination page={page} hasMore={count > skip + reviews.length} />
    </>
  );
}

function Pagination({ page, hasMore }: { page: number; hasMore: boolean }) {
  return (
    <div className="flex items-center justify-between">
      {page > 1 ? (
        <Link
          href={`/dashboard/reviews?page=${page - 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          قبلی
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link
          href={`/dashboard/reviews?page=${page + 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          بعدی
        </Link>
      )}
    </div>
  );
}
