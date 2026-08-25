import { PaymentStatus } from "@/app/generated/prisma/client";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleCheck, CircleX } from "lucide-react";
import { CancelReservationButton } from "@/components/booking/cancel-reservation-button";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ReviewForm } from "@/components/review/review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatDate, formatMoney } from "@/lib/format";
import prisma from "@/lib/prisma";

const STATUS_BADGE: Record<
  PaymentStatus,
  { key: string; className: string }
> = {
  Pending: {
    key: "pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  Paid: {
    key: "paid",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  Failed: { key: "failed", className: "bg-destructive/10 text-destructive" },
  Declined: { key: "failed", className: "bg-destructive/10 text-destructive" },
  Cancelled: { key: "cancelled", className: "bg-muted text-muted-foreground" },
  Refunded: { key: "cancelled", className: "bg-muted text-muted-foreground" },
  PartiallyRefunded: { key: "cancelled", className: "bg-muted text-muted-foreground" },
  Chargeback: { key: "failed", className: "bg-destructive/10 text-destructive" },
};

export default async function TripsPage(props: PageProps<"/[locale]/trips">) {
  const [{ locale }, sp] = await Promise.all([props.params, props.searchParams]);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const reservations = await prisma.reservation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { id: true, title: true, coverImage: true, city: true } },
      review: { select: { id: true } },
    },
  });

  const t = await getTranslations("trips");
  const tBooking = await getTranslations("booking");

  const banner = typeof sp.payment === "string" ? sp.payment : null;
  const now = new Date();
  const upcoming = reservations.filter((r) => r.endDate >= now);
  const past = reservations.filter((r) => r.endDate < now);

  function ReservationRow({ reservation }: { reservation: (typeof reservations)[number] }) {
    const badge = STATUS_BADGE[reservation.paymentStatus];
    const isUpcoming = reservation.startDate >= now;

    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
          <Image
            src={reservation.listing.coverImage}
            alt=""
            fill
            sizes="160px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/listings/${reservation.listing.id}`}
              className="font-semibold hover:underline"
            >
              {reservation.listing.title}
            </Link>
            <Badge variant="secondary" className={badge.className}>
              {t(badge.key)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(reservation.startDate, locale)} →{" "}
            {formatDate(reservation.endDate, locale)} ·{" "}
            {formatMoney(reservation.totalPrice, locale)}
          </p>
          <p className="text-xs text-muted-foreground" dir={locale === "fa" ? "rtl" : "ltr"}>
            {t("trackingCode")}: {reservation.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          {isUpcoming && reservation.paymentStatus === PaymentStatus.Pending && (
            <>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-rose-600 hover:bg-rose-700"
              >
                <Link href={`/checkout/${reservation.id}`}>
                  {t("completePayment")}
                </Link>
              </Button>
              <CancelReservationButton
                reservationId={reservation.id}
                path="/trips"
              />
            </>
          )}
          {isUpcoming && reservation.paymentStatus === PaymentStatus.Paid && (
            <CancelReservationButton
              reservationId={reservation.id}
              path="/trips"
            />
          )}
        </div>
        {!isUpcoming &&
          reservation.paymentStatus === PaymentStatus.Paid &&
          !reservation.review && (
            <div className="w-full sm:col-span-2">
              <ReviewForm reservationId={reservation.id} />
            </div>
          )}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-10">
        {banner === "success" && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            <CircleCheck className="size-5 shrink-0" />
            {tBooking("paymentSuccess")}
          </div>
        )}
        {banner === "already_paid" && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
            <CircleCheck className="size-5 shrink-0" />
            {tBooking("alreadyPaid")}
          </div>
        )}
        {(banner === "failed") && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <CircleX className="size-5 shrink-0" />
            {tBooking("paymentFailed")}
          </div>
        )}

        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

        {upcoming.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("upcoming")}
            </h2>
            <div className="mb-8 space-y-4">
              {upcoming.map((r) => (
                <ReservationRow key={r.id} reservation={r} />
              ))}
            </div>
          </>
        )}

        {past.length > 0 ? (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("past")}
            </h2>
            <div className="space-y-4 opacity-75">
              {past.map((r) => (
                <ReservationRow key={r.id} reservation={r} />
              ))}
            </div>
          </>
        ) : upcoming.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-muted-foreground">{t("empty")}</p>
            <Button asChild className="rounded-full bg-rose-600 hover:bg-rose-700">
              <Link href="/">{t("emptyAction")}</Link>
            </Button>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

