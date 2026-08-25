"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cancelReservation } from "@/lib/actions/reservations";

export function CancelReservationButton({
  reservationId,
  path,
}: {
  reservationId: string;
  path: string;
}) {
  const t = useTranslations("trips");
  const tb = useTranslations("common");
  const [pending, startTransition] = useTransition();

  function onCancel() {
    if (!window.confirm(t("cancelConfirm"))) return;
    startTransition(async () => {
      const result = await cancelReservation(reservationId, path);
      if (result.success) {
        toast.success(t("cancelled"));
      } else {
        toast.error(tb("tryAgain"));
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onCancel}
      disabled={pending}
      className="rounded-full"
    >
      {pending && <Spinner className="size-3" />}
      {t("cancelReservation")}
    </Button>
  );
}
