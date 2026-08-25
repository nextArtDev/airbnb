"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { startZarinpalPayment } from "@/lib/actions/payments";

export function ZarinpalPay({ reservationId }: { reservationId: string }) {
  const t = useTranslations("booking");
  const [pending, setPending] = useState(false);

  async function onPay() {
    setPending(true);
    toast.info(t("processingPayment"));
    const result = await startZarinpalPayment(reservationId);
    if (result.success && result.url) {
      window.location.href = result.url;
      return;
    }
    setPending(false);
    toast.error(
      result.message === "alreadyPaid" ? t("alreadyPaid") : t("paymentFailed"),
    );
  }

  return (
    <Button
      onClick={() => void onPay()}
      disabled={pending}
      className="w-full rounded-xl bg-rose-500 hover:bg-rose-600"
    >
      {pending && <Spinner />}
      {t("payWithZarinpal")}
    </Button>
  );
}
