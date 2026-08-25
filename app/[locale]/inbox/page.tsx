import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatDate } from "@/lib/format";
import { getOrCreateConversation } from "@/lib/actions/messages";
import prisma from "@/lib/prisma";

export default async function InboxPage(props: PageProps<"/[locale]/inbox">) {
  const [{ locale }, sp] = await Promise.all([props.params, props.searchParams]);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  // Deep link from listing page (?listing=<listingId>): resolve or create the
  // conversation, then jump straight into the thread.
  const listingId = typeof sp.listing === "string" ? sp.listing : null;
  if (listingId) {
    const result = await getOrCreateConversation(listingId);
    if (result.success && result.redirectTo) {
      redirect(`/${locale}${result.redirectTo}`);
    }
  }

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ guestId: user.id }, { hostId: user.id }] },
    orderBy: { updatedAt: "desc" },
    include: {
      guest: { select: { id: true, name: true, image: true } },
      host: { select: { id: true, name: true, image: true } },
      listing: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const t = await getTranslations("inbox");
  const userId = user.id;

  function otherParticipant(c: (typeof conversations)[number]) {
    return c.guestId === userId ? c.host : c.guest;
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
        {conversations.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {conversations.map((c) => {
              const other = otherParticipant(c);
              const last = c.messages[0];
              return (
                <li key={c.id}>
                  <Link
                    href={`/inbox/${c.id}`}
                    className="flex items-center gap-3 p-4 transition hover:bg-accent"
                  >
                    <Avatar className="size-10">
                      {other.image ? (
                        <AvatarImage src={other.image} alt={other.name} />
                      ) : null}
                      <AvatarFallback>
                        {(other.name ?? "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium">{other.name}</span>
                        {last && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(last.createdAt, locale)}
                          </span>
                        )}
                      </div>
                      {c.listing && (
                        <p className="truncate text-xs text-muted-foreground">
                          {t("about", { title: c.listing.title })}
                        </p>
                      )}
                      <p className="truncate text-sm text-muted-foreground">
                        {last?.body ?? ""}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
