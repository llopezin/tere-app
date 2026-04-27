import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../backend/src/lib/auth";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [inferAdditionalFields<typeof auth>()],
  fetchOptions: {
    credentials: 'include'
  }
});

export const { useSession, signIn, signUp, signOut } = authClient;
