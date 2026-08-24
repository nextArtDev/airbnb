const MELI_PAYAMAK_SEND_URL =
  "https://rest.payamak-panel.com/api/SendSMS/SendSMS";

interface MeliPayamakResponse {
  Value?: string;
  RetStatus?: number;
  StrRetStatus?: string;
}

export interface SendSmsResult {
  delivered: boolean;
  messageId?: string;
}

/**
 * Send an SMS via Meli Payamak (payamak-panel.com).
 *
 * When MELI_PAYAMAK_USERNAME / MELI_PAYAMAK_PASSWORD / MELI_PAYAMAK_FROM
 * are empty, no real request is made — the message is logged instead so
 * development flows keep working without credentials.
 */
export async function sendSms(to: string, text: string): Promise<SendSmsResult> {
  const username = process.env.MELI_PAYAMAK_USERNAME;
  const password = process.env.MELI_PAYAMAK_PASSWORD;
  const from = process.env.MELI_PAYAMAK_FROM;

  if (!username || !password || !from) {
    console.log(`[sms] stub (no Meli Payamak credentials) -> to=${to} text="${text}"`);
    return { delivered: false };
  }

  const res = await fetch(MELI_PAYAMAK_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username,
      password,
      to,
      from,
      text,
      isFlash: "false",
    }),
  });

  if (!res.ok) {
    throw new Error(`Meli Payamak HTTP ${res.status}`);
  }

  const data = (await res.json()) as MeliPayamakResponse;
  if (data.RetStatus !== 1 || data.StrRetStatus !== "Ok") {
    throw new Error(
      `Meli Payamak rejected message: RetStatus=${data.RetStatus} (${data.StrRetStatus ?? "unknown"})`,
    );
  }

  return { delivered: true, messageId: data.Value };
}
