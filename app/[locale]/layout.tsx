import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { isRtl, routing } from "@/i18n/routing";
import "../globals.css";

const vazirmatn = localFont({
  src: "../fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  variable: "--font-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: {
      default: t("title"),
      template: t("template"),
    },
    description: t("description"),
  };
}

export default async function LocaleLayout(props: LayoutProps<"/[locale]">) {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const rtl = isRtl(locale);

  return (
    <html
      lang={locale}
      dir={rtl ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${(rtl ? vazirmatn : inter).variable} h-full antialiased font-sans`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>
          {props.children}
          <Toaster position="bottom-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
