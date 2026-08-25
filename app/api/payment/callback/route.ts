import { NextRequest, NextResponse } from "next/server";
import { verifyZarinpalPayment } from "@/lib/actions/payments";

// Zarinpal redirects the browser here after the gateway session ends.
// Authority/Status are read but NEVER trusted - verification is a fresh
// server-to-server call inside verifyZarinpalPayment.
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const Authority = sp.get("Authority");
  const Status = sp.get("Status");
  const reservationId = sp.get("reservationId");

  const destBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const dest = new URL(
    `/fa/trips`,
    destBase,
  );

  if (!Authority || !Status || !reservationId) {
    dest.searchParams.set("payment", "failed");
    return NextResponse.redirect(dest.toString());
  }

  const result = await verifyZarinpalPayment({
    reservationId,
    authority: Authority,
    status: Status,
  });

  if (result.success) {
    dest.searchParams.set(
      "payment",
      result.alreadyPaid ? "already_paid" : "success",
    );
  } else {
    dest.searchParams.set("payment", "failed");
  }

  return NextResponse.redirect(dest.toString());
}
