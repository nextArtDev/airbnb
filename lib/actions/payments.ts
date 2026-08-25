"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  acquirePaymentLock,
  checkPaymentRateLimit,
  cleanupExpiredLocks,
  markAttempt,
  releasePaymentLock,
  validatePaymentAttempt,
} from "@/lib/payment-safety";
import { markReservationPaid } from "@/lib/reservation-paid";
import {
  requestPayment,
  verifyWithGateway,
  type PaymentVerifyResult,
} from "@/lib/zarinpal";
import { tomanToStripeCents } from "@/lib/fx";

export interface StartPaymentResult {
  success: boolean;
  url?: string;
  clientSecret?: string;
  publicKey?: string;
  message?: string;
}

const APP_URL = () =>
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function loadOwnedPendingReservation(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      totalPrice: true,
      paymentStatus: true,
      authority: true,
      exchangeRate: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Zarinpal (fa locale)
// ---------------------------------------------------------------------------

export async function startZarinpalPayment(
  reservationId: string,
): Promise<StartPaymentResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { success: false, message: "unauthorized" };

  try {
    await checkPaymentRateLimit(user.id);

    const reservation = await loadOwnedPendingReservation(reservationId);
    if (!reservation) return { success: false, message: "notFound" };
    if (reservation.userId !== user.id)
      return { success: false, message: "unauthorized" };
    if (reservation.paymentStatus === PaymentStatus.Paid)
      return { success: false, message: "alreadyPaid" };

    const callbackUrl =
      APP_URL() +
      `/api/payment/callback?reservationId=${encodeURIComponent(reservation.id)}`;

    const payment = await requestPayment({
      amountToman: reservation.totalPrice, // amount from DB, never the client
      callbackUrl,
      description: `Reservation ${reservation.id}`,
      mobile: user.phoneNumber ?? undefined,
      email: user.email && !user.email.endsWith("@phone.users.local") ? user.email : undefined,
      orderId: reservation.id,
    });

    if (!payment.ok) {
      console.error("zarinpal request failed:", payment.code, payment.message);
      return { success: false, message: "paymentFailed" };
    }

    // Persist authority BEFORE redirecting - reconciliation depends on it.
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { authority: payment.authority, paymentMethod: "zarinpal" },
      }),
      prisma.paymentDetails.upsert({
        where: { reservationId: reservation.id },
        create: {
          reservationId: reservation.id,
          authority: payment.authority,
          method: "zarinpal",
          status: "Pending",
          amount: reservation.totalPrice,
          currency: "IRT",
        },
        update: { authority: payment.authority, status: "Pending" },
      }),
    ]);
    await markAttempt(reservation.id, payment.authority, reservation.totalPrice, "PENDING");

    return { success: true, url: payment.url };
  } catch (error) {
    if (error instanceof Error && error.message === "rate limit exceeded") {
      return { success: false, message: "rateLimit" };
    }
    console.error("startZarinpalPayment failed:", error);
    return { success: false, message: "genericError" };
  }
}

/**
 * Called by the gateway callback route. The browser's Status param is NOT
 * trusted - it only decides whether we bother calling verify.
 */
export async function verifyZarinpalPayment(params: {
  reservationId: string;
  authority: string | null;
  status: string | null;
}): Promise<{ success: boolean; alreadyPaid?: boolean; message?: string }> {
  await cleanupExpiredLocks();

  if (!params.reservationId || !params.authority) {
    return { success: false, message: "paymentFailed" };
  }

  if (!(await acquirePaymentLock(params.reservationId, params.authority))) {
    return { success: false, message: "verificationInProgress" };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.reservationId },
      select: {
        id: true,
        userId: true,
        totalPrice: true,
        paymentStatus: true,
        exchangeRate: true,
      },
    });
    if (!reservation) return { success: false, message: "notFound" };
    if (reservation.paymentStatus === PaymentStatus.Paid) {
      return { success: true, alreadyPaid: true };
    }
    if (
      !(await validatePaymentAttempt(
        params.reservationId,
        params.authority,
      ))
    ) {
      return { success: false, message: "replayDetected" };
    }

    // Cancelled/failed at the gateway - no verify call needed.
    if (params.status !== "OK") {
      await markAttempt(params.reservationId, params.authority, reservation.totalPrice, "FAILED");
      return { success: false, message: "paymentFailed" };
    }

    const result: PaymentVerifyResult = await verifyWithGateway({
      amountToman: reservation.totalPrice, // re-read from DB; must match request
      authority: params.authority,
    });

    if (!result.ok) {
      await markAttempt(params.reservationId, params.authority, reservation.totalPrice, "FAILED");
      console.error("zarinpal verify failed:", result.code, result.message);
      return { success: false, message: "paymentFailed" };
    }
    if (!result.refId) {
      await markAttempt(params.reservationId, params.authority, reservation.totalPrice, "FAILED");
      return { success: false, message: "paymentFailed" };
    }

    await markReservationPaid({
      reservationId: params.reservationId,
      refId: result.refId,
      authority: params.authority,
      method: "zarinpal",
      amountToman: reservation.totalPrice,
    });
    await markAttempt(params.reservationId, params.authority, reservation.totalPrice, "USED");

    return { success: true, alreadyPaid: result.alreadyVerified };
  } catch (error) {
    console.error("verifyZarinpalPayment error:", error);
    return { success: false, message: "genericError" };
  } finally {
    await releasePaymentLock(params.reservationId);
  }
}

/** Reconciliation: re-verify a Pending reservation that has an authority. */
export async function reconcilePendingZarinpal(
  reservationId: string,
): Promise<boolean> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { paymentStatus: true, authority: true, totalPrice: true },
  });
  if (
    !reservation ||
    reservation.paymentStatus !== PaymentStatus.Pending ||
    !reservation.authority
  ) {
    return false;
  }
  const result = await verifyZarinpalPayment({
    reservationId,
    authority: reservation.authority,
    status: "OK",
  });
  return result.success;
}

// ---------------------------------------------------------------------------
// Stripe (en/ar locales)
// ---------------------------------------------------------------------------

export async function createStripePaymentIntent(
  reservationId: string,
): Promise<StartPaymentResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { success: false, message: "unauthorized" };

  try {
    await checkPaymentRateLimit(user.id);

    const reservation = await loadOwnedPendingReservation(reservationId);
    if (!reservation) return { success: false, message: "notFound" };
    if (reservation.userId !== user.id)
      return { success: false, message: "unauthorized" };
    if (reservation.paymentStatus === PaymentStatus.Paid)
      return { success: false, message: "alreadyPaid" };

    const { Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-12-30.preview" as never,
    });

    // Integer cents of USD derived from the Toman total at the locked rate.
    const amountCents = tomanToStripeCents(
      reservation.totalPrice,
      reservation.exchangeRate,
    );

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      metadata: { reservationId: reservation.id, userId: user.id },
      automatic_payment_methods: { enabled: true },
    });

    // Intent id stored as the order's authority (unique backstop).
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { authority: intent.id, paymentMethod: "stripe" },
      }),
      prisma.paymentDetails.upsert({
        where: { reservationId: reservation.id },
        create: {
          reservationId: reservation.id,
          authority: intent.id,
          method: "stripe",
          status: "Pending",
          amount: reservation.totalPrice,
          currency: "IRT",
        },
        update: { authority: intent.id, status: "Pending" },
      }),
    ]);
    await markAttempt(reservation.id, intent.id, reservation.totalPrice, "PENDING");

    return {
      success: true,
      clientSecret: intent.client_secret ?? undefined,
      publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "rate limit exceeded") {
      return { success: false, message: "rateLimit" };
    }
    console.error("createStripePaymentIntent failed:", error);
    return { success: false, message: "paymentFailed" };
  }
}

/**
 * Client only reports the intent id - the server re-verifies independently
 * with a fresh retrieve and cross-checks the amount before marking paid.
 */
export async function confirmStripePayment(
  reservationId: string,
  paymentIntentId: string,
): Promise<{ success: boolean; alreadyPaid?: boolean; message?: string }> {
  await cleanupExpiredLocks();

  if (!(await acquirePaymentLock(reservationId, paymentIntentId))) {
    return { success: false, message: "verificationInProgress" };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        totalPrice: true,
        paymentStatus: true,
        exchangeRate: true,
      },
    });
    if (!reservation) return { success: false, message: "notFound" };
    if (reservation.paymentStatus === PaymentStatus.Paid) {
      return { success: true, alreadyPaid: true };
    }
    if (!(await validatePaymentAttempt(reservationId, paymentIntentId))) {
      return { success: false, message: "replayDetected" };
    }

    const { Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-12-30.preview" as never,
    });

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    if (intent.status !== "succeeded") {
      await markAttempt(reservationId, paymentIntentId, reservation.totalPrice, "FAILED");
      return { success: false, message: "paymentFailed" };
    }

    // Amount cross-check in the gateway's own unit (integer cents).
    const expectedCents = tomanToStripeCents(
      reservation.totalPrice,
      reservation.exchangeRate,
    );
    if (intent.amount !== expectedCents) {
      await markAttempt(reservationId, paymentIntentId, reservation.totalPrice, "FAILED");
      console.error(
        `stripe amount mismatch: intent ${intent.amount} vs expected ${expectedCents}`,
      );
      return { success: false, message: "amountMismatch" };
    }

    const latestCharge = intent.latest_charge as { id?: string } | null;
    const refId = latestCharge?.id ?? intent.id;

    await markReservationPaid({
      reservationId,
      refId,
      authority: paymentIntentId,
      method: "stripe",
      amountToman: reservation.totalPrice,
    });
    await markAttempt(reservationId, paymentIntentId, reservation.totalPrice, "USED");

    return { success: true };
  } catch (error) {
    console.error("confirmStripePayment error:", error);
    return { success: false, message: "genericError" };
  } finally {
    await releasePaymentLock(reservationId);
  }
}

/** Reconciliation entry for pending Stripe reservations (no webhook yet). */
export async function reconcilePendingStripe(
  reservationId: string,
): Promise<boolean> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { paymentStatus: true, authority: true },
  });
  if (
    !reservation ||
    reservation.paymentStatus !== PaymentStatus.Pending ||
    !reservation.authority
  ) {
    return false;
  }
  const result = await confirmStripePayment(reservationId, reservation.authority);
  return result.success;
}
