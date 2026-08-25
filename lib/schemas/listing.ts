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

export const listingFormSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  category: z.enum(LISTING_CATEGORIES),
  amenities: z.array(z.enum(AMENITY_VALUES)).default([]),
  guestCount: z.int().min(1).max(16),
  bedroomCount: z.int().min(0).max(20),
  bedCount: z.int().min(1).max(40),
  bathroomCount: z.int().min(1).max(10),
  // Toman per night
  pricePerNight: z.number("price must be a number").int().min(50_000).max(2_000_000_000),
  country: z.string().trim().min(2).max(2).default("IR"),
  province: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: z.number("invalid latitude").min(-90).max(90).nullable().optional(),
  longitude: z.number("invalid longitude").min(-180).max(180).nullable().optional(),
  coverImage: z.string().url().min(1),
  images: z.array(z.string().url()).max(9).default([]),
});

export type ListingFormValues = z.input<typeof listingFormSchema>;
