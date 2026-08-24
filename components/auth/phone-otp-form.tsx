"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { formatIranMobile, normalizeIranMobile } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";

const RESEND_SECONDS = 60;

export function PhoneOtpForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  async function startResendCountdown() {
    setResendIn(RESEND_SECONDS);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const remaining = RESEND_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        setResendIn(0);
      } else {
        setResendIn(remaining);
      }
    }, 1000);
  }

  async function onSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const normalized = normalizeIranMobile(phoneInput);
    if (!normalized) {
      setError("Enter a valid Iranian mobile number, e.g. 0912 345 6789");
      return;
    }

    setPending(true);
    const { error } = await authClient.phoneNumber.sendOtp({
      phoneNumber: normalized,
    });
    setPending(false);

    if (error) {
      setError(error.message ?? "Could not send the code. Please try again.");
      return;
    }

    setPhoneNumber(normalized);
    setCode("");
    setStep("code");
    void startResendCountdown();
  }

  async function onVerify(codeValue: string) {
    if (!phoneNumber || codeValue.length !== 6) return;

    setError(null);
    setPending(true);
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber,
      code: codeValue,
    });
    setPending(false);

    if (error) {
      setError(error.message ?? "Verification failed. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (step === "code" && phoneNumber) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Verify your phone</CardTitle>
          <CardDescription>
            We sent a 6-digit code via SMS to{" "}
            <span className="font-medium text-foreground">
              {formatIranMobile(phoneNumber)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
              onComplete={(value) => void onVerify(value)}
              disabled={pending}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={() => void onVerify(code)}
              disabled={pending || code.length !== 6}
              className="w-full"
            >
              {pending && <Spinner />}
              Verify & continue
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="underline-offset-4 hover:underline disabled:opacity-50"
                onClick={() => void onSendOtp()}
                disabled={resendIn > 0 || pending}
              >
                Resend code
              </button>
              {resendIn > 0 && <span>in {resendIn}s</span>}
              <span aria-hidden>|</span>
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  setCode("");
                }}
              >
                Change number
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Sign in with phone</CardTitle>
        <CardDescription>
          We&apos;ll text you a one-time code. New numbers are signed up
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSendOtp(e)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="0912 345 6789"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              autoComplete="tel-national"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Send code
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
