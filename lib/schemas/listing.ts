import { z } from "zod";

export const LISTING_CATEGORIES = [
  "beach",
  "villa",
  "ecoLodge",
  "traditional",
  "apartment",
  "desert",
  "mountain",
  "luxury",
] as const;

export const LISTING_TYPES = ["nightly", "monthly", "sale"] as const;

export type ListingTypeValue = (typeof LISTING_TYPES)[number];

export const AMENITY_VALUES = [
  "wifi",
  "parking",
  "pool",
  "kitchen",
  "ac",
  "heating",
  "breakfast",
  "bbq",
  "tv",
  "washer",
] as const;

// Toman price bounds per pricing shape. `monthlyRent`/`mortgageAmount` allow 0:
// 0 rent = full-deposit (رهن کامل) listing, 0 deposit = rent-only listing.
const pricePerNight = z
  .number("price must be a number")
  .int()
  .min(50_000)
  .max(2_000_000_000)
  .nullable()
  .optional();
const monthlyRent = z
  .number("price must be a number")
  .int()
  .min(0)
  .max(1_000_000_000_000)
  .nullable()
  .optional();
const mortgageAmount = z
  .number("price must be a number")
  .int()
  .min(0)
  .max(1_000_000_000_000)
  .nullable()
  .optional();
const salePrice = z
  .number("price must be a number")
  .int()
  .min(1_000_000)
  .max(1_000_000_000_000)
  .nullable()
  .optional();

export const listingFormSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(20).max(5000),
    category: z.enum(LISTING_CATEGORIES),
    type: z.enum(LISTING_TYPES).default("nightly"),
    // Exactly one pricing shape is required, driven by `type` - enforced in
    // superRefine below and mirrored by the listing_price_shape DB constraint.
    pricePerNight,
    monthlyRent,
    mortgageAmount,
    salePrice,
    amenities: z.array(z.enum(AMENITY_VALUES)).default([]),
    guestCount: z.int().min(1).max(16),
    bedroomCount: z.int().min(0).max(20),
    bedCount: z.int().min(1).max(40),
    bathroomCount: z.int().min(1).max(10),
    country: z.string().trim().min(2).max(2).default("IR"),
    province: z.string().trim().max(80).optional().or(z.literal("")),
    city: z.string().trim().min(2).max(80),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    latitude: z.number("invalid latitude").min(-90).max(90).nullable().optional(),
    longitude: z.number("invalid longitude").min(-180).max(180).nullable().optional(),
    coverImage: z
      .string()
      .min(1)
      .refine(
        (v) => /^https?:\/\/|^\/api\/uploads\//.test(v),
        "image must be an absolute URL or /api/uploads/ path",
      ),
    images: z
      .array(
        z
          .string()
          .min(1)
          .refine(
            (v) => /^https?:\/\/|^\/api\/uploads\//.test(v),
            "image must be an absolute URL or /api/uploads/ path",
          ),
      )
      .max(9)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (v.type === "nightly" && (v.pricePerNight == null || v.pricePerNight <= 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["pricePerNight"],
        message: "price per night is required",
      });
    }
    if (v.type === "monthly") {
      const rent = v.monthlyRent ?? 0;
      const deposit = v.mortgageAmount ?? 0;
      if (rent <= 0 && deposit <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["monthlyRent"],
          message: "monthly rent or mortgage deposit is required",
        });
      }
    }
    if (v.type === "sale" && (v.salePrice == null || v.salePrice <= 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "sale price is required",
      });
    }
  });

export type ListingFormValues = z.input<typeof listingFormSchema>;
