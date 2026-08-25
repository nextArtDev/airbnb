// Single source of truth for FX rates. Never duplicate these values elsewhere -
// a second copy is how mismatched totals happen.
export const FX = {
  // Toman per 1 USD (e.g. "110000" -> $1 = 110,000 Toman)
  usdToToman: Number(process.env.NEXT_PUBLIC_DOLLAR_TO_TOMAN || 100_000),
};

export function tomanToUsd(toman: number): number {
  return toman / FX.usdToToman;
}

/** Rounds a Toman amount to whole units (gateway expects integer Toman). */
export function roundToman(amount: number): number {
  return Math.round(amount);
}

/**
 * Stripe charge amount: integer cents of USD derived from the Toman total.
 * The rate used must be the one locked on the reservation (order-time rate).
 */
export function tomanToStripeCents(
  toman: number,
  orderTimeRate?: number | null,
): number {
  const rate = orderTimeRate ?? FX.usdToToman;
  return Math.round((toman / rate) * 100);
}
