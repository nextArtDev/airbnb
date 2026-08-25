import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ListingCard } from "@/components/listing/listing-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { averageRating, getListings } from "@/lib/queries/listings";
import prisma from "@/lib/prisma";

export default async function FavoritesPage(
  props: PageProps<"/[locale]/favorites">,
) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations("favorites");
  const th = await getTranslations("home");
  const user = await getCurrentUser();

  const favorites = user
    ? await prisma.favorite.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { listingId: true },
      })
    : [];

  const favoriteIds = favorites.map((f) => f.listingId);
  const all = favoriteIds.length > 0 ? await getListings() : [];
  // Preserve the order in which items were favorited.
  const ordered = favoriteIds
    .map((id) => all.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
        {ordered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-muted-foreground">{t("empty")}</p>
            <Button asChild className="rounded-full bg-rose-500 hover:bg-rose-600">
              <Link href="/">{th("allListings")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ordered.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                rating={averageRating(listing.reviews)}
                favorited
                authenticated
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
