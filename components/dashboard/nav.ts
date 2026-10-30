import {
  BedDouble,
  CalendarDays,
  LayoutDashboard,
  MessageSquareText,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Key into the counts object supplied by the layout. */
  countKey?: "users" | "listings" | "reservations" | "reviews";
  /** Shows an alert dot when the matching count is above zero. */
  alertKey?: "pending";
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "مدیریت",
    items: [
      { href: "/dashboard", label: "نمای کلی", icon: LayoutDashboard },
      {
        href: "/dashboard/reservations",
        label: "رزروها",
        icon: CalendarDays,
        countKey: "reservations",
        alertKey: "pending",
      },
      {
        href: "/dashboard/listings",
        label: "اقامتگاه‌ها",
        icon: BedDouble,
        countKey: "listings",
      },
    ],
  },
  {
    title: "مخاطبان",
    items: [
      { href: "/dashboard/users", label: "کاربران", icon: Users, countKey: "users" },
      {
        href: "/dashboard/reviews",
        label: "نظرات",
        icon: MessageSquareText,
        countKey: "reviews",
      },
    ],
  },
];

export const FLAT_NAV = NAV_GROUPS.flatMap((group) => group.items);
