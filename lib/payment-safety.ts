import "server-only";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const LOCK_TTL_MS = 5 * 60 * 1000;

export async function cleanupExpiredLocks() {
  try {
    await prisma.paymentLock.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // best effort
  }
}

/**
 * Distributed lock backed by PaymentLock.reservationId unique constraint.
 * ALWAYS await this - an un-awaited Promise is truthy and silently passes.
 */
export async function acquirePaymentLock(
  reservationId: string,
  authority: string,
): Promise<boolean> {
  try {
    await prisma.paymentLock.create({
      data: {
        reservationId,
        authority,
        expiresAt: new Date(Date.now() + LOCK_TTL_MS),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function releasePaymentLock(reservationId: string) {
  try {
    await prisma.paymentLock.deleteMany({ where: { reservationId } });
  } catch {
    // best effort - lock expires on its own anyway
  }
}

/** Replay guard: a SUCCESS/USED attempt for the same authority never reruns. */
export async function validatePaymentAttempt(
  reservationId: string,
  authority: string,
  amount: number,
): Promise<boolean> {
  const existing = await prisma.paymentAttempt.findUnique({
    where: { reservationId_authority: { reservationId, authority } },
  });
  if (!existing) return true;
  return !(existing.status === "SUCCESS" || existing.status === "USED");
}

export async function markAttempt(
  reservationId: string,
  authority: string,
  amount: number,
  status: "PENDING" | "SUCCESS" | "FAILED" | "USED",
) {
  await prisma.paymentAttempt.upsert({
    where: { reservationId_authority: { reservationId, authority } },
    create: { reservationId, authority, amount, status },
    update: { status },
  });
}

/** Caps payment initiation frequency per user (default 20/hour). */
export async function checkPaymentRateLimit(userId: string, max = 20) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.paymentRateLimit.count({
    where: { userId, createdAt: { gt: oneHourAgo } },
  });
  if (count >= max) throw new Error("rate limit exceeded");
  await prisma.paymentRateLimit.create({ data: { userId } });
}

/** Ownership + session gate reused by every payment action. */
export async function requireUserForPayment() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("unauthorized");
  return user;
}
