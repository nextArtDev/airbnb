"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export interface ConversationResult {
  success: boolean;
  conversationId?: string;
  redirectTo?: string;
  message?: string;
}

/** Guest opens a conversation about a listing with its host. */
export async function getOrCreateConversation(
  listingId: string,
): Promise<ConversationResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { userId: true },
  });
  if (!listing) return { success: false, message: "notFound" };
  if (listing.userId === user.id) {
    return { success: false, message: "selfConversation" };
  }

  let conversation = await prisma.conversation.findFirst({
    where: { listingId, guestId: user.id },
    select: { id: true },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { listingId, guestId: user.id, hostId: listing.userId },
      select: { id: true },
    });
  }

  return {
    success: true,
    conversationId: conversation.id,
    redirectTo: `/inbox/${conversation.id}`,
  };
}

export interface SendResult {
  success: boolean;
  message?: string;
}

export async function sendMessage(
  conversationId: string,
  body: string,
  path: string,
): Promise<SendResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "unauthorized" };

  const text = body.trim().slice(0, 4000);
  if (text.length === 0) return { success: false, message: "empty" };

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, guestId: true, hostId: true },
  });
  // Only participants may post.
  if (!conversation || (conversation.guestId !== user.id && conversation.hostId !== user.id)) {
    return { success: false, message: "notFound" };
  }

  await prisma.message.create({
    data: { conversationId, senderId: user.id, body: text },
  });

  revalidatePath(path);
  return { success: true };
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, guestId: true, hostId: true },
  });
  if (!conversation || (conversation.guestId !== user.id && conversation.hostId !== user.id)) return;

  await prisma.message.updateMany({
    where: {
      conversationId,
      readAt: null,
      senderId: { not: user.id },
    },
    data: { readAt: new Date() },
  });
}
