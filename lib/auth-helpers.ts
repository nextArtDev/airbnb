import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Canonical session bridge. Returns a safe user subset or null - never throws
 * and never rejects. Server actions must always null-check the result even
 * when a page-level guard exists: actions are directly callable.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phoneNumber: true,
      role: true,
      banned: true,
    },
  });
});
