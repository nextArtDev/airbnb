"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { toggleFavorite } from "@/lib/actions/favorites";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

interface HeartButtonProps {
  listingId: string;
  initialFavorited: boolean;
  path: string;
  /** Passed from the server - the session cookie is httpOnly and invisible to JS. */
  authenticated: boolean;
}

export function HeartButton({
  listingId,
  initialFavorited,
  path,
  authenticated,
}: HeartButtonProps) {
  const t = useTranslations("favorites");
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) {
      router.push("/sign-in");
      return;
    }

    // Optimistic flip; corrected by the server result.
    setFavorited((v) => !v);
    startTransition(async () => {
      const res = await toggleFavorite(listingId, path);
      if (!res.success) {
        setFavorited(initialFavorited);
        return;
      }
      setFavorited(res.favorited ?? false);
      toast.success(res.favorited ? t("added") : t("removed"));
    });
  }

  return (
    <button
      type="button"
      aria-label={t("title")}
      aria-pressed={favorited}
      onClick={onClick}
      disabled={pending}
      className="absolute end-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/50 disabled:opacity-70 motion-reduce:transition-none"
    >
      {pending ? (
        <Spinner className="size-4" />
      ) : (
        <Heart
          className={cn(
            "size-[18px] drop-shadow",
            favorited && "fill-rose-500 text-rose-500",
          )}
        />
      )}
    </button>
  );
}
