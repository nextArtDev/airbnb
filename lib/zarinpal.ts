import "server-only";

// Zarinpal v4 REST client - raw fetch, no third-party dependency.
// Golden rule: browser-supplied Authority/Status are NEVER proof of payment.
// Only a fresh server-to-server verify.json call with code 100/101 counts.

const IS_SANDBOX = process.env.NODE_ENV !== "production";

const BASE = IS_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/v4/payment/"
  : "https://payment.zarinpal.com/pg/v4/payment/";

const START_PAY_BASE = IS_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/StartPay/"
  : "https://www.zarinpal.com/pg/StartPay/";

// 1 -> merchant key charges Toman directly (stored amount passes through)
// 10 -> merchant key charges Rial; multiply once at the gateway boundary
const AMOUNT_MULTIPLIER = Number(process.env.GATEWAY_AMOUNT_MULTIPLIER || 1);

function getMerchantId(): string {
  const key = process.env.ZARINPAL_KEY;
  if (!key) throw new Error("ZARINPAL_KEY is not configured");
  return key;
}

/** Stored-Toman -> gateway-unit conversion. Single conversion point. */
export function toGatewayAmount(tomanAmount: number): {
  amount: number;
  currency: "IRT" | "IRR";
} {
  return {
    amount: Math.round(tomanAmount * AMOUNT_MULTIPLIER),
    currency: AMOUNT_MULTIPLIER === 10 ? "IRR" : "IRT",
  };
}

export interface PaymentRequestInput {
  amountToman: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
  email?: string;
  orderId: string;
}

export type PaymentRequestResult =
  | { ok: true; authority: string; url: string }
  | { ok: false; code: number; message?: string };

export async function requestPayment(
  input: PaymentRequestInput,
): Promise<PaymentRequestResult> {
  const { amount, currency } = toGatewayAmount(input.amountToman);

  try {
    const res = await fetch(`${BASE}request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: getMerchantId(),
        amount,
        currency,
        callback_url: input.callbackUrl,
        description: input.description,
        metadata: {
          mobile: input.mobile,
          email: input.email,
          order_id: input.orderId,
        },
      }),
      cache: "no-store",
    });
    const data = await res.json();
    const code = data?.data?.code ?? data?.errors?.code ?? -1;

    if (code !== 100) {
      return {
        ok: false,
        code,
        message: data?.errors?.message ?? data?.data?.message,
      };
    }

    const authority: string = data.data.authority;
    return { ok: true, authority, url: `${START_PAY_BASE}${authority}` };
  } catch (error) {
    console.error("zarinpal requestPayment failed:", error);
    return { ok: false, code: -1, message: "network error" };
  }
}

export interface PaymentVerifyInput {
  amountToman: number;
  authority: string;
}

export type PaymentVerifyResult =
  | {
      ok: true;
      refId: string;
      cardPan?: string;
      cardHash?: string;
      alreadyVerified: boolean;
    }
  | { ok: false; code: number; message?: string };

/**
 * Server-to-server verification. code 100 = freshly settled, 101 = verified
 * before (idempotent success). Anything else means no money moved.
 */
export async function verifyWithGateway(
  input: PaymentVerifyInput,
): Promise<PaymentVerifyResult> {
  const { amount, currency } = toGatewayAmount(input.amountToman);

  try {
    const res = await fetch(`${BASE}verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: getMerchantId(),
        amount,
        currency,
        authority: input.authority,
      }),
      cache: "no-store",
    });
    const data = await res.json();
    const code = data?.data?.code ?? data?.errors?.code ?? -1;

    if (code !== 100 && code !== 101) {
      return {
        ok: false,
        code,
        message: data?.errors?.message ?? data?.data?.message,
      };
    }

    return {
      ok: true,
      alreadyVerified: code === 101,
      refId: String(data.data.ref_id ?? ""),
      cardPan: data.data.card_pan,
      cardHash: data.data.card_hash,
    };
  } catch (error) {
    console.error("zarinpal verify failed:", error);
    return { ok: false, code: -1, message: "network error" };
  }
}

/** Abandoned payments still sitting unverified at the gateway. */
export async function listUnverified(): Promise<
  { ok: true; authorities: string[] } | { ok: false }
> {
  try {
    const res = await fetch(`${BASE}unVerified.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ merchant_id: getMerchantId() }),
      cache: "no-store",
    });
    const data = await res.json();
    if (data?.data?.code !== 100) return { ok: false };
    const sessions: { authority: string }[] = data.data.authorities ?? [];
    return { ok: true, authorities: sessions.map((s) => s.authority) };
  } catch {
    return { ok: false };
  }
}
