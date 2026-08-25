"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const t = useTranslations("common");
  const [index, setIndex] = useState(0);
  const safeImages = images.length > 0 ? images : ["/placeholder.svg"];

  const prev = () => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
        <Image
          src={safeImages[index]}
          alt={alt}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 912px"
          className="object-cover"
        />
        {safeImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={prev}
              aria-label={t("previous")}
              className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={next}
              aria-label={t("next")}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
            >
              <ChevronRight className="rtl:rotate-180" />
            </Button>
            <span
              className="absolute bottom-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white"
              dir="ltr"
              aria-live="polite"
            >
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
              aria-label={`${alt} — ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === index ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
