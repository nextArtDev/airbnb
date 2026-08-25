import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { MessageComposer } from "@/components/inbox/message-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatNumber } from "@/lib/format";
import { markConversationRead } from "@/lib/actions/messages";
import prisma from "@/lib/prisma";

const MAX_RENDERED_MESSAGES = 200;

export default async function ConversationThreadPage(
  props: PageProps<"/[locale]/inbox/[conversationId]">,
) {
  const [{ locale }, { conversationId }] = await Promise.all([
    props.params,
    props.params,
  ]);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      guest: { select: { id: true, name: true, image: true } },
      host: { select: { id: true, name: true, image: true } },
      listing: { select: { id: true, title: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: MAX_RENDERED_MESSAGES,
      },
    },
  });

  // Only participants may view the thread.
  if (
    !conversation ||
    (conversation.guestId !== user.id && conversation.hostId !== user.id)
  ) {
    notFound();
  }

  await markConversationRead(conversationId);

  const other =
    conversation.guestId === user.id ? conversation.host : conversation.guest;
  const t = await getTranslations("inbox");

  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-2xl flex-1 flex-col px-4 py-6">
        <div className="mb-4 flex items-center gap-3 border-b pb-4">
          <Avatar className="size-9">
            {other.image ? <AvatarImage src={other.image} alt={other.name} /> : null}
            <AvatarFallback>{(other.name ?? "?").slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold">{other.name}</p>
            {conversation.listing && (
              <Link
                href={`/listings/${conversation.listing.id}`}
                className="block truncate text-xs text-muted-foreground hover:underline"
              >
                {t("about", { title: conversation.listing.title })}
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-2">
          {conversation.messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
          {conversation.messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] space-y-0.5 rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? "rounded-ee-sm bg-rose-500 text-white"
                      : "rounded-es-sm bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                  <p
                    className={`text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    {formatNumber(m.createdAt.getHours(), locale)}:
                    {formatNumber(m.createdAt.getMinutes(), locale)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 mt-2 -mx-4 bg-background px-4">
          <MessageComposer conversationId={conversationId} />
        </div>
      </main>
      <Footer />
    </>
  );
}
