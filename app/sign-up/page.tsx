import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <SignUpForm />
    </main>
  );
}
