import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-16 dark:bg-black">
      <Tabs defaultValue="phone" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="phone">Phone</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        <TabsContent value="phone" className="mt-4 flex justify-center">
          <PhoneOtpForm />
        </TabsContent>
        <TabsContent value="email" className="mt-4 flex justify-center">
          <SignInForm />
        </TabsContent>
      </Tabs>
      <Link
        href="/sign-up"
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        Create an account
      </Link>
    </main>
  );
}
