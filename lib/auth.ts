import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";
import prisma from "./prisma";
import { normalizeIranMobile } from "./phone";
import { sendSms } from "./sms";

// Synthetic email domain for users who sign up with only a phone number.
const PHONE_ONLY_EMAIL_DOMAIN = "phone.users.local";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3,
      phoneNumberValidator: (phoneNumber) =>
        normalizeIranMobile(phoneNumber) !== null,
      // Not awaited on purpose: keeps the request fast and avoids timing
      // attacks (recommended by better-auth docs).
      sendOTP: ({ phoneNumber, code }) => {
        void sendSms(phoneNumber, `کد تایید شما: ${code}`)
          .then((result) => {
            if (!result.delivered) {
              // No credentials configured — surfaced so devs can grab the code path
              console.log(`[auth] OTP for ${phoneNumber} generated (SMS stubbed)`);
            }
          })
          .catch((error) => {
            console.error(`[auth] Failed to send OTP to ${phoneNumber}:`, error);
          });
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) =>
          `${normalizeIranMobile(phoneNumber) ?? phoneNumber}@${PHONE_ONLY_EMAIL_DOMAIN}`,
        getTempName: (phoneNumber) => formatPhoneAsName(phoneNumber),
      },
    }),
  ],
});

function formatPhoneAsName(phoneNumber: string): string {
  return normalizeIranMobile(phoneNumber) ?? phoneNumber;
}
