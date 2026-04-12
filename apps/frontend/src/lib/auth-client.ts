import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../backend/src/lib/auth";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
  credentials: 'include'
});

export const { useSession, signIn, signUp, signOut } = authClient;
