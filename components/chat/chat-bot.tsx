"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { MessageSquare, SendHorizonal, X } from "lucide-react";
import { ChatMessage } from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

const SUGGESTION_KEYS = [
  "howToBook",
  "payments",
  "cancel",
  "becomeHost",
] as const;

export function ChatBot() {
  const t = useTranslations("chatbot");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { messages, append, isLoading, stop } = useChat({
    api: "/api/chat",
    body: { locale },
    onError: (error) => {
      if (error.message.includes("503")) setRequestError(t("notConfigured"));
      else if (error.message.includes("429")) setRequestError(t("rateLimited"));
      else setRequestError(t("error"));
    },
    onResponse: () => setRequestError(null),
  });

  const send = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      void append({ role: "user", content: text.trim() });
    },
    [append, isLoading],
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
    send(input.value);
    input.value = "";
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          aria-label={t("title")}
          className="fixed bottom-5 end-5 z-50 size-14 rounded-full bg-rose-600 p-0 shadow-lg hover:bg-rose-700"
        >
          <MessageSquare className="size-6" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side={locale === "fa" || locale === "ar" ? "left" : "right"}
        className="inset-y-0 flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3 text-start">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{t("title")}</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
            >
              <X />
            </Button>
          </div>
          <SheetDescription className="text-xs">{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" dir="auto">
          {messages.length === 0 && !requestError && (
            <div className="flex flex-col gap-2 pt-2">
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => send(t(`suggestions.${key}`))}
                  className="rounded-xl border bg-card px-3 py-2.5 text-start text-sm transition hover:bg-accent"
                >
                  {t(`suggestions.${key}`)}
                </button>
              ))}
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} />
          ))}
          {isLoading &&
            (messages.length === 0 ||
              messages[messages.length - 1]?.role !== "assistant") && (
              <ChatMessage
                role="assistant"
                content="..."
                pending
              />
            )}
          {requestError && (
            <p role="alert" className="px-1 text-xs text-destructive">
              {requestError}
            </p>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t p-3"
        >
          <input
            name="message"
            dir="auto"
            autoComplete="off"
            maxLength={2000}
            placeholder={t("placeholder")}
            className="h-10 w-full rounded-full border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              onClick={stop}
              aria-label={t("send")}
              className="size-10 shrink-0 rounded-full bg-rose-600 hover:bg-rose-700"
            >
              <Spinner aria-label={t("send")} />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={false}
              aria-label={t("send")}
              className="size-10 shrink-0 rounded-full bg-rose-600 hover:bg-rose-700"
            >
              <SendHorizonal className="rtl:-scale-x-100 size-4" />
            </Button>
          )}
        </form>
        <p className="px-4 pb-3 text-center text-[10px] text-muted-foreground">
          {t("disclaimer")}
        </p>
      </SheetContent>
    </Sheet>
  );
}
