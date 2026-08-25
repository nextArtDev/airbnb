import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, UserMenu } from "@/components/layout/user-menu";

export async function Navbar() {
  const t = useTranslations("nav");
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="text-xl font-bold text-rose-500 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {t("brand")}
        </Link>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          {user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
              >
                <Link href="/hostings">{t("becomeHost")}</Link>
              </Button>
              <UserMenu userName={user.name ?? user.id} userImage={user.image} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/sign-in">{t("signIn")}</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-rose-500 hover:bg-rose-600"
              >
                <Link href="/sign-up">{t("signUp")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
