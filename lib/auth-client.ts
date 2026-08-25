import { createAuthClient } from "better-auth/react";
import { adminClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), adminClient()],
});
