"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReviewForm({
  reservationId,
  path,
}: {
  reservationId: string;
  path: string;
}) {
  const t = useTranslations("reviews");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitReview({ reservationId, rating, comment });
      if (result.success) {
        toast.success(t("submitted"));
        setComment("");
      } else if (result.message === "alreadyReviewed") {
        toast.info(t("alreadyReviewed"));
      } else if (result.message === "onlyAfterStay") {
        toast.info(t("onlyAfterStay"));
      } else {
        toast.error(t("submit"));
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-3 rounded-xl border bg-muted/30 p-4"
    >
      <p className="text-sm font-medium">{t("writeReview")}</p>
      <div className="flex items-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${t("ratingLabel")}: ${value}`}
            onClick={() => setRating(value)}
            className="rounded p-0.5 transition hover:scale-110"
          >
            <Star
              className={cn(
                "size-6",
                value <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("commentLabel")}
        rows={3}
        minLength={5}
        required
      />
      <Button type="submit" size="sm" disabled={pending || comment.trim().length < 5}>
        {pending ? t("submit") + "..." : t("submit")}
      </Button>
    </form>
  );
}
