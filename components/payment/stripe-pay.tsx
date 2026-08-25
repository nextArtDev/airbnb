"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  confirmStripePayment,
  createStripePaymentIntent,
} from "@/lib/actions/payments";

function PayForm({
  reservationId,
  elements,
  stripe,
}: {
  reservationId: string;
  elements: StripeElements;
  stripe: Stripe;
}) {
  const t = useTranslations("booking");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);

    // Client only confirms in-page and reports the intent id; the server
    // re-verifies independently with a fresh retrieve + amount cross-check.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setPending(false);
      toast.error(error.message ?? t("paymentFailed"));
      return;
    }
    if (!paymentIntent) {
      setPending(false);
      toast.error(t("paymentFailed"));
      return;
    }

    const result = await confirmStripePayment(
      reservationId,
      paymentIntent.id,
    );
    setPending(false);

    if (result.success) {
      toast.success(t("paymentSuccess"));
      window.location.href = window.location.pathname.replace(
        /\/checkout\/.*/,
        "/trips",
      ) + "?payment=success";
      return;
    }
    toast.error(
      result.message === "alreadyPaid" ? t("alreadyPaid") : t("paymentFailed"),
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-rose-600 hover:bg-rose-700"
      >
        {pending && <Spinner />}
        {t("payWithCard")}
      </Button>
    </form>
  );
}

export function StripePay({ reservationId }: { reservationId: string }) {
  const t = useTranslations("booking");
  const [state, setState] = useState<{
    clientSecret: string;
    publicKey: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await createStripePaymentIntent(reservationId);
      if (cancelled) return;
      if (result.success && result.clientSecret && result.publicKey) {
        setState({
          clientSecret: result.clientSecret,
          publicKey: result.publicKey,
        });
      } else {
        setError(result.message ?? t("paymentFailed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId, t]);

  const stripePromise = state ? loadStripe(state.publicKey) : null;

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!state || !stripePromise) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: state.clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <CheckoutInner reservationId={reservationId} />
    </Elements>
  );
}

function CheckoutInner({ reservationId }: { reservationId: string }) {
  const stripe = useStripe();
  const elements = useElements();

  if (!stripe || !elements) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }
  return <PayForm reservationId={reservationId} elements={elements} stripe={stripe} />;
}
