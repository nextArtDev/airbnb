"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { sendMessage } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const t = useTranslations("inbox");
  const tc = useTranslations("common");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const path = `/inbox/${conversationId}`;

    startTransition(async () => {
      const result = await sendMessage(conversationId, text, path);
      if (result.success) {
        setBody("");
        router.refresh();
      } else {
        toast.error(tc("tryAgain"));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 border-t p-3">
      <Input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("placeholder")}
        maxLength={4000}
      />
      <Button
        type="submit"
        size="icon"
        disabled={pending || !body.trim()}
        aria-label={t("send")}
        className="shrink-0 rounded-full bg-rose-600 hover:bg-rose-700"
      >
        {pending ? <Spinner className="size-4" /> : <SendHorizonal className="rtl:-scale-x-100 size-4" />}
      </Button>
    </form>
  );
}
