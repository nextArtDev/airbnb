import "server-only";

// The ONLY place a reservation's paymentStatus may become "Paid".
//
// Why `server-only` instead of `use server`: a "use server" export is a public
// RPC endpoint by definition - anyone with devtools could mark any reservation
// paid without paying. This module cannot be imported from client code at all.

import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

interface MarkPaidInput {
  reservationId: string;
  refId: string; // Zarinpal ref_id / Stripe charge id / PayPal capture id
  authority: string; // gateway reference stored during initiation
  method: "zarinpal" | "stripe";
  amountToman: number; // re-read amount passed by caller for the final check
}

export interface MarkPaidResult {
  ok: boolean;
  alreadyPaid?: boolean;
}

export async function markReservationPaid(
  input: MarkPaidInput,
): Promise<MarkPaidResult> {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      select: {
        id: true,
        totalPrice: true,
        paymentStatus: true,
      },
    });

    // Idempotency: a retried verify is normal, not an error.
    if (!reservation || reservation.paymentStatus === PaymentStatus.Paid) {
      return;
    }

    // Final amount agreement between what we verified and what is stored.
    if (reservation.totalPrice !== input.amountToman) {
      throw new Error("amount mismatch between verification and order");
    }

    await tx.reservation.update({
      where: { id: input.reservationId },
      data: {
        paymentStatus: PaymentStatus.Paid,
        paidAt: new Date(),
      },
    });

    await tx.paymentDetails.upsert({
      where: { reservationId: input.reservationId },
      create: {
        reservationId: input.reservationId,
        authority: input.authority,
        transactionId: input.refId || null,
        method: input.method,
        status: "Paid",
        amount: input.amountToman,
        currency: "IRT",
      },
      update: {
        transactionId: input.refId || null,
        status: "Paid",
      },
    });

    await tx.paymentAttempt.updateMany({
      where: { reservationId: input.reservationId, authority: input.authority },
      data: { status: "SUCCESS" },
    });
  });

  const fresh = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
    select: { paymentStatus: true },
  });

  if (fresh?.paymentStatus === PaymentStatus.Paid) return { ok: true };
  return { ok: true, alreadyPaid: true };
}
