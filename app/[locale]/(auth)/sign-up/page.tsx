import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignUpPage(
  props: PageProps<"/[locale]/sign-up">,
) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Iranian users register implicitly through phone OTP verification.
  if (locale === "fa") redirect({ href: "/sign-in", locale });

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <SignUpForm />
    </main>
  );
}
