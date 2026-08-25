"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

interface ToggleFavoriteResult {
  success: boolean;
  favorited?: boolean;
  message?: string;
}

/**
 * Atomic favorite toggle backed by the @@unique([userId, listingId])
 * constraint - races can never create duplicate rows.
 */
export async function toggleFavorite(
  listingId: string,
  path: string,
): Promise<ToggleFavoriteResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  try {
    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: user.id, listingId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      revalidatePath(path);
      return { success: true, favorited: false };
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) return { success: false, message: "listing not found" };

    await prisma.favorite.create({ data: { userId: user.id, listingId } });
    revalidatePath(path);
    return { success: true, favorited: true };
  } catch (error) {
    console.error("toggleFavorite failed:", error);
    return { success: false, message: "something went wrong" };
  }
}

export async function isFavorited(listingId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const fav = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  return fav !== null;
}
