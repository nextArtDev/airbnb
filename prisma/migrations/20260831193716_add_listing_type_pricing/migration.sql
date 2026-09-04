-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('nightly', 'monthly', 'sale');

-- AlterTable
ALTER TABLE "listing" ADD COLUMN     "monthlyRent" INTEGER,
ADD COLUMN     "mortgageAmount" INTEGER,
ADD COLUMN     "salePrice" INTEGER,
ADD COLUMN     "type" "ListingType" NOT NULL DEFAULT 'nightly',
ALTER COLUMN "pricePerNight" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "listing_type_idx" ON "listing"("type");

-- DB-level backstop: the pricing shape must match the ad type. App-level zod
-- validation mirrors this rule; the constraint catches anything that slips
-- through (e.g. raw SQL, drift, bugs). Existing rows are all nightly with a
-- price set, so they satisfy it.
ALTER TABLE "listing" ADD CONSTRAINT "listing_price_shape" CHECK (
  ("type" = 'nightly' AND "pricePerNight" IS NOT NULL AND "pricePerNight" > 0)
  OR ("type" = 'monthly' AND ("monthlyRent" > 0 OR "mortgageAmount" > 0))
  OR ("type" = 'sale' AND "salePrice" IS NOT NULL AND "salePrice" > 0)
);
