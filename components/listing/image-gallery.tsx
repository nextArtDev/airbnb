"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const safeImages = images.length > 0 ? images : ["/placeholder.svg"];

  const prev = () => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
        <img
          src={safeImages[index]}
          alt={alt}
          className="size-full object-cover"
        />
        {safeImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={prev}
              aria-label="previous"
              className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={next}
              aria-label="next"
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
            >
              <ChevronRight className="rtl:rotate-180" />
            </Button>
            <span className="absolute bottom-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white" dir="ltr">
              {index + 1} / {safeImages.length}
            </span>
          </>
        )}
      </div>
      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" dir="ltr">
          {safeImages.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === index ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
