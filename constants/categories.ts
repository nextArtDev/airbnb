import {
  AirVent,
  Building2,
  Car,
  Coffee,
  CookingPot,
  Flame,
  Gem,
  Home,
  KeyRound,
  Landmark,
  Layers,
  Mountain,
  Sun,
  Tag,
  TentTree,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export interface CategoryDef {
  value:
    | "beach"
    | "villa"
    | "ecoLodge"
    | "traditional"
    | "apartment"
    | "desert"
    | "mountain"
    | "luxury";
  icon: LucideIcon;
}

export const CATEGORIES: CategoryDef[] = [
  { value: "beach", icon: Waves },
  { value: "villa", icon: Home },
  { value: "ecoLodge", icon: TentTree },
  { value: "traditional", icon: Landmark },
  { value: "apartment", icon: Building2 },
  { value: "desert", icon: Sun },
  { value: "mountain", icon: Mountain },
  { value: "luxury", icon: Gem },
];

// Top-level ad types shown as the primary tabs (like airbnb's
// All/Homes/Services/Experiences). "all" is a pseudo-type = no filter.
export type ListingTypeTab = "all" | "nightly" | "monthly" | "sale";

export const LISTING_TYPE_TABS: { value: ListingTypeTab; icon: LucideIcon }[] = [
  { value: "all", icon: Layers },
  { value: "nightly", icon: Home },
  { value: "monthly", icon: KeyRound },
  { value: "sale", icon: Tag },
];

export const LISTING_TYPE_VALUES = ["nightly", "monthly", "sale"] as const;
export type ListingTypeValue = (typeof LISTING_TYPE_VALUES)[number];

export function isListingTypeValue(v: string): v is ListingTypeValue {
  return (LISTING_TYPE_VALUES as readonly string[]).includes(v);
}

export const AMENITY_KEYS = [
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

export type AmenityKey = (typeof AMENITY_KEYS)[number];

// Stable icons per amenity key, translated at display time via messages.
export const AMENITIES: { key: AmenityKey; icon: LucideIcon }[] = [
  { key: "wifi", icon: Wifi },
  { key: "parking", icon: Car },
  { key: "pool", icon: Waves },
  { key: "kitchen", icon: CookingPot },
  { key: "ac", icon: AirVent },
  { key: "heating", icon: Flame },
  { key: "breakfast", icon: Coffee },
  { key: "bbq", icon: UtensilsCrossed },
  { key: "tv", icon: Tv },
  { key: "washer", icon: WashingMachine },
];
