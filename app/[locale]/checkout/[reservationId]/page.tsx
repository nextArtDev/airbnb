import { notFound, redirect } from "next/navigation";import { PaymentStatus } from "@/app/generated/prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { StripePay } from "@/components/payment/stripe-pay";
import { ZarinpalPay } from "@/components/payment/zarinpal-pay";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatDate, formatMoney } from "@/lib/format";
import prisma from "@/lib/prisma";

export default async function CheckoutPage(
  props: PageProps<"/[locale]/checkout/[reservationId]">,
) {
  const [{ locale }, { reservationId }] = await Promise.all([
    props.params,
    props.params,
  ]);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      listing: { select: { id: true, title: true, coverImage: true, city: true } },
    },
  });

  if (!reservation) notFound();
  // Ownership is the boundary - checkout of someone else's reservation is 404.
  if (reservation.userId !== user.id) notFound();
  if (reservation.paymentStatus !== PaymentStatus.Pending) {
    redirect(`/${locale}/trips`);
  }

  const t = await getTranslations("booking");
  const tl = await getTranslations("listing");

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

        <div className="grid gap-8 sm:grid-cols-[160px_1fr]">
          <img
            src={reservation.listing.coverImage}
            alt=""
            className="aspect-square w-full rounded-xl object-cover"
          />
          <div className="space-y-2 text-sm">
            <Link
              href={`/listings/${reservation.listing.id}`}
              className="text-base font-semibold hover:underline"
            >
              {reservation.listing.title}
            </Link>
            <p className="text-muted-foreground">{reservation.listing.city}</p>
            <p className="pt-2">
              <span className="text-muted-foreground">{tl("perNight")}: </span>
              {formatMoney(reservation.totalPrice / Math.max(reservation.nights, 1), locale)}
            </p>
            <p>
              <span className="text-muted-foreground">{t("selectDates")}: </span>
              {formatDate(reservation.startDate, locale)} →{" "}
              {formatDate(reservation.endDate, locale)}
            </p>
            <p className="border-t pt-2 text-base font-bold">
              {t("total")}: {formatMoney(reservation.totalPrice, locale)}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
          {locale === "fa" ? (
            <ZarinpalPay reservationId={reservation.id} />
          ) : (
            <StripePay reservationId={reservation.id} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
