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

// ---------------------------------------------------------------------------
// Bulk actions. Every one re-validates admin, caps the batch size and returns
// the affected count so the toolbar can report what actually changed. Each is
// exposed with the exact `(ids: string[]) => Promise<Result>` shape a client
// component can receive as a prop - server actions cannot be wrapped in a
// closure at the call site.
// ---------------------------------------------------------------------------

export type BulkResult = { success: boolean; count: number };

const MAX_BULK = 100;

function sanitizeIds(ids: string[]) {
  return [
    ...new Set(ids.filter((id) => typeof id === "string" && id.length > 0)),
  ].slice(0, MAX_BULK);
}

async function setPublished(ids: string[], published: boolean): Promise<BulkResult> {
  const safe = sanitizeIds(ids);
  if (safe.length === 0) return { success: false, count: 0 };

  const result = await prisma.listing.updateMany({
    where: { id: { in: safe } },
    data: { published },
  });
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true, count: result.count };
}

export async function bulkPublishListings(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  return setPublished(ids, true);
}

export async function bulkUnpublishListings(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  return setPublished(ids, false);
}

export async function bulkCancelReservations(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const safe = sanitizeIds(ids);
  if (safe.length === 0) return { success: false, count: 0 };

  // Only pendings: refunds must go through the gateway, never a bulk update.
  const result = await prisma.reservation.updateMany({
    where: { id: { in: safe }, paymentStatus: PaymentStatus.Pending },
    data: { paymentStatus: PaymentStatus.Cancelled, authority: null },
  });
  revalidatePath("/dashboard/reservations");
  revalidatePath("/dashboard");
  return { success: true, count: result.count };
}

export async function bulkDeleteReviews(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const safe = sanitizeIds(ids);
  if (safe.length === 0) return { success: false, count: 0 };

  const result = await prisma.review.deleteMany({ where: { id: { in: safe } } });
  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard");
  return { success: true, count: result.count };
}

async function setBanned(ids: string[], banned: boolean): Promise<BulkResult> {
  const safe = sanitizeIds(ids);
  if (safe.length === 0) return { success: false, count: 0 };

  // Admins are never bulk-banned.
  const result = await prisma.user.updateMany({
    where: { id: { in: safe }, role: { not: "admin" } },
    data: banned
      ? { banned: true, banReason: "توسط مدیر مسدود شد" }
      : { banned: false, banReason: null, banExpires: null },
  });
  revalidatePath("/dashboard/users");
  return { success: true, count: result.count };
}

export async function bulkBanUsers(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  return setBanned(ids, true);
}

export async function bulkUnbanUsers(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  return setBanned(ids, false);
}
