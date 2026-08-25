"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { deleteListing } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const t = useTranslations("hosting");
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(t("deleteConfirmDesc"))) return;
    startTransition(async () => {
      const result = await deleteListing(listingId);
      if (result.success) toast.success(t("deleted"));
      else toast.error(result.message);
    });
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={onDelete}
      disabled={pending}
      aria-label={t("edit")}
      className="text-destructive hover:bg-destructive/10"
    >
      {pending ? <Spinner className="size-3.5" /> : <Trash2 className="size-4" />}
    </Button>
  );
}
