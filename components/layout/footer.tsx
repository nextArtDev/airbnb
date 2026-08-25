import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t bg-muted/40 py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        {t("rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
