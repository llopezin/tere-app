import { redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

/**
 * `beforeLoad` guard of the professional pages. Changing only the search params of the same page
 * (`cause: "stay"`, e.g. paging or searching) skips the session request: the session was checked on entering.
 */
export async function requireProfessional({ cause }: { cause: "preload" | "enter" | "stay" }) {
  if (cause === "stay") return;
  const session = await authClient.getSession();
  if (!session.data?.session || session.data.user.role !== "professional") {
    throw redirect({ to: "/login" });
  }
}
