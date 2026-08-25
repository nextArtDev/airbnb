"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const reviewSchema = z.object({
  reservationId: z.string().min(1),
  rating: z.int().min(1).max(5),
  comment: z.string().trim().min(5).max(2000),
});

export interface ReviewResult {
  success: boolean;
  message?: string;
}

/**
 * A guest may review only their own completed, paid stay - once per listing.
 */
export async function submitReview(input: unknown): Promise<ReviewResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "invalid" };
  const { reservationId, rating, comment } = parsed.data;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        userId: true,
        listingId: true,
        endDate: true,
        paymentStatus: true,
      },
    });

    if (!reservation || reservation.userId !== user.id) {
      return { success: false, message: "notFound" };
    }
    if (reservation.paymentStatus !== PaymentStatus.Paid) {
      return { success: false, message: "onlyAfterStay" };
    }
    if (reservation.endDate > new Date()) {
      return { success: false, message: "onlyAfterStay" };
    }

    const existing = await prisma.review.findFirst({
      where: { listingId: reservation.listingId, userId: user.id },
      select: { id: true },
    });
    if (existing) return { success: false, message: "alreadyReviewed" };

    await prisma.review.create({
      data: {
        rating,
        comment,
        userId: user.id,
        listingId: reservation.listingId,
        reservationId,
      },
    });

    revalidatePath(`/listings/${reservation.listingId}`);
    revalidatePath("/trips");
    return { success: true };
  } catch (error) {
    console.error("submitReview failed:", error);
    return { success: false, message: "server error" };
  }
}
