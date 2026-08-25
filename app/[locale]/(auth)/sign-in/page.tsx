import { setRequestLocale } from "next-intl/server";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage(
  props: PageProps<"/[locale]/sign-in">,
) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      {locale === "fa" ? <PhoneOtpForm /> : <SignInForm />}
    </main>
  );
}
