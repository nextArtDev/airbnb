import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage(props: PageProps<"/[locale]">) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">{t("heroTitle")}</h1>
      <p className="text-muted-foreground">{t("heroSubtitle")}</p>
    </main>
  );
}
