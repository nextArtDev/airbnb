import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil } from "lucide-react";
import { DeleteListingButton } from "@/components/host/delete-listing-button";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export default async function HostingsPage(props: PageProps<"/[locale]/hostings">) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const listings = await prisma.listing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      reservations: {
        where: { paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] } },
        orderBy: { startDate: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  const t = await getTranslations("hosting");
  const tt = await getTranslations("trips");

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <Button asChild className="rounded-full bg-rose-600 hover:bg-rose-700">
            <Link href="/hostings/new">{t("new")}</Link>
          </Button>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <p className="mb-4 text-muted-foreground">{t("empty")}</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/hostings/new">{t("createFirst")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {listings.map((listing) => (
              <section key={listing.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={listing.coverImage}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                    <div className="min-w-0">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="line-clamp-1 font-semibold hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {listing.city} ·{" "}
                        {formatMoney(listing.pricePerNight, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" size="icon-sm" aria-label={t("edit")}>
                      <Link href={`/hostings/${listing.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <DeleteListingButton listingId={listing.id} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {t("bookingsReceived")}
                  </h3>
                  {listing.reservations.length === 0 ? (
                    <p className="px-1 text-sm text-muted-foreground/70">
                      {t("noBookingsYet")}
                    </p>
                  ) : (
                    <ul className="divide-y rounded-xl border">
                      {listing.reservations.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                        >
                          <span className="font-medium">
                            {r.user.name ?? "?"}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDate(r.startDate, locale)} →{" "}
                            {formatDate(r.endDate, locale)}
                          </span>
                          <span className="font-semibold">
                            {formatMoney(r.totalPrice, locale)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              r.paymentStatus === PaymentStatus.Paid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }
                          >
                            {tt(
                              r.paymentStatus === PaymentStatus.Paid
                                ? "paid"
                                : "pending",
                            )}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
