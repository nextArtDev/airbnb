import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const t = useTranslations("common");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <p className="text-lg text-muted-foreground">{t("notFound")}</p>
      <Button asChild>
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </main>
  );
}
