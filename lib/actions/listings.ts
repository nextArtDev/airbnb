"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { deleteFile, uploadFile } from "@/lib/actions/upload";
import { listingFormSchema, type ListingTypeValue } from "@/lib/schemas/listing";

export interface MutationResult {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

const MAX_IMAGES = 10;

/**
 * Nulls out pricing fields that don't belong to the chosen ad type so the
 * listing_price_shape DB CHECK constraint always holds. Long-term amounts are
 * BigInt columns, so the (JSON-transported) numbers are converted here.
 */
function priceFields(type: ListingTypeValue, data: {
  pricePerNight?: number | null;
  monthlyRent?: number | null;
  mortgageAmount?: number | null;
  salePrice?: number | null;
}) {
  const big = (v: number | null | undefined) => BigInt(Math.trunc(v ?? 0));
  return {
    pricePerNight: type === "nightly" ? data.pricePerNight : null,
    monthlyRent: type === "monthly" ? big(data.monthlyRent) : null,
    mortgageAmount: type === "monthly" ? big(data.mortgageAmount) : null,
    salePrice: type === "sale" ? big(data.salePrice) : null,
  };
}

/** Uploads image files to local disk; returns served URLs. */
export async function uploadListingImages(
  formData: FormData,
): Promise<{ success: boolean; urls?: string[]; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { success: false, message: "no files" };
  if (files.length > MAX_IMAGES) return { success: false, message: "too many files" };

  try {
    const urls: string[] = [];
    for (const file of files) {
      const { url } = await uploadFile(file);
      urls.push(url);
    }
    return { success: true, urls };
  } catch (error) {
    console.error("uploadListingImages failed:", error);
    return { success: false, message: "upload failed" };
  }
}

export async function createListing(input: unknown): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    return { success: false, message: "invalid" };
  }
  const data = parsed.data;

  try {
    // Verify uploaded images actually belong to this host's uploads.
    const allImages = [data.coverImage, ...data.images];
    for (const url of allImages) {
      if (!url.startsWith("/api/uploads/")) {
        return { success: false, message: "invalidImage" };
      }
    }

    const listing = await prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        type: data.type,
        ...priceFields(data.type, data),
        amenities: data.amenities,
        guestCount: data.guestCount,
        bedroomCount: data.bedroomCount,
        bedCount: data.bedCount,
        bathroomCount: data.bathroomCount,
        country: data.country,
        province: data.province || null,
        city: data.city,
        address: data.address || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        coverImage: data.coverImage,
        images: data.images,
        userId: user.id,
      },
      select: { id: true },
    });

    revalidatePath("/");
    revalidatePath("/hostings");
    return {
      success: true,
      redirectTo: `/hostings/${listing.id}/edit`,
      message: "created",
    };
  } catch (error) {
    console.error("createListing failed:", error);
    return { success: false, message: "serverError" };
  }
}

export async function updateListing(
  listingId: string,
  input: unknown,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "invalid" };
  const data = parsed.data;

  try {
    // A listing that already holds bookings can't switch ad type - its
    // reservation history is meaningless for another pricing shape.
    const existing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true, type: true },
    });
    if (!existing || existing.userId !== user.id) {
      return { success: false, message: "notFound" };
    }
    if (existing.type !== data.type) {
      const activeReservations = await prisma.reservation.count({
        where: {
          listingId,
          paymentStatus: { in: [PaymentStatus.Pending, PaymentStatus.Paid] },
        },
      });
      if (activeReservations > 0) {
        return { success: false, message: "hasReservations" };
      }
    }

    // updateMany scoped by userId doubles as the ownership check.
    const result = await prisma.listing.updateMany({
      where: { id: listingId, userId: user.id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        type: data.type,
        ...priceFields(data.type, data),
        amenities: data.amenities,
        guestCount: data.guestCount,
        bedroomCount: data.bedroomCount,
        bedCount: data.bedCount,
        bathroomCount: data.bathroomCount,
        country: data.country,
        province: data.province || null,
        city: data.city,
        address: data.address || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        coverImage: data.coverImage,
        images: data.images,
      },
    });
    if (result.count === 0) return { success: false, message: "notFound" };

    revalidatePath("/");
    revalidatePath(`/listings/${listingId}`);
    revalidatePath("/hostings");
    return { success: true, message: "updated" };
  } catch (error) {
    console.error("updateListing failed:", error);
    return { success: false, message: "serverError" };
  }
}

export async function deleteListing(
  listingId: string,
): Promise<MutationResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  try {
    // Collect image keys before deletion so disk cleanup can follow.
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true, coverImage: true, images: true },
    });
    if (!listing || listing.userId !== user.id) {
      return { success: false, message: "notFound" };
    }

    await prisma.listing.delete({ where: { id: listingId } });

    // Best-effort disk cleanup of this listing's uploads.
    const keys = [listing.coverImage, ...listing.images]
      .filter((u) => u.startsWith("/api/uploads/"))
      .map((u) => u.replace("/api/uploads/", ""));
    for (const key of keys) {
      try {
        await deleteFile(key);
      } catch {
        // ignore individual cleanup failures
      }
    }

    revalidatePath("/");
    revalidatePath("/hostings");
    return { success: true, message: "deleted" };
  } catch (error) {
    console.error("deleteListing failed:", error);
    return { success: false, message: "serverError" };
  }
}
