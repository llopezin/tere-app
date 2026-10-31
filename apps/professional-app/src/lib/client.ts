import type { ProfessionalAppType } from "@fisio-app/backend";
import { hc } from "hono/client";
import { API_URL } from "@/lib/api-url";

// Professional BFF: professional-app only talks to /api/v1/professional/* (role professional, this app's origin)
export const client = hc<ProfessionalAppType>(`${API_URL}/api/v1/professional`, {
  init: {
    credentials: "include",
  },
});
