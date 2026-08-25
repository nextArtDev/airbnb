"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { deleteFile } from "@/lib/actions/upload";

/**
 * Unconditional admin gate for every mutation in this file. Called at the top
 * of each action - never rely on the layout or page guards alone.
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("forbidden");
  }
  return user;
}

export async function toggleUserBan(
  userId: string,
): Promise<{ success: boolean; banned?: boolean }> {
  await requireAdmin();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  // Admins never ban themselves or other admins.
  if (!target || target.role === "admin") return { success: false };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { banned: true, banReason: "توسط مدیر مسدود شد" },
    select: { banned: true },
  });
  void updated;
  revalidatePath("/dashboard/users");
  return { success: true, banned: true };
}

export async function unbanUser(userId: string): Promise<{ success: boolean }> {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { banned: false, banReason: null, banExpires: null },
  });
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function setListingPublished(
  listingId: string,
  published: boolean,
): Promise<{ success: boolean }> {
  await requireAdmin();
  await prisma.listing.update({
    where: { id: listingId },
    data: { published },
  });
  revalidatePath("/dashboard/listings");
  revalidatePath("/");
  return { success: true };
}

export async function adminDeleteListing(
  listingId: string,
): Promise<{ success: boolean }> {
  await requireAdmin();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { coverImage: true, images: true },
  });
  if (!listing) return { success: false };

  await prisma.listing.delete({ where: { id: listingId } });

  const keys = [listing.coverImage, ...listing.images]
    .filter((u) => u.startsWith("/api/uploads/"))
    .map((u) => u.replace("/api/uploads/", ""));
  for (const key of keys) {
    try {
      await deleteFile(key);
    } catch {
      // best effort
    }
  }
  revalidatePath("/dashboard/listings");
  revalidatePath("/");
  return { success: true };
}

export async function cancelStaleReservation(
  reservationId: string,
): Promise<{ success: boolean }> {
  await requireAdmin();
  const result = await prisma.reservation.updateMany({
    where: {
      id: reservationId,
      paymentStatus: PaymentStatus.Pending, // only pendings; refunds are gateway calls
    },
    data: { paymentStatus: PaymentStatus.Cancelled, authority: null },
  });
  revalidatePath("/dashboard/reservations");
  return { success: result.count > 0 };
}

export async function adminDeleteReview(
  reviewId: string,
): Promise<{ success: boolean }> {
  await requireAdmin();
  await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath("/dashboard/reviews");
  return { success: true };
}
