import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ListingForm } from "@/components/host/listing-form";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { ListingFormValues } from "@/lib/schemas/listing";
import prisma from "@/lib/prisma";

export default async function EditListingPage(
  props: PageProps<"/[locale]/hostings/[listingId]/edit">,
) {
  const [{ locale }, { listingId }] = await Promise.all([
    props.params,
    props.params,
  ]);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      userId: true,
      title: true,
      description: true,
      category: true,
      type: true,
      amenities: true,
      guestCount: true,
      bedroomCount: true,
      bedCount: true,
      bathroomCount: true,
      pricePerNight: true,
      monthlyRent: true,
      mortgageAmount: true,
      salePrice: true,
      country: true,
      province: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      coverImage: true,
      images: true,
    },
  });
  // Ownership boundary: editing someone else's listing is a 404.
  if (!listing || listing.userId !== user.id) notFound();

  // BigInt DB columns -> plain numbers for the form (JSON-safe).
  const formDefaults = {
    ...listing,
    pricePerNight: listing.pricePerNight ?? undefined,
    monthlyRent:
      listing.type === "monthly" && listing.monthlyRent != null
        ? Number(listing.monthlyRent)
        : undefined,
    mortgageAmount:
      listing.type === "monthly" && listing.mortgageAmount != null
        ? Number(listing.mortgageAmount)
        : undefined,
    salePrice:
      listing.type === "sale" && listing.salePrice != null
        ? Number(listing.salePrice)
        : undefined,
    province: listing.province ?? "",
    address: listing.address ?? "",
  } as Partial<ListingFormValues>;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl flex-1 px-4 py-10">
        <ListingForm listingId={listingId} defaultValues={formDefaults} />
      </main>
      <Footer />
    </>
  );
}
