import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

/**
 * Cron sweep (system cron on VPS):
 *   *\/15 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sweep
 *
 * 1) Cancels stale Pending reservations older than 24h (frees held dates).
 * 2) Re-verifies Pending reservations that carry an authority (money may have
 *    moved even though the browser never came back).
 */
const STALE_PENDING_HOURS = 24;
const RECONCILE_BATCH = 50;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) Stale pending sweep
  const cutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000);
  const stale = await prisma.reservation.updateMany({
    where: {
      paymentStatus: PaymentStatus.Pending,
      createdAt: { lt: cutoff },
    },
    data: { paymentStatus: PaymentStatus.Cancelled, authority: null },
  });

  // 2) Reconciliation of authoritied pendings
  const { reconcilePendingStripe } = await import("@/lib/actions/payments");
  const { reconcilePendingZarinpal } = await import("@/lib/actions/payments");

  const pending = await prisma.reservation.findMany({
    where: {
      paymentStatus: PaymentStatus.Pending,
      authority: { not: null },
      updatedAt: { gt: cutoff }, // fresh ones only; older ones were cancelled above
    },
    select: { id: true, paymentMethod: true },
    take: RECONCILE_BATCH,
  });

  let reconciled = 0;
  for (const r of pending) {
    try {
      const ok =
        r.paymentMethod === "stripe"
          ? await reconcilePendingStripe(r.id)
          : await reconcilePendingZarinpal(r.id);
      if (ok) reconciled++;
    } catch (error) {
      console.error(`reconcile failed for ${r.id}:`, error);
    }
  }

  return NextResponse.json({
    ok: true,
    staleCancelled: stale.count,
    reconciled,
    checked: pending.length,
  });
}
