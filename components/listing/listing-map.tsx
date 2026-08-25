"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ListingMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

export default function ListingMap({ latitude, longitude, label }: ListingMapProps) {
  useEffect(() => {
    const map = L.map("listing-map", {
      center: [latitude, longitude],
      zoom: 13,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.circleMarker([latitude, longitude], {
      radius: 9,
      color: "#ffffff",
      weight: 2,
      fillColor: "#f43f5e",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(label, { permanent: false, direction: "top" });

    return () => {
      map.remove();
    };
  }, [latitude, longitude, label]);

  return (
    <div
      id="listing-map"
      className="h-72 w-full overflow-hidden rounded-xl border"
      dir="ltr"
    />
  );
}
