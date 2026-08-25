import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { routing } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticPaths = ["", "/sign-in"];
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${base}/${locale}${path}`,
        changeFrequency: path === "" ? "daily" : "monthly",
        priority: path === "" ? 1 : 0.3,
      });
    }
  }

  try {
    const listings = await prisma.listing.findMany({
      where: { published: true },
      select: { id: true, updatedAt: true },
      take: 500,
      orderBy: { updatedAt: "desc" },
    });
    for (const listing of listings) {
      for (const locale of routing.locales) {
        entries.push({
          url: `${base}/${locale}/listings/${listing.id}`,
          lastModified: listing.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // DB unreachable at build time - ship the static entries only.
  }

  return entries;
}
