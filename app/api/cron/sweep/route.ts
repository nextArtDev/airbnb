import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

/**
 * Cron sweep (system cron on VPS):
 *   *\/15 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sweep
 *
 * 1) Reconciles authoritied Pending reservations (money may have moved even
 *    though the browser never came back). Runs BEFORE the stale cancel so
 *    paid-at-gateway-but-abandoned payments are never lost.
 * 2) Cancels stale Pending reservations older than 24h that never initiated
 *    payment (authority is null). Authoritied ones are kept for reconciliation
 *    every cycle.
 */
const STALE_PENDING_HOURS = 24;
const RECONCILE_BATCH = 50;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000);

  // 1) Reconciliation of authoritied pendings — money may have moved
  const { reconcilePendingStripe } = await import("@/lib/actions/payments");
  const { reconcilePendingZarinpal } = await import("@/lib/actions/payments");

  const pending = await prisma.reservation.findMany({
    where: {
      paymentStatus: PaymentStatus.Pending,
      authority: { not: null },
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

  // 2) Cancel stale pendings that never initiated payment (authority is null).
  //    Authoritied ones are safe — they are either reconciled to Paid or
  //    remain Pending with authority preserved for the next cycle.
  const stale = await prisma.reservation.updateMany({
    where: {
      paymentStatus: PaymentStatus.Pending,
      authority: null,
      createdAt: { lt: cutoff },
    },
    data: { paymentStatus: PaymentStatus.Cancelled },
  });

  return NextResponse.json({
    ok: true,
    staleCancelled: stale.count,
    reconciled,
    checked: pending.length,
  });
}