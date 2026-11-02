import type { PatientAppType } from "@fisio-app/backend";
import { hc } from "hono/client";

export const client = hc<PatientAppType>(`${import.meta.env.VITE_API_URL}/api/v1/patient`, {
  init: {
    credentials: "include",
  },
});
