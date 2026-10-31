import type { PatientAppType } from "@fisio-app/backend";
import { hc } from "hono/client";

// Patient BFF: client-app only talks to /api/v1/patient/* (role patient, client-app origin)
export const client = hc<PatientAppType>(`${import.meta.env.VITE_API_URL}/api/v1/patient`, {
  init: {
    credentials: "include",
  },
});
