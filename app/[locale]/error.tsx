"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LocaleErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-5xl">⚠️</p>
      <p className="text-lg text-muted-foreground">{t("genericError")}</p>
      <Button onClick={reset} variant="outline" className="rounded-full">
        {t("tryAgain")}
      </Button>
    </main>
  );
}
