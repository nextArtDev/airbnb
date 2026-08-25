"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ListingMap = dynamic(() => import("./listing-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
});

export function MapLoader(props: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  return <ListingMap {...props} />;
}
