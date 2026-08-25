"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { FX, roundToman } from "@/lib/fx";

const createReservationSchema = z.object({
  listingId: z.string().min(1),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.int().min(1).max(16),
});

export interface ActionResult {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/**
 * Creates a Pending reservation that holds its dates. Price is derived from
 * the DB at this moment - never accepted from the client. The exchange rate
 * is locked here so the later Stripe charge matches exactly.
 */
export async function createReservation(
  input: unknown,
  locale: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "invalid input" };
  const { listingId, checkIn, checkOut, guests } = parsed.data;

  if (checkOut <= checkIn) return { success: false, message: "dateError" };
  if (startOfDay(checkIn) < startOfDay(new Date())) {
    return { success: false, message: "pastDateError" };
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        userId: true,
        guestCount: true,
        pricePerNight: true,
        published: true,
      },
    });
    if (!listing || !listing.published) {
      return { success: false, message: "notFound" };
    }
    if (listing.userId === user.id) {
      return { success: false, message: "selfBookingError" };
    }
    if (guests > listing.guestCount) {
      return { success: false, message: "guestCountError" };
    }

    // Overlap guard: Pending holds block too. The transaction below re-checks.
    const overlap = await prisma.reservation.count({
      where: {
        listingId,
        paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] },
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
    });
    if (overlap > 0) return { success: false, message: "overlapError" };

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice = roundToman(nights * listing.pricePerNight);

    const created = await prisma.$transaction(async (tx) => {
      // Re-check overlap inside the transaction to narrow the race window.
      const stillFree = await tx.reservation.count({
        where: {
          listingId,
          paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] },
          startDate: { lt: checkOut },
          endDate: { gt: checkIn },
        },
      });
      if (stillFree > 0) throw new Error("overlapError");

      return tx.reservation.create({
        data: {
          listingId,
          userId: user.id,
          startDate: checkIn,
          endDate: checkOut,
          nights,
          guests,
          totalPrice,
          // Lock FX at creation time; Stripe derives cents from this exact rate.
          exchangeRate: FX.usdToToman,
          paymentStatus: PaymentStatus.Pending,
        },
        select: { id: true },
      });
    });

    return {
      success: true,
      redirectTo: `/${locale}/checkout/${created.id}`,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "overlapError") {
      return { success: false, message: "overlapError" };
    }
    console.error("createReservation failed:", error);
    return { success: false, message: "genericError" };
  }
}

/**
 * Guest-initiated cancellation. Pending = no money moved, safe to flip.
 * Paid cancellations are flipped here as bookkeeping; an actual refund must
 * go through the real gateway API (admin/manual process in v1).
 */
export async function cancelReservation(
  reservationId: string,
  path: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  try {
    const result = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        userId: user.id,
        paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] },
        startDate: { gt: new Date() },
      },
      data: { paymentStatus: PaymentStatus.Cancelled, authority: null },
    });

    if (result.count === 0) return { success: false, message: "genericError" };

    revalidatePath(path);
    return { success: true };
  } catch (error) {
    console.error("cancelReservation failed:", error);
    return { success: false, message: "genericError" };
  }
}
