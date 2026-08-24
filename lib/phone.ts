const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex !== -1) return String(persianIndex);
    return String(ARABIC_DIGITS.indexOf(digit));
  });
}

/**
 * Normalize an Iranian mobile number to E.164 (+989xxxxxxxxx).
 * Accepts 09xxxxxxxxx, 9xxxxxxxxx, 00989xxxxxxxxx, +989xxxxxxxxx,
 * Persian/Arabic digits, and common separators.
 */
export function normalizeIranMobile(input: string): string | null {
  const cleaned = normalizeDigits(input.trim()).replace(/[\s()\-.]/g, "");

  let local = cleaned;
  if (local.startsWith("+98")) local = `0${local.slice(3)}`;
  else if (local.startsWith("0098")) local = `0${local.slice(4)}`;
  else if (local.startsWith("98") && local.length === 12) local = `0${local.slice(2)}`;
  else if (local.startsWith("9") && local.length === 10) local = `0${local}`;

  if (!/^09\d{9}$/.test(local)) return null;

  return `+98${local.slice(1)}`;
}

/** Pretty-print an E.164 number as 0912 345 6789 */
export function formatIranMobile(e164: string): string {
  const normalized = normalizeIranMobile(e164);
  if (!normalized) return e164;
  const local = `0${normalized.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
