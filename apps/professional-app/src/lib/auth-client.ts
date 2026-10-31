import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../backend/src/lib/auth";
import { API_URL } from "@/lib/api-url";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
